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
  { id: 'sony-venice', manufacturer: 'Sony', model: 'VENICE', sensor: SENSORS.FF, mount: 'PL', adaptedMounts: ['E'], resolutions: ['6K', '4K', 'HD'], type: 'cinema', notes: 'Full-frame CineAlta, PL native, E-mount via supplied adapter', mountAdapters: {
    E: { name: 'Sony VENICE E-mount Adapter', lightLossStops: 0, notes: 'Sony ships VENICE with both a PL mount block and an E-mount block; swapping between them is a mechanical change with no optical relay and no light loss. The same full-frame sensor area is used.' },
  } },
  { id: 'sony-venice2', manufacturer: 'Sony', model: 'VENICE 2', sensor: { name: 'FF 8.6K (36.2×24.1)', widthMm: 36.2, heightMm: 24.1, cropFactor: 0.99 }, mount: 'PL', adaptedMounts: ['E'], resolutions: ['8.6K', '6K', '4K', 'HD'], type: 'cinema', notes: 'Dual base ISO 800/3200, PL native, E-mount adapter', sensorModes: [
    { name: 'FF 8.6K (36.2×24.1)', widthMm: 36.2, heightMm: 24.1, cropFactor: 0.99 },
    { name: 'FF 6K 3:2 (35.9×24.0)', widthMm: 35.9, heightMm: 24.0, cropFactor: 1.0 },
    { name: 'S35 5.8K (24.8×13.1)', widthMm: 24.8, heightMm: 13.1, cropFactor: 1.46 },
    { name: 'S35 4K 4:3 (19.0×14.2)', widthMm: 19.0, heightMm: 14.2, cropFactor: 1.89 },
  ], mountAdapters: {
    E: { name: 'Sony VENICE 2 E-mount Adapter', lightLossStops: 0, notes: 'Mechanical mount-block swap, no optical relay. The full sensor area stays available — choose the desired window via the Sensor Mode dropdown.' },
  } },
  { id: 'sony-pmw-f5', deviceTypeId: 'f54cdfa3-1708-4b05-9179-4a8769c0b891', manufacturer: 'Sony', model: 'PMW-F5', sensor: SENSORS.S35, mount: 'FZ', adaptedMounts: ['PL', 'B4', 'EF', 'NF'], resolutions: ['4K', '2K', 'HD'], type: 'cinema', notes: 'FZ-mount native; PL/B4 via Sony adapter, EF via Metabones FZ-EF CINE, NF via Metabones FZ-NF', mountAdapters: {
    PL: { name: 'Sony VCT-FZ55B PL Adapter', lightLossStops: 0, notes: 'Mechanical PL-to-FZ adapter. No optical relay, no light loss; the full Super-35 sensor is used.' },
    B4: { name: 'Sony LA-FZB1 / LA-FZB2', lightLossStops: 1.0, cropSensor: SENSORS.TWO_THIRD, notes: 'B4 mount adapter with internal 2× relay optics. Crops the Super-35 sensor down to the 2/3" image circle the B4 lens projects, and costs ~1 T-stop of light through the relay glass.' },
    EF: { name: 'Metabones EF → FZ Smart CINE Adapter', lightLossStops: 0, notes: 'Smart EF-to-FZ adapter with electronic aperture control. Passive optically — no light loss, full Super-35 sensor used.' },
    NF: { name: 'Metabones Nikon F → FZ Adapter', lightLossStops: 0, notes: 'Mechanical Nikon-F-to-FZ adapter. Manual aperture only. No optical relay.' },
  } },
  { id: 'sony-pmw-f55', deviceTypeId: 'eb02ca7e-856c-40ab-9a73-d1e98110f003', manufacturer: 'Sony', model: 'PMW-F55', sensor: SENSORS.S35, mount: 'FZ', adaptedMounts: ['PL', 'B4', 'EF', 'NF'], resolutions: ['4K', '2K', 'HD'], type: 'cinema', notes: 'FZ-mount native; PL/B4 via Sony adapter, EF via Metabones FZ-EF CINE, NF via Metabones FZ-NF', mountAdapters: {
    PL: { name: 'Sony VCT-FZ55B PL Adapter', lightLossStops: 0, notes: 'Mechanical PL-to-FZ adapter. No optical relay, no light loss; the full Super-35 sensor is used.' },
    B4: { name: 'Sony LA-FZB1 / LA-FZB2', lightLossStops: 1.0, cropSensor: SENSORS.TWO_THIRD, notes: 'B4 mount adapter with internal 2× relay optics. Crops the Super-35 sensor down to the 2/3" image circle the B4 lens projects, and costs ~1 T-stop of light through the relay glass.' },
    EF: { name: 'Metabones EF → FZ Smart CINE Adapter', lightLossStops: 0, notes: 'Smart EF-to-FZ adapter with electronic aperture control. Passive optically — no light loss, full Super-35 sensor used.' },
    NF: { name: 'Metabones Nikon F → FZ Adapter', lightLossStops: 0, notes: 'Mechanical Nikon-F-to-FZ adapter. Manual aperture only. No optical relay.' },
  } },
  { id: 'sony-fx6', deviceTypeId: 'a823f2ff-3be9-4c45-af4e-bd4f6b13f7d7', manufacturer: 'Sony', model: 'FX6', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF', 'NF'], resolutions: ['4K', 'HD'], type: 'cinema', notes: 'E-mount native; PL via Metabones PL → E CINE, EF via Metabones EF → E', mountAdapters: {
    PL: { name: 'Metabones PL → E CINE Adapter', lightLossStops: 0, notes: 'Mechanical PL-to-E adapter. No light loss, full sensor.' },
    EF: { name: 'Metabones EF → E Smart Adapter (Mk V)', lightLossStops: 0, notes: 'Smart EF-to-E adapter with electronic aperture/AF. Passive optically.' },
    NF: { name: 'Nikon F → E Adapter', lightLossStops: 0, notes: 'Mechanical Nikon-F-to-E adapter. Manual aperture only.' },
  } },
  { id: 'sony-fx3', deviceTypeId: '3cd5dd2d-7d51-4af9-ad59-25860aa4baa2', manufacturer: 'Sony', model: 'FX3', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF', 'NF'], resolutions: ['4K', 'HD'], type: 'cinema', notes: 'E-mount native; PL/EF via passive adapter', mountAdapters: {
    PL: { name: 'PL → E Adapter', lightLossStops: 0, notes: 'Mechanical PL-to-E adapter (Metabones, Sigma MC-11 variants).' },
    EF: { name: 'Metabones EF → E Smart Adapter (Mk V)', lightLossStops: 0, notes: 'Smart EF-to-E adapter with electronic aperture/AF.' },
    NF: { name: 'Nikon F → E Adapter', lightLossStops: 0, notes: 'Mechanical Nikon-F-to-E adapter. Manual aperture only.' },
  } },
  { id: 'sony-fx9', deviceTypeId: '05d88e97-2f3d-4b16-868c-f13f202754c5', manufacturer: 'Sony', model: 'PXW-FX9', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF', 'NF'], resolutions: ['6K', '4K', 'HD'], type: 'cinema', notes: 'E-mount native; PL/EF via adapter', sensorModes: [
    { name: 'Full Frame (35.7×18.8)', widthMm: 35.7, heightMm: 18.8, cropFactor: 1.0 },
    { name: 'Super 35 crop (23.6×12.4)', widthMm: 23.6, heightMm: 12.4, cropFactor: 1.51 },
  ], mountAdapters: {
    PL: { name: 'Metabones PL → E CINE Adapter', lightLossStops: 0, notes: 'Mechanical PL-to-E adapter. No light loss.' },
    EF: { name: 'Metabones EF → E Smart Adapter (Mk V)', lightLossStops: 0, notes: 'Smart EF-to-E adapter with electronic aperture/AF.' },
    NF: { name: 'Nikon F → E Adapter', lightLossStops: 0, notes: 'Mechanical Nikon-F-to-E adapter. Manual aperture only.' },
  } },
  { id: 'sony-fs7ii', deviceTypeId: 'ff69e6b9-7a72-4eb2-ba53-df17fd8bfdf7', manufacturer: 'Sony', model: 'PXW-FS7 II', sensor: SENSORS.S35, mount: 'E', adaptedMounts: ['PL', 'EF', 'NF'], resolutions: ['4K', 'HD'], type: 'cinema', notes: 'E-mount native; PL/EF via adapter', mountAdapters: {
    PL: { name: 'Metabones PL → E CINE Adapter', lightLossStops: 0, notes: 'Mechanical PL-to-E adapter. No light loss.' },
    EF: { name: 'Metabones EF → E Smart Adapter (Mk V)', lightLossStops: 0, notes: 'Smart EF-to-E adapter with electronic aperture/AF.' },
    NF: { name: 'Nikon F → E Adapter', lightLossStops: 0, notes: 'Mechanical Nikon-F-to-E adapter. Manual aperture only.' },
  } },
  { id: 'sony-a7siii', manufacturer: 'Sony', model: 'A7S III', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF', 'NF'], resolutions: ['4K', 'HD'], type: 'mirrorless', mountAdapters: {
    PL: { name: 'PL → E Adapter', lightLossStops: 0, notes: 'Mechanical PL-to-E adapter.' },
    EF: { name: 'Sigma MC-11 / Metabones EF → E', lightLossStops: 0, notes: 'Smart EF-to-E adapter, AF supported on most Canon EF lenses.' },
    NF: { name: 'Nikon F → E Adapter', lightLossStops: 0, notes: 'Mechanical Nikon-F-to-E adapter. Manual aperture only.' },
  } },
  { id: 'sony-a7iv', manufacturer: 'Sony', model: 'A7 IV', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF', 'NF'], resolutions: ['4K', 'HD'], type: 'mirrorless', mountAdapters: {
    PL: { name: 'PL → E Adapter', lightLossStops: 0, notes: 'Mechanical PL-to-E adapter.' },
    EF: { name: 'Sigma MC-11 / Metabones EF → E', lightLossStops: 0, notes: 'Smart EF-to-E adapter, AF supported on most Canon EF lenses.' },
    NF: { name: 'Nikon F → E Adapter', lightLossStops: 0, notes: 'Mechanical Nikon-F-to-E adapter. Manual aperture only.' },
  } },
  { id: 'sony-fr7', manufacturer: 'Sony', model: 'FR7', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF', 'NF'], resolutions: ['4K', 'HD'], type: 'ptz', notes: 'Full-frame PTZ; E-mount native, PL/EF via adapter', mountAdapters: {
    PL: { name: 'PL → E Adapter', lightLossStops: 0, notes: 'Mechanical PL-to-E adapter. Add a support bracket for heavier PL glass.' },
    EF: { name: 'Metabones EF → E Smart Adapter', lightLossStops: 0, notes: 'Smart EF-to-E adapter with electronic aperture.' },
    NF: { name: 'Nikon F → E Adapter', lightLossStops: 0, notes: 'Mechanical Nikon-F-to-E adapter. Manual aperture only.' },
  } },

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
  { id: 'canon-c500ii', deviceTypeId: '87fc07c8-7327-466d-9fd1-eac259af154e', manufacturer: 'Canon', model: 'C500 Mark II', sensor: SENSORS.FF, mount: 'EF', adaptedMounts: ['PL'], resolutions: ['5.9K', '4K', 'HD'], type: 'cinema', notes: 'EF native; PL via Canon swappable mount kit', mountAdapters: {
    PL: { name: 'Canon C500 II PL Mount Kit', lightLossStops: 0, notes: 'Canon-official swappable PL mount unit. Mechanical change only — no relay, no light loss; the full sensor area stays available.' },
  } },
  { id: 'canon-c300iii', deviceTypeId: 'bfdc4077-32b8-4f1b-b9a5-6f875b37816c', manufacturer: 'Canon', model: 'C300 Mark III', sensor: SENSORS.S35, mount: 'EF', adaptedMounts: ['PL'], resolutions: ['4K', 'HD'], type: 'cinema', notes: 'EF native; PL via Canon swappable mount kit', mountAdapters: {
    PL: { name: 'Canon C300 III PL Mount Kit', lightLossStops: 0, notes: 'Canon-official swappable PL mount unit. Mechanical change only — no relay, no light loss.' },
  } },
  { id: 'canon-c70', deviceTypeId: 'fd8fdb1a-0927-4d70-9c8b-f40ef5ef0fdb', manufacturer: 'Canon', model: 'C70', sensor: SENSORS.S35, mount: 'RF', adaptedMounts: ['EF', 'PL'], resolutions: ['4K', 'HD'], type: 'cinema', notes: 'RF native; EF via Canon EF-EOS R 0.71×, PL via Wooden Camera adapter', mountAdapters: {
    EF: { name: 'Canon EF → RF 0.71× Speed Booster Adapter', lightLossStops: -1.0, notes: 'Canon-official EF-EOS R 0.71× cinema adapter widens FOV by 1/0.71 and brightens by ~1 stop. Full electronic EF compatibility.' },
    PL: { name: 'Wooden Camera PL → RF Adapter', lightLossStops: 0, notes: 'Passive PL-to-RF adapter (Wooden Camera, Vocas). Mechanical only — full sensor area available, no light loss.' },
  } },
  { id: 'canon-xf605', manufacturer: 'Canon', model: 'XF605', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'camcorder' },
  { id: 'canon-cr-n500', manufacturer: 'Canon', model: 'CR-N500', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'canon-cr-n300', manufacturer: 'Canon', model: 'CR-N300', sensor: SENSORS.HALF_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },

  // ── Panasonic ──
  { id: 'pana-ak-uc4000', manufacturer: 'Panasonic', model: 'AK-UC4000', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'pana-ak-uc3300', manufacturer: 'Panasonic', model: 'AK-UC3300', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'pana-ak-hc5000', manufacturer: 'Panasonic', model: 'AK-HC5000', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'pana-eva1', manufacturer: 'Panasonic', model: 'AU-EVA1', sensor: SENSORS.S35, mount: 'EF', adaptedMounts: ['PL'], resolutions: ['5.7K', '4K', 'HD'], type: 'cinema', notes: 'EF native; PL via Wooden Camera mount', mountAdapters: {
    PL: { name: 'Wooden Camera PL → EF Mount (EVA1)', lightLossStops: 0, notes: 'Replaces the EVA1 EF mount with a PL mount. Mechanical only — no relay, no light loss; the full Super-35 sensor remains.' },
  } },
  { id: 'pana-aw-ue150', manufacturer: 'Panasonic', model: 'AW-UE150', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'pana-aw-ue40', manufacturer: 'Panasonic', model: 'AW-UE40', sensor: SENSORS.HALF_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },

  // ── Blackmagic Design ──
  { id: 'bmd-ursa-broadcast-g2', manufacturer: 'Blackmagic', model: 'URSA Broadcast G2', sensor: { name: 'BMD 6K (23.1×12.99)', widthMm: 23.1, heightMm: 12.99, cropFactor: 1.56 }, mount: 'B4', adaptedMounts: ['EF', 'PL'], resolutions: ['6K', '4K', 'HD'], type: 'broadcast', notes: 'B4 native, EF/PL via adapter. Broadcast camera with cinema sensor.', sensorModes: [
    { name: '6K Full (23.1×12.99)', widthMm: 23.1, heightMm: 12.99, cropFactor: 1.56 },
    { name: '4K UHD S16 crop (12.4×6.97)', widthMm: 12.4, heightMm: 6.97, cropFactor: 2.91 },
  ], mountAdapters: {
    B4: { name: 'Built-in B4 relay (2/3" mount plate)', lightLossStops: 1.0, cropSensor: SENSORS.TWO_THIRD, notes: 'The URSA Broadcast G2\'s B4 mount has internal relay optics that crop the 6K sensor to a 2/3" image area to match the B4 lens\'s smaller image circle. Costs ~1 T-stop. Swap to the EF or PL plate to use the full Super-35-ish sensor.' },
    EF: { name: 'URSA Mini EF Mount Plate', lightLossStops: 0, notes: 'Removes the B4 relay so the full 6K image area is available. EF lenses sit native — no light loss, no extra crop.' },
    PL: { name: 'URSA Mini PL Mount Plate', lightLossStops: 0, notes: 'Removes the B4 relay so the full 6K image area is available. PL cine lenses sit native — no light loss, no extra crop.' },
  } },
  { id: 'bmd-ursa-12k', manufacturer: 'Blackmagic', model: 'URSA Mini Pro 12K', sensor: SENSORS.S35, mount: 'PL', adaptedMounts: ['EF'], resolutions: ['12K', '8K', '4K'], type: 'cinema', sensorModes: [
    { name: '12K Full S35 (27.03×14.25)', widthMm: 27.03, heightMm: 14.25, cropFactor: 1.33 },
    { name: '12K 8:1 Open Gate (27.03×19.04)', widthMm: 27.03, heightMm: 19.04, cropFactor: 1.30 },
    { name: '8K S16 crop (18.0×9.5)', widthMm: 18.0, heightMm: 9.5, cropFactor: 2.0 },
    { name: '6K S16 crop (13.5×7.13)', widthMm: 13.5, heightMm: 7.13, cropFactor: 2.66 },
  ], mountAdapters: {
    EF: { name: 'URSA Mini EF Mount Plate', lightLossStops: 0, notes: 'Mechanical swap of the PL block for the EF block — no optical relay, no light loss. The same full sensor area is available; choose the desired crop via the Sensor Mode dropdown.' },
  } },
  { id: 'bmd-ursa-g2', manufacturer: 'Blackmagic', model: 'URSA Mini Pro G2', sensor: SENSORS.S35, mount: 'PL', adaptedMounts: ['EF'], resolutions: ['4.6K', '4K', 'HD'], type: 'cinema', mountAdapters: {
    EF: { name: 'URSA Mini EF Mount Plate', lightLossStops: 0, notes: 'Passive mechanical mount-plate swap. Full Super-35 sensor area available either way.' },
  } },
  { id: 'bmd-ursa-46k', manufacturer: 'Blackmagic', model: 'URSA Mini Pro 4.6K', sensor: SENSORS.S35, mount: 'PL', adaptedMounts: ['EF'], resolutions: ['4.6K', '4K', 'HD'], type: 'cinema', mountAdapters: {
    EF: { name: 'URSA Mini EF Mount Plate', lightLossStops: 0, notes: 'Passive mechanical mount-plate swap. Full Super-35 sensor area available either way.' },
  } },
  { id: 'bmd-pocket6kpro', manufacturer: 'Blackmagic', model: 'Pocket Cinema 6K Pro', sensor: SENSORS.S35, mount: 'EF', resolutions: ['6K', '4K', 'HD'], type: 'cinema' },
  { id: 'bmd-pocket6k', manufacturer: 'Blackmagic', model: 'Pocket Cinema 6K G2', sensor: SENSORS.S35, mount: 'EF', resolutions: ['6K', '4K', 'HD'], type: 'cinema' },
  { id: 'bmd-pocket4k', manufacturer: 'Blackmagic', model: 'Pocket Cinema 4K', sensor: SENSORS.MFT, mount: 'MFT', resolutions: ['4K', 'HD'], type: 'cinema' },
  { id: 'bmd-cinema-camera-6k', manufacturer: 'Blackmagic', model: 'Cinema Camera 6K', sensor: SENSORS.FF, mount: 'L', adaptedMounts: ['EF', 'PL', 'NF'], resolutions: ['6K', '4K', 'HD'], type: 'cinema', notes: 'Full-frame, L-mount native; EF/PL/Nikon F via adapter', mountAdapters: {
    EF: { name: 'EF → L Adapter', lightLossStops: 0, notes: 'Passive EF-to-L adapter (Sigma MC-21, Novoflex, etc.). Mechanical only — full-frame sensor area available, no light loss.' },
    PL: { name: 'PL → L Adapter', lightLossStops: 0, notes: 'Passive PL-to-L adapter. PL has a longer flange distance than L, so an empty barrel fits between them. No optical penalty.' },
    NF: { name: 'Nikon F → L Adapter', lightLossStops: 0, notes: 'Mechanical Nikon-F-to-L adapter (Novoflex, Megadap). Manual aperture only — no electronics.' },
  } },
  { id: 'bmd-pyxis-6k', manufacturer: 'Blackmagic', model: 'PYXIS 6K', sensor: SENSORS.FF, mount: 'L', adaptedMounts: ['PL', 'EF'], resolutions: ['6K', '4K', 'HD'], type: 'cinema', notes: 'Full-frame box-style, L-mount native', mountAdapters: {
    PL: { name: 'PYXIS PL Mount (interchangeable)', lightLossStops: 0, notes: 'Passive PL mount block for the PYXIS 6K. Mechanical change only — full-frame 6K sensor area is used either way.' },
    EF: { name: 'PYXIS EF Mount (interchangeable)', lightLossStops: 0, notes: 'Passive EF mount block for the PYXIS 6K. Electronic aperture control is supported. No optical penalty.' },
  } },
  { id: 'bmd-studio4kplus', manufacturer: 'Blackmagic', model: 'Studio Camera 4K Plus', sensor: SENSORS.MFT, mount: 'MFT', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'bmd-studio4kpro', manufacturer: 'Blackmagic', model: 'Studio Camera 4K Pro G2', sensor: SENSORS.MFT, mount: 'MFT', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'bmd-studio6kpro', manufacturer: 'Blackmagic', model: 'Studio Camera 6K Pro', sensor: SENSORS.S35, mount: 'EF', resolutions: ['6K', '4K', 'HD'], type: 'broadcast' },
  { id: 'bmd-micro-studio-4k-g2', manufacturer: 'Blackmagic', model: 'Micro Studio Camera 4K G2', sensor: SENSORS.MFT, mount: 'MFT', adaptedMounts: ['EF'], resolutions: ['4K', 'HD'], type: 'broadcast', notes: 'Micro form factor, MFT native, EF via adapter or EF Speedbooster', mountAdapters: {
    EF: { name: 'EF → MFT Adapter (passive)', lightLossStops: 0, notes: 'Standard EF-to-MFT adapter — purely mechanical, no glass, manual aperture control only. For light gain + wider FOV, enable Speed Booster instead.' },
  } },

  // ── Grass Valley ──
  { id: 'gv-ldx-100', manufacturer: 'Grass Valley', model: 'LDX 100', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'gv-ldx-150', manufacturer: 'Grass Valley', model: 'LDX 150', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K UHD', 'HD', '3x HD'], type: 'broadcast' },

  // ── Hitachi ──
  { id: 'hitachi-sk-hd1800', manufacturer: 'Hitachi', model: 'SK-HD1800', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'broadcast' },
  { id: 'hitachi-sk-uhd7000', manufacturer: 'Hitachi', model: 'SK-UHD7000', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },

  // ── ARRI ──
  { id: 'arri-alexa-35', manufacturer: 'ARRI', model: 'ALEXA 35', sensor: { name: 'ARRI ALEV 4 (27.99×19.22)', widthMm: 27.99, heightMm: 19.22, cropFactor: 1.29 }, mount: 'PL', adaptedMounts: ['EF', 'LPL'], resolutions: ['4.6K', '4K', 'HD'], type: 'cinema', notes: 'PL native (LPL optional via swap); EF via ARRI EF Mount', sensorModes: [
    { name: '4.6K 3:2 Open Gate (27.99×19.22)', widthMm: 27.99, heightMm: 19.22, cropFactor: 1.29 },
    { name: '4K 16:9 (24.88×13.99)', widthMm: 24.88, heightMm: 13.99, cropFactor: 1.45 },
    { name: '4K 2:1 (27.99×13.99)', widthMm: 27.99, heightMm: 13.99, cropFactor: 1.29 },
    { name: '4K S16 (12.42×7.0)', widthMm: 12.42, heightMm: 7.0, cropFactor: 2.91 },
  ], mountAdapters: {
    EF: { name: 'ARRI EF Mount (LBUS) for ALEXA 35', lightLossStops: 0, notes: 'ARRI-official EF mount module. Passive optically — full ALEV 4 sensor area available, no light loss. Electronic aperture control via LBUS.' },
    LPL: { name: 'ARRI LPL Mount for ALEXA 35', lightLossStops: 0, notes: 'Swappable LPL mount module. LPL is mechanically larger than PL with a shorter flange depth, designed for ARRI Signature Primes. No optical relay.' },
  } },
  { id: 'arri-amira', manufacturer: 'ARRI', model: 'AMIRA', sensor: SENSORS.S35, mount: 'PL', adaptedMounts: ['EF', 'B4'], resolutions: ['4K UHD', 'HD'], type: 'cinema', notes: 'PL native; EF/B4 via ARRI mount kits', mountAdapters: {
    EF: { name: 'ARRI EF Mount Module (AMIRA)', lightLossStops: 0, notes: 'ARRI-official EF mount kit for the AMIRA. Mechanical swap, no relay, full Super-35 sensor available.' },
    B4: { name: 'ARRI B4 Mount Kit (AMIRA) — 2/3" relay', lightLossStops: 1.0, cropSensor: SENSORS.TWO_THIRD, notes: 'B4 lens mount with internal 2× relay optics that crop the Super-35 sensor to a 2/3" image circle. Costs ~1 T-stop.' },
  } },

  // ── RED ──
  { id: 'red-v-raptor', manufacturer: 'RED', model: 'V-RAPTOR XL', sensor: { name: 'RED VV (40.96×21.6)', widthMm: 40.96, heightMm: 21.6, cropFactor: 0.88 }, mount: 'PL', adaptedMounts: ['EF', 'L', 'RF'], resolutions: ['8K', '6K', '4K'], type: 'cinema', notes: 'PL native (LPL optional); EF/L/RF via interchangeable RED mounts', mountAdapters: {
    EF: { name: 'RED V-RAPTOR EF Mount', lightLossStops: 0, notes: 'RED-official swappable EF mount. Mechanical change only — full VistaVision sensor area available, no light loss.' },
    L: { name: 'RED V-RAPTOR L-mount', lightLossStops: 0, notes: 'RED-official swappable L-mount. Useful with Sigma / Leica L lenses. Passive optically.' },
    RF: { name: 'RED V-RAPTOR RF Mount', lightLossStops: 0, notes: 'RED-official swappable Canon RF mount. Electronic aperture / IS supported with most RF glass.' },
  } },

  { id: 'red-komodo', manufacturer: 'RED', model: 'KOMODO 6K', sensor: { name: 'RED S35 6K (27.03×14.25)', widthMm: 27.03, heightMm: 14.25, cropFactor: 1.42 }, mount: 'RF', adaptedMounts: ['PL', 'EF'], resolutions: ['6K', '4K', '2K'], type: 'cinema', notes: 'Canon RF native; PL/EF via adapter' },
  { id: 'red-komodo-x', manufacturer: 'RED', model: 'KOMODO-X 6K', sensor: { name: 'RED S35 6K (27.03×14.25)', widthMm: 27.03, heightMm: 14.25, cropFactor: 1.42 }, mount: 'RF', adaptedMounts: ['PL', 'EF'], resolutions: ['6K', '4K', '2K'], type: 'cinema', notes: 'Canon RF native; PL/EF via adapter' },

  // ── Weitere verbreitete Cinema-Kameras (Sensor-Masse laut Datenblatt, 2026-09) ──
  { id: 'arri-alexa-mini-lf', manufacturer: 'ARRI', model: 'ALEXA Mini LF', sensor: { name: 'ARRI ALEV 3 LF (36.70×25.54)', widthMm: 36.70, heightMm: 25.54, cropFactor: 0.97 }, mount: 'LPL', adaptedMounts: ['PL', 'EF'], resolutions: ['4.5K', 'UHD', 'HD'], type: 'cinema', notes: 'LPL native; PL via LPL-zu-PL-Adapter, EF via ARRI EF-Mount' },
  { id: 'sony-burano', manufacturer: 'Sony', model: 'BURANO', sensor: { name: 'FF 8.6K (35.9×24.0)', widthMm: 35.9, heightMm: 24.0, cropFactor: 1.0 }, mount: 'E', adaptedMounts: ['PL', 'EF'], resolutions: ['8.6K', '6K', '4K', 'HD'], type: 'cinema', notes: 'E-Mount nativ mit eingebautem ND; PL via Adapter' },
  { id: 'panasonic-bs1h', manufacturer: 'Panasonic', model: 'BS1H', sensor: SENSORS.FF, mount: 'L', adaptedMounts: ['EF', 'PL'], resolutions: ['6K', '4K', 'HD'], type: 'cinema', notes: 'Vollformat-Box, L-Mount nativ; EF/PL via Adapter' },

  // ── Z CAM (Cine) ──
  { id: 'z-cam-e2', manufacturer: 'Z CAM', model: 'E2', sensor: SENSORS.MFT, mount: 'MFT', resolutions: ['4K', 'HD'], type: 'cinema', notes: 'MFT nativ' },
  { id: 'z-cam-e2c', manufacturer: 'Z CAM', model: 'E2C', sensor: SENSORS.MFT, mount: 'MFT', resolutions: ['4K', 'HD'], type: 'cinema' },
  { id: 'z-cam-e2-m4', manufacturer: 'Z CAM', model: 'E2-M4', sensor: { name: '4/3" WDR (19.0x13.0)', widthMm: 19.0, heightMm: 13.0, cropFactor: 1.88 }, mount: 'MFT', resolutions: ['4K', 'HD'], type: 'cinema' },
  { id: 'z-cam-e2-s6', manufacturer: 'Z CAM', model: 'E2-S6', sensor: SENSORS.S35, mount: 'EF', adaptedMounts: ['PL', 'MFT'], resolutions: ['6K', '4K', 'HD'], type: 'cinema', notes: 'EF nativ; PL/MFT via Wechselmount' },
  { id: 'z-cam-e2-f6', manufacturer: 'Z CAM', model: 'E2-F6', sensor: SENSORS.FF, mount: 'EF', adaptedMounts: ['PL'], resolutions: ['6K', '4K', 'HD'], type: 'cinema' },
  { id: 'z-cam-e2-f8', manufacturer: 'Z CAM', model: 'E2-F8', sensor: SENSORS.FF, mount: 'EF', adaptedMounts: ['PL'], resolutions: ['8K', '6K', '4K'], type: 'cinema' },
  { id: 'z-cam-e2-s6-mk2', manufacturer: 'Z CAM', model: 'E2-S6 Mark II', sensor: SENSORS.S35, mount: 'EF', adaptedMounts: ['PL', 'MFT'], resolutions: ['6K', '4K', 'HD'], type: 'cinema' },
  { id: 'z-cam-e2-f8-mk2', manufacturer: 'Z CAM', model: 'E2-F8 Mark II', sensor: SENSORS.FF, mount: 'EF', adaptedMounts: ['PL'], resolutions: ['8K', '6K', '4K'], type: 'cinema' },

  // ── Ikegami (Broadcast, 2/3" B4) ──
  { id: 'ikegami-uhk-430', manufacturer: 'Ikegami', model: 'UHK-430', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast', notes: 'Native-4K-Systemkamera' },
  { id: 'ikegami-uhk-x700', manufacturer: 'Ikegami', model: 'UHK-X700', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'ikegami-uhk-x600', manufacturer: 'Ikegami', model: 'UHK-X600', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'ikegami-uhl-43', manufacturer: 'Ikegami', model: 'UHL-43', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast', notes: 'Kompakt/POV 4K' },
  { id: 'ikegami-hdk-99', manufacturer: 'Ikegami', model: 'HDK-99', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'broadcast' },
  { id: 'ikegami-hdk-73', manufacturer: 'Ikegami', model: 'HDK-73', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'broadcast' },
  { id: 'ikegami-hdk-55', manufacturer: 'Ikegami', model: 'HDK-55', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'broadcast' },
  { id: 'ikegami-hdk-97arri', manufacturer: 'Ikegami', model: 'HDK-97ARRI', sensor: SENSORS.S35, mount: 'PL', resolutions: ['HD'], type: 'broadcast', notes: 'Super-35 mit ARRI-ALEV-Sensor, PL-Mount' },

  // ── Panasonic Broadcast (2/3" B4) ──
  { id: 'pana-ak-uc3000', manufacturer: 'Panasonic', model: 'AK-UC3000', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'pana-ak-hc3900', manufacturer: 'Panasonic', model: 'AK-HC3900', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'broadcast' },
  { id: 'pana-ak-hc3800', manufacturer: 'Panasonic', model: 'AK-HC3800', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'broadcast' },
  // ── Sony Broadcast (2/3" B4) ──
  { id: 'sony-hdc-3200', manufacturer: 'Sony', model: 'HDC-3200', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'sony-hdc-3170', manufacturer: 'Sony', model: 'HDC-3170', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'sony-hdc-3100', manufacturer: 'Sony', model: 'HDC-3100', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'broadcast' },
  { id: 'sony-hxc-fb80', manufacturer: 'Sony', model: 'HXC-FB80', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'sony-hsc-100', manufacturer: 'Sony', model: 'HSC-100', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'broadcast' },
  { id: 'sony-pxw-z750', manufacturer: 'Sony', model: 'PXW-Z750', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast', notes: 'Schulter-Camcorder, 3-CMOS Global Shutter' },
  { id: 'sony-pxw-z450', manufacturer: 'Sony', model: 'PXW-Z450', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  // ── Grass Valley / Hitachi (2/3" B4) ──
  { id: 'gv-ldx-135', manufacturer: 'Grass Valley', model: 'LDX 135', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'gv-ldx-98', manufacturer: 'Grass Valley', model: 'LDX 98', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'gv-ldx-86n', manufacturer: 'Grass Valley', model: 'LDX 86N', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'hitachi-sk-hd1500', manufacturer: 'Hitachi', model: 'SK-HD1500', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'broadcast' },
  { id: 'hitachi-z-hd6500', manufacturer: 'Hitachi', model: 'Z-HD6500', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'broadcast' },
  { id: 'hitachi-sk-uhd4000b', manufacturer: 'Hitachi', model: 'SK-UHD4000B', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  // ── Panasonic Cinema / Lumix ──
  { id: 'pana-au-eva1', manufacturer: 'Panasonic', model: 'AU-EVA1', sensor: SENSORS.S35, mount: 'EF', resolutions: ['5.7K', '4K', 'HD'], type: 'cinema', notes: 'S35, EF-Mount' },
  { id: 'pana-varicam-lt', manufacturer: 'Panasonic', model: 'VariCam LT', sensor: SENSORS.S35, mount: 'EF', adaptedMounts: ['PL'], resolutions: ['4K', 'HD'], type: 'cinema' },
  { id: 'pana-varicam-35', manufacturer: 'Panasonic', model: 'VariCam 35', sensor: SENSORS.S35, mount: 'PL', adaptedMounts: ['EF'], resolutions: ['4K', 'HD'], type: 'cinema' },
  { id: 'pana-lumix-s1h', manufacturer: 'Panasonic', model: 'Lumix S1H', sensor: SENSORS.FF, mount: 'L', adaptedMounts: ['EF', 'PL'], resolutions: ['6K', '4K', 'HD'], type: 'mirrorless' },
  { id: 'pana-lumix-gh6', manufacturer: 'Panasonic', model: 'Lumix GH6', sensor: SENSORS.MFT, mount: 'MFT', resolutions: ['5.7K', '4K', 'HD'], type: 'mirrorless' },
  { id: 'pana-lumix-gh7', manufacturer: 'Panasonic', model: 'Lumix GH7', sensor: SENSORS.MFT, mount: 'MFT', resolutions: ['5.8K', '4K', 'HD'], type: 'mirrorless' },
  { id: 'pana-lumix-bgh1', manufacturer: 'Panasonic', model: 'Lumix BGH1', sensor: SENSORS.MFT, mount: 'MFT', resolutions: ['4K', 'HD'], type: 'cinema', notes: 'Box-Style MFT' },
  // ── Kinefinity (Cine) ──
  { id: 'kine-mavo-edge-8k', manufacturer: 'Kinefinity', model: 'MAVO Edge 8K', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF'], resolutions: ['8K', '6K', '4K'], type: 'cinema' },
  { id: 'kine-mavo-edge-6k', manufacturer: 'Kinefinity', model: 'MAVO Edge 6K', sensor: SENSORS.S35, mount: 'E', adaptedMounts: ['PL', 'EF'], resolutions: ['6K', '4K', 'HD'], type: 'cinema' },
  { id: 'kine-mavo-lf', manufacturer: 'Kinefinity', model: 'MAVO LF', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF'], resolutions: ['6K', '4K', 'HD'], type: 'cinema' },
  { id: 'kine-mavo-s35', manufacturer: 'Kinefinity', model: 'MAVO S35', sensor: SENSORS.S35, mount: 'E', adaptedMounts: ['PL', 'EF'], resolutions: ['6K', '4K', 'HD'], type: 'cinema' },
  // ── PTZ (1" Sensor) ──
  { id: 'pana-aw-ue160', manufacturer: 'Panasonic', model: 'AW-UE160', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'pana-aw-ue100', manufacturer: 'Panasonic', model: 'AW-UE100', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'sony-brc-x1000', manufacturer: 'Sony', model: 'BRC-X1000', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'sony-srg-x400', manufacturer: 'Sony', model: 'SRG-X400', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'canon-cr-n700', manufacturer: 'Canon', model: 'CR-N700', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz', notes: '15x Zoom' },

  // ── Cinema (Ausbau) ──
  { id: 'canon-eos-c400', manufacturer: 'Canon', model: 'EOS C400', sensor: SENSORS.FF, mount: 'RF', adaptedMounts: ['EF', 'PL'], resolutions: ['6K', '4K', 'HD'], type: 'cinema', notes: 'FF 6K, RF nativ' },
  { id: 'canon-eos-c80', manufacturer: 'Canon', model: 'EOS C80', sensor: SENSORS.FF, mount: 'RF', adaptedMounts: ['EF'], resolutions: ['6K', '4K', 'HD'], type: 'cinema' },
  { id: 'red-v-raptor-vv', manufacturer: 'RED', model: 'V-RAPTOR 8K VV', sensor: SENSORS.FF, mount: 'RF', adaptedMounts: ['PL', 'EF'], resolutions: ['8K', '6K', '4K'], type: 'cinema', notes: 'VistaVision 8K' },
  { id: 'red-v-raptor-s35', manufacturer: 'RED', model: 'V-RAPTOR 8K S35', sensor: SENSORS.S35, mount: 'RF', adaptedMounts: ['PL', 'EF'], resolutions: ['8K', '6K', '4K'], type: 'cinema' },
  { id: 'red-v-raptor-xl-s35', manufacturer: 'RED', model: 'V-RAPTOR XL 8K S35', sensor: SENSORS.S35, mount: 'PL', adaptedMounts: ['RF', 'EF'], resolutions: ['8K', '6K', '4K'], type: 'cinema' },
  { id: 'red-v-raptor-x', manufacturer: 'RED', model: 'V-RAPTOR [X] 8K VV', sensor: SENSORS.FF, mount: 'RF', adaptedMounts: ['PL', 'EF'], resolutions: ['8K', '6K', '4K'], type: 'cinema', notes: 'Global Shutter' },
  { id: 'bmd-ursa-cine-12k', manufacturer: 'Blackmagic', model: 'URSA Cine 12K LF', sensor: SENSORS.FF, mount: 'PL', adaptedMounts: ['EF'], resolutions: ['12K', '8K', '4K'], type: 'cinema', notes: 'FF 36×24, RGBW-Sensor' },
  { id: 'arri-alexa-lf', manufacturer: 'ARRI', model: 'ALEXA LF', sensor: SENSORS.FF, mount: 'LPL', adaptedMounts: ['PL'], resolutions: ['4.5K', 'UHD', 'HD'], type: 'cinema' },
  // ── Camcorder ──
  { id: 'canon-xf705', manufacturer: 'Canon', model: 'XF705', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'camcorder' },
  { id: 'canon-xa75', manufacturer: 'Canon', model: 'XA75', sensor: { name: '1/2.5" (5.76×4.29)', widthMm: 5.76, heightMm: 4.29, cropFactor: 6.25 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'camcorder' },
  { id: 'sony-pxw-z190', manufacturer: 'Sony', model: 'PXW-Z190', sensor: SENSORS.THIRD_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'camcorder', notes: '1/3" 3-CMOS' },
  { id: 'sony-hxr-nx5r', manufacturer: 'Sony', model: 'HXR-NX5R', sensor: { name: '1/2.5" (5.76×4.29)', widthMm: 5.76, heightMm: 4.29, cropFactor: 6.25 }, mount: 'integrated', resolutions: ['HD'], type: 'camcorder' },
  { id: 'sony-pxw-fx30', manufacturer: 'Sony', model: 'PXW-FX30', sensor: SENSORS.APSC, mount: 'E', adaptedMounts: ['PL', 'EF'], resolutions: ['4K', 'HD'], type: 'cinema', notes: 'S35/APS-C Cinema Line' },
  { id: 'jvc-gy-hc900', manufacturer: 'JVC', model: 'GY-HC900', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'broadcast', notes: '3×2/3" B4' },
  { id: 'jvc-gy-hc550', manufacturer: 'JVC', model: 'GY-HC550', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'camcorder' },
  { id: 'pana-ag-cx350', manufacturer: 'Panasonic', model: 'AG-CX350', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'camcorder' },
  // ── PTZ (Ausbau) ──
  { id: 'canon-cr-n100', manufacturer: 'Canon', model: 'CR-N100', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'pana-aw-ue80', manufacturer: 'Panasonic', model: 'AW-UE80', sensor: { name: '1/2.5" (5.76×4.29)', widthMm: 5.76, heightMm: 4.29, cropFactor: 6.25 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'pana-aw-ue50', manufacturer: 'Panasonic', model: 'AW-UE50', sensor: { name: '1/2.5" (5.76×4.29)', widthMm: 5.76, heightMm: 4.29, cropFactor: 6.25 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'pana-aw-he145', manufacturer: 'Panasonic', model: 'AW-HE145', sensor: { name: '1/2.5" (5.76×4.29)', widthMm: 5.76, heightMm: 4.29, cropFactor: 6.25 }, mount: 'integrated', resolutions: ['HD'], type: 'ptz', notes: '3-MOS' },
  { id: 'sony-srg-a40', manufacturer: 'Sony', model: 'SRG-A40', sensor: { name: '1/2.5" (5.76×4.29)', widthMm: 5.76, heightMm: 4.29, cropFactor: 6.25 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'ptzoptics-move-4k', manufacturer: 'PTZOptics', model: 'Move 4K', sensor: { name: '1/2.5" (5.76×4.29)', widthMm: 5.76, heightMm: 4.29, cropFactor: 6.25 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'marshall-cv730', manufacturer: 'Marshall', model: 'CV730', sensor: { name: '1/2.5" (5.76×4.29)', widthMm: 5.76, heightMm: 4.29, cropFactor: 6.25 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },

  // ── Marshall POV/Kompakt ──
  { id: 'marshall-cv420-cs', manufacturer: 'Marshall', model: 'CV420-CS', sensor: { name: '1/1.7" (7.6×5.7)', widthMm: 7.6, heightMm: 5.7, cropFactor: 4.55 }, mount: 'CS', resolutions: ['4K', 'HD'], type: 'broadcast', notes: 'True-4K60 12G-SDI, CS-Mount' },
  { id: 'marshall-cv420e', manufacturer: 'Marshall', model: 'CV420e', sensor: { name: '1/1.8" (7.44×5.58)', widthMm: 7.44, heightMm: 5.58, cropFactor: 4.84 }, mount: 'CS', resolutions: ['4K', 'HD'], type: 'broadcast', notes: 'HDMI/IP/USB Stream' },
  { id: 'marshall-cv506', manufacturer: 'Marshall', model: 'CV506', sensor: SENSORS.THIRD_INCH, mount: 'M12', resolutions: ['HD'], type: 'broadcast', notes: 'Miniatur POV, 3G-SDI+HDMI' },
  { id: 'marshall-cv612', manufacturer: 'Marshall', model: 'CV612', sensor: { name: '1/2.8" (5.37×4.04)', widthMm: 5.37, heightMm: 4.04, cropFactor: 6.7 }, mount: 'integrated', resolutions: ['HD'], type: 'ptz', notes: 'Kompakt-PTZ' },
  // ── PTZ (weitere Marken) ──
  { id: 'lumens-vc-a71', manufacturer: 'Lumens', model: 'VC-A71', sensor: { name: '1/1.8" (7.44×5.58)', widthMm: 7.44, heightMm: 5.58, cropFactor: 4.84 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz', notes: '1/1.8", 30x Zoom' },
  { id: 'lumens-vc-a50p', manufacturer: 'Lumens', model: 'VC-A50P', sensor: { name: '1/2.8" (5.37×4.04)', widthMm: 5.37, heightMm: 4.04, cropFactor: 6.7 }, mount: 'integrated', resolutions: ['HD'], type: 'ptz' },
  { id: 'birddog-p400', manufacturer: 'BirdDog', model: 'P400', sensor: { name: '1/2.5" (5.76×4.29)', widthMm: 5.76, heightMm: 4.29, cropFactor: 6.25 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz', notes: 'Full-NDI' },
  { id: 'birddog-x1', manufacturer: 'BirdDog', model: 'X1', sensor: { name: '1/2.8" (5.37×4.04)', widthMm: 5.37, heightMm: 4.04, cropFactor: 6.7 }, mount: 'integrated', resolutions: ['HD'], type: 'ptz' },
  { id: 'aver-tr313', manufacturer: 'AVer', model: 'TR313', sensor: { name: '1/2.8" (5.37×4.04)', widthMm: 5.37, heightMm: 4.04, cropFactor: 6.7 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz', notes: 'Auto-Tracking, 12x' },
  { id: 'aver-tr333', manufacturer: 'AVer', model: 'TR333', sensor: { name: '1/2.8" (5.37×4.04)', widthMm: 5.37, heightMm: 4.04, cropFactor: 6.7 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'sony-srg-xp1', manufacturer: 'Sony', model: 'SRG-XP1', sensor: { name: '1/2.8" (5.37×4.04)', widthMm: 5.37, heightMm: 4.04, cropFactor: 6.7 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz', notes: 'POV-Box' },
  { id: 'pana-aw-ue20', manufacturer: 'Panasonic', model: 'AW-UE20', sensor: { name: '1/2.5" (5.76×4.29)', widthMm: 5.76, heightMm: 4.29, cropFactor: 6.25 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'ptzoptics-link-4k', manufacturer: 'PTZOptics', model: 'Link 4K', sensor: { name: '1/2.5" (5.76×4.29)', widthMm: 5.76, heightMm: 4.29, cropFactor: 6.25 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },

  // ── Cinema-Hybride / Mirrorless (Ausbau) ──
  { id: 'canon-eos-r5c', manufacturer: 'Canon', model: 'EOS R5 C', sensor: SENSORS.FF, mount: 'RF', adaptedMounts: ['EF'], resolutions: ['8K', '4K', 'HD'], type: 'cinema', notes: 'Cine-Hybrid, aktive Kühlung' },
  { id: 'canon-eos-r5-ii', manufacturer: 'Canon', model: 'EOS R5 Mark II', sensor: SENSORS.FF, mount: 'RF', adaptedMounts: ['EF'], resolutions: ['8K', '4K', 'HD'], type: 'mirrorless' },
  { id: 'canon-eos-r3', manufacturer: 'Canon', model: 'EOS R3', sensor: SENSORS.FF, mount: 'RF', adaptedMounts: ['EF'], resolutions: ['6K', '4K', 'HD'], type: 'mirrorless' },
  { id: 'canon-eos-r6-ii', manufacturer: 'Canon', model: 'EOS R6 Mark II', sensor: SENSORS.FF, mount: 'RF', adaptedMounts: ['EF'], resolutions: ['4K', 'HD'], type: 'mirrorless' },
  { id: 'sony-a1', manufacturer: 'Sony', model: 'A1', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF'], resolutions: ['8K', '4K', 'HD'], type: 'mirrorless' },
  { id: 'sony-a7r5', manufacturer: 'Sony', model: 'A7R V', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF'], resolutions: ['8K', '4K', 'HD'], type: 'mirrorless' },
  { id: 'sony-a9-iii', manufacturer: 'Sony', model: 'A9 III', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF'], resolutions: ['4K', 'HD'], type: 'mirrorless', notes: 'Global Shutter' },
  { id: 'pana-lumix-s5-ii', manufacturer: 'Panasonic', model: 'Lumix S5 II', sensor: SENSORS.FF, mount: 'L', adaptedMounts: ['EF', 'PL'], resolutions: ['6K', '4K', 'HD'], type: 'mirrorless' },
  { id: 'pana-lumix-s1', manufacturer: 'Panasonic', model: 'Lumix S1', sensor: SENSORS.FF, mount: 'L', adaptedMounts: ['EF'], resolutions: ['4K', 'HD'], type: 'mirrorless' },
  { id: 'pana-lumix-gh5-ii', manufacturer: 'Panasonic', model: 'Lumix GH5 II', sensor: SENSORS.MFT, mount: 'MFT', resolutions: ['4K', 'HD'], type: 'mirrorless' },
  // ── RED DSMC2 ──
  { id: 'red-dsmc2-monstro', manufacturer: 'RED', model: 'DSMC2 Monstro 8K VV', sensor: { name: 'RED VV Monstro (40.96×21.6)', widthMm: 40.96, heightMm: 21.6, cropFactor: 0.88 }, mount: 'PL', adaptedMounts: ['RF', 'EF'], resolutions: ['8K', '6K', '4K'], type: 'cinema' },
  { id: 'red-dsmc2-helium', manufacturer: 'RED', model: 'DSMC2 Helium 8K S35', sensor: { name: 'RED S35 Helium (29.9×15.77)', widthMm: 29.9, heightMm: 15.77, cropFactor: 1.2 }, mount: 'RF', adaptedMounts: ['PL', 'EF'], resolutions: ['8K', '6K', '4K'], type: 'cinema' },
  { id: 'red-dsmc2-gemini', manufacturer: 'RED', model: 'DSMC2 Gemini 5K S35', sensor: { name: 'RED S35 Gemini (30.72×18.0)', widthMm: 30.72, heightMm: 18.0, cropFactor: 1.16 }, mount: 'RF', adaptedMounts: ['PL', 'EF'], resolutions: ['5K', '4K', 'HD'], type: 'cinema', notes: 'Dual-ISO Low-Light' },
  // ── Broadcast / POV (Ausbau) ──
  { id: 'marshall-cv566', manufacturer: 'Marshall', model: 'CV566', sensor: { name: '1/2.8" (5.37×4.04)', widthMm: 5.37, heightMm: 4.04, cropFactor: 6.7 }, mount: 'M12', resolutions: ['HD'], type: 'broadcast', notes: 'Micro-Genlock POV' },
  { id: 'marshall-cv346', manufacturer: 'Marshall', model: 'CV346', sensor: { name: '1/2.8" (5.37×4.04)', widthMm: 5.37, heightMm: 4.04, cropFactor: 6.7 }, mount: 'M12', resolutions: ['HD'], type: 'broadcast' },
  { id: 'marshall-cv380', manufacturer: 'Marshall', model: 'CV380-CS', sensor: { name: '1/2.5" (5.76×4.29)', widthMm: 5.76, heightMm: 4.29, cropFactor: 6.25 }, mount: 'CS', resolutions: ['4K', 'HD'], type: 'broadcast' },

  // ── Nikon Z (Bodies für die Z-Objektive) ──
  { id: 'nikon-z9', manufacturer: 'Nikon', model: 'Z9', sensor: SENSORS.FF, mount: 'Z', resolutions: ['8K', '4K', 'HD'], type: 'mirrorless', notes: 'Global-ish Stacked FF, Z-Mount' },
  { id: 'nikon-z8', manufacturer: 'Nikon', model: 'Z8', sensor: SENSORS.FF, mount: 'Z', resolutions: ['8K', '4K', 'HD'], type: 'mirrorless' },
  { id: 'nikon-z6-iii', manufacturer: 'Nikon', model: 'Z6 III', sensor: SENSORS.FF, mount: 'Z', resolutions: ['6K', '4K', 'HD'], type: 'mirrorless' },
  { id: 'nikon-zf', manufacturer: 'Nikon', model: 'Zf', sensor: SENSORS.FF, mount: 'Z', resolutions: ['4K', 'HD'], type: 'mirrorless' },
  // ── Sony / Panasonic Mirrorless (Ausbau) ──
  { id: 'sony-zv-e1', manufacturer: 'Sony', model: 'ZV-E1', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF'], resolutions: ['4K', 'HD'], type: 'mirrorless' },
  { id: 'sony-a7-iii', manufacturer: 'Sony', model: 'A7 III', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF'], resolutions: ['4K', 'HD'], type: 'mirrorless' },
  { id: 'sony-a6700', manufacturer: 'Sony', model: 'A6700', sensor: SENSORS.APSC, mount: 'E', resolutions: ['4K', 'HD'], type: 'mirrorless', notes: 'APS-C' },
  { id: 'sony-fx2', manufacturer: 'Sony', model: 'FX2', sensor: SENSORS.FF, mount: 'E', adaptedMounts: ['PL', 'EF'], resolutions: ['4K', 'HD'], type: 'cinema', notes: 'Cinema Line FF' },
  { id: 'pana-lumix-s9', manufacturer: 'Panasonic', model: 'Lumix S9', sensor: SENSORS.FF, mount: 'L', adaptedMounts: ['EF'], resolutions: ['6K', '4K', 'HD'], type: 'mirrorless' },
  // ── PTZ (Ausbau) ──
  { id: 'sony-srg-a12', manufacturer: 'Sony', model: 'SRG-A12', sensor: { name: '1/2.8" (5.37×4.04)', widthMm: 5.37, heightMm: 4.04, cropFactor: 6.7 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz' },
  { id: 'pana-aw-he40', manufacturer: 'Panasonic', model: 'AW-HE40', sensor: { name: '1/2.8" (5.37×4.04)', widthMm: 5.37, heightMm: 4.04, cropFactor: 6.7 }, mount: 'integrated', resolutions: ['HD'], type: 'ptz' },
  { id: 'ptzoptics-move-se', manufacturer: 'PTZOptics', model: 'Move SE', sensor: { name: '1/2.8" (5.37×4.04)', widthMm: 5.37, heightMm: 4.04, cropFactor: 6.7 }, mount: 'integrated', resolutions: ['HD'], type: 'ptz' },
  { id: 'lumens-vc-tr40', manufacturer: 'Lumens', model: 'VC-TR40', sensor: { name: '1/2.5" (5.76×4.29)', widthMm: 5.76, heightMm: 4.29, cropFactor: 6.25 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'ptz', notes: 'Auto-Tracking' },
  { id: 'aver-tr311', manufacturer: 'AVer', model: 'TR311', sensor: { name: '1/2.8" (5.37×4.04)', widthMm: 5.37, heightMm: 4.04, cropFactor: 6.7 }, mount: 'integrated', resolutions: ['HD'], type: 'ptz' },

  // ── Broadcast / Cinema (Abschluss) ──
  { id: 'sony-hdc-p50', manufacturer: 'Sony', model: 'HDC-P50', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast', notes: 'POV-Systemkamera' },
  { id: 'sony-hdc-5500v2', manufacturer: 'Sony', model: 'HDC-5500V2', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'sony-hxc-fz90', manufacturer: 'Sony', model: 'HXC-FZ90', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'pana-ak-ub300', manufacturer: 'Panasonic', model: 'AK-UB300', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast', notes: 'Box-Systemkamera' },
  { id: 'gv-ldx-82', manufacturer: 'Grass Valley', model: 'LDX 82', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['HD'], type: 'broadcast' },
  { id: 'hitachi-sk-uhd8060b', manufacturer: 'Hitachi', model: 'SK-UHD8060B', sensor: SENSORS.TWO_THIRD, mount: 'B4', resolutions: ['4K', 'HD'], type: 'broadcast' },
  { id: 'bmd-ursa-mini-pro-12k', manufacturer: 'Blackmagic', model: 'URSA Mini Pro 12K', sensor: SENSORS.S35, mount: 'PL', adaptedMounts: ['EF'], resolutions: ['12K', '8K', '4K'], type: 'cinema', notes: 'S35 12K' },
  { id: 'jvc-gy-hc500', manufacturer: 'JVC', model: 'GY-HC500', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'camcorder' },
  { id: 'jvc-gy-hm250', manufacturer: 'JVC', model: 'GY-HM250', sensor: { name: '1/2.3" (6.17×4.55)', widthMm: 6.17, heightMm: 4.55, cropFactor: 5.64 }, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'camcorder' },
  { id: 'canon-xf400', manufacturer: 'Canon', model: 'XF400', sensor: SENSORS.ONE_INCH, mount: 'integrated', resolutions: ['4K', 'HD'], type: 'camcorder' },

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
 * Canonical focal-reducer ("Speed Booster") per lens→body mount combo, keyed
 * "<lensMount>-><bodyMount>". Only the common 0.71× ULTRA variant is modelled
 * because the UI exposes Speed Booster as a single on/off toggle; the widened
 * sensor is derived from the body's own native sensor at runtime, so one entry
 * stays correct on any body that exposes the combo (MFT, FZ, S35 E …).
 *
 * This is intentionally NOT a global auto-adapter catalogue — it only resolves
 * when the operator explicitly enables `VenueCamera.useSpeedbooster`, matching
 * the strict, opt-in mount model below.
 */
const SPEED_BOOSTERS: Record<string, { name: string; factor: number }> = {
  'EF->MFT': { name: 'Metabones EF → MFT Speed Booster ULTRA II 0.71×',   factor: 0.71 },
  'EF->FZ':  { name: 'Metabones EF → FZ Speed Booster ULTRA 0.71×',       factor: 0.71 },
  'EF->E':   { name: 'Metabones EF → E CINE Speed Booster ULTRA II 0.71×', factor: 0.71 },
  'EF->X':   { name: 'Metabones EF-X CINE Speed Booster ULTRA II 0.71×',  factor: 0.71 },
  'NF->E':   { name: 'Metabones Nikon G → E Speed Booster ULTRA II 0.71×', factor: 0.71 },
  'NF->MFT': { name: 'Metabones Nikon G → MFT Speed Booster ULTRA 0.71×',  factor: 0.71 },
};

/** True when a Speed Booster focal reducer exists for the lens→body mount combo. */
export function speedBoosterExists(lensMount?: string, bodyMount?: string): boolean {
  if (!lensMount || !bodyMount) return false;
  return `${lensMount}->${bodyMount}` in SPEED_BOOSTERS;
}

/**
 * Resolve the Speed Booster fitted between an adapted lens and the body, if the
 * combo is supported. The widened sensor is computed from the body's own native
 * sensor (focal reduction enlarges the captured area by 1/factor), so a 0.71×
 * booster reports the correct effective frame on an MFT, FZ or S35 body alike.
 */
export function getSpeedBooster(camera: Camera, activeMount?: string): AdapterInfo | null {
  const lensMount = activeMount ?? camera.mount;
  const def = SPEED_BOOSTERS[`${lensMount}->${camera.mount}`];
  if (!def) return null;
  const { factor, name } = def;
  const widened: SensorSize = {
    name: `${camera.sensor.name} + Speed Booster ${factor}×`,
    widthMm: camera.sensor.widthMm / factor,
    heightMm: camera.sensor.heightMm / factor,
    cropFactor: camera.sensor.cropFactor * factor,
  };
  // Focal reduction is a light *gain*: stops = 2·log2(factor) (negative).
  const lightLossStops = Math.round(2 * Math.log2(factor) * 10) / 10;
  return {
    name,
    lightLossStops,
    cropSensor: widened,
    notes: `Focal reducer between the ${lensMount} lens and the ${camera.mount} body. Widens the field of view by 1/${factor} and gains ~${Math.abs(lightLossStops)} T-stop; the effective sensor area scales up accordingly.`,
  };
}

/**
 * Determine the adapter currently fitted on the camera, if any.
 *
 * Strict model:
 *   - The user picks the mount plate via the camera's Mount selector
 *     (`VenueCamera.activeMount`). Whatever adapter is needed to convert from
 *     `camera.mount` to `activeMount` is described in
 *     `camera.mountAdapters[activeMount]`.
 *   - The lens MUST match `activeMount`. There is no automatic "you picked a
 *     B4 lens so we'll assume you also fitted the LA-FZB1" — that path made
 *     the calculator silently apply optical penalties the user never opted
 *     into. Lens-mount mismatches are surfaced as an incompatibility warning
 *     in the UI instead.
 *   - Speed Booster is an opt-in focal reducer (`VenueCamera.useSpeedbooster`)
 *     that swaps in for the passive mount plate. When enabled and a booster
 *     exists for the active lens mount → body mount combo (see SPEED_BOOSTERS),
 *     it supersedes the body's plain mountAdapter entry.
 */
export function getAdapterInfo(camera: Camera, _lens: Lens, useSpeedbooster = false, activeMount?: string): AdapterInfo | null {
  const effectiveMount = activeMount ?? camera.mount;

  if (useSpeedbooster) {
    const booster = getSpeedBooster(camera, effectiveMount);
    if (booster) return booster;
  }

  return camera.mountAdapters?.[effectiveMount] ?? null;
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

// ── Lens image circle (mm) by mount ──
// Rough nominal projected circle diameter for each lens family. Used by
// getCoverageStatus to warn when a lens can't fully cover the effective
// sensor (vignetting). A lens that publishes a smaller circle than its
// mount suggests (Sigma DC, Tamron Di III-A, Canon EF-S, Sony E APS-C)
// should set `Lens.imageCircle` to override this default.
const MOUNT_IMAGE_CIRCLE_MM: Record<string, number> = {
  PL:   31.4,  // Super-35 image circle
  LPL:  46.3,  // Full-frame / VistaVision
  EF:   43.3,
  RF:   43.3,
  E:    43.3,  // FE-mount lenses; APS-C E glass overridden via Lens.imageCircle
  L:    43.3,
  NF:   43.3,
  FZ:   31.4,  // Sony FZ is S35-class
  MFT:  21.6,
  X:    28.2,  // Fujifilm X is APS-C
  B4:   11.0,  // 2/3" broadcast
  M12:  8.0,   // POV / industrial — well under 1/2"
  integrated: 0,
  universal: 43.3,
};

// Explicit image-circle diameters in mm, keyed by Lens.imageCircle kind.
const IMAGE_CIRCLE_KIND_MM: Record<string, number> = {
  FF:   43.3,
  S35:  31.4,
  APSC: 28.2,
  MFT:  21.6,
  '2/3': 11.0,
  '1':  16.0,
  integrated: 0,
};

export type CoverageStatus = 'ok' | 'marginal' | 'vignette';
export interface CoverageResult {
  status: CoverageStatus;
  ratio: number;
  message?: string;
}

/**
 * Compare the lens image circle (inferred from its mount) against the
 * effective sensor diagonal so the UI can warn about vignetting. B4 lenses
 * on a Super-35 body without the right relay adapter, for example, leave
 * massive black corners; this catches that mid-setup.
 */
export function getCoverageStatus(camera: Camera, lens: Lens, useSpeedbooster = false, activeMount?: string, sensorModeIndex?: number): CoverageResult {
  if (lens.mount === 'integrated') return { status: 'ok', ratio: 1 };
  const adapter = getAdapterInfo(camera, lens, useSpeedbooster, activeMount);
  // Adapter with a cropSensor (B4 relay, Speedbooster) re-projects the lens
  // onto its own sensor area. The effective image circle is then bounded by
  // that adapter's crop, not by the bare lens.
  // Explicit `lens.imageCircle` overrides the per-mount heuristic so that
  // crop-format glass on a full-frame mount (Sigma DC, EF-S etc.) flags
  // correctly.
  let circle = lens.imageCircle
    ? IMAGE_CIRCLE_KIND_MM[lens.imageCircle] ?? 43.3
    : MOUNT_IMAGE_CIRCLE_MM[lens.mount] ?? 43.3;
  if (adapter?.cropSensor) {
    const adapterDiag = Math.hypot(adapter.cropSensor.widthMm, adapter.cropSensor.heightMm);
    circle = Math.min(circle, adapterDiag);
  }
  const sensor = getEffectiveSensor(camera, lens, useSpeedbooster, sensorModeIndex, activeMount);
  const sensorDiag = Math.hypot(sensor.widthMm, sensor.heightMm);
  if (sensorDiag <= 0) return { status: 'ok', ratio: 1 };
  const ratio = circle / sensorDiag;
  if (ratio >= 1.0) return { status: 'ok', ratio };
  if (ratio >= 0.9) {
    return { status: 'marginal', ratio, message: `Bildkreis knapp (${(ratio * 100).toFixed(0)} %) — Ecken können abdunkeln.` };
  }
  return { status: 'vignette', ratio, message: `Objektiv deckt den Sensor nicht (${(ratio * 100).toFixed(0)} %) — starke Vignettierung, Crop nötig.` };
}

export const CAMERA_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#8b5cf6',
  '#f43f5e', '#0ea5e9', '#84cc16', '#d946ef', '#fb923c',
];
