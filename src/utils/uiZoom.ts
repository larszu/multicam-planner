import { loadJSON, saveJSON } from './storage';

/**
 * Globale UI-Skalierung (Zoom). Die App nutzt durchgaengig feste px-Groessen
 * (10-12px), was auf hochaufloesenden Displays sehr klein wirkt (Issue #61,
 * "alles extrem klein"). Da es keinen rem-Hebel gibt, skalieren wir die ganze
 * Oberflaeche ueber CSS `zoom` auf dem #root-Container. Der Wert ist pro Geraet
 * in localStorage gespeichert und opt-in: Standard bleibt 1.0, aendert also fuer
 * niemanden das Aussehen, der nicht selbst zoomt.
 */
const KEY = 'multicam-ui-zoom';
export const ZOOM_MIN = 0.8;
export const ZOOM_MAX = 1.8;
export const ZOOM_STEP = 0.1;
export const ZOOM_DEFAULT = 1.0;

function clamp(z: number): number {
  if (!Number.isFinite(z)) return ZOOM_DEFAULT;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

export function loadZoom(): number {
  return clamp(loadJSON<number>(KEY, ZOOM_DEFAULT));
}

/** Wendet den Zoom auf den #root-Container an (CSS `zoom`). */
export function applyZoom(zoom: number): void {
  const z = clamp(zoom);
  const root = document.getElementById('root');
  if (root) root.style.zoom = String(z);
}

/** Speichert + wendet an; gibt den geklemmten Wert zurueck. */
export function setZoom(zoom: number): number {
  const z = clamp(zoom);
  saveJSON(KEY, z);
  applyZoom(z);
  return z;
}
