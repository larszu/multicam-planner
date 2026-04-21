// Lighting domain types – ported & simplified from light-planner
// Kept lean intentionally: this is a quick sketch tool, not Vectorworks.

export type FixtureCategory =
  | 'profile'        // Profile / Ellipsoidal (ETC Source Four)
  | 'fresnel'        // Stufenlinsenscheinwerfer
  | 'par'            // PAR
  | 'wash'           // LED-Wash / Flächenlicht
  | 'spot'           // LED-Spot
  | 'moving-wash'    // Moving Head Wash
  | 'moving-spot'    // Moving Head Spot
  | 'moving-beam'    // Moving Head Beam
  | 'blinder'        // Blinder / Strobe
  | 'cyc'            // Horizontleuchte
  | 'flood'          // Fluter
  | 'followspot'     // Verfolger
  | 'led-panel'      // Panel (Aputure, ARRI Skypanel)
  | 'custom';

export type BeamShape = 'circular' | 'elliptical' | 'linear' | 'rectangular';

export interface PhotometricData {
  /** Measured illuminance in lux */
  lux: number;
  /** Distance at which measured in metres */
  distance: number;
  /** Beam angle at which measured (for zooms) */
  beamAngle?: number;
  /** CCT at which measured */
  colorTemp?: number;
}

export interface Fixture {
  id: string;
  name: string;
  manufacturer: string;
  category: FixtureCategory;
  wattage: number;
  lumens?: number;
  photometric?: PhotometricData;
  /** 50 % beam angle in degrees */
  beamAngle: number;
  /** 10 % field angle in degrees */
  fieldAngle: number;
  beamShape: BeamShape;
  /** width / height ratio for elliptical beams */
  beamRatioWH: number;
  /** Min/max beam angle in degrees if zoom */
  zoomRange?: [number, number];
  /** Bi-color / tunable white range */
  colorTempRange?: [number, number];
  /** Single CCT in K, or 0 for full RGB */
  colorTemp: number;
  cri?: number;
  weight?: number;
  dmxChannels?: number;
  isCustom?: boolean;
}

export interface PlacedFixture {
  id: string;
  fixtureId: string;
  /** Plan x in metres */
  x: number;
  /** Plan y (depth) in metres */
  y: number;
  /** Mounting height above floor in metres */
  z: number;
  /** Aim point on floor in metres */
  aimX: number;
  aimY: number;
  /** Housing rotation in degrees – orients elliptical beam */
  bodyRotation: number;
  /** 0–100 % */
  dimming: number;
  /** Current beam angle (zoom override) */
  currentBeamAngle?: number;
  /** Current CCT for tunable white */
  currentColorTemp?: number;
  /** Gel filter ids from gel library */
  gelFilterIds?: string[];
  /** Free-text label (optional) */
  label?: string;
}

export interface FixtureGroup {
  id: string;
  label: string;
  fixtureIds: string[];
}

export type GelType = 'CTO' | 'CTB' | 'frost' | 'diffusion' | 'color';

export interface GelFilter {
  id: string;
  name: string;
  brand: 'LEE' | 'Rosco';
  code: string;
  type: GelType;
  /** 0..1 – fraction of light passed through */
  transmissionFactor: number;
  miredShift?: number;
  /** 0..1 diffusion strength */
  diffusionLevel?: number;
  /** Hex color for visual preview */
  displayColor?: string;
}

export type AppMode = 'camera' | 'lighting';
