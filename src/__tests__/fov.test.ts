import { describe, it, expect } from 'vitest';
import {
  horizontalFov,
  verticalFov,
  diagonalFov,
  imageWidthAtDistance,
  imageHeightAtDistance,
  equivalentFocalLength,
  computeFov,
  circleOfConfusion,
  hyperfocalDistance,
  computeDof,
  personHeightInFrame,
  fovConePoints,
} from '../utils/fov';
import type { SensorSize } from '../types';

const FF_SENSOR: SensorSize = { name: 'Full Frame', widthMm: 36, heightMm: 24, cropFactor: 1 };
const S35_SENSOR: SensorSize = { name: 'Super 35', widthMm: 24.89, heightMm: 14, cropFactor: 1.74 };
const TWO_THIRDS_SENSOR: SensorSize = { name: '2/3"', widthMm: 8.8, heightMm: 6.6, cropFactor: 5.0 };

describe('horizontalFov', () => {
  it('returns correct FOV for a full-frame 50mm lens', () => {
    const fov = horizontalFov(36, 50);
    expect(fov).toBeCloseTo(39.6, 1);
  });

  it('returns wider FOV for shorter focal length', () => {
    const wide = horizontalFov(36, 24);
    const tele = horizontalFov(36, 200);
    expect(wide).toBeGreaterThan(tele);
  });

  it('returns 0 for infinite focal length conceptually', () => {
    const fov = horizontalFov(36, 100000);
    expect(fov).toBeCloseTo(0, 1);
  });
});

describe('verticalFov', () => {
  it('returns correct vertical FOV', () => {
    const fov = verticalFov(24, 50);
    expect(fov).toBeCloseTo(27.0, 1);
  });
});

describe('diagonalFov', () => {
  it('is always >= horizontal and vertical', () => {
    const d = diagonalFov(36, 24, 50);
    const h = horizontalFov(36, 50);
    const v = verticalFov(24, 50);
    expect(d).toBeGreaterThan(h);
    expect(d).toBeGreaterThan(v);
  });
});

describe('imageWidthAtDistance', () => {
  it('doubles when distance doubles', () => {
    const w5 = imageWidthAtDistance(36, 50, 5);
    const w10 = imageWidthAtDistance(36, 50, 10);
    expect(w10).toBeCloseTo(w5 * 2, 2);
  });

  it('returns a reasonable width at 10m for 50mm FF', () => {
    const w = imageWidthAtDistance(36, 50, 10);
    expect(w).toBeGreaterThan(5);
    expect(w).toBeLessThan(10);
  });
});

describe('imageHeightAtDistance', () => {
  it('scales linearly with distance', () => {
    const h1 = imageHeightAtDistance(24, 50, 1);
    const h3 = imageHeightAtDistance(24, 50, 3);
    expect(h3 / h1).toBeCloseTo(3, 2);
  });
});

describe('equivalentFocalLength', () => {
  it('equals focal length for crop factor 1', () => {
    expect(equivalentFocalLength(50, 1)).toBe(50);
  });

  it('multiplies correctly', () => {
    expect(equivalentFocalLength(50, 1.5)).toBe(75);
  });
});

describe('computeFov', () => {
  it('applies extender multiplication', () => {
    const noExt = computeFov(FF_SENSOR, 50, 10, 1);
    const with2x = computeFov(FF_SENSOR, 50, 10, 2);
    expect(with2x.horizontalDeg).toBeLessThan(noExt.horizontalDeg);
    expect(with2x.equivalentFocalLength).toBeCloseTo(noExt.equivalentFocalLength * 2, 1);
  });

  it('returns consistent image dimensions', () => {
    const fov = computeFov(S35_SENSOR, 35, 10, 1);
    expect(fov.imageWidthAtDistance).toBeGreaterThan(0);
    expect(fov.imageHeightAtDistance).toBeGreaterThan(0);
    expect(fov.imageWidthAtDistance).toBeGreaterThan(fov.imageHeightAtDistance);
  });

  it('handles 2/3" broadcast sensor', () => {
    const fov = computeFov(TWO_THIRDS_SENSOR, 8, 10, 1);
    expect(fov.horizontalDeg).toBeGreaterThan(20);
    expect(fov.horizontalDeg).toBeLessThan(90);
  });
});

describe('circleOfConfusion', () => {
  it('returns standard value for full frame (~0.029mm)', () => {
    const coc = circleOfConfusion(36, 24);
    expect(coc).toBeCloseTo(0.029, 2);
  });

  it('returns smaller CoC for smaller sensors', () => {
    const cocFF = circleOfConfusion(36, 24);
    const cocS35 = circleOfConfusion(24.89, 14);
    expect(cocS35).toBeLessThan(cocFF);
  });
});

describe('hyperfocalDistance', () => {
  it('returns a finite positive value', () => {
    const h = hyperfocalDistance(50, 5.6, 0.029);
    expect(h).toBeGreaterThan(0);
    expect(isFinite(h)).toBe(true);
  });

  it('increases with focal length', () => {
    const h50 = hyperfocalDistance(50, 5.6, 0.029);
    const h100 = hyperfocalDistance(100, 5.6, 0.029);
    expect(h100).toBeGreaterThan(h50);
  });
});

describe('computeDof', () => {
  it('returns near < focus < far', () => {
    const dof = computeDof(FF_SENSOR, 50, 5.6, 5, 1);
    expect(dof.nearLimit).toBeLessThan(5);
    expect(dof.farLimit).toBeGreaterThan(5);
  });

  it('wider aperture = shallower DoF', () => {
    const dofWide = computeDof(FF_SENSOR, 85, 1.4, 3, 1);
    const dofNarrow = computeDof(FF_SENSOR, 85, 11, 3, 1);
    expect(dofWide.totalDof).toBeLessThan(dofNarrow.totalDof);
  });

  it('short focal length increases DoF', () => {
    const dofShort = computeDof(FF_SENSOR, 24, 5.6, 5, 1);
    const dofLong = computeDof(FF_SENSOR, 200, 5.6, 5, 1);
    expect(dofShort.totalDof).toBeGreaterThan(dofLong.totalDof);
  });

  it('can return infinity for far limit', () => {
    const dof = computeDof(FF_SENSOR, 24, 11, 10, 1);
    expect(dof.farLimit).toBe(Infinity);
  });

  it('applies extender to DoF', () => {
    const noExt = computeDof(FF_SENSOR, 50, 5.6, 5, 1);
    const with2x = computeDof(FF_SENSOR, 50, 5.6, 5, 2);
    expect(with2x.totalDof).toBeLessThan(noExt.totalDof);
  });
});

describe('personHeightInFrame', () => {
  it('person fills more of frame at closer distance', () => {
    const pxClose = personHeightInFrame(24, 50, 3);
    const pxFar = personHeightInFrame(24, 50, 20);
    expect(pxClose).toBeGreaterThan(pxFar);
  });

  it('returns positive value', () => {
    const px = personHeightInFrame(24, 50, 10);
    expect(px).toBeGreaterThan(0);
  });

  it('longer focal length shows person larger', () => {
    const px50 = personHeightInFrame(24, 50, 10);
    const px200 = personHeightInFrame(24, 200, 10);
    expect(px200).toBeGreaterThan(px50);
  });
});

describe('fovConePoints', () => {
  it('returns symmetric points for 0 rotation', () => {
    const pts = fovConePoints(0, 0, 0, 60, 10);
    expect(pts.left.y).toBeCloseTo(-pts.right.y, 5);
    expect(pts.left.x).toBeCloseTo(pts.right.x, 5);
  });

  it('returns points at the correct range', () => {
    const pts = fovConePoints(0, 0, 90, 40, 5);
    const distL = Math.sqrt(pts.left.x ** 2 + pts.left.y ** 2);
    const distR = Math.sqrt(pts.right.x ** 2 + pts.right.y ** 2);
    expect(distL).toBeCloseTo(5, 5);
    expect(distR).toBeCloseTo(5, 5);
  });
});
