import { describe, it, expect } from 'vitest';
import { effectiveCameraPos } from '../utils/camera';
import type { VenueCamera } from '../types';

function makeCam(overrides: Partial<VenueCamera> = {}): VenueCamera {
  return {
    id: 'cam-1',
    label: 'CAM 1',
    cameraId: 'test',
    lensId: 'test',
    x: 10,
    y: 5,
    z: 1.5,
    pan: 0,
    tilt: 0,
    focalLength: 50,
    aperture: 5.6,
    focusDistance: 10,
    color: '#ff0000',
    extenderActive: 1,
    ...overrides,
  };
}

describe('effectiveCameraPos', () => {
  it('returns parked position when no offset', () => {
    const cam = makeCam();
    const pos = effectiveCameraPos(cam);
    expect(pos.x).toBe(10);
    expect(pos.y).toBe(5);
  });

  it('returns parked position when trackOffset is 0', () => {
    const cam = makeCam({ trackOffset: 0 });
    const pos = effectiveCameraPos(cam);
    expect(pos.x).toBe(10);
    expect(pos.y).toBe(5);
  });

  it('offsets along pan=0 (rightward)', () => {
    const cam = makeCam({ pan: 0, trackOffset: 2 });
    const pos = effectiveCameraPos(cam);
    expect(pos.x).toBeCloseTo(12, 5);
    expect(pos.y).toBeCloseTo(5, 5);
  });

  it('offsets along pan=90 (downward)', () => {
    const cam = makeCam({ pan: 90, trackOffset: 3 });
    const pos = effectiveCameraPos(cam);
    expect(pos.x).toBeCloseTo(10, 5);
    expect(pos.y).toBeCloseTo(8, 5);
  });

  it('offsets along pan=-90 (upward)', () => {
    const cam = makeCam({ pan: -90, trackOffset: 2 });
    const pos = effectiveCameraPos(cam);
    expect(pos.x).toBeCloseTo(10, 5);
    expect(pos.y).toBeCloseTo(3, 5);
  });

  it('handles negative trackOffset', () => {
    const cam = makeCam({ pan: 0, trackOffset: -2 });
    const pos = effectiveCameraPos(cam);
    expect(pos.x).toBeCloseTo(8, 5);
    expect(pos.y).toBeCloseTo(5, 5);
  });
});
