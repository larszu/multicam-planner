import { describe, it, expect } from 'vitest';
import { toCameraList, parseCameraList, CAMERA_LIST_KIND } from '../utils/cameraExport';
import type { VenueCamera, Camera } from '../types';

function cam(overrides: Partial<VenueCamera>): VenueCamera {
  return {
    id: 'c1', label: 'CAM 1', cameraId: 'sony-pmw-f55', lensId: 'lens1',
    x: 5, y: 7, pan: 0, tilt: 0, focalLength: 50, aperture: 2.8, focusDistance: 5,
    extenderActive: false, useSpeedbooster: false, sensorModeIndex: 0,
    color: '#fff', mountType: 'tripod', z: 1.5,
    ...overrides,
  } as unknown as VenueCamera;
}

const f55: Camera = {
  id: 'sony-pmw-f55', deviceTypeId: 'eb02ca7e-856c-40ab-9a73-d1e98110f003',
  manufacturer: 'Sony', model: 'PMW-F55',
  sensor: { widthMm: 24, heightMm: 12.7 } as Camera['sensor'],
  mount: 'FZ', resolutions: ['4K'], type: 'cinema',
};

describe('cameraExport (MultiCam → Cable)', () => {
  it('exportiert platzierte Kameras mit Modell/Hersteller + Position', () => {
    const ex = toCameraList(
      [cam({ id: 'c1', label: 'CAM 1', x: 5, y: 7 })],
      (id) => (id === 'sony-pmw-f55' ? f55 : undefined),
      { appVersion: '0.4.0', exportedAt: '2026-06-30T00:00:00.000Z' },
    );
    expect(ex.kind).toBe(CAMERA_LIST_KIND);
    expect(ex.cameras).toHaveLength(1);
    expect(ex.cameras[0]).toMatchObject({
      id: 'c1', label: 'CAM 1', manufacturer: 'Sony', model: 'PMW-F55', x: 5, y: 7,
    });
    // Stabile Geraetetyp-ID wird mitgegeben, damit Cable autoritativ aufloest.
    expect(ex.cameras[0].deviceTypeId).toBe('eb02ca7e-856c-40ab-9a73-d1e98110f003');
  });

  it('Round-Trip durch parseCameraList', () => {
    const ex = toCameraList([cam({})], () => f55, { appVersion: '0.4.0', exportedAt: 'x' });
    const back = parseCameraList(JSON.stringify(ex));
    expect(back.cameras[0].model).toBe('PMW-F55');
  });

  it('parseCameraList lehnt fremde Dateien ab', () => {
    expect(() => parseCameraList('{"kind":"venue-exchange"}')).toThrow();
  });
});
