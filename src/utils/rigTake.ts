// Aufgezeichnete Rig-Fahrten ("Takes") — Aufnahme und Wiedergabe.
//
// Der Unterschied zur Shot-Fahrt (`cameraTransition`): dort werden zwei
// Zustaende interpoliert, hier wird die tatsaechlich gefahrene Bewegung
// mitgeschrieben. Alles, was am Pult passiert — Zoegern, Nachfuehren, zwei
// Achsen gleichzeitig — bleibt erhalten.
//
// Reines Modul: kein Store, kein DOM, kein rAF. Der Aufrufer tastet ab und
// schreibt zurueck.
import type { RigTake, ShotState, TakeSample, VenueCamera } from '../types';
import { wrap180 } from './rigDrive';

/**
 * Mindestabstand zweier Aufnahmepunkte (s). Bei 60 fps waere jeder Frame ein
 * Sample; 25 Hz reicht fuer eine Kamerafahrt voellig und haelt den Take klein
 * genug fuer den localStorage.
 */
export const TAKE_SAMPLE_MIN_S = 0.04;

/**
 * Obergrenze an Samples (~2 Minuten bei 25 Hz). Danach laeuft die Aufnahme
 * weiter, verwirft aber neue Punkte — besser als ein Take, der beim Speichern
 * die Quota sprengt und die ganze Liste mitreisst.
 */
export const TAKE_MAX_SAMPLES = 3000;

/** Kuerzeste Fahrt, die als Take gespeichert wird. */
export const TAKE_MIN_DURATION_S = 0.3;

/** Zustand + Rig-Ausrichtung einer Kamera als Sample. */
export function sampleFromCamera(cam: VenueCamera, t: number): TakeSample {
  return {
    t: Math.round(t * 1000) / 1000,
    state: {
      x: cam.x,
      y: cam.y,
      z: cam.z,
      pan: cam.pan,
      tilt: cam.tilt,
      focalLength: cam.focalLength,
      aperture: cam.aperture,
      focusDistance: cam.focusDistance,
      trackOffset: cam.trackOffset ?? 0,
    },
    ...(typeof cam.rigRotation === 'number' ? { rigRotation: cam.rigRotation } : {}),
  };
}

/**
 * Haengt ein Sample an, wenn genug Zeit vergangen ist. Gibt die (ggf.
 * unveraenderte) Liste zurueck — mutiert nichts.
 */
export function appendSample(samples: TakeSample[], next: TakeSample): TakeSample[] {
  if (samples.length >= TAKE_MAX_SAMPLES) return samples;
  const last = samples[samples.length - 1];
  if (last && next.t - last.t < TAKE_SAMPLE_MIN_S) return samples;
  return [...samples, next];
}

/** Laenge der Fahrt in Sekunden. */
export function takeDuration(take: Pick<RigTake, 'samples'>): number {
  if (take.samples.length === 0) return 0;
  return take.samples[take.samples.length - 1].t;
}

/** Winkel-Interpolation auf dem kuerzeren Weg (sonst 359°-Sprung bei -180/180). */
export function lerpAngle(a: number, b: number, u: number): number {
  return wrap180(a + wrap180(b - a) * u);
}

const ANGLE_KEYS = new Set<keyof ShotState>(['pan', 'tilt']);

/**
 * Zustand der Fahrt zum Zeitpunkt `t` (s). Vor dem Start bzw. nach dem Ende
 * gilt das erste bzw. letzte Sample — so bleibt die Kamera stehen, statt zu
 * springen. `null`, wenn der Take leer ist.
 */
export function sampleTakeAt(take: Pick<RigTake, 'samples'>, t: number): Partial<VenueCamera> | null {
  const s = take.samples;
  if (s.length === 0) return null;
  if (s.length === 1 || t <= s[0].t) return toPatch(s[0]);
  const end = s[s.length - 1];
  if (t >= end.t) return toPatch(end);

  // Binaersuche: das letzte Sample mit t <= gesuchter Zeit.
  let lo = 0;
  let hi = s.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = s[lo];
  const b = s[hi];
  const span = b.t - a.t;
  const u = span > 0 ? (t - a.t) / span : 0;

  const patch: Partial<VenueCamera> = {};
  for (const key of Object.keys(a.state) as (keyof ShotState)[]) {
    const va = a.state[key];
    const vb = b.state[key];
    patch[key] = ANGLE_KEYS.has(key) ? lerpAngle(va, vb, u) : va + (vb - va) * u;
  }
  if (typeof a.rigRotation === 'number' && typeof b.rigRotation === 'number') {
    patch.rigRotation = lerpAngle(a.rigRotation, b.rigRotation, u);
  } else if (typeof a.rigRotation === 'number') {
    patch.rigRotation = a.rigRotation;
  }
  return patch;
}

function toPatch(sample: TakeSample): Partial<VenueCamera> {
  return {
    ...sample.state,
    ...(typeof sample.rigRotation === 'number' ? { rigRotation: sample.rigRotation } : {}),
  };
}

/** Vorschlagsname beim Aufnehmen, z. B. "CAM 1 · Fahrt 7.2s". */
export function defaultTakeName(cam: VenueCamera, durationS: number): string {
  return `${cam.label} · Fahrt ${durationS.toFixed(1)}s`;
}

/** mm:ss.s — Anzeige der Laufzeit. */
export function formatTakeTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest < 10 ? '0' : ''}${rest.toFixed(1)}`;
}
