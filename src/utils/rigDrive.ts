// Live-Bedienung des Rigs — mehrere Achsen gleichzeitig.
//
// Ein Dolly wird waehrend der Fahrt geneigt, ein Kran faehrt aus, waehrend er
// schwenkt. Deshalb ist die Eingabe hier kein Zielwert, sondern eine
// AUSLENKUNG je Achse (-1..1, wie ein Joystick am Remote-Pult): pro Frame wird
// daraus mit der Geschwindigkeit des Rigs eine Aenderung. Solange mehrere
// Achsen ausgelenkt sind, laufen sie zusammen.
//
// Die Tempi kommen aus `MotionProfile` — ein Dolly rollt eben langsamer an als
// ein Gimbal, und ein Stativ schwenkt schneller als ein SuperTechno. Damit
// bleibt auch die Live-Fahrt physikalisch plausibel und passt zu dem, was die
// Machbarkeitsrechnung der Shotlist sagt.
//
// Reines Modul: kein Store, kein DOM.
import type { VenueCamera } from '../types';
import type { MotionProfile } from './motionProfile';
import { clampHeight, clampTrack, type RigLimits } from './rigLimits';
import { rigYaw } from './camera';

export type DriveAxis = 'travel' | 'pan' | 'tilt' | 'lift' | 'yaw' | 'zoom';

/** Auslenkung je Achse, -1..1. Fehlende Achse = 0. */
export type DriveInput = Partial<Record<DriveAxis, number>>;

/** Neigebereich der Kamera (Grad) — wie im 3D-Gizmo und im Sidebar-Regler. */
export const TILT_RANGE = { min: -90, max: 45 } as const;

/**
 * Tastenbelegung. Bewusst OHNE W/A/S/D/Space/Shift (fliegende 3D-Kamera) und
 * ohne Q/E (Shot-Navigation) — alle Panels sind gleichzeitig gerendert, ihre
 * Tastatur-Handler also gleichzeitig aktiv.
 *
 * J/L kommt vom Jog-Shuttle aus dem Schnittplatz, R/F ist die uebliche
 * Hoch/Runter-Belegung, [ und ] richten das Rig aus, , und . zoomen.
 */
export const DRIVE_KEYS: Record<string, { axis: DriveAxis; dir: -1 | 1 }> = {
  j: { axis: 'travel', dir: -1 },
  l: { axis: 'travel', dir: 1 },
  arrowleft: { axis: 'pan', dir: -1 },
  arrowright: { axis: 'pan', dir: 1 },
  arrowup: { axis: 'tilt', dir: 1 },
  arrowdown: { axis: 'tilt', dir: -1 },
  r: { axis: 'lift', dir: 1 },
  f: { axis: 'lift', dir: -1 },
  '[': { axis: 'yaw', dir: -1 },
  ']': { axis: 'yaw', dir: 1 },
  ',': { axis: 'zoom', dir: -1 },
  '.': { axis: 'zoom', dir: 1 },
};

/** Parkt den Fahrweg auf 0 (Rig in Grundstellung). */
export const PARK_KEY = '0';

/**
 * Tempo-Stufen. Statt Shift/Alt als Modifier (beide haengen schon an der
 * 3D-Flugkamera bzw. am Fenstermenue) wird die Stufe wie an einem PTZ-Pult
 * vorgewaehlt.
 */
export const SPEED_STEPS = [
  { key: '1', label: 'Fein', factor: 0.25, hint: 'Feinkorrektur — viertel Tempo' },
  { key: '2', label: 'Normal', factor: 1, hint: 'Datenblatt-Tempo des Rigs' },
  { key: '3', label: 'Schnell', factor: 2.5, hint: 'Umsetzen/Ausrichten — 2.5-faches Tempo' },
] as const;

export const DEFAULT_SPEED_INDEX = 1;

/** Winkel auf -180..180 normieren. */
export function wrap180(deg: number): number {
  let v = deg % 360;
  if (v > 180) v -= 360;
  if (v <= -180) v += 360;
  return v;
}

/** Gedrueckte Tasten → Auslenkung. Gegenlaeufige Tasten heben sich auf. */
export function driveFromKeys(keys: Iterable<string>): DriveInput {
  const input: DriveInput = {};
  for (const raw of keys) {
    const hit = DRIVE_KEYS[raw.toLowerCase()];
    if (!hit) continue;
    input[hit.axis] = (input[hit.axis] ?? 0) + hit.dir;
  }
  for (const axis of Object.keys(input) as DriveAxis[]) {
    input[axis] = Math.max(-1, Math.min(1, input[axis] as number));
  }
  return input;
}

/** Zwei Eingaben (Tastatur + Pad) ueberlagern und begrenzen. */
export function mergeInput(a: DriveInput, b: DriveInput): DriveInput {
  const out: DriveInput = { ...a };
  for (const axis of Object.keys(b) as DriveAxis[]) {
    out[axis] = Math.max(-1, Math.min(1, (out[axis] ?? 0) + (b[axis] as number)));
  }
  return out;
}

/** true, wenn ueberhaupt eine Achse ausgelenkt ist. */
export function isIdle(input: DriveInput): boolean {
  return !Object.values(input).some((v) => Math.abs(v ?? 0) > 1e-4);
}

export interface DriveContext {
  cam: VenueCamera;
  limits: RigLimits;
  profile: MotionProfile;
  /** Brennweitenbereich des Objektivs (mm) — begrenzt den Zoom. */
  focalRange?: { min: number; max: number };
}

/**
 * Groesster Zeitschritt, der noch verrechnet wird. Nach einem Tab-Wechsel oder
 * einem Ruckler liefert rAF sonst eine Sekunde am Stueck und das Rig
 * "springt" — genau das, was ein echtes Pult nicht tut.
 */
const MAX_DT_S = 0.25;

/** Das Rig wird langsamer ausgerichtet als geschwenkt — es wird umgestellt. */
const YAW_RATE_FACTOR = 0.6;

/**
 * Eine Frame-Aenderung. Liefert nur die Felder, die sich wirklich aendern,
 * und `null`, wenn nichts passiert — sonst schreibt jeder Frame in den Store.
 */
export function applyDrive(
  ctx: DriveContext,
  input: DriveInput,
  dtSeconds: number,
  speed = 1,
): Partial<VenueCamera> | null {
  const dt = Math.max(0, Math.min(MAX_DT_S, dtSeconds));
  if (dt <= 0 || isIdle(input)) return null;

  const { cam, limits, profile } = ctx;
  const patch: Partial<VenueCamera> = {};
  const v = (axis: DriveAxis) => input[axis] ?? 0;

  // Fahrweg — nur, wenn das Rig ueberhaupt einen hat.
  if (v('travel') !== 0 && limits.travelM > 0) {
    const next = clampTrack(limits, (cam.trackOffset ?? 0) + v('travel') * profile.maxTravelMps * speed * dt);
    if (Math.abs(next - (cam.trackOffset ?? 0)) > 1e-6) patch.trackOffset = next;
  }

  if (v('pan') !== 0) {
    const next = wrap180(cam.pan + v('pan') * profile.maxRotDps * speed * dt);
    if (Math.abs(next - cam.pan) > 1e-6) patch.pan = next;
  }

  if (v('tilt') !== 0) {
    const next = Math.max(
      TILT_RANGE.min,
      Math.min(TILT_RANGE.max, cam.tilt + v('tilt') * profile.maxRotDps * speed * dt),
    );
    if (Math.abs(next - cam.tilt) > 1e-6) patch.tilt = next;
  }

  if (v('lift') !== 0) {
    const next = clampHeight(limits, cam.z + v('lift') * profile.maxLiftMps * speed * dt);
    if (Math.abs(next - cam.z) > 1e-6) patch.z = next;
  }

  if (v('yaw') !== 0) {
    const from = rigYaw(cam);
    const next = wrap180(from + v('yaw') * profile.maxRotDps * YAW_RATE_FACTOR * speed * dt);
    if (Math.abs(next - from) > 1e-6) patch.rigRotation = next;
  }

  if (v('zoom') !== 0 && cam.focalLength > 0) {
    // Zoom laeuft multiplikativ: gleiche Tastenzeit = gleicher Bildwinkel-
    // Sprung, egal ob bei 10 mm oder bei 100 mm.
    const factor = Math.exp(v('zoom') * Math.log(profile.maxZoomRatioPerS) * speed * dt);
    let next = cam.focalLength * factor;
    if (ctx.focalRange) next = Math.max(ctx.focalRange.min, Math.min(ctx.focalRange.max, next));
    if (Math.abs(next - cam.focalLength) > 1e-6) patch.focalLength = next;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}
