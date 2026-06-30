# Venue-Suite: light + multicam kombinieren, cable-ready

> Erweitert [`MERGE_INTO_CABLE_PLANNER.md`](./MERGE_INTO_CABLE_PLANNER.md) (multicam→cable)
> um **light-planner** und ein **gemeinsames Venue-Datenmodell**.
> Leitanforderung: Jedes der drei Tools muss **einzeln sinnvoll nutzbar** sein
> **und** mit den anderen **verknüpfbar**.
>
> Basis: tiefen-Analyse von Daten-/State-Modell, cable-Host-Architektur und
> Build-Verdrahtung aller drei Apps (Stand nach Stack-Angleichung).

## 0. Kernbefunde aus der Tiefen-Analyse

1. **Der Stack ist bereits angeglichen** (nach den jüngsten Updates): alle drei auf
   Vite 8.1, React 19.2.7, Zustand 5.0.14, TypeScript 6.0, `@vitejs/plugin-react` 6,
   Electron 42.5, three 0.185, `moduleResolution: "bundler"`. Die Versions-Hürde aus
   dem alten Merge-Doc ist **weg**.
2. **cable ist bereits für Module gebaut:** `src/renderer/lib/modules.ts` + `useModule()`,
   `Settings/tabs/ModulesTab.tsx` rendert jeden Modul-Eintrag automatisch, `docs/modular-ui-concept.md`.
   Es gibt sogar schon einen `lib/cameraCatalog.ts`-Stub. `greengoConfig?` zeigt das
   Muster „ganze Sub-Domäne = ein optionales Top-Level-Projektfeld".
3. **cable hat die Standalone-Abstraktion schon vorgelebt:** `cablePlannerApi =
   window.cablePlanner ?? webFallbackApi` (`lib/bridge.ts`). Dasselbe Muster trägt die
   „einzeln nutzbar"-Anforderung: ein Modul gegen ein schmales Host-Interface
   programmieren, zwei Implementierungen (embedded / standalone).
4. **light ist am weitesten Richtung Einbettung:** UI-freier `core.ts`-Barrel,
   `HostAdapter`-Pattern (`integration/hostAdapter.ts` + `cablePlannerHost.ts`),
   `LightingDocument = Omit<ProjectData,'meta'>` als einbettbares Sub-Dokument,
   echtes Undo + Diff (`core/diff.ts`, `versionStore.ts`).
5. **multicam und light sind strukturell ~65% dieselbe App** (Venue-2D + 3D +
   Floor-Plan + Personen + Wände + Bibliothek + Properties + Export), getrennt gebaut.

## 1. Leitidee: geteilte Venue-Basis + optionale Domänen-Layer

Ein Projekt ist **ein Venue** (physischer Raum + Floor-Plan). Darauf liegen
**optionale Domänen-Layer**. Optional ⇒ jede Domäne läuft einzeln; gemeinsames Venue
⇒ sie verknüpfen sich automatisch (eine Person ist Kamera-Motiv **und** Licht-Subjekt).

```ts
interface UnifiedProject {
  formatVersion: 2; appVersion: string;
  meta: ProjectMeta;            // aus light (name/author/version/notes/timestamps)
  projectVersion: number;       // aus multicam (Dirty-Tracking)
  venue: Venue;                 // immer vorhanden
  cameras?: CameraDomain;       // optional → reines Licht-Projekt gültig
  lighting?: LightingDomain;    // optional → reines Kamera-Projekt gültig
}

interface Venue {               // domänen-neutral, GETEILT
  name: string; widthM?: number; heightM?: number;
  floorPlan?: FloorPlanCalibration;   // kanonisch = light-Form (widthMeters/heightMeters)
  persons: Person[];                  // gemeinsam von beiden Domänen referenziert
  walls: Wall[];                      // gemeinsame Geometrie-Basis
  stageObjects: StageObject[];        // Fusion multicam Stage + light StageElement
}
```

**Geteilte Entitäten (Feld-für-Feld konvergiert):**
- `Person`: `id,x,y,height,label` (beide) + `width/objectType` (multicam) + `pose/facing` (light).
- `Wall`: `x1,y1,x2,y2,height,label` (identisch) + `cx,cy/reflectance/color/windows` (light-Physik, optional).
- `FloorPlanCalibration`: **kanonisch lights Form** (`widthMeters/heightMeters`, PDF-fähig);
  multicam-Renderer bekommt `scaleX = widthMeters/naturalWidth` per Helper. ⚠ Skalierungs-
  Semantik ist heute invers (multicam m/px, light reale Maße) — das ist das größte Migrationsrisiko.

**Domänen-Layer (fachspezifisch, getrennt):** `cameras.placed` (VenueCamera: pan/tilt/lens/
sensor/mountType…) vs. `lighting.fixtures` (PlacedFixture: aim/dimming/gel/DMX-Patch…),
plus `lighting.{trusses,ceilings,scenes,sun,viewpoints}` und `cameras.{customCameras,customLenses}`.

> ⚠ **Namenskollision:** lights `cameras: CameraView[]` sind 3D-**Blickpunkte**, multicams
> `cameras` sind echte Kameras. Im Unified-Modell → `lighting.viewpoints` vs. `cameras.placed`.

## 2. „Einzeln nutzbar + verknüpfbar" — die Architektur

### 2a. Einzeln nutzbar (Standalone)
- `cameras?`/`lighting?` optional → ein Projekt nur mit Kameras, nur mit Licht, oder beides.
- In cable: jede Domäne ein eigener **Modul-Flag** (`useModule('cameras')`, `useModule('lighting')`)
  — über `ModulesTab` an/abschaltbar, exakt das bestehende Muster.
- **`VenueHost`-Interface** (nach Vorbild `cablePlannerApi ?? webFallbackApi`):
  ```ts
  interface VenueHost {
    saveDocument(json, name): Promise<void>;   openDocument(): Promise<{name,text}|null>;
    exportFile(blob, name): Promise<void>;     secret: { get/set/delete };
    ai?: ExtractService;                       // optional capability
  }
  ```
  Zwei Implementierungen: **embedded** → delegiert an cable-Bridge + `project.venue`-Slice;
  **standalone** → Browser-Download/File-Picker + localStorage (cables `webFallbackApi`-Äquivalent).
  Das ist genau lights schon vorhandenes `HostAdapter`, verallgemeinert auf beide Domänen.

### 2b. Verknüpft (cross-domain)
- **Geteiltes Venue:** `venue.persons/walls/stageObjects/floorPlan` werden von beiden
  Domänen gelesen — automatische räumliche Verknüpfung ohne Extra-Arbeit.
- **Equipment-Brücke (Stufe B aus dem Merge-Doc):** optionales `equipmentId?: string` auf
  `VenueCamera` **und** `PlacedFixture` → eine platzierte Kamera/Lampe verlinkt mit einem
  Equipment-Node auf cables Signal-Flow-Canvas. Eine Selektion, mehrere Repräsentationen.
- **Cross-domain-Berechnungen (später):** Fixture-Leistung (`patch.computePower`) fließt in
  cables Power-Budget; eine platzierte Kamera erscheint als Quelle im Signal-Flow.

## 3. UI-Konzept

- **cable als Host-Shell** (reifste Architektur). Ein neuer **Venue-Modus** (oder andockbares
  Panel-Set via `FloatingPanelShell`) neben dem Signal-Flow-Canvas, eingehängt über das
  Modul-Flag-Muster (`MenuBar` → View, `App.tsx` Panel-Host wie `AnnotationsPanelHost`).
- **Geteilte Venue-Fläche** (2D + 3D) als Herzstück; Kameras und Lichter sind Render-Layer
  darauf. Domänen-Umschaltung dimmt+lockt die jeweils andere (lights `LayersPanel`-Muster,
  um Domänen-Gruppen erweitert).
- **Ein selektionsgetriebenes Properties-Panel** (cables `Properties/sections/`-Framework),
  Sections fachspezifisch.
- **Standalone-Builds** behalten ihre schlanke Shell (multicam flexlayout-Tabs / light Dock),
  reden aber über dasselbe `VenueHost`-Interface mit der Welt.

## 4. 2D-Canvas-Entscheidung (die eine harte technische Wahl)

multicam nutzt **Konva** (retained-mode), light einen **eigenen `<canvas>`** (immediate-mode,
reicher: HeatMap, Bézier-Wände, Lineale, Maßlinien, Marquee, Pick-Cycling).

**Empfehlung:** lights Immediate-Mode-Kern ist die bessere Basis — aber **nicht** die
1644-Zeilen-`PlanCanvas` 1:1 heben, sondern einen **neutralen `CanvasController`** extrahieren
(View-Transform, Pan/Zoom-um-Pointer, Grid/Lineale, generische Drag-State-Machine,
`screen↔world`) + Domänen-Render-Callback. multicam portiert seine Venue2D darauf (Konva
entfällt). Begründung: Konva als Basis zwänge eine ~Hunderte-KB-Dependency in *alle* Apps
(auch cable/light, die sie nicht haben) und passt schlecht zu lights Offscreen-/HeatMap-Compositing.

## 5. Was sonst noch sinnvoll zu kombinieren ist (Recherche)

Gereiht nach Nutzen/Risiko. Die ersten beiden sind **klassenfrei/Tailwind-unabhängig** → ideale erste Welle.

| Shared-Paket | Inhalt | Quelle (Basis) | Doppelt in |
|---|---|---|---|
| **`@bp/geometry`** ★ zuerst | `distToSegment`, `convexHull`, `pointInPolygon`, Wall-Sampling/Bézier, Winkel-Snap (45°), Align/Distribute | light `core/geometry.ts` + multicam Inline-Helfer + cable `alignEquipment.ts` | alle 3 |
| **`@bp/floorplan`** | Floor-Plan-Import (PDF/Bild, `pdfjs-dist`), 2-Punkt-Kalibrierung, `CanvasController`, geteilte Typen `Wall/Person/FloorPlan` | light `floorPlanLoader.ts` + `PlanCanvas`-Kern; multicam 2-Achsen-Calib | multicam ↔ light |
| **`@bp/venue3d`** | Three.js Boden/Wände/Stage/Personen + Orbit + Troika-Labels | merge multicam `Venue3D` + light `Scene3D` | multicam ↔ light |
| **`@bp/power`** | Watt/Ampere/Stromkreise | cable + light `patch.computePower` | cable ↔ light |
| **`@bp/library`** | Such-/Favoriten-/Custom-Item-Framework + AI-Datasheet-Extraktion (Claude) | cable Library + light AI-Extract + multicam Favoriten | alle 3 |
| Plattform (cable liefert) | Settings-Shell, `cp-*`-Theme, i18n, Undo (`projectHistory`), Export-Pipeline, atomic-write + `healProjectPositions`, Command-Palette, Layers-Panel, BOM/CSV, Mobile-Viewer, CRDT | cable | — |

**Three.js-Regel:** `@bp/venue3d` **nur** via `lazy(() => import(...))` einbinden (lights Muster),
three/r3f als `peerDependencies`. Schützt cables ~600-KB-Hauptbundle-Grenze (heute nur per
Konvention gehalten — bei der Gelegenheit auch cables statischen `RackBuilderDialog`-Import härten).

**Nicht teilen (domänenspezifisch):** cable ATEM/Videohub/Signal-Vererbung/Rack-Builder;
multicam Adapter-Optik/Sensor-Modi/FOV-DoF/Preview; light Photometrie/Auto-Lighting/MVR/Sonne/Patch.

## 6. Shared-Package-Mechanik (Build)

- npm-workspaces-Monorepo; `@bp/*` als **Source-only-TS-Pakete** (`exports: "./src/index.ts"`,
  **kein** Build-Step) — alle Consumer haben `moduleResolution: "bundler"`, Vite/esbuild
  transpilieren die `.ts` direkt. Hält HMR über Paketgrenzen, vermeidet stale-`dist`.
- `react`/`zustand`/`three` als **peerDependencies** der Pakete (eine Instanz, gehoisted).
- Typecheck via TS-**Projekt-Referenzen** (`composite: true` nur für den Typecheck-Graph).
- Tailwind in shared UI: erst relevant ab `@bp/library` — dann Token-CSS (`@bp/tokens`,
  cables `cp-*` als Vorlage) statt roher Utilities, plus `content`/`@source`-Globs auf die Pakete.

## 7. Phasenplan (erweitert MERGE_INTO_CABLE_PLANNER.md um light + Unified-Modell)

| Phase | Inhalt | Risiko |
|---|---|---|
| **0** | Stack abgleichen | ✅ erledigt (alle auf Vite8/React19/TS6/three0.185) |
| **1** | `@bp/geometry` extrahieren (pure Funktionen + Tests), von light + multicam konsumiert | niedrig |
| **2** | Unified-Typen `Venue/Person/Wall/StageObject/FloorPlanCalibration` + Migrationshelfer (multicam `scaleX/scaleY` ↔ light `widthMeters`); `@bp/floorplan` (Import+Calib+CanvasController) | mittel |
| **3** | `@bp/venue3d` (lazy); multicam Venue2D von Konva auf CanvasController portieren | mittel |
| **4** | `VenueHost`-Interface + standalone/embedded-Impl; light + multicam reden darüber | mittel |
| **5** | In cable einhängen: `venue`-Modul-Flag, `project.venue`-Slice (Vorlage `annotationSlice`), `healProjectPositions`-Default, Undo erbt automatisch; AI→`aiSuggestions`+Keychain, i18n | mittel–hoch |
| **6** | Verknüpfung (Stufe B): `equipmentId` auf VenueCamera/PlacedFixture ↔ cable-Equipment | mittel |

## 8. Risiken

1. **FloorPlan-Skalierungs-Inversion** (höchstes) — anisotrope multicam-Kalibrierung (scaleX≠scaleY)
   verliert beim Mapping auf lights isotrope Form Information. Migrationspfad sorgfältig testen.
2. **formatVersion-Asymmetrie** — multicam prüft hart `===1`, light hat keins. Bump auf 2,
   beide Alt-Formate erkennen.
3. **Person/Objekt-Vermischung** — multicam packt Drums/Tisch als `ReferencePerson`; beim Merge
   zu `StageObject` umleiten, sonst tauchen Objekte als „Person" in Licht-Scenes auf.
4. **ID-Kollisionen** beim Zusammenführen zweier Projekte ins selbe Venue → Re-ID/Namespacing.
5. **Undo-Scope** — alle Domänen-Mutationen über EINEN History-Mechanismus (cables `projectHistory`).
6. **3 gleichzeitige Renderer** (Konva/WebGL/Canvas) zusätzlich zu ReactFlow → Lazy-Mount nur bei offenem Modul.

## 9. Erster konkreter Schnitt

`@bp/geometry` (Phase 1): aus `light/src/core/geometry.ts` (komplett) + multicams Inline-Snap-Helfern
aus `Venue2D.tsx`. Imports in light (`PlanCanvas.tsx:5`, `core/lightCalc.ts`) und multicam umbiegen.
Dann Unified-Typen + `@bp/floorplan`. Reihenfolge strikt: erst pure Funktionen (risikolos), dann Typen/Canvas.
