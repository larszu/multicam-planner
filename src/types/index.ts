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
  name: string;
  lightLossStops: number; // T-stop loss (0 = no loss, 1 = ~1 stop)
  cropSensor?: SensorSize; // forced sensor crop (e.g. 2/3" when using B4 adapter)
}

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
  extenderFactors?: number[];
  type: 'zoom' | 'prime' | 'integrated';
  notes?: string;
}

// ── Reference person / object in venue ──
export interface ReferencePerson {
  id: string;
  x: number; // metres from left
  y: number; // metres from top
  height: number; // metres
  label: string;
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
  useSpeedbooster?: boolean; // EF Speedbooster on MFT cameras
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
}
