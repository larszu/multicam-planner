import type { Camera, SensorSize, AdapterInfo, Lens } from '../types';

// ── Standard sensor sizes ──
export const SENSORS: Record<string, SensorSize> = {
  FF:        { name: 'Full Frame (36×24)',     widthMm: 36,    heightMm: 24,    cropFactor: 1.0 },
  S35:       { name: 'Super 35 (24.6×13.8)',   widthMm: 24.6,  heightMm: 13.8,  cropFactor: 1.46 },
  APSC:      { name: 'APS-C (23.5×15.6)',      widthMm: 23.5,  heightMm: 15.6,  cropFactor: 1.53 },
  MFT:       { name: 'Micro Four Thirds',      widthMm: 17.3,  heightMm: 13,    cropFactor: 2.0 },
  ONE_INCH:  { name: '1" (13.2×8.8)',          widthMm: 13.2,  heightMm: 8.8,   cropFactor: 2.73 },
  TWO_THIRD: { name: '2/3" (9.6×5.4)',         widthMm: 9.6,   heightMm: 5.4,   cropFactor: 3.93 },
  HALF_INCH: { name: '1/2" (6.4×4.8)',         widthMm: 6.4,   heightMm: 4.8,   cropFactor: 5.63 },
  THIRD_INCH:{ name: '1/3" (4.8×3.6)',         widthMm: 4.8,   heightMm: 3.6,   cropFactor: 7.5 },
  QUARTER:   { name: '1/2.3" (6.17×4.55)',     widthMm: 6.17,  heightMm: 4.55,  cropFactor: 5.64 },
};

export const CAMERAS: Camera[] = [
  // ── Sony Broadcast / Cinema ──
  { id: 'sony-hdc-3500', manufacturer: 'Sony', model: 'HDC-3500', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'sony-hdc-5500', manufacturer: 'Sony', model: 'HDC-5500', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'sony-hdc-f5500', manufacturer: 'Sony', model: 'HDC-F5500', sensor: SENSORS.S35, mount: 'PL', resolutions: ['4K', 'HD'], type: 'broadcast', notes: 'Super 35mm broadcast camera' },
  { id: 'sony-venice', manufacturer: 'Sony', model: 'VENICE', sensor: SENSORS.FF, mount: 'PL', adaptedMounts: ['E'], resolutions: ['6K', '4K', 'HD'], type: 'cinema', notes: 'Full-frame CineAlta, PL native, E-mount via supplied adapter' },
  { id: 'sony-venice2', manufacturer: 'Sony', model: 'VENICE 2', sensor: { name: 'FF 8.6K (36.2×24.1)', widthMm: 36.2, heightMm: 24.1, cropFactor: 0.99 }, mount: 'PL', adaptedMounts: ['E'], resolutions: ['8.6K', '6K', '4K', 'HD'], type: 'cinema', notes: 'Dual base ISO 800/3200, PL native, E-mount adapter', sensorModes: [
    { name: 'FF 8.6K (36.2×24.1)', widthMm: 36.2, heightMm: 24.1, cropFactor: 0.99 },
    { name: 'FF 6K 3:2 (35.9×24.0)', widthMm: 35.9, heightMm: 24.0, cropFactor: 1.0 },
    { name: 'S35 5.8K (24.8×13.1)', widthMm: 24.8, heightMm: 13.1, cropFactor: 1.46 },
    { name: 'S35 4K 4:3 (19.0×14.2)', widthMm: 19.0, heightMm: 14.2, cropFactor: 1.89 },
  ] },
  { id: 'sony-pmw-f5', manufacturer: 'Sony', model: 'PMW-F5', sensor: SENSORS.S35, mount: 'FZ', adaptedMounts: ['PL', 'B4'], resolutions: ['4K', '2K', 'HD'], type: 'cinema', notes: 'FZ-mount native, PL via adapter, B4 via Sony LA-FZB1 (LAFZ-B1)' },
  { id: 'sony-pmw-f55', manufacturer: 'Sony', model: 'PMW-F55', sensor: SENSORS.S35, mount: 'FZ', adaptedMounts: ['PL', 'B4'], resolutions: ['4K', '2K', 'HD'], type: 'cinema', notes: 'FZ-mount native, PL via adapter, B4 via Sony LA-FZB1 (LAFZ-B1) with crop to 2/3" area' },
  { id: 'sony-fx6', manufacturer: 'Sony', model: 'FX6', sensor: SENSORS.FF, mount: 'E', resolutions: ['4K', 'HD'], type: 'cinema' },
  { id: 'sony-fx3', manufacturer: 'Sony', model: 'FX3', sensor: SENSORS.FF, mount: 'E', resolutions: ['4K', 'HD'], type: 'cinema' },
  { id: 'sony-fx9', manufacturer: 'Sony', model: 'PXW-FX9', sensor: SENSORS.FF, mount: 'E', resolutions: ['6K', '4K', 'HD'], type: 'cinema', sensorModes: [
    { name: 'Full Frame (35.7×18.8)', widthMm: 35.7, heightMm: 18.8, cropFactor: 1.0 },
    { name: 'Super 35 crop (23.6×12.4)', widthMm: 23.6, heightMm: 12.4, cropFactor: 1.51 },
  ] },
  { id: 'sony-fs7ii', manufacturer: 'Sony', model: 'PXW-FS7 II', sensor: SENSORS.S35, mount: 'E', resolutions: ['4K', 'HD'], type: 'cinema' },
  { id: 'sony-a7siii', manufacturer: 'Sony', model: 'A7S III', sensor: SENSORS.FF, mount: 'E', resolutions: ['4K', 'HD'], type: 'mirrorless' },
  { id: 'sony-a7iv', manufacturer: 'Sony', model: 'A7 IV', sensor: SENSORS.FF, mount: 'E', resolutions: ['4K', 'HD'], type: 'mirrorless' },
  { id: 'sony-fr7', manufacturer: 'Sony', model: 'FR7', sensor: SENSORS.FF, mount: 'E', resolutions: ['4K', 'HD'], type: 'ptz', notes: 'Full-frame PTZ cinema camera' },

  // ── Sony ENG Camcorder ──
  { id: 'sony-pdw-700', manufacturer: 'Sony', model: 'PDW-700', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'eng', notes: 'XDCAM HD422, 2/3" 3-CCD' },
  { id: 'sony-pdw-850', manufacturer: 'Sony', model: 'PDW-850', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'eng', notes: 'XDCAM HD422, shoulder camcorder' },
  { id: 'sony-pdw-f800', manufacturer: 'Sony', model: 'PDW-F800', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'eng', notes: 'XDCAM HD422, 3-CCD' },
  { id: 'sony-hdc-4300', manufacturer: 'Sony', model: 'HDC-4300', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast', notes: '4K 3-CMOS system camera' },

  // ── Sony PTZ ──
  { id: 'sony-brc-x400', manufacturer: 'Sony', model: 'BRC-X400', sensor: SENSORS.HALF_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'sony-srg-x120', manufacturer: 'Sony', model: 'SRG-X120', sensor: SENSORS.HALF_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'sony-brc-h800', manufacturer: 'Sony', model: 'BRC-H800', sensor: SENSORS.HALF_INCH, mount: 'integrated', resolutions: ['HD'], type: 'ptz', notes: '1/2.5" Exmor R CMOS, 12x optical zoom PTZ' },

  // ── Canon Broadcast / Cinema ──
  { id: 'canon-c500ii', manufacturer: 'Canon', model: 'C500 Mark II', sensor: SENSORS.FF, mount: 'EF', resolutions: ['5.9K', '4K', 'HD'], type: 'cinema' },
  { id: 'canon-c300iii', manufacturer: 'Canon', model: 'C300 Mark III', sensor: SENSORS.S35, mount: 'EF', resolutions: ['4K', 'HD'], type: 'cinema' },
  { id: 'canon-c70', manufacturer: 'Canon', model: 'C70', sensor: SENSORS.S35, mount: 'RF', resolutions: ['4K', 'HD'], type: 'cinema' },
  { id: 'canon-xf605', manufacturer: 'Canon', model: 'XF605', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'camcorder' },
  { id: 'canon-cr-n500', manufacturer: 'Canon', model: 'CR-N500', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'canon-cr-n300', manufacturer: 'Canon', model: 'CR-N300', sensor: SENSORS.HALF_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },

  // ── Panasonic ──
  { id: 'pana-ak-uc4000', manufacturer: 'Panasonic', model: 'AK-UC4000', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'pana-ak-uc3300', manufacturer: 'Panasonic', model: 'AK-UC3300', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'pana-ak-hc5000', manufacturer: 'Panasonic', model: 'AK-HC5000', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'pana-eva1', manufacturer: 'Panasonic', model: 'AU-EVA1', sensor: SENSORS.S35, mount: 'EF', resolutions: ['5.7K', '4K', 'HD'], type: 'cinema' },
  { id: 'pana-aw-ue150', manufacturer: 'Panasonic', model: 'AW-UE150', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'pana-aw-ue40', manufacturer: 'Panasonic', model: 'AW-UE40', sensor: SENSORS.HALF_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },

  // ── Blackmagic Design ──
  { id: 'bmd-ursa-broadcast-g2', manufacturer: 'Blackmagic', model: 'URSA Broadcast G2', sensor: { name: 'BMD 6K (23.1×12.99)', widthMm: 23.1, heightMm: 12.99, cropFactor: 1.56 }, mount: 'B4', adaptedMounts: ['EF', 'PL'], resolutions: ['6K', '4K', 'HD'], type: 'broadcast', notes: 'B4 native, EF/PL via adapter. Broadcast camera with cinema sensor.', sensorModes: [
    { name: '6K Full (23.1×12.99)', widthMm: 23.1, heightMm: 12.99, cropFactor: 1.56 },
    { name: '4K UHD S16 crop (12.4×6.97)', widthMm: 12.4, heightMm: 6.97, cropFactor: 2.91 },
    { name: '2/3" B4 crop (9.6×5.4)', widthMm: 9.6, heightMm: 5.4, cropFactor: 3.93 },
  ] },
  { id: 'bmd-ursa-12k', manufacturer: 'Blackmagic', model: 'URSA Mini Pro 12K', sensor: SENSORS.S35, mount: 'PL', adaptedMounts: ['EF'], resolutions: ['12K', '8K', '4K'], type: 'cinema', sensorModes: [
    { name: '12K Full S35 (27.03×14.25)', widthMm: 27.03, heightMm: 14.25, cropFactor: 1.33 },
    { name: '12K 8:1 Open Gate (27.03×19.04)', widthMm: 27.03, heightMm: 19.04, cropFactor: 1.30 },
    { name: '8K S16 crop (18.0×9.5)', widthMm: 18.0, heightMm: 9.5, cropFactor: 2.0 },
    { name: '6K S16 crop (13.5×7.13)', widthMm: 13.5, heightMm: 7.13, cropFactor: 2.66 },
  ] },
  { id: 'bmd-ursa-g2', manufacturer: 'Blackmagic', model: 'URSA Mini Pro G2', sensor: SENSORS.S35, mount: 'PL', adaptedMounts: ['EF'], resolutions: ['4.6K', '4K', 'HD'], type: 'cinema' },
  { id: 'bmd-ursa-46k', manufacturer: 'Blackmagic', model: 'URSA Mini Pro 4.6K', sensor: SENSORS.S35, mount: 'PL', adaptedMounts: ['EF'], resolutions: ['4.6K', '4K', 'HD'], type: 'cinema' },
  { id: 'bmd-pocket6kpro', manufacturer: 'Blackmagic', model: 'Pocket Cinema 6K Pro', sensor: SENSORS.S35, mount: 'EF', resolutions: ['6K', '4K', 'HD'], type: 'cinema' },
  { id: 'bmd-pocket6k', manufacturer: 'Blackmagic', model: 'Pocket Cinema 6K G2', sensor: SENSORS.S35, mount: 'EF', resolutions: ['6K', '4K', 'HD'], type: 'cinema' },
  { id: 'bmd-pocket4k', manufacturer: 'Blackmagic', model: 'Pocket Cinema 4K', sensor: SENSORS.MFT, mount: 'MFT', resolutions: ['4K', 'HD'], type: 'cinema' },
  { id: 'bmd-cinema-camera-6k', manufacturer: 'Blackmagic', model: 'Cinema Camera 6K', sensor: SENSORS.FF, mount: 'L', resolutions: ['6K', '4K', 'HD'], type: 'cinema', notes: 'Full-frame, Leica L-mount' },
  { id: 'bmd-pyxis-6k', manufacturer: 'Blackmagic', model: 'PYXIS 6K', sensor: SENSORS.FF, mount: 'L', adaptedMounts: ['PL', 'EF'], resolutions: ['6K', '4K', 'HD'], type: 'cinema', notes: 'Full-frame box-style, L-mount native' },
  { id: 'bmd-studio4kplus', manufacturer: 'Blackmagic', model: 'Studio Camera 4K Plus', sensor: SENSORS.MFT, mount: 'MFT', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'bmd-studio4kpro', manufacturer: 'Blackmagic', model: 'Studio Camera 4K Pro G2', sensor: SENSORS.MFT, mount: 'MFT', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'bmd-studio6kpro', manufacturer: 'Blackmagic', model: 'Studio Camera 6K Pro', sensor: SENSORS.S35, mount: 'EF', resolutions: ['6K', '4K', 'HD'], type: 'broadcast' },
  { id: 'bmd-micro-studio-4k-g2', manufacturer: 'Blackmagic', model: 'Micro Studio Camera 4K G2', sensor: SENSORS.MFT, mount: 'MFT', adaptedMounts: ['EF'], resolutions: ['4K', 'HD'], type: 'broadcast', notes: 'Micro form factor, MFT native, EF via adapter or EF Speedbooster' },

  // ── Grass Valley ──
  { id: 'gv-ldx-100', manufacturer: 'Grass Valley', model: 'LDX 100', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'gv-ldx-150', manufacturer: 'Grass Valley', model: 'LDX 150', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K UHD', 'HD', '3x HD'], type: 'broadcast' },

  // ── Hitachi ──
  { id: 'hitachi-sk-hd1800', manufacturer: 'Hitachi', model: 'SK-HD1800', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'broadcast' },
  { id: 'hitachi-sk-uhd7000', manufacturer: 'Hitachi', model: 'SK-UHD7000', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },

  // ── ARRI ──
  { id: 'arri-alexa-35', manufacturer: 'ARRI', model: 'ALEXA 35', sensor: { name: 'ARRI ALEV 4 (27.99×19.22)', widthMm: 27.99, heightMm: 19.22, cropFactor: 1.29 }, mount: 'PL', resolutions: ['4.6K', '4K', 'HD'], type: 'cinema', sensorModes: [
    { name: '4.6K 3:2 Open Gate (27.99×19.22)', widthMm: 27.99, heightMm: 19.22, cropFactor: 1.29 },
    { name: '4K 16:9 (24.88×13.99)', widthMm: 24.88, heightMm: 13.99, cropFactor: 1.45 },
    { name: '4K 2:1 (27.99×13.99)', widthMm: 27.99, heightMm: 13.99, cropFactor: 1.29 },
    { name: '4K S16 (12.42×7.0)', widthMm: 12.42, heightMm: 7.0, cropFactor: 2.91 },
  ] },
  { id: 'arri-amira', manufacturer: 'ARRI', model: 'AMIRA', sensor: SENSORS.S35, mount: 'PL', resolutions: ['4K UHD', 'HD'], type: 'cinema' },

  // ── RED ──
  { id: 'red-v-raptor', manufacturer: 'RED', model: 'V-RAPTOR XL', sensor: { name: 'RED VV (40.96×21.6)', widthMm: 40.96, heightMm: 21.6, cropFactor: 0.88 }, mount: 'PL', resolutions: ['8K', '6K', '4K'], type: 'cinema' },

  // ── Marshall POV ──
  { id: 'marshall-cv568', manufacturer: 'Marshall', model: 'CV568', sensor: { name: '1/1.8" (7.44×5.58)', widthMm: 7.44, heightMm: 5.58, cropFactor: 4.84 }, mount: 'M12', resolutions: ['4K', 'HD'], type: 'broadcast', notes: 'POV camera, global shutter' },
];

export function getCameraById(id: string, customCameras?: Camera[]): Camera | undefined {
  // Custom entries take precedence — when the user edits a built-in we shadow
  // it with a customCameras entry that has the same id, and that should win.
  return customCameras?.find((c) => c.id === id) ?? CAMERAS.find((c) => c.id === id);
}

export function getCamerasByType(type: Camera['type']): Camera[] {
  return CAMERAS.filter((c) => c.type === type);
}

/**
 * Determine if an adapter is needed and its effects.
 * B4 lenses on non-B4 cameras → relay optics, crop to 2/3", ~1 stop loss.
 * PL/EF → FZ/E are simple spacers with no optical penalty.
 * EF → MFT with speedbooster: 0.71x focal reducer, +1 stop gain.
 *
 * `activeMount` overrides the camera's native mount for the purpose of adapter
 * detection. This models swappable-mount bodies like the URSA Broadcast G2 —
 * with the EF mount plate fitted, an EF lens is native (no adapter), and the
 * built-in 2/3" relay crop that comes with the B4 plate no longer applies.
 */
export function getAdapterInfo(camera: Camera, lens: Lens, useSpeedbooster = false, activeMount?: string): AdapterInfo | null {
  const effectiveMount = activeMount ?? camera.mount;
  if (lens.mount === effectiveMount) return null; // native
  if (lens.mount === 'integrated') return null;

  // B4 → any larger-sensor camera: relay optics needed, crop to 2/3"
  if (lens.mount === 'B4') {
    if (effectiveMount === 'FZ') return { name: 'Sony LA-FZB1/FZB2', lightLossStops: 1.0, cropSensor: SENSORS.TWO_THIRD };
    if (effectiveMount === 'E') return { name: 'B4 → E-mount Adapter (relay)', lightLossStops: 1.0, cropSensor: SENSORS.TWO_THIRD };
    if (effectiveMount === 'PL') return { name: 'B4 → PL Adapter (relay)', lightLossStops: 1.0, cropSensor: SENSORS.TWO_THIRD };
    if (effectiveMount === 'EF') return { name: 'B4 → EF Adapter (relay)', lightLossStops: 1.0, cropSensor: SENSORS.TWO_THIRD };
    return null;
  }

  // PL → shorter flange mounts (spacer adapters, no optics)
  if (lens.mount === 'PL') {
    if (effectiveMount === 'FZ') return { name: 'PL → FZ Adapter', lightLossStops: 0 };
    if (effectiveMount === 'E') return { name: 'PL → E-mount Adapter', lightLossStops: 0 };
    if (effectiveMount === 'RF') return { name: 'PL → RF Adapter', lightLossStops: 0 };
    return null;
  }

  // EF → shorter flange mounts
  if (lens.mount === 'EF') {
    if (effectiveMount === 'E') return { name: 'EF → E-mount Adapter', lightLossStops: 0 };
    if (effectiveMount === 'RF') return { name: 'Canon EF → RF Adapter', lightLossStops: 0 };
    if (effectiveMount === 'MFT') {
      if (useSpeedbooster) {
        // Metabones Speed Booster Ultra 0.71x: widens FOV by 0.71x, gains ~1 stop
        return {
          name: 'Metabones EF→MFT Speed Booster 0.71×',
          lightLossStops: -1.0, // gain
          cropSensor: { name: 'MFT + Speed Booster (S35 equiv)', widthMm: 17.3 / 0.71, heightMm: 13 / 0.71, cropFactor: 2.0 * 0.71 },
        };
      }
      return { name: 'EF → MFT Adapter', lightLossStops: 0 };
    }
    return null;
  }

  // Nikon F → shorter flange mounts
  if (lens.mount === 'NF') {
    if (effectiveMount === 'E') return { name: 'Nikon F → E-mount Adapter', lightLossStops: 0 };
    return null;
  }

  return null;
}

/**
 * Get the effective sensor size, accounting for adapter crop and selected hardware mode.
 * Priority (highest first):
 *   1. Adapter crop (e.g. B4 relay forces 2/3", Speedbooster widens MFT)
 *   2. Camera hardware sensor mode (URSA B4 crop, VENICE window, FX9 S35 etc.)
 *   3. Camera default sensor
 */
export function getEffectiveSensor(camera: Camera, lens: Lens, useSpeedbooster = false, sensorModeIndex?: number, activeMount?: string): SensorSize {
  const adapter = getAdapterInfo(camera, lens, useSpeedbooster, activeMount);
  if (adapter?.cropSensor) return adapter.cropSensor;
  if (
    sensorModeIndex !== undefined &&
    sensorModeIndex >= 0 &&
    camera.sensorModes &&
    sensorModeIndex < camera.sensorModes.length
  ) {
    return camera.sensorModes[sensorModeIndex];
  }
  return camera.sensor;
}

/**
 * Get effective aperture accounting for adapter light loss.
 */
export function getEffectiveAperture(camera: Camera, lens: Lens, aperture: number, useSpeedbooster = false, activeMount?: string): number {
  const adapter = getAdapterInfo(camera, lens, useSpeedbooster, activeMount);
  if (!adapter || adapter.lightLossStops === 0) return aperture;
  // Each stop doubles the area, so T-number increases by 2^(stops/2)
  // Negative lightLossStops = gain (speedbooster)
  return aperture * Math.pow(2, adapter.lightLossStops / 2);
}

export const CAMERA_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#8b5cf6',
  '#f43f5e', '#0ea5e9', '#84cc16', '#d946ef', '#fb923c',
];
