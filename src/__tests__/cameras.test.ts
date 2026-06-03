import { describe, it, expect } from 'vitest';
import {
  getAdapterInfo,
  getEffectiveSensor,
  getSpeedBooster,
  speedBoosterExists,
} from '../data/cameras';
import type { Camera, Lens } from '../types';

const MFT_BODY: Camera = {
  id: 'test-mft', manufacturer: 'Test', model: 'MFT Body',
  sensor: { name: 'MFT', widthMm: 17.3, heightMm: 13, cropFactor: 2.0 },
  mount: 'MFT', adaptedMounts: ['EF'], resolutions: ['4K'], type: 'cinema',
  mountAdapters: {
    EF: { name: 'EF → MFT Adapter (passive)', lightLossStops: 0 },
  },
};

const FZ_BODY: Camera = {
  id: 'test-fz', manufacturer: 'Test', model: 'FZ Body',
  sensor: { name: 'S35', widthMm: 24.6, heightMm: 13.8, cropFactor: 1.46 },
  mount: 'FZ', adaptedMounts: ['EF', 'B4'], resolutions: ['4K'], type: 'cinema',
  mountAdapters: {
    B4: { name: 'LA-FZB1', lightLossStops: 1.0, cropSensor: { name: '2/3"', widthMm: 9.6, heightMm: 5.4, cropFactor: 3.93 } },
  },
};

const DUMMY_LENS: Lens = {
  id: 'l', manufacturer: 'Test', model: 'Zoom',
  focalLengthMin: 24, focalLengthMax: 70, maxApertureWide: 2.8,
  mount: 'EF', type: 'zoom',
};

describe('speedBoosterExists', () => {
  it('is true for supported combos', () => {
    expect(speedBoosterExists('EF', 'MFT')).toBe(true);
    expect(speedBoosterExists('EF', 'FZ')).toBe(true);
    expect(speedBoosterExists('NF', 'E')).toBe(true);
  });
  it('is false for unsupported combos and missing args', () => {
    expect(speedBoosterExists('B4', 'PL')).toBe(false);
    expect(speedBoosterExists('EF', 'B4')).toBe(false);
    expect(speedBoosterExists(undefined, 'MFT')).toBe(false);
    expect(speedBoosterExists('EF', undefined)).toBe(false);
  });
});

describe('getSpeedBooster', () => {
  it('returns null when no booster exists for the combo', () => {
    expect(getSpeedBooster(MFT_BODY, 'PL')).toBeNull();
    expect(getSpeedBooster(FZ_BODY, 'B4')).toBeNull();
  });

  it('widens the MFT sensor by 1/0.71 and reports ~1 stop gain', () => {
    const sb = getSpeedBooster(MFT_BODY, 'EF');
    expect(sb).not.toBeNull();
    expect(sb!.cropSensor!.widthMm).toBeCloseTo(17.3 / 0.71, 4);
    expect(sb!.cropSensor!.heightMm).toBeCloseTo(13 / 0.71, 4);
    expect(sb!.cropSensor!.cropFactor).toBeCloseTo(2.0 * 0.71, 4);
    expect(sb!.lightLossStops).toBe(-1.0); // gain
  });

  it('derives the widened sensor from each body’s own native sensor', () => {
    const mft = getSpeedBooster(MFT_BODY, 'EF');
    const fz = getSpeedBooster(FZ_BODY, 'EF');
    expect(fz!.cropSensor!.widthMm).toBeCloseTo(24.6 / 0.71, 4);
    // Different bodies → different widened sensors from the same 0.71× booster
    expect(fz!.cropSensor!.widthMm).not.toBeCloseTo(mft!.cropSensor!.widthMm, 1);
  });
});

describe('getAdapterInfo with speed booster', () => {
  it('returns the speed booster when enabled on a supported combo', () => {
    const info = getAdapterInfo(MFT_BODY, DUMMY_LENS, true, 'EF');
    expect(info?.name).toMatch(/Speed Booster/i);
    expect(info?.lightLossStops).toBe(-1.0);
  });

  it('falls back to the passive mountAdapter when booster is off', () => {
    const info = getAdapterInfo(MFT_BODY, DUMMY_LENS, false, 'EF');
    expect(info?.name).toBe('EF → MFT Adapter (passive)');
    expect(info?.lightLossStops).toBe(0);
  });

  it('ignores the booster flag when the combo has none', () => {
    // B4 active on FZ body has a relay adapter, no speed booster
    const info = getAdapterInfo(FZ_BODY, DUMMY_LENS, true, 'B4');
    expect(info?.name).toBe('LA-FZB1');
    expect(info?.cropSensor?.cropFactor).toBeCloseTo(3.93, 2);
  });
});

describe('getEffectiveSensor with speed booster', () => {
  it('uses the widened booster sensor when enabled', () => {
    const sensor = getEffectiveSensor(MFT_BODY, DUMMY_LENS, true, undefined, 'EF');
    expect(sensor.widthMm).toBeCloseTo(17.3 / 0.71, 4);
  });

  it('uses the native sensor when the booster is off', () => {
    const sensor = getEffectiveSensor(MFT_BODY, DUMMY_LENS, false, undefined, 'EF');
    expect(sensor.widthMm).toBeCloseTo(17.3, 4);
  });
});
