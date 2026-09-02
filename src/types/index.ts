// ── Sensor ──
export interface SensorSize {
  name: string;
  widthMm: number;
  heightMm: number;
  cropFactor: number;
}

// ── Camera ──
export interface Camera {
  id: string;
  /**
   * Stabile geraeteuebergreifende Typ-Identitaet (GUID, GDTF/DIN-SPEC-15800-
   * analog: FixtureTypeID). Optional — gesetzt fuer Modelle, deren echte I/O im
   * Cable-Planner-Katalog hinterlegt ist. Beim Export (cameraExport) wird sie in
   * die camera-list geschrieben, sodass der Cable-Planner die Kamera AUTORITATIV
   * auf ihr Datenblatt/ihre Ports aufloest, statt ueber den Modellnamen zu raten.
   * Dieselben GUIDs stehen in cable-planner src/renderer/lib/cameraCatalog.ts.
   */
  deviceTypeId?: string;
  manufacturer: string;
  model: string;
  sensor: SensorSize;
  mount: string; // B4, EF, E, PL, MFT, M12, FZ, integrated
  adaptedMounts?: string[]; // mounts usable via adapter (e.g. B4 via LAFZ-B1 on FZ-mount)
  resolutions: string[];
  type: 'broadcast' | 'cinema' | 'ptz' | 'mirrorless' | 'camcorder' | 'eng';
  notes?: string;
  /**
   * Optional list of selectable sensor crop modes the body can run in. The first
   * entry is treated as the default and is interchangeable with `sensor`. Use this
   * for cameras with hardware crop modes that aren't determined by the lens (e.g.
   * URSA Broadcast B4 crop, VENICE 2 6K/4K windows, FX9 Super35 crop).
   */
  sensorModes?: SensorSize[];
  /**
   * Per-mount adapter metadata for the body's swappable mount plates. Keyed by
   * mount name (matching `mount` or any entry in `adaptedMounts`). When the user
   * sets `VenueCamera.activeMount` to one of these, the adapter is automatically
   * applied to FOV / DoF / aperture calculations and the badge displays its
   * name + notes.
   *
   * Use this for adapters with real optical impact (relay/crop/light loss like
   * Sony LA-FZB1 for FZ→B4, or the URSA Broadcast G2's built-in 2/3" relay on
   * the B4 mount). Passive mount plates can also be listed here for clarity —
   * the badge will show the adapter name with 0 stops loss and no crop.
   */
  mountAdapters?: Record<string, AdapterInfo>;
}

// ── Adapter result ──
export interface AdapterInfo {
  name: string;
  lightLossStops: number; // T-stop loss (0 = no loss, 1 = ~1 stop)
  cropSensor?: SensorSize; // forced sensor crop (e.g. 2/3" when using B4 adapter)
  /** Free-form background info displayed in the camera card when the adapter is active. */
  notes?: string;
}

// ── Lens image circle ──
// Format the lens actually projects (independent of its mount). E.g. an EF-S
// lens reports `mount: 'EF'` but only fills an APS-C circle. Used by the
// coverage check so an EF-S lens on a 5D body flags as vignetting even
// though the mount fits.
export type LensImageCircle = 'FF' | 'S35' | 'APSC' | 'MFT' | '2/3' | '1' | 'integrated';

// ── Lens ──
export interface Lens {
  id: string;
  manufacturer: string;
  model: string;
  focalLengthMin: number; // mm
  focalLengthMax: number; // mm (same as min for primes)
  maxApertureWide: number;
  maxApertureTele?: number;
  mount: string;
  /** Image circle actually projected by the lens. Falls back to a per-mount
   * heuristic when omitted. Set explicitly for crop lenses on full-frame
   * mounts (Sigma DC, Tamron Di III-A, Canon EF-S, Sony E APS-C). */
  imageCircle?: LensImageCircle;
  extenderFactors?: number[];
  type: 'zoom' | 'prime' | 'integrated';
  isCustom?: boolean;
  notes?: string;
}

// ── Object type presets ──
export type StageObjectType =
  | 'person' | 'person-guitar' | 'sitting-person' | 'drums' | 'keys'
  | 'mic-stand' | 'chair' | 'table' | 'lectern' | 'schneetiger' | 'custom';

// ── Camera mount / support type (physical rig) ──
// Re-introduced from the older dev tree because each mount imposes a real
// height range and (for jib / dolly) a track length used by the live track
// slider. Without it Z is unconstrained, which is fine for typing but loses
// the "this rig physically can't go that high" check.
export type CameraMountType =
  | 'tripod' | 'hihat' | 'pedestal' | 'jib' | 'technocrane' | 'dolly' | 'slider'
  | 'cablecam' | 'drone' | 'scissorlift' | 'remotehead' | 'carmount' | 'rickshaw'
  | 'gimbal' | 'handheld' | 'steadicam' | 'fixed';

export const MOUNT_TYPE_LABELS: Record<CameraMountType, string> = {
  tripod: 'Stativ',
  hihat: 'Hi-Hat / Bodenstativ',
  pedestal: 'Studio Pedestal',
  jib: 'Jib / Kran',
  technocrane: 'Technocrane (teleskopierend)',
  dolly: 'Dolly (Schiene)',
  slider: 'Slider',
  cablecam: 'Cable-Cam / Spidercam',
  drone: 'Drohne',
  scissorlift: 'Scherenbuehne / Hebebuehne',
  remotehead: 'Remote-Head',
  carmount: 'Fahrzeug-Montage',
  rickshaw: 'Rickshaw / Kamerawagen',
  gimbal: 'Gimbal',
  handheld: 'Handheld',
  steadicam: 'Steadicam',
  fixed: 'Feste Montage',
};

/**
 * Per-mount-type ergonomic ranges in metres. `pump` is the recommended single
 * height-slider step (column pump for pedestal, jib lift step, etc.). `track`
 * is the maximum live-motion travel along the rig (used by the dolly travel
 * and jib swing sliders); undefined for static rigs.
 */
export const MOUNT_HEIGHT_RANGE: Record<CameraMountType, { min: number; max: number; pump: number; track?: number }> = {
  tripod:    { min: 0.5, max: 2.2, pump: 0.05 },
  // Hi-Hat: Kamera fast auf dem Boden, kaum Hoehenspiel.
  hihat:     { min: 0.1, max: 0.5, pump: 0.05 },
  pedestal:  { min: 0.6, max: 1.8, pump: 0.4 },
  jib:       { min: 0.3, max: 6.0, pump: 1.5, track: 3.5 },
  // Techno 22 als gaengiger Vertreter: 24' (7.3 m) Objektivhoehe ueberschlaegig,
  // 15'6" (4.7 m) Teleskopweg. Der Arm faehrt teleskopierend ein/aus, statt nur
  // zu schwenken — darum deutlich mehr Track als ein klassischer Jib.
  technocrane: { min: 0.5, max: 7.3, pump: 1.5, track: 4.7 },
  dolly:     { min: 0.4, max: 1.9, pump: 0.1, track: 6.0 },
  // Slider: kurzer Weg, dafuer sehr feine Kontrolle.
  slider:    { min: 0.2, max: 2.0, pump: 0.05, track: 1.2 },
  // Cable-Cam haengt in Seilen — grosser Hoehenbereich, sehr weiter Weg.
  cablecam:  { min: 2.0, max: 40.0, pump: 2.0, track: 80.0 },
  drone:     { min: 0.5, max: 120.0, pump: 5.0, track: 100.0 },
  scissorlift: { min: 1.2, max: 12.0, pump: 1.0 },
  // Remote-Head sitzt auf einem anderen Rig; eigener Hoehenbereich bleibt klein.
  remotehead: { min: 0.3, max: 3.0, pump: 0.2 },
  carmount:  { min: 0.3, max: 2.5, pump: 0.2, track: 50.0 },
  rickshaw:  { min: 0.8, max: 2.0, pump: 0.2, track: 30.0 },
  gimbal:    { min: 0.8, max: 1.9, pump: 0.6 },
  handheld:  { min: 1.0, max: 1.9, pump: 0.8 },
  steadicam: { min: 0.3, max: 2.0, pump: 0.5 },
  fixed:     { min: 0.0, max: 12.0, pump: 0.0 },
};


// ── Venue wall ──
// `pattern` controls the wall surface texture in the camera preview so an
// operator can judge focus/blur against a known motif (issue #45).
export type WallPattern = 'solid' | 'grid' | 'flowers' | 'image';

export interface Wall {
  id: string;
  x1: number; y1: number; // start point in metres
  x2: number; y2: number; // end point in metres
  height: number; // metres
  label: string;
  /** Base surface colour (hex). Falls back to a neutral grey when unset. */
  color?: string;
  /** Surface pattern for blur-checking in the preview. Defaults to 'solid'. */
  pattern?: WallPattern;
  /** Data URL of a custom image, tiled across the wall when pattern === 'image'. */
  patternImage?: string;
  /**
   * Wie das Muster auf die Wand gelegt wird (#74). Ohne Angabe: gekachelt.
   * Frueher wurde das Muster im Bildschirmraum gemalt — dadurch aenderte sich
   * die Anzahl mit dem Zoom und ein Bild klebte am Bildschirm statt an der
   * Wand ("die Wand ist ein Loch fuer das Bild dahinter").
   */
  patternFit?: WallFit;
  /**
   * Wiederholungen ueber die WANDHOEHE (#74) — "wie viele Blumen in der Hoehe".
   * Die Anzahl in der Breite ergibt sich daraus, damit Kacheln nicht verzerren.
   * Gilt fuer `tile`; bei den anderen Modi bestimmt sie die Wiederholung
   * quer zur skalierten Achse. Default: 6.
   */
  patternRows?: number;
}

/**
 * Auflegen des Musters auf die Wandflaeche (#74):
 *   tile     — feste Anzahl Kacheln, Seitenverhaeltnis bleibt erhalten
 *   scale-v  — Bildhoehe = Wandhoehe, waagerecht wiederholt
 *   scale-h  — Bildbreite = Wandlaenge, senkrecht wiederholt
 *   stretch  — ein Bild ueber die ganze Wand, Seitenverhaeltnis egal
 */
export type WallFit = 'tile' | 'scale-v' | 'scale-h' | 'stretch';

// ── Reference person / object in venue ──
export interface ReferencePerson {
  id: string;
  x: number; // metres from left
  y: number; // metres from top
  height: number; // metres
  width: number; // metres (footprint width)
  label: string;
  objectType: StageObjectType;
  /** Optional custom accent colour (hex). Falls back to type default. */
  color?: string;
  /** When true, the object can't be dragged in the 2D/3D plan. */
  locked?: boolean;
}

// ── Background floor plan ──
export interface BackgroundPlan {
  dataUrl: string;
  scaleX: number; // metres per image pixel (horizontal)
  scaleY: number; // metres per image pixel (vertical)
  offsetX: number; // metres
  offsetY: number; // metres
  opacity: number; // 0-1
  widthPx: number;
  heightPx: number;
}

// ── Placed camera in the venue ──
export interface VenueCamera {
  id: string;
  label: string; // CAM 1, CAM 2 …
  cameraId: string;
  lensId: string;
  x: number; // metres from left
  y: number; // metres from top (2D)
  z: number; // height in metres
  pan: number; // degrees, 0 = pointing right (horizontal rotation)
  tilt: number; // degrees, 0 = level, negative = looking down
  focalLength: number; // current focal length in mm
  aperture: number; // current f-stop
  focusDistance: number; // metres
  color: string;
  extenderActive: number; // 1 = none, 1.5, 2
  useSpeedbooster?: boolean; // opt-in focal reducer (EF/NF → MFT/FZ/E/X), see SPEED_BOOSTERS
  /**
   * Index into `Camera.sensorModes` selecting a hardware crop mode. Undefined or
   * out-of-range falls back to the camera's default sensor.
   */
  sensorModeIndex?: number;
  /**
   * Currently mounted lens mount on a swappable-mount body (e.g. URSA Broadcast
   * G2 can swap between B4 / EF / PL mount plates). Defaults to the camera's
   * native `mount` when undefined. Must be either `camera.mount` or one of
   * `camera.adaptedMounts`.
   */
  activeMount?: string;
  /**
   * Physical rig the camera is mounted on. Determines the Z (height) slider
   * range via `MOUNT_HEIGHT_RANGE` and whether the live track slider is shown
   * (jib swing, dolly travel).
   */
  mountType?: CameraMountType;
  /**
   * Konkretes Rig aus dem Katalog (`data/rigs.ts`) — z. B. ein 18-ft-Jimmy-Jib
   * statt nur "Jib". Setzt Hoehenbereich und Fahrweg auf die echten Maße des
   * Geraets. Ohne Angabe gelten die Kategorie-Defaults aus MOUNT_HEIGHT_RANGE.
   */
  rigId?: string;
  /**
   * Gelegte Schienenlaenge in Metern (Dolly/Slider). Ueberschreibt den Vorschlag
   * des Rigs — die Strecke wird aus Sektionen (4/8/10 ft) gelegt und ist damit
   * pro Aufbau anders lang.
   */
  trackLengthM?: number;
  /**
   * Preview drag-direction overrides. Persisted per camera so an operator with
   * a preferred swing direction keeps it across sessions.
   * `invertPreviewH` flips the pan direction, `invertPreviewV` flips tilt.
   */
  invertPreviewH?: boolean;
  invertPreviewV?: boolean;
  /**
   * Focus lock: when set, the preview keeps the focus distance pinned to the
   * named ReferencePerson. Re-pans and re-tilts but the distance follows the
   * subject automatically.
   */
  lockedPersonId?: string;
  /**
   * Distance lock: when set, the camera holds this exact subject distance while
   * dollying — moving the camera adjusts pan/tilt to keep the same target in
   * focus. Independent of `lockedPersonId` (a fixed distance, not a fixed
   * subject).
   */
  lockedDistance?: number;
  /**
   * Live-motion offset for jib swing or dolly travel (metres along the rig's
   * `track`). 0 = parked, positive = travelled. Renders as a coloured arc /
   * line in the 2D plan so the operator can see the swept area.
   */
  trackOffset?: number;
  /**
   * Ausrichtung des Rigs im Raum (Grad, gleiche Konvention wie `pan`).
   * Eine gelegte Schiene, ein Kran-Chassis oder die Beinstellung eines Stativs
   * bleiben stehen, waehrend die Kamera darauf schwenkt — darum ist das ein
   * eigener Winkel und kein Offset auf `pan`.
   *
   * Ohne Angabe folgt das Rig dem Pan der Kamera (Verhalten vor #71 und
   * sinnvoller Default: Stativ wird eben so hingestellt, wie man schaut).
   * `rigYaw()` in `utils/camera.ts` loest das auf; der Fahrweg laeuft immer
   * entlang dieser Achse, nicht entlang der Blickrichtung.
   */
  rigRotation?: number;
  /**
   * Free-form notes for this camera placement (mount, operator, instructions,
   * shot list, etc.). Shown in the sidebar and included in PNG exports when set.
   */
  notes?: string;
  /** When true, the camera marker can't be dragged in the 2D plan. */
  locked?: boolean;
}

// ── Stage / target zone ──
export interface Stage {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  /** When true, the stage can't be dragged or resized in the 2D plan. */
  locked?: boolean;
  /**
   * Podesthoehe ueber dem Boden (m) — macht aus der Flaeche einen Koerper
   * (#73). `width`/`height` sind die Grundflaeche, deshalb der eigene Name.
   * Ohne Angabe: flach (0.1 m Andeutung wie bisher).
   */
  elevationM?: number;
  /** Farbe des Podests (Hex). Ohne Angabe das bisherige Blau. */
  color?: string;
  /** Deckkraft 0..1. Ohne Angabe 0.4 wie bisher. */
  opacity?: number;
}

// ── Venue ──
export interface Venue {
  name: string;
  widthM: number;
  heightM: number; // depth
  stages: Stage[];
}

// ── Template ──
export interface VenueTemplate {
  id: string;
  name: string;
  category: 'sport' | 'concert' | 'church' | 'conference' | 'custom';
  venue: Venue;
  cameras: Omit<VenueCamera, 'id'>[];
}

// ── FOV result ──
export interface FovResult {
  horizontalDeg: number;
  verticalDeg: number;
  diagonalDeg: number;
  imageWidthAtDistance: number; // metres
  imageHeightAtDistance: number;
  equivalentFocalLength: number;
}

// ── DoF result ──
export interface DofResult {
  nearLimit: number;
  farLimit: number;
  totalDof: number;
  hyperfocal: number;
  circleOfConfusion: number;
}

// ── Tab views ──
export type ViewTab = '2d' | '3d' | 'preview' | 'calculator' | 'shotlist';

// ── Shotlist / Storyboard (#62 Punkt 5) ──
// Ein Preset ist ein einzelner Kamera-Zustand; ein Shot ist derselbe Zustand,
// aber benannt, bebildert (Framegrab) und Teil einer geordneten Sequenz. Die
// Shotlist faehrt die Shots der Reihe nach an — mit derselben Transition-Engine
// wie die Presets (#62 Punkt 4) — und laesst sich als Storyboard exportieren.

/** Eingefrorener Kamera-Zustand eines Shots (die Preset-Parameter aus Punkt 3). */
export interface ShotState {
  x: number;
  y: number;
  z: number;
  pan: number;
  tilt: number;
  focalLength: number;
  aperture: number;
  focusDistance: number;
  trackOffset: number;
}

/** Wie ein Shot angefahren wird. `off` springt hart. */
export type ShotTransition = 'off' | 'fast' | 'slow' | 'manual';

export interface Shot {
  id: string;
  /** Freier Name, z. B. "WS Buehne", "CU Saenger". */
  name: string;
  /** Auf welche VenueCamera sich der Shot bezieht (`VenueCamera.id`). */
  cameraId: string;
  state: ShotState;
  transition: ShotTransition;
  /** Nur bei `transition === 'manual'` relevant. */
  transitionSeconds?: number;
  /**
   * Bewegungsstil beim Anfahren. Ohne Angabe gilt der Stil der Montage, auf der
   * die Kamera steht (`VenueCamera.mountType`) — das ist der Normalfall. Explizit
   * gesetzt laesst sich ein Shot abweichend fahren, z. B. eine Stativ-Kamera
   * bewusst „wie ein Dolly" traege anlaufen lassen.
   */
  motionStyle?: CameraMountType;
  /** Framegrab als data-URL. Klein gehalten (JPEG), damit localStorage reicht. */
  thumbnail?: string;
  /** Regie-/Kamera-Notiz. */
  note?: string;
}

export interface Shotlist {
  id: string;
  name: string;
  shots: Shot[];
}

// ── Aufgezeichnete Rig-Fahrt ("Take") ──
// Ein Shot ist EIN Zustand und wird angefahren; ein Take ist die ganze
// Bewegung, so wie sie am Pult gefahren wurde — inklusive Zoegern,
// Nachfuehren und gleichzeitiger Achsen. Damit lassen sich Fahrten
// wiedergeben, statt sie nur zwischen zwei Punkten zu interpolieren.

/** Ein abgetasteter Moment der Fahrt. `t` = Sekunden seit Aufnahmebeginn. */
export interface TakeSample {
  t: number;
  state: ShotState;
  /** Ausrichtung des Rigs zu diesem Zeitpunkt (nur wenn eigenstaendig). */
  rigRotation?: number;
}

export interface RigTake {
  id: string;
  name: string;
  /** Kamera, mit der aufgezeichnet wurde (`VenueCamera.id`). */
  cameraId: string;
  /** Montage zum Aufnahmezeitpunkt — fuer die Anzeige, nicht fuer Wiedergabe. */
  mountType?: CameraMountType;
  samples: TakeSample[];
  createdAt: number;
}

// ── Edit mode (issue #43) ──
// A top-bar slider restricts editing to one category at a time so a plan can be
// built up step by step. `all` respects each object's own lock flag instead.
export type EditMode = 'all' | 'floorplan' | 'stage' | 'objects' | 'cameras';

// ── Saved project ──
export interface ProjectFile {
  formatVersion: 1;
  appVersion: string;
  projectVersion: number; // auto-incremented on changes
  savedAt: string; // ISO date
  venue: Venue;
  cameras: VenueCamera[];
  persons: ReferencePerson[];
  backgroundPlan: BackgroundPlan | null;
  walls?: Wall[];
  /**
   * ADR-005 — Fremde .avplan-Domaenen (lighting/cabling), die MultiCam nicht
   * bearbeitet. Sie gehoeren in die Projektdatei, nicht nur in den Store:
   * lagen sie nur im Speicher, war jedes Speichern-und-neu-Oeffnen zwischen
   * Import und Export ein vollstaendiger Verlust des Licht- und Kabelplans.
   * Opak durchgereicht, nie interpretiert.
   */
  avForeign?: { lighting?: unknown; cabling?: unknown };
  /**
   * ADR-005 — Buehnen-Felder aus einem eingelesenen Raum, die MultiCam nicht
   * modelliert (Podest-Hoehe, Drehung, Polygon-Umriss), je Buehnen-Id.
   *
   * Gehoert aus demselben Grund in die Datei wie `avForeign`: laege es nur im
   * Speicher, waere jedes Speichern-und-neu-Oeffnen zwischen Import und Export
   * genau der Verlust, den das Feld verhindern soll.
   */
  stageForeign?: Record<string, import('../utils/venueExchange').ForeignStageFields>;
  /**
   * ADR-005 — Gebaeudeplan-Felder aus einem eingelesenen Raum, die MultiCam
   * nicht modelliert (Name, Sperre, PDF-Herkunft, Seitenzahl). Ohne sie kam
   * ein uebernommener PDF-Grundriss als namenloses Bild ohne Seitenbezug
   * zurueck. Gehoert aus demselben Grund in die Datei wie `stageForeign`.
   */
  floorPlanForeign?: import('../utils/venueExchange').ForeignFloorPlanFields;
  /**
   * ADR-005 — Wand-Felder aus einem eingelesenen Raum, die MultiCam nicht
   * modelliert (Kruemmung, Reflexionsgrad), je Wand-Id.
   */
  wallForeign?: Record<string, import('../utils/venueExchange').ForeignWallFields>;
  /**
   * ADR-005 — Personen-Felder aus einem eingelesenen Raum, die MultiCam nicht
   * modelliert (Pose, Blickrichtung), je Personen-Id.
   */
  personForeign?: Record<string, import('../utils/venueExchange').ForeignPersonFields>;
}
