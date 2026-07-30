import { describe, expect, it } from 'vitest';
import {
  TAKE_MAX_SAMPLES,
  TAKE_SAMPLE_MIN_S,
  appendSample,
  defaultTakeName,
  formatTakeTime,
  lerpAngle,
  sampleFromCamera,
  sampleTakeAt,
  takeDuration,
} from '../utils/rigTake';
import type { RigTake, TakeSample, VenueCamera } from '../types';

const cam = (over: Partial<VenueCamera> = {}): VenueCamera => ({
  id: 'cam-1',
  label: 'CAM 1',
  cameraId: 'c',
  lensId: 'l',
  x: 10,
  y: 8,
  z: 1.4,
  pan: -90,
  tilt: 0,
  focalLength: 50,
  aperture: 4,
  focusDistance: 8,
  color: '#f00',
  extenderActive: 1,
  ...over,
});

const take = (samples: TakeSample[]): Pick<RigTake, 'samples'> => ({ samples });

describe('Aufzeichnen', () => {
  it('friert Fahrweg und Ausrichtung mit ein', () => {
    const s = sampleFromCamera(cam({ trackOffset: 1.25, rigRotation: 0 }), 1.5);
    expect(s.t).toBe(1.5);
    expect(s.state.trackOffset).toBe(1.25);
    expect(s.rigRotation).toBe(0);
  });

  it('macht aus fehlendem Fahrweg eine 0, nicht undefined', () => {
    expect(sampleFromCamera(cam(), 0).state.trackOffset).toBe(0);
  });

  it('laesst die Ausrichtung weg, solange sie der Kamera folgt', () => {
    expect(sampleFromCamera(cam(), 0).rigRotation).toBeUndefined();
  });

  it('duennt zu dichte Punkte aus', () => {
    let s: TakeSample[] = [sampleFromCamera(cam(), 0)];
    s = appendSample(s, sampleFromCamera(cam(), TAKE_SAMPLE_MIN_S / 2));
    expect(s).toHaveLength(1); // zu frueh
    s = appendSample(s, sampleFromCamera(cam(), TAKE_SAMPLE_MIN_S));
    expect(s).toHaveLength(2);
  });

  it('mutiert die uebergebene Liste nicht', () => {
    const before: TakeSample[] = [sampleFromCamera(cam(), 0)];
    appendSample(before, sampleFromCamera(cam(), 1));
    expect(before).toHaveLength(1);
  });

  it('deckelt die Laenge, damit der Speicher nicht platzt', () => {
    const full: TakeSample[] = Array.from({ length: TAKE_MAX_SAMPLES }, (_, i) =>
      sampleFromCamera(cam(), i * TAKE_SAMPLE_MIN_S),
    );
    expect(appendSample(full, sampleFromCamera(cam(), 9999))).toHaveLength(TAKE_MAX_SAMPLES);
  });
});

describe('Wiedergabe', () => {
  const t = take([
    sampleFromCamera(cam({ trackOffset: 0, tilt: 0 }), 0),
    sampleFromCamera(cam({ trackOffset: 2, tilt: -10 }), 2),
  ]);

  it('kennt die Laufzeit', () => {
    expect(takeDuration(t)).toBe(2);
    expect(takeDuration(take([]))).toBe(0);
  });

  it('interpoliert zwischen zwei Punkten', () => {
    const mid = sampleTakeAt(t, 1)!;
    expect(mid.trackOffset).toBeCloseTo(1, 6);
    expect(mid.tilt).toBeCloseTo(-5, 6);
  });

  it('haelt vor dem Start und nach dem Ende still', () => {
    expect(sampleTakeAt(t, -5)!.trackOffset).toBe(0);
    expect(sampleTakeAt(t, 99)!.trackOffset).toBe(2);
  });

  it('gibt bei leerem Take nichts zurueck', () => {
    expect(sampleTakeAt(take([]), 0)).toBeNull();
  });

  it('faehrt Fahrweg und Neigung gleichzeitig zurueck', () => {
    // Wenn beim Aufnehmen zwei Achsen liefen, muessen sie auch zusammen
    // wiedergegeben werden.
    const q = sampleTakeAt(t, 0.5)!;
    expect(q.trackOffset).toBeCloseTo(0.5, 6);
    expect(q.tilt).toBeCloseTo(-2.5, 6);
  });

  it('trifft dichte Punkte ueber die Binaersuche', () => {
    const many = take(
      Array.from({ length: 500 }, (_, i) => sampleFromCamera(cam({ z: i / 100 }), i * 0.04)),
    );
    const at = sampleTakeAt(many, 4)!; // Sample 100
    expect(at.z).toBeCloseTo(1, 6);
  });

  it('nimmt beim Pan den kuerzeren Weg ueber die 180°-Grenze', () => {
    const around = take([
      sampleFromCamera(cam({ pan: 170 }), 0),
      sampleFromCamera(cam({ pan: -170 }), 1),
    ]);
    // 170 → -170 sind 20° ueber die Grenze, nicht 340° zurueck.
    expect(sampleTakeAt(around, 0.5)!.pan).toBeCloseTo(180, 6);
  });
});

describe('lerpAngle', () => {
  it('geht den kurzen Weg', () => {
    expect(lerpAngle(-170, 170, 0.5)).toBeCloseTo(180, 6);
    expect(lerpAngle(0, 90, 0.5)).toBeCloseTo(45, 6);
  });
});

describe('Anzeige', () => {
  it('benennt die Fahrt nach Kamera und Dauer', () => {
    expect(defaultTakeName(cam(), 7.24)).toBe('CAM 1 · Fahrt 7.2s');
  });

  it('formatiert die Laufzeit als m:ss.s', () => {
    expect(formatTakeTime(7.24)).toBe('0:07.2');
    expect(formatTakeTime(65)).toBe('1:05.0');
    expect(formatTakeTime(-3)).toBe('0:00.0');
  });
});
