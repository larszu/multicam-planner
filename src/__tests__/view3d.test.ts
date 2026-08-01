import { describe, it, expect } from 'vitest';
import {
  HORIZON_TOP_FRACTION,
  VIEW3D_FOV_DEG,
  defaultCameraPos,
  defaultPitchRad,
  groundPitchRad,
} from '../utils/view3d';

/** Wo landet ein Bodenpunkt bei dieser Neigung? 0 = oben, 1 = unten. */
function screenFraction(camHeightM: number, distM: number, pitchRad: number, fovDeg = VIEW3D_FOV_DEG): number {
  const halfFov = (fovDeg * Math.PI) / 360;
  const depression = Math.atan(camHeightM / distM);
  const offset = Math.tan(depression - Math.abs(pitchRad)) / Math.tan(halfFov);
  return (offset + 1) / 2;
}

describe('groundPitchRad', () => {
  it('setzt den Zielpunkt genau auf den gewuenschten Bildanteil', () => {
    const pitch = groundPitchRad(15, 25);
    expect(screenFraction(15, 25, pitch)).toBeCloseTo(HORIZON_TOP_FRACTION, 5);
  });

  it('trifft den Anteil auch bei anderer Hoehe, Entfernung und Bildwinkel', () => {
    for (const [h, d, fov, f] of [
      [8, 40, 50, 0.2],
      [25, 30, 35, 0.1],
      [15, 60, 70, 0.3],
    ] as const) {
      const pitch = groundPitchRad(h, d, fov, f);
      expect(screenFraction(h, d, pitch, fov)).toBeCloseTo(f, 5);
    }
  });

  it('nimmt bei extremer Geometrie die Grenze in Kauf statt zu ueberdrehen', () => {
    // Kamera 25 m hoch, Kante nur 12 m entfernt: der Zielanteil waere erst bei
    // ~78 Grad erreicht. Die Grenze greift, der Blick bleibt brauchbar.
    const pitch = groundPitchRad(25, 12, 35, 0.1);
    expect(pitch).toBe(-1.35);
    expect(screenFraction(25, 12, pitch, 35)).toBeGreaterThan(0.1);
  });

  it('neigt nach unten', () => {
    expect(groundPitchRad(15, 25)).toBeLessThan(0);
  });

  it('neigt bei einer weiter entfernten Kante flacher', () => {
    const nah = groundPitchRad(15, 15);
    const fern = groundPitchRad(15, 60);
    expect(Math.abs(fern)).toBeLessThan(Math.abs(nah));
  });

  it('bleibt in sinnvollen Grenzen', () => {
    expect(groundPitchRad(200, 0.5)).toBeGreaterThanOrEqual(-1.35);
    expect(groundPitchRad(0.1, 5000)).toBeLessThanOrEqual(-0.1);
  });

  it('faengt Null- und Negativwerte ab', () => {
    expect(Number.isFinite(groundPitchRad(0, 0))).toBe(true);
    expect(Number.isFinite(groundPitchRad(-5, -5))).toBe(true);
  });
});

describe('defaultPitchRad', () => {
  it('neigt deutlich staerker als die fruehere feste Vorgabe von -0.3', () => {
    expect(defaultPitchRad(20, 15)).toBeLessThan(-0.3);
  });

  it('passt sich der Hallengroesse an — grosse Halle, flacherer Blick', () => {
    expect(Math.abs(defaultPitchRad(80, 60))).toBeLessThan(Math.abs(defaultPitchRad(20, 15)));
  });

  it('legt die hintere Kante auf den Zielanteil', () => {
    const [, camY, camZ] = defaultCameraPos(20, 15);
    expect(screenFraction(camY, camZ, defaultPitchRad(20, 15))).toBeCloseTo(HORIZON_TOP_FRACTION, 5);
  });
});

describe('defaultCameraPos', () => {
  it('steht mittig vor der Halle', () => {
    expect(defaultCameraPos(20, 15)).toEqual([10, 15, 25]);
  });
});
