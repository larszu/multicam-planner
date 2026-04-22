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
  { id: 'sony-venice2', manufacturer: 'Sony', model: 'VENICE 2', sensor: { name: 'FF 8.6K (36.2×24.1)', widthMm: 36.2, heightMm: 24.1, cropFactor: 0.99 }, mount: 'PL', adaptedMounts: ['E'], resolutions: ['8.6K', '6K', '4K', 'HD'], type: 'cinema', notes: 'Dual base ISO 800/3200, PL native, E-mount adapter' },
  { id: 'sony-pmw-f5', manufacturer: 'Sony', model: 'PMW-F5', sensor: SENSORS.S35, mount: 'FZ', adaptedMounts: ['PL', 'B4', 'EF', 'NF'], resolutions: ['4K', '2K', 'HD'], type: 'cinema', notes: 'FZ-mount native, PL via adapter, B4 via Sony LA-FZB1 (LAFZ-B1), EF via Metabones FZ-EF CINE' },
  { id: 'sony-pmw-f55', manufacturer: 'Sony', model: 'PMW-F55', sensor: SENSORS.S35, mount: 'FZ', adaptedMounts: ['PL', 'B4', 'EF', 'NF'], resolutions: ['4K', '2K', 'HD'], type: 'cinema', notes: 'FZ-mount native, PL via adapter, B4 via LAFZ-B1 (2/3" crop), EF via Metabones FZ-EF CINE' },
  { id: 'sony-fx6', manufacturer: 'Sony', model: 'FX6', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF', 'NF'], resolutions: ['4K', 'HD'], type: 'cinema', notes: 'E-mount nativ; PL via Metabones PL → E CINE, EF via Metabones EF → E' },
  { id: 'sony-fx3', manufacturer: 'Sony', model: 'FX3', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF', 'NF'], resolutions: ['4K', 'HD'], type: 'cinema', notes: 'E-mount nativ; PL via Metabones PL → E CINE, EF via Metabones EF → E' },
  { id: 'sony-fx9', manufacturer: 'Sony', model: 'PXW-FX9', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF', 'NF'], resolutions: ['6K', '4K', 'HD'], type: 'cinema', notes: 'E-mount nativ; PL/EF via Adapter' },
  { id: 'sony-fs7ii', manufacturer: 'Sony', model: 'PXW-FS7 II', sensor: SENSORS.S35, mount: 'E', adaptedMounts: ['PL', 'EF', 'NF'], resolutions: ['4K', 'HD'], type: 'cinema', notes: 'E-mount nativ; PL/EF via Adapter' },
  { id: 'sony-a7siii', manufacturer: 'Sony', model: 'A7S III', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF', 'NF'], resolutions: ['4K', 'HD'], type: 'mirrorless' },
  { id: 'sony-a7iv', manufacturer: 'Sony', model: 'A7 IV', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF', 'NF'], resolutions: ['4K', 'HD'], type: 'mirrorless' },
  { id: 'sony-fr7', manufacturer: 'Sony', model: 'FR7', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF', 'NF'], resolutions: ['4K', 'HD'], type: 'ptz', notes: 'Full-frame PTZ, E-mount; PL/EF via Adapter' },

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
  { id: 'canon-c500ii', manufacturer: 'Canon', model: 'C500 Mark II', sensor: SENSORS.FF, mount: 'EF', adaptedMounts: ['PL'], resolutions: ['5.9K', '4K', 'HD'], type: 'cinema', notes: 'EF nativ, PL via Canon Mount-Kit' },
  { id: 'canon-c300iii', manufacturer: 'Canon', model: 'C300 Mark III', sensor: SENSORS.S35, mount: 'EF', adaptedMounts: ['PL'], resolutions: ['4K', 'HD'], type: 'cinema', notes: 'EF nativ, PL via Canon Mount-Kit' },
  { id: 'canon-c70', manufacturer: 'Canon', model: 'C70', sensor: SENSORS.S35, mount: 'RF', adaptedMounts: ['EF', 'PL'], resolutions: ['4K', 'HD'], type: 'cinema', notes: 'RF nativ; EF via Canon EF-EOS R 0.71×, PL via Adapter' },
  { id: 'canon-xf605', manufacturer: 'Canon', model: 'XF605', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'camcorder' },
  { id: 'canon-cr-n500', manufacturer: 'Canon', model: 'CR-N500', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'canon-cr-n300', manufacturer: 'Canon', model: 'CR-N300', sensor: SENSORS.HALF_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },

  // ── Panasonic ──
  { id: 'pana-ak-uc4000', manufacturer: 'Panasonic', model: 'AK-UC4000', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'pana-ak-uc3300', manufacturer: 'Panasonic', model: 'AK-UC3300', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'pana-ak-hc5000', manufacturer: 'Panasonic', model: 'AK-HC5000', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'pana-eva1', manufacturer: 'Panasonic', model: 'AU-EVA1', sensor: SENSORS.S35, mount: 'EF', adaptedMounts: ['PL'], resolutions: ['5.7K', '4K', 'HD'], type: 'cinema', notes: 'EF nativ, PL via Adapter' },
  { id: 'pana-aw-ue150', manufacturer: 'Panasonic', model: 'AW-UE150', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'pana-aw-ue40', manufacturer: 'Panasonic', model: 'AW-UE40', sensor: SENSORS.HALF_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },

  // ── Blackmagic Design ──
  { id: 'bmd-ursa-broadcast-g2', manufacturer: 'Blackmagic', model: 'URSA Broadcast G2', sensor: { name: 'BMD 6K (23.1×12.99)', widthMm: 23.1, heightMm: 12.99, cropFactor: 1.56 }, mount: 'B4', adaptedMounts: ['EF', 'PL'], resolutions: ['6K', '4K', 'HD'], type: 'broadcast', notes: 'B4 native, EF/PL via adapter. Broadcast camera with cinema sensor.' },
  { id: 'bmd-ursa-12k', manufacturer: 'Blackmagic', model: 'URSA Mini Pro 12K', sensor: SENSORS.S35, mount: 'PL', adaptedMounts: ['EF'], resolutions: ['12K', '8K', '4K'], type: 'cinema' },
  { id: 'bmd-ursa-g2', manufacturer: 'Blackmagic', model: 'URSA Mini Pro G2', sensor: SENSORS.S35, mount: 'PL', adaptedMounts: ['EF'], resolutions: ['4.6K', '4K', 'HD'], type: 'cinema' },
  { id: 'bmd-ursa-46k', manufacturer: 'Blackmagic', model: 'URSA Mini Pro 4.6K', sensor: SENSORS.S35, mount: 'PL', adaptedMounts: ['EF'], resolutions: ['4.6K', '4K', 'HD'], type: 'cinema' },
  { id: 'bmd-pocket6kpro', manufacturer: 'Blackmagic', model: 'Pocket Cinema 6K Pro', sensor: SENSORS.S35, mount: 'EF', resolutions: ['6K', '4K', 'HD'], type: 'cinema' },
  { id: 'bmd-pocket6k', manufacturer: 'Blackmagic', model: 'Pocket Cinema 6K G2', sensor: SENSORS.S35, mount: 'EF', resolutions: ['6K', '4K', 'HD'], type: 'cinema' },
  { id: 'bmd-pocket4k', manufacturer: 'Blackmagic', model: 'Pocket Cinema 4K', sensor: SENSORS.MFT, mount: 'MFT', resolutions: ['4K', 'HD'], type: 'cinema' },
  { id: 'bmd-cinema-camera-6k', manufacturer: 'Blackmagic', model: 'Cinema Camera 6K', sensor: SENSORS.FF, mount: 'L', adaptedMounts: ['EF', 'PL', 'NF'], resolutions: ['6K', '4K', 'HD'], type: 'cinema', notes: 'Full-frame, L-mount nativ; EF/PL/Nikon via Adapter' },
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
  { id: 'arri-alexa-35', manufacturer: 'ARRI', model: 'ALEXA 35', sensor: { name: 'ARRI ALEV 4 (27.99×19.22)', widthMm: 27.99, heightMm: 19.22, cropFactor: 1.29 }, mount: 'PL', adaptedMounts: ['EF'], resolutions: ['4.6K', '4K', 'HD'], type: 'cinema', notes: 'PL nativ (LPL optional), EF via ARRI EF-Mount' },
  { id: 'arri-amira', manufacturer: 'ARRI', model: 'AMIRA', sensor: SENSORS.S35, mount: 'PL', adaptedMounts: ['EF', 'B4'], resolutions: ['4K UHD', 'HD'], type: 'cinema', notes: 'PL nativ, EF/B4 via ARRI Mount-Kits' },

  // ── RED ──
  { id: 'red-v-raptor', manufacturer: 'RED', model: 'V-RAPTOR XL', sensor: { name: 'RED VV (40.96×21.6)', widthMm: 40.96, heightMm: 21.6, cropFactor: 0.88 }, mount: 'PL', adaptedMounts: ['EF', 'L'], resolutions: ['8K', '6K', '4K'], type: 'cinema', notes: 'PL nativ (LPL optional), EF/L via RED Mount' },

  // ── Marshall POV ──
  { id: 'marshall-cv568', manufacturer: 'Marshall', model: 'CV568', sensor: { name: '1/1.8" (7.44×5.58)', widthMm: 7.44, heightMm: 5.58, cropFactor: 4.84 }, mount: 'M12', resolutions: ['4K', 'HD'], type: 'broadcast', notes: 'POV camera, global shutter' },
];

export function getCameraById(id: string): Camera | undefined {
  return CAMERAS.find((c) => c.id === id);
}

export function getCamerasByType(type: Camera['type']): Camera[] {
  return CAMERAS.filter((c) => c.type === type);
}

/**
 * Full catalogue of known physical adapters between lens- and camera-mounts.
 * Each entry has a stable `id` used when the user overrides the automatic
 * pick. `autoRank` controls the default: the highest ranked entry that is
 * applicable to a lens/camera combination is selected automatically.
 */
interface AdapterRule extends AdapterInfo {
  lensMount: string;
  autoRank: number; // higher = preferred default
  /** Physical focal-reduction factor (0.71, 0.64, 0.58). Undefined = spacer. */
  speedBoosterFactor?: number;
}

const S35_SPEEDBOOSTER_SENSOR: SensorSize = {
  name: 'S35 + Speed Booster 0.71× (equiv ~FF framing)',
  widthMm: 24.6 / 0.71,
  heightMm: 13.8 / 0.71,
  cropFactor: 1.46 * 0.71,
};

const MFT_SPEEDBOOSTER_ULTRA: SensorSize = {
  name: 'MFT + Speed Booster ULTRA 0.71× (S35 equiv)',
  widthMm: 17.3 / 0.71,
  heightMm: 13 / 0.71,
  cropFactor: 2.0 * 0.71,
};

const MFT_SPEEDBOOSTER_XL: SensorSize = {
  name: 'MFT + Speed Booster XL 0.64× (near-S35)',
  widthMm: 17.3 / 0.64,
  heightMm: 13 / 0.64,
  cropFactor: 2.0 * 0.64,
};

const FE_SPEEDBOOSTER_S: SensorSize = {
  // Metabones EF → E Speed Booster "S" 0.58× is designed for S35 cameras
  // operated in S35 crop mode (FS7/FS5/FX6 S35 mode). Widens FOV accordingly.
  name: 'Sony S35 + Speed Booster S 0.58× (~FF framing)',
  widthMm: 24.6 / 0.58,
  heightMm: 13.8 / 0.58,
  cropFactor: 1.46 * 0.58,
};

const ADAPTER_RULES: AdapterRule[] = [
  // ── B4 → other mounts (relay optics, crop to 2/3", ~1 stop loss) ──
  { id: 'b4-fz-lafzb1', lensMount: 'B4', cameraMounts: ['FZ'], name: 'Sony LA-FZB1 / FZB2 (B4 → FZ relay)', lightLossStops: 1.0, cropSensor: SENSORS.TWO_THIRD, autoRank: 10 },
  { id: 'b4-e-relay', lensMount: 'B4', cameraMounts: ['E'], name: 'B4 → E-mount Relay Adapter', lightLossStops: 1.0, cropSensor: SENSORS.TWO_THIRD, autoRank: 10 },
  { id: 'b4-pl-relay', lensMount: 'B4', cameraMounts: ['PL'], name: 'B4 → PL Relay Adapter', lightLossStops: 1.0, cropSensor: SENSORS.TWO_THIRD, autoRank: 10 },
  { id: 'b4-ef-relay', lensMount: 'B4', cameraMounts: ['EF'], name: 'B4 → EF Relay Adapter', lightLossStops: 1.0, cropSensor: SENSORS.TWO_THIRD, autoRank: 10 },

  // ── PL → shorter flange mounts (mechanical, 0 stops) ──
  { id: 'pl-fz', lensMount: 'PL', cameraMounts: ['FZ'], name: 'Sony LA-FZP1 (PL → FZ)', lightLossStops: 0, autoRank: 10 },
  { id: 'pl-e-cine', lensMount: 'PL', cameraMounts: ['E'], name: 'Metabones PL → E CINE Adapter', lightLossStops: 0, autoRank: 10 },
  { id: 'pl-rf', lensMount: 'PL', cameraMounts: ['RF'], name: 'Canon PL → RF Adapter', lightLossStops: 0, autoRank: 10 },
  { id: 'pl-l', lensMount: 'PL', cameraMounts: ['L'], name: 'PL → L-mount Adapter', lightLossStops: 0, autoRank: 10 },
  { id: 'pl-mft', lensMount: 'PL', cameraMounts: ['MFT'], name: 'PL → MFT Adapter (passiv)', lightLossStops: 0, autoRank: 8 },

  // ── Canon EF → Sony FZ (F5 / F55) ──
  { id: 'ef-fz-smart', lensMount: 'EF', cameraMounts: ['FZ'], name: 'Metabones EF → FZ Smart CINE Adapter', lightLossStops: 0, autoRank: 18 },
  { id: 'ef-fz-sb-ultra', lensMount: 'EF', cameraMounts: ['FZ'], name: 'Metabones EF → FZ Speed Booster ULTRA 0.71×', lightLossStops: -1.0, isSpeedBooster: true, speedBoosterFactor: 0.71, autoRank: 4 },

  // ── Canon EF → Sony E (Metabones range) ──
  { id: 'ef-e-smart-v', lensMount: 'EF', cameraMounts: ['E'], name: 'Metabones EF → E Smart Adapter Mark V', lightLossStops: 0, autoRank: 20 },
  { id: 'ef-e-cine-smart', lensMount: 'EF', cameraMounts: ['E'], name: 'Metabones EF → E CINE Smart Adapter', lightLossStops: 0, autoRank: 15 },
  { id: 'ef-e-cine-end', lensMount: 'EF', cameraMounts: ['E'], name: 'Metabones EF → E CINE eND Smart Adapter (variable ND)', lightLossStops: 0, autoRank: 5 },
  { id: 'ef-e-sb-ultra', lensMount: 'EF', cameraMounts: ['E'], name: 'Metabones EF → E CINE Speed Booster ULTRA II 0.71×', lightLossStops: -1.0, isSpeedBooster: true, speedBoosterFactor: 0.71, autoRank: 3 },
  { id: 'ef-e-sb-s', lensMount: 'EF', cameraMounts: ['E'], name: 'Metabones EF → E CINE Speed Booster "S" 0.58× (S35 mode only)', lightLossStops: -1.33, requiresSensorMode: 'S35', cropSensor: FE_SPEEDBOOSTER_S, isSpeedBooster: true, speedBoosterFactor: 0.58, autoRank: 2 },

  // ── Canon EF → other mirrorless mounts ──
  { id: 'ef-rf', lensMount: 'EF', cameraMounts: ['RF'], name: 'Canon EF → RF Adapter', lightLossStops: 0, autoRank: 20 },
  { id: 'ef-mft-smart', lensMount: 'EF', cameraMounts: ['MFT'], name: 'Metabones EF → MFT Smart Adapter', lightLossStops: 0, autoRank: 20 },
  { id: 'ef-mft-cine-smart', lensMount: 'EF', cameraMounts: ['MFT'], name: 'Metabones EF → MFT CINE Smart Adapter', lightLossStops: 0, autoRank: 15 },
  { id: 'ef-mft-sb-ultra', lensMount: 'EF', cameraMounts: ['MFT'], name: 'Metabones EF → MFT Speed Booster ULTRA II 0.71×', lightLossStops: -1.0, cropSensor: MFT_SPEEDBOOSTER_ULTRA, isSpeedBooster: true, speedBoosterFactor: 0.71, autoRank: 5 },
  { id: 'ef-mft-sb-xl', lensMount: 'EF', cameraMounts: ['MFT'], name: 'Metabones EF → MFT Speed Booster XL 0.64×', lightLossStops: -1.33, cropSensor: MFT_SPEEDBOOSTER_XL, isSpeedBooster: true, speedBoosterFactor: 0.64, autoRank: 3 },
  { id: 'ef-l', lensMount: 'EF', cameraMounts: ['L'], name: 'EF → L-mount Adapter', lightLossStops: 0, autoRank: 10 },
  { id: 'ef-x-cine-smart', lensMount: 'EF', cameraMounts: ['X'], name: 'Metabones EF-X CINE Smart Adapter II', lightLossStops: 0, autoRank: 15 },
  { id: 'ef-x-sb-ultra', lensMount: 'EF', cameraMounts: ['X'], name: 'Metabones EF-X CINE Speed Booster ULTRA II 0.71×', lightLossStops: -1.0, cropSensor: S35_SPEEDBOOSTER_SENSOR, isSpeedBooster: true, speedBoosterFactor: 0.71, autoRank: 5 },

  // ── Nikon F → other mounts ──
  { id: 'nf-e-smart', lensMount: 'NF', cameraMounts: ['E'], name: 'Metabones Nikon G → E Smart Adapter', lightLossStops: 0, autoRank: 20 },
  { id: 'nf-e-sb-ultra', lensMount: 'NF', cameraMounts: ['E'], name: 'Metabones Nikon G → E Speed Booster ULTRA II 0.71×', lightLossStops: -1.0, isSpeedBooster: true, speedBoosterFactor: 0.71, autoRank: 5 },
  { id: 'nf-mft-sb-ultra', lensMount: 'NF', cameraMounts: ['MFT'], name: 'Metabones Nikon G → MFT Speed Booster ULTRA 0.71×', lightLossStops: -1.0, cropSensor: MFT_SPEEDBOOSTER_ULTRA, isSpeedBooster: true, speedBoosterFactor: 0.71, autoRank: 15 },

  // ── L-mount shorter flange targets ──
  { id: 'l-e', lensMount: 'L', cameraMounts: ['E'], name: 'L → E-mount Adapter', lightLossStops: 0, autoRank: 10 },

  // ── Nikon F → further mounts ──
  { id: 'nf-l', lensMount: 'NF', cameraMounts: ['L'], name: 'Nikon F → L-mount Adapter', lightLossStops: 0, autoRank: 10 },
  { id: 'nf-rf', lensMount: 'NF', cameraMounts: ['RF'], name: 'Nikon F → RF Adapter', lightLossStops: 0, autoRank: 10 },
  { id: 'nf-fz-smart', lensMount: 'NF', cameraMounts: ['FZ'], name: 'Metabones Nikon G → FZ CINE Adapter', lightLossStops: 0, autoRank: 10 },
];

function stripAutoFields(rule: AdapterRule): AdapterInfo {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { lensMount, autoRank, ...info } = rule;
  return info;
}

// ── Lens image-circle diameters (approx. diagonal in mm) ──
const IMAGE_CIRCLE_MM: Record<string, number> = {
  FF: 43.3,
  S35: 28.4,
  APSC: 28.3,
  MFT: 21.6,
  '2/3': 11.0,
  '1': 15.9,
  integrated: 0,
};

/** Infer a reasonable default image circle from the lens mount. */
function defaultImageCircleForMount(mount: string): keyof typeof IMAGE_CIRCLE_MM {
  switch (mount) {
    case 'PL': case 'EF': case 'RF': case 'E': case 'L': case 'NF': case 'FZ':
      return 'FF';
    case 'MFT': return 'MFT';
    case 'X':   return 'APSC';
    case 'B4':  return '2/3';
    case 'integrated': return 'integrated';
    default: return 'FF';
  }
}

/**
 * Image circle diameter (mm) actually projected onto the sensor, after adapter optics.
 * A speed booster demagnifies the lens image circle by its factor.
 */
export function getEffectiveImageCircleMm(lens: Lens, adapter: AdapterInfo | null): number {
  const kind = lens.imageCircle ?? defaultImageCircleForMount(lens.mount);
  let circle = IMAGE_CIRCLE_MM[kind] ?? IMAGE_CIRCLE_MM.FF;
  if (adapter?.speedBoosterFactor) circle *= adapter.speedBoosterFactor;
  // B4 / relay adapters re-project onto 2/3" regardless of lens circle
  if (adapter?.cropSensor && !adapter.speedBoosterFactor) {
    const diag = Math.hypot(adapter.cropSensor.widthMm, adapter.cropSensor.heightMm);
    if (diag < circle) circle = diag;
  }
  return circle;
}

export type CoverageStatus = 'ok' | 'marginal' | 'vignette';

export interface CoverageResult {
  status: CoverageStatus;
  lensCircleMm: number; // after adapter
  sensorDiagonalMm: number;
  /** Relative coverage; <1 means lens under-fills the sensor (vignetting). */
  ratio: number;
  message?: string;
}

/**
 * Compare the adapter-reduced image circle against the REAL sensor diagonal
 * (never the synthetic speed-booster sensor). This catches cases like
 * APS-C / EF-S lenses on full-frame bodies, or any lens + Speed Booster S
 * combined with a body that uses too small a focal reducer-compatible circle.
 */
export function getCoverageStatus(camera: Camera, lens: Lens, adapter: AdapterInfo | null): CoverageResult {
  const sensorDiag = Math.hypot(camera.sensor.widthMm, camera.sensor.heightMm);
  const circle = getEffectiveImageCircleMm(lens, adapter);
  if (circle <= 0) return { status: 'ok', lensCircleMm: 0, sensorDiagonalMm: sensorDiag, ratio: 1 };
  const ratio = circle / sensorDiag;
  if (ratio >= 1.0) return { status: 'ok', lensCircleMm: circle, sensorDiagonalMm: sensorDiag, ratio };
  if (ratio >= 0.9) {
    return {
      status: 'marginal',
      lensCircleMm: circle,
      sensorDiagonalMm: sensorDiag,
      ratio,
      message: `Bildkreis knapp (${(ratio * 100).toFixed(0)} %) – leichte Randabschattung möglich.`,
    };
  }
  return {
    status: 'vignette',
    lensCircleMm: circle,
    sensorDiagonalMm: sensorDiag,
    ratio,
    message: `Objektiv deckt Sensor nicht ab (${(ratio * 100).toFixed(0)} %) – starkes Vignetting / Crop nötig.`,
  };
}

/**
 * Return all physically valid adapters between a lens and camera.
 * Ordered by `autoRank` (highest first) so the first entry is the auto default.
 * Speedboosters are deprioritised when the lens cannot cover the resulting circle.
 */
export function getAvailableAdapters(camera: Camera, lens: Lens): AdapterInfo[] {
  if (lens.mount === camera.mount) return [];
  if (lens.mount === 'integrated') return [];
  const lensCircleKind = lens.imageCircle ?? defaultImageCircleForMount(lens.mount);
  const isSmallCircle = lensCircleKind !== 'FF' && lensCircleKind !== 'S35';
  return ADAPTER_RULES
    .filter((r) => r.lensMount === lens.mount && (!r.cameraMounts || r.cameraMounts.includes(camera.mount)))
    .map((r) => {
      // If lens circle is too small, penalise speed boosters so auto-pick avoids them.
      if (r.isSpeedBooster && isSmallCircle) {
        return { ...r, autoRank: r.autoRank - 100 };
      }
      return r;
    })
    .sort((a, b) => b.autoRank - a.autoRank)
    .map(stripAutoFields);
}

/**
 * Pick the adapter that would be used by default (highest `autoRank`).
 */
export function getAutoAdapterId(camera: Camera, lens: Lens): string | null {
  const list = getAvailableAdapters(camera, lens);
  return list[0]?.id ?? null;
}

/**
 * Resolve the active adapter info, honouring an explicit override or falling
 * back to the automatic pick. A legacy `useSpeedbooster` boolean is still
 * respected when no explicit `adapterId` is supplied, so existing projects
 * keep working.
 */
export function getAdapterInfo(
  camera: Camera,
  lens: Lens,
  legacySpeedbooster: boolean | { adapterId?: string; useSpeedbooster?: boolean } = false,
): AdapterInfo | null {
  if (lens.mount === camera.mount) return null;
  if (lens.mount === 'integrated') return null;

  const override = typeof legacySpeedbooster === 'object' ? legacySpeedbooster.adapterId : undefined;
  const legacyBooster = typeof legacySpeedbooster === 'boolean'
    ? legacySpeedbooster
    : !!legacySpeedbooster.useSpeedbooster;

  const available = getAvailableAdapters(camera, lens);
  if (available.length === 0) return null;

  if (override) {
    const chosen = available.find((a) => a.id === override);
    if (chosen) return chosen;
    // override invalid for this pairing → fall through to auto
  }

  if (legacyBooster) {
    const booster = available.find((a) => a.isSpeedBooster);
    if (booster) return booster;
  }

  return available[0];
}

/**
 * Get the effective sensor size, accounting for adapter crop.
 * B4 lenses always project 2/3" image circle regardless of camera sensor.
 * Speedbooster widens the effective sensor area.
 */
export function getEffectiveSensor(
  camera: Camera,
  lens: Lens,
  override: boolean | { adapterId?: string; useSpeedbooster?: boolean } = false,
): SensorSize {
  const adapter = getAdapterInfo(camera, lens, override);
  if (adapter?.cropSensor) return adapter.cropSensor;
  return camera.sensor;
}

/**
 * Get effective aperture accounting for adapter light loss.
 */
export function getEffectiveAperture(
  camera: Camera,
  lens: Lens,
  aperture: number,
  override: boolean | { adapterId?: string; useSpeedbooster?: boolean } = false,
): number {
  const adapter = getAdapterInfo(camera, lens, override);
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
