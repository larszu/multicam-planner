import type { Lens } from '../types';

export const LENSES: Lens[] = [
  // ══════════════════════════════════════════════
  //  B4 BROADCAST ZOOM LENSES (2/3" mount)
  // ══════════════════════════════════════════════

  // ── Fujinon B4 ──
  { id: 'fuj-xa20sx8.5', manufacturer: 'Fujinon', model: 'XA20sx8.5BRM', focalLengthMin: 8.5, focalLengthMax: 170, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom' },
  { id: 'fuj-xa17x7.6', manufacturer: 'Fujinon', model: 'XA17x7.6BRM', focalLengthMin: 7.6, focalLengthMax: 129, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom' },
  { id: 'fuj-ha23x7.6', manufacturer: 'Fujinon', model: 'HA23x7.6BERD', focalLengthMin: 7.6, focalLengthMax: 175, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom' },
  { id: 'fuj-ha18x7.6', manufacturer: 'Fujinon', model: 'HA18x7.6BERM', focalLengthMin: 7.6, focalLengthMax: 137, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom' },
  { id: 'fuj-ha14x4.5', manufacturer: 'Fujinon', model: 'HA14x4.5BERD', focalLengthMin: 4.5, focalLengthMax: 63, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Ultra wide angle' },
  { id: 'fuj-ua107x8.4', manufacturer: 'Fujinon', model: 'UA107x8.4BESM', focalLengthMin: 8.4, focalLengthMax: 900, maxApertureWide: 1.7, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Box lens (107x zoom)' },
  { id: 'fuj-ua80x9', manufacturer: 'Fujinon', model: 'UA80x9BESM', focalLengthMin: 9, focalLengthMax: 720, maxApertureWide: 1.7, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Box lens' },
  { id: 'fuj-ua46x9.5', manufacturer: 'Fujinon', model: 'UA46x9.5BERD', focalLengthMin: 9.5, focalLengthMax: 437, maxApertureWide: 1.7, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Box lens' },
  { id: 'fuj-ua24x7.8', manufacturer: 'Fujinon', model: 'UA24x7.8BERD', focalLengthMin: 7.8, focalLengthMax: 187, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: '4K Premium handheld' },

  // ── Canon B4 ──
  { id: 'can-cj20ex7.8b', manufacturer: 'Canon', model: 'CJ20ex7.8B', focalLengthMin: 7.8, focalLengthMax: 156, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom' },
  { id: 'can-cj15ex4.3b', manufacturer: 'Canon', model: 'CJ15ex4.3B', focalLengthMin: 4.3, focalLengthMax: 64.5, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Wide angle' },
  { id: 'can-cj24ex7.5b', manufacturer: 'Canon', model: 'CJ24ex7.5B', focalLengthMin: 7.5, focalLengthMax: 180, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom' },
  { id: 'can-cj45ex9.7b', manufacturer: 'Canon', model: 'CJ45ex9.7B', focalLengthMin: 9.7, focalLengthMax: 436, maxApertureWide: 1.7, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Box lens' },
  { id: 'can-cj12ex4.3b', manufacturer: 'Canon', model: 'CJ12ex4.3B', focalLengthMin: 4.3, focalLengthMax: 51.6, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Ultra wide' },
  { id: 'can-hj22ex7.6b', manufacturer: 'Canon', model: 'HJ22ex7.6B', focalLengthMin: 7.6, focalLengthMax: 167, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom' },
  { id: 'can-hj14ex4.3b', manufacturer: 'Canon', model: 'HJ14ex4.3B', focalLengthMin: 4.3, focalLengthMax: 60, maxApertureWide: 1.8, mount: 'B4', extenderFactors: [2], type: 'zoom', notes: 'Wide angle HD' },

  // ══════════════════════════════════════════════
  //  CINEMA / E-MOUNT ZOOMS
  // ══════════════════════════════════════════════

  { id: 'sony-28-135', manufacturer: 'Sony', model: 'FE PZ 28-135mm f/4 G OSS', focalLengthMin: 28, focalLengthMax: 135, maxApertureWide: 4, mount: 'E', type: 'zoom' },
  { id: 'sony-16-35gm', manufacturer: 'Sony', model: 'FE 16-35mm f/2.8 GM II', focalLengthMin: 16, focalLengthMax: 35, maxApertureWide: 2.8, mount: 'E', type: 'zoom' },
  { id: 'sony-24-70gm', manufacturer: 'Sony', model: 'FE 24-70mm f/2.8 GM II', focalLengthMin: 24, focalLengthMax: 70, maxApertureWide: 2.8, mount: 'E', type: 'zoom' },
  { id: 'sony-70-200gm', manufacturer: 'Sony', model: 'FE 70-200mm f/2.8 GM II', focalLengthMin: 70, focalLengthMax: 200, maxApertureWide: 2.8, mount: 'E', type: 'zoom' },
  { id: 'sony-200-600', manufacturer: 'Sony', model: 'FE 200-600mm f/5.6-6.3 G', focalLengthMin: 200, focalLengthMax: 600, maxApertureWide: 5.6, maxApertureTele: 6.3, mount: 'E', type: 'zoom' },

  // ── Canon Cinema ──
  { id: 'can-cn-e18-80', manufacturer: 'Canon', model: 'CN-E 18-80mm T4.4', focalLengthMin: 18, focalLengthMax: 80, maxApertureWide: 4.4, mount: 'EF', type: 'zoom' },
  { id: 'can-cn-e70-200', manufacturer: 'Canon', model: 'CN-E 70-200mm T4.4', focalLengthMin: 70, focalLengthMax: 200, maxApertureWide: 4.4, mount: 'EF', type: 'zoom' },

  // ── Sigma Cine ──
  { id: 'sigma-18-35-cine', manufacturer: 'Sigma', model: 'Cine 18-35mm T2.0', focalLengthMin: 18, focalLengthMax: 35, maxApertureWide: 2.0, mount: 'EF', type: 'zoom' },
  { id: 'sigma-50-100-cine', manufacturer: 'Sigma', model: 'Cine 50-100mm T2.0', focalLengthMin: 50, focalLengthMax: 100, maxApertureWide: 2.0, mount: 'EF', type: 'zoom' },

  // ══════════════════════════════════════════════
  //  MFT LENSES (Blackmagic etc.)
  // ══════════════════════════════════════════════
  { id: 'oly-12-100', manufacturer: 'Olympus', model: 'M.Zuiko 12-100mm f/4', focalLengthMin: 12, focalLengthMax: 100, maxApertureWide: 4, mount: 'MFT', type: 'zoom' },
  { id: 'pana-10-25', manufacturer: 'Panasonic', model: 'Leica 10-25mm f/1.7', focalLengthMin: 10, focalLengthMax: 25, maxApertureWide: 1.7, mount: 'MFT', type: 'zoom' },

  // ══════════════════════════════════════════════
  //  PTZ INTEGRATED LENSES (virtual entries)
  // ══════════════════════════════════════════════
  { id: 'ptz-sony-brc-x400', manufacturer: 'Sony', model: 'BRC-X400 integrated 20x', focalLengthMin: 4.4, focalLengthMax: 88, maxApertureWide: 2.0, mount: 'integrated', type: 'integrated', notes: '20x optical zoom' },
  { id: 'ptz-sony-srg-x120', manufacturer: 'Sony', model: 'SRG-X120 integrated 12x', focalLengthMin: 4.4, focalLengthMax: 52.8, maxApertureWide: 2.0, mount: 'integrated', type: 'integrated', notes: '12x optical zoom' },
  { id: 'ptz-pana-ue150', manufacturer: 'Panasonic', model: 'AW-UE150 integrated 20x', focalLengthMin: 4.08, focalLengthMax: 81.6, maxApertureWide: 1.6, mount: 'integrated', type: 'integrated', notes: '20x optical zoom' },
  { id: 'ptz-pana-ue40', manufacturer: 'Panasonic', model: 'AW-UE40 integrated 24x', focalLengthMin: 4.3, focalLengthMax: 103.2, maxApertureWide: 1.8, mount: 'integrated', type: 'integrated', notes: '24x optical zoom' },
  { id: 'ptz-canon-crn500', manufacturer: 'Canon', model: 'CR-N500 integrated 15x', focalLengthMin: 8.9, focalLengthMax: 133.5, maxApertureWide: 2.8, mount: 'integrated', type: 'integrated', notes: '15x optical zoom' },
  { id: 'ptz-canon-crn300', manufacturer: 'Canon', model: 'CR-N300 integrated 20x', focalLengthMin: 4.3, focalLengthMax: 86, maxApertureWide: 2.0, mount: 'integrated', type: 'integrated', notes: '20x optical zoom' },
  { id: 'ptz-sony-fr7', manufacturer: 'Sony', model: 'FR7 (no integrated lens)', focalLengthMin: 28, focalLengthMax: 135, maxApertureWide: 4, mount: 'E', type: 'zoom', notes: 'Use E-mount lens' },
];

export function getLensById(id: string): Lens | undefined {
  return LENSES.find((l) => l.id === id);
}

export function getLensesByMount(mount: string): Lens[] {
  return LENSES.filter((l) => l.mount === mount);
}

export function getCompatibleLenses(cameraMount: string): Lens[] {
  if (cameraMount === 'integrated') return LENSES.filter((l) => l.mount === 'integrated');
  return LENSES.filter((l) => l.mount === cameraMount || l.mount === 'integrated');
}
