// ───────────────────────────────────────────────────────────────────────────
// Venue-Austauschformat (`venue-exchange` v1)
//
// Domaenen-neutrales Format fuer den Raum/das Venue (Floor-Plan, Waende,
// Stage-Objekte, Personen, Venue-Masse) — der Teil, den MultiCam-, Light- und
// (perspektivisch) Cable-Planner gemeinsam haben. So kann man ein Venue in der
// einen App exportieren und in der anderen importieren, um z. B. im selben Raum
// Kameras UND Licht zu planen.
//
// Das Schema ist in jeder App identisch gehalten (siehe light-planner
// src/core/venueExchange.ts). Reine Daten, keine DOM-/Store-Abhaengigkeit →
// headless testbar.
// ───────────────────────────────────────────────────────────────────────────
import type { Venue, ReferencePerson, Wall, BackgroundPlan, StageObjectType } from '../types';

export const VENUE_EXCHANGE_KIND = 'venue-exchange' as const;
export const VENUE_EXCHANGE_VERSION = 1 as const;

export interface VenueExchangePerson {
  id: string; x: number; y: number; height: number; label: string;
  width?: number; objectType?: string; pose?: 'standing' | 'sitting'; facing?: number; color?: string;
}
export interface VenueExchangeWall {
  id: string; x1: number; y1: number; x2: number; y2: number; height: number;
  label?: string; cx?: number; cy?: number; reflectance?: number; color?: string;
}
export interface VenueExchangeStageObject {
  id: string; x: number; y: number; width: number; height: number;
  depth?: number; height2?: number; rotation?: number; points?: { x: number; y: number }[]; label?: string;
}
export interface VenueExchangeFloorPlan {
  src: string; name?: string; naturalWidth: number; naturalHeight: number;
  // Kanonisch: reale Masse (light-Form). MultiCams scaleX/scaleY werden hieraus abgeleitet.
  widthMeters: number; heightMeters: number;
  offsetX: number; offsetY: number; opacity: number;
  locked?: boolean; kind?: 'image' | 'pdf'; pageCount?: number; pageIndex?: number;
}
export interface VenueExchange {
  kind: typeof VENUE_EXCHANGE_KIND;
  formatVersion: typeof VENUE_EXCHANGE_VERSION;
  app: string;
  appVersion: string;
  exportedAt: string;
  venue: {
    name: string;
    widthM?: number;
    heightM?: number;
    persons: VenueExchangePerson[];
    walls: VenueExchangeWall[];
    stageObjects: VenueExchangeStageObject[];
    floorPlan?: VenueExchangeFloorPlan;
  };
}

/**
 * ADR-005 — Buehnen-Felder, die MultiCam nicht modelliert, je Buehnen-Id
 * aufgehoben.
 *
 * MultiCams Buehne ist eine flache 2D-Zone: sie hat Breite und Plan-Tiefe,
 * aber keine Podest-Hoehe, keine Drehung und keinen Polygon-Umriss. Das
 * Austauschformat kennt alle drei. Bisher schrieb der Export deshalb fuer
 * JEDE Buehne `height: 0` — und das ist nicht dasselbe wie „weiss ich nicht":
 * ein 0,6 m hohes Podest aus dem Light-Planner kam nach einem
 * MultiCam-Round-Trip als flacher Boden zurueck.
 *
 * `height` ist im Austauschtyp Pflicht, kann also nicht weggelassen werden —
 * eine Aenderung daran waere eine Aenderung am eingefrorenen Draht-Vertrag.
 * Stattdessen hebt MultiCam auf, was es nicht versteht, und gibt es beim
 * Export unveraendert zurueck. Fuer eine MultiCam-eigene Buehne gibt es
 * nichts Aufgehobenes, und `height: 0` bleibt — dort ist es zutreffend und
 * keine Erfindung.
 */
export interface ForeignStageFields {
  height?: number;
  height2?: number;
  rotation?: number;
  points?: { x: number; y: number }[];
}

/**
 * ADR-005 — Gebaeudeplan-Felder, die MultiCam nicht modelliert.
 *
 * MultiCams `BackgroundPlan` ist eine Bitmap mit Massstab und Versatz: kein
 * Name, kein Sperr-Flag, keine Seitenzahl, keine Angabe, ob die Quelle ein PDF
 * war. Der Export schrieb deshalb unbedingt `kind: 'image'`.
 *
 * Fuer einen in MultiCam hochgeladenen Plan ist das wahr. Fuer einen aus dem
 * Light-Planner uebernommenen PDF-Grundriss nicht: aus Seite 3 von 5 eines
 * gesperrten `EG_Grundriss.pdf` wurde ein namenloses, entsperrtes Bild ohne
 * Seitenbezug. Dieselbe Sorte Schaden wie bei der Podest-Hoehe — ein falscher
 * Wert, kein fehlender.
 */
export interface ForeignFloorPlanFields {
  name?: string;
  locked?: boolean;
  kind?: 'image' | 'pdf';
  pageCount?: number;
  pageIndex?: number;
}

/**
 * ADR-005 — Wand-Felder, die MultiCam nicht modelliert.
 *
 * Light kennt gekruemmte Waende (`cx`/`cy`, ein Bezier-Kontrollpunkt) und
 * einen Reflexionsgrad. MultiCams Wand ist eine Strecke. Die Felder fielen
 * beim Import weg und wurden beim Export nicht geschrieben — lights Import
 * setzt danach `reflectance ?? 0.5` ein, und die fehlende Kruemmung heisst
 * nicht „unbekannt", sondern **gerade**. Eine gebogene Wand kam nach einem
 * Round-Trip durch MultiCam als Strecke zurueck.
 */
/**
 * ADR-005 — Personen-Felder, die MultiCam nicht modelliert.
 *
 * Light kennt an einer Figur Pose (stehend/sitzend) und Blickrichtung.
 * MultiCams `ReferencePerson` ist ein Buehnen-Objekt mit Grundflaeche und Art —
 * beides gibt es dort nicht. Die Felder fielen weg, und lights Import setzt
 * danach `pose ?? 'standing'` und `facing ?? 270` ein: eine sitzende, nach
 * Osten blickende Figur stand nach einem Round-Trip durch MultiCam und schaute
 * nach vorn.
 */
export interface ForeignPersonFields {
  pose?: 'standing' | 'sitting';
  facing?: number;
}

export interface ForeignWallFields {
  cx?: number;
  cy?: number;
  reflectance?: number;
}

export interface MultiCamVenueInput {
  venue: Venue;
  persons: ReferencePerson[];
  walls: Wall[];
  backgroundPlan: BackgroundPlan | null;
  appVersion: string;
  exportedAt: string;
  /** Siehe ForeignStageFields. Fehlt es, verhaelt sich der Export wie bisher. */
  stageForeign?: Record<string, ForeignStageFields>;
  /** Siehe ForeignFloorPlanFields. Fehlt es, bleibt es bei `kind: 'image'`. */
  floorPlanForeign?: ForeignFloorPlanFields;
  /** Siehe ForeignWallFields, je Wand-Id. */
  wallForeign?: Record<string, ForeignWallFields>;
  /** Siehe ForeignPersonFields, je Personen-Id. */
  personForeign?: Record<string, ForeignPersonFields>;
}

function bgToFloorPlan(
  bg: BackgroundPlan,
  foreign: ForeignFloorPlanFields = {},
): VenueExchangeFloorPlan {
  return {
    src: bg.dataUrl,
    naturalWidth: bg.widthPx,
    naturalHeight: bg.heightPx,
    // MultiCam speichert Meter pro Pixel → reale Masse = scale * Pixelmasse.
    widthMeters: bg.scaleX * bg.widthPx,
    heightMeters: bg.scaleY * bg.heightPx,
    offsetX: bg.offsetX,
    offsetY: bg.offsetY,
    opacity: bg.opacity,
    // ADR-005 — `kind: 'image'` gilt nur, solange nichts anderes bekannt ist.
    // Ein uebernommener PDF-Grundriss behaelt seine Herkunft und seine Seite.
    kind: foreign.kind ?? 'image',
    ...(foreign.name !== undefined ? { name: foreign.name } : {}),
    ...(foreign.locked !== undefined ? { locked: foreign.locked } : {}),
    ...(foreign.pageCount !== undefined ? { pageCount: foreign.pageCount } : {}),
    ...(foreign.pageIndex !== undefined ? { pageIndex: foreign.pageIndex } : {}),
  };
}

/** MultiCam-Venue → neutrales Austauschformat. */
export function toVenueExchange(input: MultiCamVenueInput): VenueExchange {
  const { venue, persons, walls, backgroundPlan } = input;
  const foreign = input.stageForeign ?? {};
  const wallForeign = input.wallForeign ?? {};
  const personForeign = input.personForeign ?? {};
  return {
    kind: VENUE_EXCHANGE_KIND,
    formatVersion: VENUE_EXCHANGE_VERSION,
    app: 'multicam-planner',
    appVersion: input.appVersion,
    exportedAt: input.exportedAt,
    venue: {
      name: venue.name,
      widthM: venue.widthM,
      heightM: venue.heightM,
      persons: persons.map((p) => {
        // ADR-005 — Pose und Blickrichtung modelliert MultiCam nicht und gibt
        // sie unveraendert weiter.
        const f = personForeign[p.id];
        return {
          id: p.id, x: p.x, y: p.y, height: p.height, label: p.label,
          width: p.width, objectType: p.objectType, color: p.color,
          ...(f?.pose !== undefined ? { pose: f.pose } : {}),
          ...(f?.facing !== undefined ? { facing: f.facing } : {}),
        };
      }),
      walls: walls.map((w) => {
        // ADR-005 — `color` modelliert MultiCam selbst und schrieb es trotzdem
        // nicht: eine blau gestrichene Wand kam nach einem Venue-Round-Trip
        // grau zurueck. Kruemmung und Reflexionsgrad modelliert es nicht und
        // gibt sie unveraendert weiter.
        const f = wallForeign[w.id];
        return {
          id: w.id, x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, height: w.height, label: w.label,
          ...(w.color !== undefined ? { color: w.color } : {}),
          ...(f?.cx !== undefined ? { cx: f.cx } : {}),
          ...(f?.cy !== undefined ? { cy: f.cy } : {}),
          ...(f?.reflectance !== undefined ? { reflectance: f.reflectance } : {}),
        };
      }),
      // MultiCam-Stage ist eine flache 2D-Zone (width × height-in-Plan); die
      // Plan-Tiefe wandert ins `depth`-Feld. Die Podest-Hoehe bleibt 0, wenn
      // die Buehne hier entstanden ist — und kommt zurueck, wenn sie
      // eingelesen wurde (siehe ForeignStageFields).
      stageObjects: venue.stages.map((s) => {
        const f = foreign[s.id];
        return {
          id: s.id, x: s.x, y: s.y, width: s.width, depth: s.height, label: s.label,
          height: f?.height ?? 0,
          ...(f?.height2 !== undefined ? { height2: f.height2 } : {}),
          ...(f?.rotation !== undefined ? { rotation: f.rotation } : {}),
          ...(f?.points !== undefined ? { points: f.points } : {}),
        };
      }),
      floorPlan: backgroundPlan
        ? bgToFloorPlan(backgroundPlan, input.floorPlanForeign)
        : undefined,
    },
  };
}

export interface MultiCamVenueResult {
  venue: Venue;
  persons: ReferencePerson[];
  walls: Wall[];
  backgroundPlan: BackgroundPlan | null;
  /** Siehe ForeignStageFields. Nur Buehnen mit wirklich fremden Werten. */
  stageForeign: Record<string, ForeignStageFields>;
  /** Siehe ForeignFloorPlanFields. Leer, wenn die Datei nichts davon trug. */
  floorPlanForeign: ForeignFloorPlanFields;
  /** Siehe ForeignWallFields. Nur Waende mit wirklich fremden Werten. */
  wallForeign: Record<string, ForeignWallFields>;
  /** Siehe ForeignPersonFields. Nur Figuren mit wirklich fremden Werten. */
  personForeign: Record<string, ForeignPersonFields>;
}

function floorPlanToBg(fp: VenueExchangeFloorPlan): BackgroundPlan {
  return {
    dataUrl: fp.src,
    // Reale Masse → Meter pro Pixel (Inverse von bgToFloorPlan).
    scaleX: fp.naturalWidth ? fp.widthMeters / fp.naturalWidth : 1,
    scaleY: fp.naturalHeight ? fp.heightMeters / fp.naturalHeight : 1,
    offsetX: fp.offsetX,
    offsetY: fp.offsetY,
    opacity: fp.opacity,
    widthPx: fp.naturalWidth,
    heightPx: fp.naturalHeight,
  };
}

/** Neutrales Austauschformat → MultiCam-Venue (Kamera-Layer bleibt unberuehrt). */
export function fromVenueExchange(ex: VenueExchange): MultiCamVenueResult {
  const v = ex.venue;
  return {
    venue: {
      name: v.name || 'Venue',
      widthM: v.widthM ?? 20,
      heightM: v.heightM ?? 12,
      stages: (v.stageObjects ?? []).map((s) => ({
        id: s.id, x: s.x, y: s.y, width: s.width,
        height: s.depth ?? s.height ?? 1, label: s.label ?? '',
      })),
    },
    persons: (v.persons ?? []).map((p) => ({
      id: p.id, x: p.x, y: p.y, height: p.height, width: p.width ?? 0.5,
      label: p.label, objectType: (p.objectType as StageObjectType) ?? 'person', color: p.color,
    })),
    walls: (v.walls ?? []).map((w) => ({
      id: w.id, x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, height: w.height, label: w.label ?? '',
      ...(w.color !== undefined ? { color: w.color } : {}),
    })),
    backgroundPlan: v.floorPlan ? floorPlanToBg(v.floorPlan) : null,
    stageForeign: collectStageForeign(v.stageObjects ?? []),
    floorPlanForeign: collectFloorPlanForeign(v.floorPlan),
    wallForeign: collectWallForeign(v.walls ?? []),
    personForeign: collectPersonForeign(v.persons ?? []),
  };
}

/** Hebt je Figur auf, was MultiCam nicht modelliert. Die Standardwerte,
 *  die lights Import ohnehin einsetzt ('standing', 270), werden NICHT
 *  aufgehoben — sie zu speichern hiesse zu behaupten, jemand habe sie
 *  gesetzt. */
function collectPersonForeign(
  persons: VenueExchangePerson[],
): Record<string, ForeignPersonFields> {
  const out: Record<string, ForeignPersonFields> = {};
  for (const p of persons) {
    const f: ForeignPersonFields = {};
    if (p.pose !== undefined && p.pose !== 'standing') f.pose = p.pose;
    if (typeof p.facing === 'number' && p.facing !== 270) f.facing = p.facing;
    if (Object.keys(f).length > 0) out[p.id] = f;
  }
  return out;
}

/** Hebt je Wand auf, was MultiCam nicht modelliert. Eine gerade Wand ohne
 *  Reflexionsgrad bekommt keinen Eintrag. */
function collectWallForeign(
  walls: VenueExchangeWall[],
): Record<string, ForeignWallFields> {
  const out: Record<string, ForeignWallFields> = {};
  for (const w of walls) {
    const f: ForeignWallFields = {};
    if (typeof w.cx === 'number') f.cx = w.cx;
    if (typeof w.cy === 'number') f.cy = w.cy;
    if (typeof w.reflectance === 'number') f.reflectance = w.reflectance;
    if (Object.keys(f).length > 0) out[w.id] = f;
  }
  return out;
}

/** Hebt auf, was MultiCams BackgroundPlan nicht kennt. `kind: 'image'` wird
 *  NICHT aufgehoben: das ist der Wert, den der Export ohnehin schreibt, und
 *  ihn zu speichern hiesse zu behaupten, eine fremde App habe ihn gesetzt. */
function collectFloorPlanForeign(
  fp: VenueExchangeFloorPlan | undefined,
): ForeignFloorPlanFields {
  if (!fp) return {};
  return {
    ...(fp.name !== undefined ? { name: fp.name } : {}),
    ...(fp.locked !== undefined ? { locked: fp.locked } : {}),
    ...(fp.kind !== undefined && fp.kind !== 'image' ? { kind: fp.kind } : {}),
    ...(fp.pageCount !== undefined ? { pageCount: fp.pageCount } : {}),
    ...(fp.pageIndex !== undefined ? { pageIndex: fp.pageIndex } : {}),
  };
}

/** Hebt je Buehne auf, was MultiCam nicht modelliert. Eine Buehne ohne solche
 *  Werte bekommt keinen Eintrag — ein leeres Objekt je Buehne waere Ballast
 *  und wuerde behaupten, es habe etwas zu bewahren gegeben. Eine Hoehe von 0
 *  ist ebenfalls nichts zu bewahren: das ist genau der Wert, den der Export
 *  ohnehin schreibt. */
function collectStageForeign(
  objs: VenueExchangeStageObject[],
): Record<string, ForeignStageFields> {
  const out: Record<string, ForeignStageFields> = {};
  for (const s of objs) {
    const f: ForeignStageFields = {};
    if (typeof s.height === 'number' && s.height !== 0) f.height = s.height;
    if (s.height2 !== undefined) f.height2 = s.height2;
    if (s.rotation !== undefined) f.rotation = s.rotation;
    if (s.points !== undefined) f.points = s.points;
    if (Object.keys(f).length > 0) out[s.id] = f;
  }
  return out;
}

/** Parst + validiert eine Austauschdatei. Wirft bei falschem Format. */
export function parseVenueExchange(text: string): VenueExchange {
  const data = JSON.parse(text) as Partial<VenueExchange>;
  if (!data || data.kind !== VENUE_EXCHANGE_KIND) {
    throw new Error('Keine gueltige Venue-Austauschdatei (kind != venue-exchange).');
  }
  if (data.formatVersion !== VENUE_EXCHANGE_VERSION) {
    throw new Error(`Nicht unterstuetzte Venue-Austausch-Version: ${data.formatVersion}`);
  }
  if (!data.venue) throw new Error('Venue-Austauschdatei ohne venue-Block.');
  return data as VenueExchange;
}

/**
 * ADR-005, Regel 2 — eine Projektion darf den vollen Stand nicht ueberschreiben.
 *
 * Der geteilte Raum ist fuer Existenz und Geometrie kanonisch: hat eine
 * Nachbar-App eine Wand verschoben oder geloescht, gilt das. Er kann aber nur
 * die Felder tragen, die das Austauschformat kennt — MultiCams
 * `pattern`, `patternImage`, `patternFit` und `patternRows` gehoeren nicht dazu.
 *
 * Ohne diese Zusammenfuehrung loeschte jeder Venue-Import die Wand-Muster, die
 * der Nutzer eingerichtet hatte: `importVenueExchange` setzte `walls` im Ganzen
 * neu. Dasselbe Muster wie `mergeOwnVenueFields` im light-planner.
 */
/**
 * ADR-005, Regel 2 — dasselbe fuer Figuren. Das Austauschformat kennt kein
 * `locked`; ohne diese Zusammenfuehrung loeschte jeder Venue-Import die Sperren,
 * die der Nutzer gesetzt hat.
 */
export function mergeOwnPersonFields(
  projected: MultiCamVenueResult,
  own: { persons: ReferencePerson[] },
): MultiCamVenueResult {
  const mine = new Map((own.persons ?? []).map((p) => [p.id, p]));
  return {
    ...projected,
    persons: projected.persons.map((p) => {
      const o = mine.get(p.id);
      return o?.locked !== undefined ? { ...p, locked: o.locked } : p;
    }),
  };
}

export function mergeOwnWallFields(
  projected: MultiCamVenueResult,
  own: { walls: Wall[] },
): MultiCamVenueResult {
  const mine = new Map((own.walls ?? []).map((w) => [w.id, w]));
  return {
    ...projected,
    walls: projected.walls.map((w) => {
      const o = mine.get(w.id);
      if (!o) return w;
      return {
        ...w,
        ...(o.pattern !== undefined ? { pattern: o.pattern } : {}),
        ...(o.patternImage !== undefined ? { patternImage: o.patternImage } : {}),
        ...(o.patternFit !== undefined ? { patternFit: o.patternFit } : {}),
        ...(o.patternRows !== undefined ? { patternRows: o.patternRows } : {}),
        // `color` traegt das Austauschformat jetzt selbst; die Projektion
        // gewinnt also, sonst kaeme eine vom Nachbarn geaenderte Farbe nie an.
      };
    }),
  };
}
