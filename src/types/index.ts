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
export type CameraMountType = 'tripod' | 'pedestal' | 'jib' | 'dolly' | 'gimbal' | 'handheld' | 'steadicam' | 'fixed';

export const MOUNT_TYPE_LABELS: Record<CameraMountType, string> = {
  tripod: 'Stativ',
  pedestal: 'Studio Pedestal',
  jib: 'Jib / Crane',
  dolly: 'Dolly',
  gimbal: 'Gimbal',
  handheld: 'Handheld',
  steadicam: 'Steadicam',
  fixed: 'Fixed Mount',
};

/**
 * Per-mount-type ergonomic ranges in metres. `pump` is the recommended single
 * height-slider step (column pump for pedestal, jib lift step, etc.). `track`
 * is the maximum live-motion travel along the rig (used by the dolly travel
 * and jib swing sliders); undefined for static rigs.
 */
export const MOUNT_HEIGHT_RANGE: Record<CameraMountType, { min: number; max: number; pump: number; track?: number }> = {
  tripod:    { min: 0.5, max: 2.2, pump: 0.05 },
  pedestal:  { min: 0.6, max: 1.8, pump: 0.4 },
  jib:       { min: 0.3, max: 6.0, pump: 1.5, track: 3.5 },
  dolly:     { min: 0.4, max: 1.9, pump: 0.1, track: 6.0 },
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
}

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
export type ViewTab = '2d' | '3d' | 'preview' | 'calculator';

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
}
