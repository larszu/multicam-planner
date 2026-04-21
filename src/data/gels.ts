import type { GelFilter } from '../types/lighting';

/**
 * Small curated gel library – Lee / Rosco staples only.
 * Transmission factors are industry-averaged.
 */
export const GELS: GelFilter[] = [
  { id: 'lee-201', name: 'Full CT Blue', brand: 'LEE', code: '201', type: 'CTB', transmissionFactor: 0.36, miredShift: -131, displayColor: '#a8d0ff' },
  { id: 'lee-202', name: 'Half CT Blue', brand: 'LEE', code: '202', type: 'CTB', transmissionFactor: 0.56, miredShift: -68, displayColor: '#c7dfff' },
  { id: 'lee-203', name: 'Quarter CT Blue', brand: 'LEE', code: '203', type: 'CTB', transmissionFactor: 0.73, miredShift: -35, displayColor: '#daeaff' },
  { id: 'lee-204', name: 'Full CT Orange', brand: 'LEE', code: '204', type: 'CTO', transmissionFactor: 0.52, miredShift: 159, displayColor: '#ffc48a' },
  { id: 'lee-205', name: 'Half CT Orange', brand: 'LEE', code: '205', type: 'CTO', transmissionFactor: 0.64, miredShift: 81, displayColor: '#ffd8b0' },
  { id: 'lee-216', name: 'White Diffusion', brand: 'LEE', code: '216', type: 'diffusion', transmissionFactor: 0.39, diffusionLevel: 0.9, displayColor: '#f5f5f5' },
  { id: 'lee-250', name: 'Half White Diffusion', brand: 'LEE', code: '250', type: 'diffusion', transmissionFactor: 0.55, diffusionLevel: 0.5, displayColor: '#fafafa' },
  { id: 'lee-251', name: 'Quarter White Diffusion', brand: 'LEE', code: '251', type: 'diffusion', transmissionFactor: 0.7, diffusionLevel: 0.25, displayColor: '#ffffff' },
  { id: 'lee-025', name: 'Sunset Red', brand: 'LEE', code: '025', type: 'color', transmissionFactor: 0.15, displayColor: '#ff5a3a' },
  { id: 'lee-106', name: 'Primary Red', brand: 'LEE', code: '106', type: 'color', transmissionFactor: 0.11, displayColor: '#d41c1c' },
  { id: 'lee-120', name: 'Deep Blue', brand: 'LEE', code: '120', type: 'color', transmissionFactor: 0.10, displayColor: '#1b3fc4' },
  { id: 'lee-124', name: 'Dark Green', brand: 'LEE', code: '124', type: 'color', transmissionFactor: 0.14, displayColor: '#0e7a2c' },
  { id: 'lee-136', name: 'Pale Lavender', brand: 'LEE', code: '136', type: 'color', transmissionFactor: 0.65, displayColor: '#c8b6e6' },
  { id: 'rosco-3202', name: 'Full Blue', brand: 'Rosco', code: '3202', type: 'CTB', transmissionFactor: 0.34, miredShift: -137, displayColor: '#b0d4ff' },
  { id: 'rosco-3407', name: 'Full CTO', brand: 'Rosco', code: '3407', type: 'CTO', transmissionFactor: 0.48, miredShift: 167, displayColor: '#ffb676' },
  { id: 'rosco-3005', name: 'Tough Frost', brand: 'Rosco', code: '3005', type: 'frost', transmissionFactor: 0.65, diffusionLevel: 0.6, displayColor: '#f5f5f5' },
];

const GEL_MAP = new Map(GELS.map((g) => [g.id, g]));

export function getGelById(id: string): GelFilter | undefined {
  return GEL_MAP.get(id);
}

/** Combined transmission factor for a stack of gels (multiplicative). */
export function gelStackTransmission(ids: string[] | undefined): number {
  if (!ids || ids.length === 0) return 1;
  return ids.reduce((acc, id) => {
    const g = GEL_MAP.get(id);
    return g ? acc * g.transmissionFactor : acc;
  }, 1);
}

/** Average display color of a gel stack (used for 2D/3D visualisation). */
export function gelStackColor(ids: string[] | undefined): string | undefined {
  if (!ids || ids.length === 0) return undefined;
  // Blend colors by averaging channels weighted by transmissionFactor.
  const gels = ids.map((id) => GEL_MAP.get(id)).filter((g): g is GelFilter => !!g && !!g.displayColor);
  if (gels.length === 0) return undefined;
  let r = 0, g = 0, b = 0, w = 0;
  for (const gel of gels) {
    const hex = gel.displayColor!.replace('#', '');
    const rr = parseInt(hex.slice(0, 2), 16);
    const gg = parseInt(hex.slice(2, 4), 16);
    const bb = parseInt(hex.slice(4, 6), 16);
    const weight = Math.max(0.1, gel.transmissionFactor);
    r += rr * weight; g += gg * weight; b += bb * weight; w += weight;
  }
  if (w === 0) return undefined;
  const toHex = (v: number) => Math.round(v / w).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
