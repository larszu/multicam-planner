/**
 * Startausrichtung der 3D-Ansicht.
 *
 * Die Blickneigung stand als feste Zahl im Code (-0.35 beim Einhaengen, -0.3
 * beim Zuruecksetzen). Damit lag die hintere Hallenkante — der sichtbare
 * Horizont — je nach Hallengroesse irgendwo in der Bildmitte, und die obere
 * Bildhaelfte blieb leer. Hier wird die Neigung stattdessen aus Kamerahoehe,
 * Entfernung und Bildwinkel bestimmt, sodass die Kante immer an derselben
 * Stelle nahe dem oberen Bildrand sitzt.
 */

/** Vertikaler Bildwinkel der 3D-Ansicht (Grad) — muss zur PerspectiveCamera passen. */
export const VIEW3D_FOV_DEG = 50;

/** Zielposition der hinteren Hallenkante, gemessen von oben (0 = Oberkante). */
export const HORIZON_TOP_FRACTION = 0.2;

/** Grenzen, damit eine ungewoehnliche Halle die Ansicht nicht auf den Kopf stellt. */
const MIN_PITCH = -1.35; // ~77 Grad nach unten
const MAX_PITCH = -0.1; //  ~6 Grad nach unten

/** Standardposition der Blickkamera ueber einer Halle (x, Hoehe, z). */
export function defaultCameraPos(widthM: number, heightM: number): [number, number, number] {
  return [widthM / 2, 15, heightM + 10];
}

/**
 * Neigung (rad, negativ = nach unten), bei der ein Punkt auf dem Boden in
 * `groundDistM` Entfernung auf `topFraction` der Bildhoehe landet.
 *
 * Herleitung: der Punkt liegt um `d = atan(camHeight / groundDist)` unter der
 * Waagerechten. Auf dem Bild erscheint er um `tan(d - |pitch|) / tan(fov/2)`
 * von der Mitte versetzt; gewuenscht ist `2 * topFraction - 1`. Nach `pitch`
 * aufgeloest ergibt das die Formel unten.
 */
export function groundPitchRad(
  camHeightM: number,
  groundDistM: number,
  fovDeg: number = VIEW3D_FOV_DEG,
  topFraction: number = HORIZON_TOP_FRACTION,
): number {
  const dist = Math.max(0.001, groundDistM);
  const height = Math.max(0.001, camHeightM);
  const halfFov = (Math.max(1, fovDeg) * Math.PI) / 360;
  const f = Math.min(0.95, Math.max(0.05, topFraction));
  const depression = Math.atan(height / dist);
  const offset = Math.atan((2 * f - 1) * Math.tan(halfFov));
  return Math.min(MAX_PITCH, Math.max(MIN_PITCH, -(depression - offset)));
}

/** Startneigung fuer eine Halle mit der Standardposition der Blickkamera. */
export function defaultPitchRad(widthM: number, heightM: number): number {
  const [, camY, camZ] = defaultCameraPos(widthM, heightM);
  // Hintere Hallenkante liegt bei z = 0, die Kamera bei z = camZ.
  return groundPitchRad(camY, camZ);
}
