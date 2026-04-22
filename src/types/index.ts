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
  manufacturer: string;
  model: string;
  sensor: SensorSize;
  mount: string; // B4, EF, E, PL, MFT, M12, FZ, integrated
  adaptedMounts?: string[]; // mounts usable via adapter (e.g. B4 via LAFZ-B1 on FZ-mount)
  resolutions: string[];
  type: 'broadcast' | 'cinema' | 'ptz' | 'mirrorless' | 'camcorder' | 'eng';
  notes?: string;
}

// ── Adapter result ──
export interface AdapterInfo {
  id: string; // stable id for manual selection (e.g. 'ef-e-smart-v')
  name: string;
  lightLossStops: number; // T-stop loss (0 = no loss, 1 = ~1 stop, negative = gain)
  cropSensor?: SensorSize; // forced sensor crop (e.g. 2/3" when using B4 adapter)
  cameraMounts?: string[]; // camera mounts this adapter fits; omitted = any
  requiresSensorMode?: 'S35'; // only applicable when camera is set to that sensor mode
  isSpeedBooster?: boolean;
  /** Focal reduction factor for speed boosters (e.g. 0.71). Image circle shrinks by the same factor. */
  speedBoosterFactor?: number;
}

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
  /** Image circle the lens actually projects. If omitted, inferred from mount. */
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

// ── Camera mount/support type ──
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
 * Physically realistic vertical movement range (in meters) for each mount type.
 * `min`/`max` = absolute camera height above ground.
 * `pump` = how quickly the operator can change height while "live" (m/s) — used for live-motion preview.
 * `track` = optional horizontal travel along the dolly/jib arm (radius in meters).
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

/**
 * Resolve the *live* camera position including any track offset.
 * The offset is applied perpendicular-left to the pan direction (positive = camera-right swing).
 */
export function getLiveCameraPosition(cam: { x: number; y: number; z: number; pan: number; trackOffset?: number }): { x: number; y: number; z: number } {
  const t = cam.trackOffset ?? 0;
  if (!t) return { x: cam.x, y: cam.y, z: cam.z };
  const panRad = (cam.pan * Math.PI) / 180;
  // +trackOffset moves camera along its left-right axis (perpendicular to look dir)
  const dx = Math.cos(panRad) * t;
  const dy = Math.sin(panRad) * t;
  return { x: cam.x + dx, y: cam.y + dy, z: cam.z };
}

// ── Venue wall ──
export interface Wall {
  id: string;
  x1: number; y1: number; // start point in metres
  x2: number; y2: number; // end point in metres
  height: number; // metres
  label: string;
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
  useSpeedbooster?: boolean; // legacy EF Speedbooster toggle (still honoured when adapterId is absent)
  adapterId?: string; // explicit adapter override; undefined = auto pick best
  mountType?: CameraMountType;
  /** Persistent override of preview mouse direction. Defaults to natural. */
  invertPreview?: boolean;
  /** If set, the preview keeps the focus distance locked to this person. */
  lockedPersonId?: string;
  /** If set, keeps the distance-to-target constant when dollying (pan/tilt unchanged). */
  lockedDistance?: number;
  /** Live-motion track position for dolly/jib/pedestal (meters along arm/track). */
  trackOffset?: number;
}

// ── Stage / target zone ──
export interface Stage {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
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
  /** Lighting module */
  placedFixtures?: import('./lighting').PlacedFixture[];
  customFixtures?: import('./lighting').Fixture[];
  fixtureGroups?: import('./lighting').FixtureGroup[];
}
