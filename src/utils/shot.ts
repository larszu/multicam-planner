// Shot ↔ Kamera-Umrechnung (#62 Punkt 5).
//
// Bewusst rein (kein Store, kein DOM), damit die Sequenz-Logik testbar bleibt
// und Preview-Tab wie Shotlist-Panel denselben Code nutzen.
import type { Shot, ShotState, VenueCamera } from '../types';

/**
 * Friert die Shot-relevanten Kamera-Parameter ein — exakt die Preset-Felder
 * aus #62 Punkt 3. Fehlendes `trackOffset` (Kamera ohne Rig) wird zu 0, damit
 * ein Shot nie `undefined` speichert und die Interpolation nicht abreisst.
 */
export function shotStateFromCamera(cam: VenueCamera): ShotState {
  return {
    x: cam.x,
    y: cam.y,
    z: cam.z,
    pan: cam.pan,
    tilt: cam.tilt,
    focalLength: cam.focalLength,
    aperture: cam.aperture,
    focusDistance: cam.focusDistance,
    trackOffset: cam.trackOffset ?? 0,
  };
}

/**
 * Zielwerte einer Shot-Fahrt. `lockedPersonId: undefined` loest den Fokus-Lock,
 * sonst zieht der Lock die Fokusdistanz waehrend der Fahrt zurueck und der Shot
 * kommt nicht dort an, wo er aufgenommen wurde.
 */
export function shotTargetFromState(state: ShotState): Partial<VenueCamera> {
  return { ...state, lockedPersonId: undefined };
}

/** Vorschlagsname beim Aufnehmen, z. B. "CAM 1 · 35mm". */
export function defaultShotName(cam: VenueCamera): string {
  return `${cam.label} · ${Math.round(cam.focalLength)}mm`;
}

/**
 * Index des naechsten/vorherigen Shots. Laeuft zyklisch (wie Q/E in Cine
 * Tracer) und startet bei -1 (noch kein Shot aktiv) sinnvoll am Anfang bzw.
 * Ende. Gibt -1 zurueck, wenn die Liste leer ist.
 */
export function stepShotIndex(current: number, count: number, dir: 1 | -1): number {
  if (count <= 0) return -1;
  if (current < 0) return dir === 1 ? 0 : count - 1;
  return (current + dir + count) % count;
}

/** Findet den Index eines Shots per id; -1 wenn nicht enthalten. */
export function indexOfShot(shots: Shot[], shotId: string | null): number {
  if (!shotId) return -1;
  return shots.findIndex((s) => s.id === shotId);
}
