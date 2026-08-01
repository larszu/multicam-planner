import type { Stage } from '../types';

/**
 * Buehnen-Geometrie als Koerper (#73).
 *
 * Die 3D-Ansicht zeichnet das Podest schon als Box; der Preview-Tab kannte
 * bisher nur die flache Grundflaeche. Damit beide dieselbe Buehne meinen,
 * liegen Oberkante, sichtbare Seiten und die Standhoehe von Personen hier in
 * einem Modul — ohne Canvas und ohne Three.js, also direkt testbar.
 */

/** Hoehe der flachen Andeutung, wenn keine Podesthoehe gesetzt ist (m). */
export const FLAT_STAGE_M = 0.1;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type StageFaceKind = 'top' | 'side';

export interface StageFace {
  kind: StageFaceKind;
  /** Eckpunkte in Weltkoordinaten, im Uhrzeigersinn der Grundflaeche. */
  points: Vec3[];
  /**
   * Helligkeit relativ zur Deckflaeche (1 = Deckflaeche). Ohne Licht-Modell,
   * aber mit unterschiedlichen Werten pro Achse, damit die Kanten eines
   * Podests im Bild als Koerper lesbar sind statt als Farbflaeche.
   */
  shade: number;
  /** Abstand Kamera → Flaechenmitte in der Grundebene, fuer die Malerordnung. */
  depth: number;
}

/** Oberkante der Buehne ueber dem Boden (m). Ohne Angabe: flach (0). */
export function stageTopZ(stage: Pick<Stage, 'elevationM'>): number {
  const raised = stage.elevationM;
  if (typeof raised !== 'number' || !Number.isFinite(raised) || raised <= 0) return 0;
  return raised;
}

/** Liegt (x, y) auf der Grundflaeche der Buehne? Kante zaehlt als drauf. */
export function isOnStage(stage: Stage, x: number, y: number): boolean {
  const x0 = Math.min(stage.x, stage.x + stage.width);
  const x1 = Math.max(stage.x, stage.x + stage.width);
  const y0 = Math.min(stage.y, stage.y + stage.height);
  const y1 = Math.max(stage.y, stage.y + stage.height);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

/**
 * Hoehe des Bodens an (x, y) — 0 oder die Oberkante der hoechsten Buehne, die
 * den Punkt ueberdeckt. Damit steht eine Person auf dem Podest statt davor in
 * der Luft, sobald jemand die Buehne unter sie schiebt.
 */
export function groundHeightAt(stages: Stage[], x: number, y: number): number {
  let z = 0;
  for (const stage of stages) {
    if (!isOnStage(stage, x, y)) continue;
    const top = stageTopZ(stage);
    if (top > z) z = top;
  }
  return z;
}

/**
 * Sichtbare Flaechen des Podests, hinten zuerst (Malerordnung).
 *
 * Eine Seitenflaeche kommt nur vor, wenn die Kamera auf ihrer Aussenseite
 * steht, die Deckflaeche nur, wenn die Kamera ueber der Oberkante ist — sonst
 * malt man die Rueckseite des Koerpers ueber seine Vorderseite.
 *
 * Bei einer flachen Buehne (Oberkante 0) bleibt es bei der einen Flaeche auf
 * dem Boden, genau wie bisher.
 */
export function stageFaces(stage: Stage, camX: number, camY: number, camZ: number): StageFace[] {
  const x0 = Math.min(stage.x, stage.x + stage.width);
  const x1 = Math.max(stage.x, stage.x + stage.width);
  const y0 = Math.min(stage.y, stage.y + stage.height);
  const y1 = Math.max(stage.y, stage.y + stage.height);
  const top = stageTopZ(stage);

  const depthTo = (cx: number, cy: number) => Math.hypot(cx - camX, cy - camY);

  const faces: StageFace[] = [];

  if (top <= 0 || camZ > top) {
    faces.push({
      kind: 'top',
      points: [
        { x: x0, y: y0, z: top },
        { x: x1, y: y0, z: top },
        { x: x1, y: y1, z: top },
        { x: x0, y: y1, z: top },
      ],
      shade: 1,
      depth: depthTo((x0 + x1) / 2, (y0 + y1) / 2),
    });
  }

  if (top > 0) {
    // Seiten quer zur Tiefe etwas heller als die seitlichen — sonst
    // verschmelzen zwei aneinanderstossende Flaechen zu einer.
    if (camY < y0) {
      faces.push({
        kind: 'side',
        points: [
          { x: x0, y: y0, z: 0 },
          { x: x1, y: y0, z: 0 },
          { x: x1, y: y0, z: top },
          { x: x0, y: y0, z: top },
        ],
        shade: 0.72,
        depth: depthTo((x0 + x1) / 2, y0),
      });
    }
    if (camY > y1) {
      faces.push({
        kind: 'side',
        points: [
          { x: x1, y: y1, z: 0 },
          { x: x0, y: y1, z: 0 },
          { x: x0, y: y1, z: top },
          { x: x1, y: y1, z: top },
        ],
        shade: 0.72,
        depth: depthTo((x0 + x1) / 2, y1),
      });
    }
    if (camX < x0) {
      faces.push({
        kind: 'side',
        points: [
          { x: x0, y: y1, z: 0 },
          { x: x0, y: y0, z: 0 },
          { x: x0, y: y0, z: top },
          { x: x0, y: y1, z: top },
        ],
        shade: 0.55,
        depth: depthTo(x0, (y0 + y1) / 2),
      });
    }
    if (camX > x1) {
      faces.push({
        kind: 'side',
        points: [
          { x: x1, y: y0, z: 0 },
          { x: x1, y: y1, z: 0 },
          { x: x1, y: y1, z: top },
          { x: x1, y: y0, z: top },
        ],
        shade: 0.55,
        depth: depthTo(x1, (y0 + y1) / 2),
      });
    }
  }

  return faces.sort((a, b) => b.depth - a.depth);
}

/** Standardfarbe einer Buehne, wenn keine gesetzt ist. */
export const DEFAULT_STAGE_COLOR = '#3b82f6';

/** Farbe der Buehne — dieselbe Vorgabe in 2D, 3D und Preview. */
export function stageColor(stage: Pick<Stage, 'color'>): string {
  return stage.color ?? DEFAULT_STAGE_COLOR;
}

/** Deckkraft der Buehne, geklemmt auf 0..1. Ohne Angabe 0.4 wie bisher. */
export function stageOpacity(stage: Pick<Stage, 'opacity'>): number {
  const o = stage.opacity;
  if (typeof o !== 'number' || !Number.isFinite(o)) return 0.4;
  return Math.max(0, Math.min(1, o));
}

/** Punkt fuer die Beschriftung: Mitte der Deckflaeche. */
export function stageLabelAnchor(stage: Stage): Vec3 {
  return {
    x: stage.x + stage.width / 2,
    y: stage.y + stage.height / 2,
    z: stageTopZ(stage),
  };
}
