import { describe, it, expect } from 'vitest';
import {
  groundHeightAt,
  isOnStage,
  stageFaces,
  stageLabelAnchor,
  stageTopZ,
} from '../utils/stageBody';
import type { Stage } from '../types';

const stage = (over: Partial<Stage> = {}): Stage => ({
  id: 's1',
  x: 0,
  y: 0,
  width: 4,
  height: 2,
  label: 'Buehne',
  ...over,
});

describe('stageTopZ', () => {
  it('ist 0 ohne Podesthoehe', () => {
    expect(stageTopZ(stage())).toBe(0);
  });

  it('nimmt die gesetzte Hoehe', () => {
    expect(stageTopZ(stage({ elevationM: 0.8 }))).toBe(0.8);
  });

  it('behandelt negative und kaputte Werte als flach', () => {
    expect(stageTopZ(stage({ elevationM: -1 }))).toBe(0);
    expect(stageTopZ({ elevationM: NaN })).toBe(0);
  });
});

describe('isOnStage', () => {
  const s = stage({ x: 2, y: 3, width: 4, height: 2 });

  it('erkennt Punkte innen und auf der Kante', () => {
    expect(isOnStage(s, 4, 4)).toBe(true);
    expect(isOnStage(s, 2, 3)).toBe(true);
    expect(isOnStage(s, 6, 5)).toBe(true);
  });

  it('erkennt Punkte ausserhalb', () => {
    expect(isOnStage(s, 1.9, 4)).toBe(false);
    expect(isOnStage(s, 4, 5.1)).toBe(false);
  });

  it('kommt mit negativer Breite/Tiefe klar', () => {
    const flipped = stage({ x: 6, y: 5, width: -4, height: -2 });
    expect(isOnStage(flipped, 4, 4)).toBe(true);
  });
});

describe('groundHeightAt', () => {
  it('ist 0 ohne Buehne unter dem Punkt', () => {
    expect(groundHeightAt([stage({ elevationM: 1 })], 10, 10)).toBe(0);
  });

  it('gibt die Oberkante der Buehne zurueck', () => {
    expect(groundHeightAt([stage({ elevationM: 0.6 })], 1, 1)).toBeCloseTo(0.6);
  });

  it('nimmt bei uebereinander liegenden Buehnen die hoechste', () => {
    const stages = [
      stage({ id: 'a', elevationM: 0.4 }),
      stage({ id: 'b', elevationM: 1.2 }),
      stage({ id: 'c', x: 20, y: 20, elevationM: 5 }),
    ];
    expect(groundHeightAt(stages, 1, 1)).toBeCloseTo(1.2);
  });

  it('ignoriert flache Buehnen', () => {
    expect(groundHeightAt([stage()], 1, 1)).toBe(0);
  });
});

describe('stageFaces', () => {
  it('liefert bei flacher Buehne genau die Bodenflaeche', () => {
    const faces = stageFaces(stage(), 2, -5, 1.5);
    expect(faces).toHaveLength(1);
    expect(faces[0].kind).toBe('top');
    expect(faces[0].points.every((p) => p.z === 0)).toBe(true);
  });

  it('zeigt beim Podest nur die der Kamera zugewandten Seiten', () => {
    // Kamera suedlich (y < y0) und westlich (x < x0) der Buehne
    const faces = stageFaces(stage({ elevationM: 1 }), -3, -5, 1.6);
    const sides = faces.filter((f) => f.kind === 'side');
    expect(sides).toHaveLength(2);
    // Suedseite liegt auf y = 0, Westseite auf x = 0
    expect(sides.some((f) => f.points.every((p) => p.y === 0))).toBe(true);
    expect(sides.some((f) => f.points.every((p) => p.x === 0))).toBe(true);
  });

  it('laesst die Deckflaeche weg, wenn die Kamera unter der Oberkante steht', () => {
    const low = stageFaces(stage({ elevationM: 2 }), 2, -5, 1.5);
    expect(low.some((f) => f.kind === 'top')).toBe(false);
    const high = stageFaces(stage({ elevationM: 2 }), 2, -5, 2.5);
    expect(high.some((f) => f.kind === 'top')).toBe(true);
  });

  it('liefert keine Seite, wenn die Kamera ueber der Flaeche steht', () => {
    const faces = stageFaces(stage({ elevationM: 1 }), 2, 1, 6);
    expect(faces.filter((f) => f.kind === 'side')).toHaveLength(0);
    expect(faces).toHaveLength(1);
  });

  it('sortiert hinten nach vorn', () => {
    const faces = stageFaces(stage({ elevationM: 1 }), 2, -5, 3);
    const depths = faces.map((f) => f.depth);
    expect(depths).toEqual([...depths].sort((a, b) => b - a));
    // Die zugewandte Suedseite ist die naechste Flaeche → zuletzt gemalt
    expect(faces[faces.length - 1].kind).toBe('side');
  });

  it('setzt die Oberkante der Seitenflaechen auf die Podesthoehe', () => {
    const faces = stageFaces(stage({ elevationM: 0.75 }), 2, -5, 1.6);
    const side = faces.find((f) => f.kind === 'side')!;
    expect(Math.max(...side.points.map((p) => p.z))).toBeCloseTo(0.75);
    expect(Math.min(...side.points.map((p) => p.z))).toBe(0);
  });
});

describe('stageLabelAnchor', () => {
  it('sitzt mittig auf der Oberkante', () => {
    const a = stageLabelAnchor(stage({ x: 2, y: 3, width: 4, height: 2, elevationM: 0.9 }));
    expect(a).toEqual({ x: 4, y: 4, z: 0.9 });
  });
});
