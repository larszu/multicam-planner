import { describe, expect, it } from 'vitest';
import {
  DRIVE_KEYS,
  SPEED_STEPS,
  TILT_RANGE,
  applyDrive,
  driveFromKeys,
  isIdle,
  mergeInput,
  wrap180,
  type DriveInput,
} from '../utils/rigDrive';
import { rigLimits } from '../utils/rigLimits';
import { profileForMount } from '../utils/motionProfile';
import type { CameraMountType, VenueCamera } from '../types';

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

const ctx = (c: VenueCamera, mount: CameraMountType = 'dolly', rigId?: string) => ({
  cam: c,
  limits: rigLimits({ mountType: mount, rigId, trackLengthM: c.trackLengthM }),
  profile: profileForMount(mount),
});

describe('Tastenbelegung', () => {
  it('kollidiert nicht mit der 3D-Flugkamera oder der Shot-Navigation', () => {
    // Alle Panels sind gleichzeitig gerendert, ihre Tastatur-Handler also auch.
    // W/A/S/D + Space gehoeren der 3D-Kamera, Q/E der Shotlist.
    for (const taken of ['w', 'a', 's', 'd', ' ', 'q', 'e']) {
      expect(DRIVE_KEYS[taken], `${taken} ist doppelt belegt`).toBeUndefined();
    }
  });

  it('summiert gedrueckte Tasten zu Auslenkungen', () => {
    const input = driveFromKeys(['l', 'arrowup']);
    expect(input.travel).toBe(1);
    expect(input.tilt).toBe(1);
  });

  it('hebt gegenlaeufige Tasten auf', () => {
    expect(driveFromKeys(['j', 'l']).travel).toBe(0);
  });

  it('ignoriert unbelegte Tasten', () => {
    expect(isIdle(driveFromKeys(['x', 'y']))).toBe(true);
  });

  it('ueberlagert Tastatur und Pad, bleibt aber bei ±1', () => {
    const merged = mergeInput({ pan: 1 }, { pan: 1, tilt: -0.5 });
    expect(merged.pan).toBe(1);
    expect(merged.tilt).toBe(-0.5);
  });

  it('bietet drei Tempo-Stufen mit eigenen Tasten', () => {
    expect(SPEED_STEPS.map((s) => s.key)).toEqual(['1', '2', '3']);
    expect(SPEED_STEPS[0].factor).toBeLessThan(SPEED_STEPS[2].factor);
  });
});

describe('wrap180', () => {
  it('normiert auf -180..180', () => {
    expect(wrap180(190)).toBeCloseTo(-170, 6);
    expect(wrap180(-190)).toBeCloseTo(170, 6);
    expect(wrap180(180)).toBeCloseTo(180, 6);
    expect(wrap180(0)).toBe(0);
  });
});

describe('applyDrive', () => {
  it('faehrt mehrere Achsen im selben Frame', () => {
    // Das ist der Kern: Dolly verschieben WAEHREND man neigt.
    const c = cam({ trackOffset: 0, trackLengthM: 8 });
    const patch = applyDrive(ctx(c), { travel: 1, tilt: -1 }, 1);
    expect(patch).not.toBeNull();
    expect(patch!.trackOffset).toBeGreaterThan(0);
    expect(patch!.tilt).toBeLessThan(0);
  });

  it('haelt sich an das Tempo des Rigs', () => {
    const c = cam({ trackOffset: 0, trackLengthM: 20 });
    const p = profileForMount('dolly');
    const dt = 0.2;
    const patch = applyDrive(ctx(c), { travel: 1 }, dt);
    expect(patch!.trackOffset! / dt).toBeCloseTo(p.maxTravelMps, 6);
  });

  it('skaliert mit der Tempo-Stufe', () => {
    const c = cam({ trackOffset: 0, trackLengthM: 20 });
    const fein = applyDrive(ctx(c), { travel: 1 }, 1, SPEED_STEPS[0].factor)!;
    const schnell = applyDrive(ctx(c), { travel: 1 }, 1, SPEED_STEPS[2].factor)!;
    expect(schnell.trackOffset! / fein.trackOffset!).toBeCloseTo(
      SPEED_STEPS[2].factor / SPEED_STEPS[0].factor,
      5,
    );
  });

  it('faehrt nicht ueber das Schienenende hinaus', () => {
    // ±1 m Fahrweg, Wagen steht schon fast am Ende.
    const c = cam({ trackOffset: 0.95, trackLengthM: 2 });
    const patch = applyDrive(ctx(c), { travel: 1 }, 0.25);
    expect(patch!.trackOffset).toBeCloseTo(1, 6);
  });

  it('laesst ein Rig ohne Fahrweg nicht fahren', () => {
    const c = cam({ trackOffset: 0 });
    const patch = applyDrive(ctx(c, 'tripod'), { travel: 1 }, 1);
    expect(patch).toBeNull();
  });

  it('begrenzt den Tilt auf den Neigebereich', () => {
    const up = applyDrive(ctx(cam({ tilt: 40 })), { tilt: 1 }, 10);
    expect(up!.tilt).toBe(TILT_RANGE.max);
    const down = applyDrive(ctx(cam({ tilt: -80 })), { tilt: -1 }, 10);
    expect(down!.tilt).toBe(TILT_RANGE.min);
  });

  it('laesst den Pan umlaufen statt anzuschlagen', () => {
    const patch = applyDrive(ctx(cam({ pan: 179 })), { pan: 1 }, 1, 5);
    expect(patch!.pan).toBeLessThan(0); // ueber 180 hinaus → negativ
  });

  it('bleibt beim Hub in den Grenzen des Rigs', () => {
    const max = rigLimits({ mountType: 'dolly', rigId: 'fisher-11' }).maxHeightM;
    const c = cam({ z: max - 0.01 });
    const patch = applyDrive(ctx(c, 'dolly', 'fisher-11'), { lift: 1 }, 0.25);
    expect(patch!.z).toBeCloseTo(max, 6);
  });

  it('richtet das Rig langsamer aus als es schwenkt', () => {
    const c = cam({ pan: 0 });
    const pan = applyDrive(ctx(c), { pan: 1 }, 1)!.pan! - 0;
    const yaw = applyDrive(ctx(c), { yaw: 1 }, 1)!.rigRotation! - 0;
    expect(yaw).toBeGreaterThan(0);
    expect(yaw).toBeLessThan(pan);
  });

  it('zoomt multiplikativ — gleiche Tastenzeit, gleicher Bildwinkel-Sprung', () => {
    const p = profileForMount('dolly');
    const dt = 0.2;
    const a = applyDrive(ctx(cam({ focalLength: 20 })), { zoom: 1 }, dt)!;
    const b = applyDrive(ctx(cam({ focalLength: 80 })), { zoom: 1 }, dt)!;
    expect(a.focalLength! / 20).toBeCloseTo(b.focalLength! / 80, 6);
    expect(a.focalLength! / 20).toBeCloseTo(Math.exp(Math.log(p.maxZoomRatioPerS) * dt), 6);
  });

  it('bleibt im Brennweitenbereich des Objektivs', () => {
    const range = { min: 8, max: 80 };
    const tele = applyDrive({ ...ctx(cam({ focalLength: 78 })), focalRange: range }, { zoom: 1 }, 0.25);
    expect(tele!.focalLength).toBe(80);
    const weit = applyDrive({ ...ctx(cam({ focalLength: 8.2 })), focalRange: range }, { zoom: -1 }, 0.25);
    expect(weit!.focalLength).toBe(8);
  });

  it('meldet nichts zurueck, wenn nichts anliegt', () => {
    expect(applyDrive(ctx(cam()), {}, 1)).toBeNull();
    expect(applyDrive(ctx(cam()), { travel: 0 } as DriveInput, 1)).toBeNull();
  });

  it('deckelt lange Frame-Pausen, statt das Rig springen zu lassen', () => {
    // Nach einem Tab-Wechsel liefert rAF gerne eine ganze Sekunde am Stueck.
    const c = cam({ trackOffset: 0, trackLengthM: 100 });
    const kurz = applyDrive(ctx(c), { travel: 1 }, 0.25)!;
    const lang = applyDrive(ctx(c), { travel: 1 }, 5)!;
    expect(lang.trackOffset).toBeCloseTo(kurz.trackOffset!, 6);
  });
});
