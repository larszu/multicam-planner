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
  mount: string; // B4, EF, E, PL, MFT, M12, integrated
  adaptedMounts?: string[]; // mounts usable via adapter (e.g. B4 via LAFZ-B1 on FZ-mount)
  resolutions: string[];
  type: 'broadcast' | 'cinema' | 'ptz' | 'mirrorless' | 'camcorder' | 'eng';
  notes?: string;
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

// ── Placed camera in the venue ──
export interface VenueCamera {
  id: string;
  label: string; // CAM 1, CAM 2 …
  cameraId: string;
  lensId: string;
  x: number; // metres from left
  y: number; // metres from top (2D)
  z: number; // height in metres
  rotation: number; // degrees, 0 = pointing right
  focalLength: number; // current focal length in mm
  aperture: number; // current f-stop
  focusDistance: number; // metres
  color: string;
  extenderActive: number; // 1 = none, 1.5, 2
}

// ── Stage / target zone ──
export interface Stage {
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
