import { describe, expect, it } from 'vitest';
import {
  MOTION_PROFILES,
  feasibleDuration,
  feasibleDurationRounded,
  motionEase,
  motionJitter,
  profileForMount,
} from '../utils/motionProfile';
import { MOUNT_HEIGHT_RANGE, MOUNT_TYPE_LABELS, type CameraMountType, type VenueCamera } from '../types';

// Bewegungsstil je Montage: jedes Rig faehrt anders an und hat echte
// Geschwindigkeitsgrenzen. Getestet ist die reine Mathematik dahinter.

const cam = (over: Partial<VenueCamera> = {}): VenueCamera =>
  ({
    id: 'c1', label: 'CAM 1', cameraId: 'x', lensId: 'y',
    x: 0, y: 0, z: 1.5, pan: 0, tilt: 0,
    focalLength: 20, aperture: 2.8, focusDistance: 5,
    color: '#f00', extenderActive: 1, trackOffset: 0,
    ...over,
  }) as VenueCamera;

describe('Profil-Zuordnung', () => {
  it('kennt jede Montage aus den Typen', () => {
    for (const m of Object.keys(MOUNT_TYPE_LABELS) as CameraMountType[]) {
      expect(MOTION_PROFILES[m]).toBeDefined();
      expect(MOTION_PROFILES[m].label.length).toBeGreaterThan(0);
    }
  });

  it('faellt ohne Montage auf Stativ zurueck', () => {
    expect(profileForMount(undefined)).toBe(MOTION_PROFILES.tripod);
  });

  it('fuehrt den Technocrane als eigene Montage mit Teleskopweg', () => {
    expect(MOUNT_TYPE_LABELS.technocrane).toContain('Technocrane');
    // Teleskopierender Arm -> laengerer Weg als ein klassischer Jib.
    expect(MOUNT_HEIGHT_RANGE.technocrane.track!).toBeGreaterThan(MOUNT_HEIGHT_RANGE.jib.track!);
    expect(MOUNT_HEIGHT_RANGE.technocrane.max).toBeGreaterThan(MOUNT_HEIGHT_RANGE.jib.max);
  });
});

describe('motionEase', () => {
  it('startet bei 0 und endet exakt bei 1 — auch bei ueberschwingenden Profilen', () => {
    for (const m of Object.keys(MOTION_PROFILES) as CameraMountType[]) {
      expect(motionEase(MOTION_PROFILES[m], 0)).toBe(0);
      expect(motionEase(MOTION_PROFILES[m], 1)).toBe(1);
    }
  });

  it('klemmt Zeiten ausserhalb 0..1 ab', () => {
    expect(motionEase(MOTION_PROFILES.dolly, -1)).toBe(0);
    expect(motionEase(MOTION_PROFILES.dolly, 5)).toBe(1);
  });

  it('laesst den Dolly traeger anlaufen als das Stativ', () => {
    // Kern des Features: schwere Rigs legen im ersten Viertel weniger Weg
    // zurueck (langer Anlauf).
    const early = 0.25;
    expect(motionEase(MOTION_PROFILES.dolly, early)).toBeLessThan(
      motionEase(MOTION_PROFILES.tripod, early),
    );
    expect(motionEase(MOTION_PROFILES.technocrane, early)).toBeLessThan(
      motionEase(MOTION_PROFILES.tripod, early),
    );
  });

  it('laesst die Steadicam ueberschwingen und sich einpendeln', () => {
    // Schwebendes Rig: kurz vor Schluss schon ueber dem Ziel.
    expect(motionEase(MOTION_PROFILES.steadicam, 0.85)).toBeGreaterThan(1);
  });
});

describe('motionJitter', () => {
  it('bleibt bei ruhigen Rigs exakt null', () => {
    expect(motionJitter(MOTION_PROFILES.tripod, 0.5)).toEqual({ pan: 0, tilt: 0 });
    expect(motionJitter(MOTION_PROFILES.dolly, 0.5)).toEqual({ pan: 0, tilt: 0 });
  });

  it('zittert bei Handheld, aber nur waehrend der Fahrt', () => {
    // An den Enden 0, damit Start- und Zielbild exakt getroffen werden.
    expect(motionJitter(MOTION_PROFILES.handheld, 0).pan).toBeCloseTo(0, 9);
    expect(motionJitter(MOTION_PROFILES.handheld, 1).pan).toBeCloseTo(0, 9);
    expect(Math.abs(motionJitter(MOTION_PROFILES.handheld, 0.5).pan)).toBeGreaterThan(0);
  });

  it('bleibt innerhalb der Profil-Amplitude', () => {
    const p = MOTION_PROFILES.handheld;
    for (let t = 0; t <= 1; t += 0.05) {
      expect(Math.abs(motionJitter(p, t).pan)).toBeLessThanOrEqual(p.jitterDeg + 1e-9);
    }
  });

  it('ist deterministisch — dieselbe Fahrt sieht gleich aus', () => {
    expect(motionJitter(MOTION_PROFILES.handheld, 0.42)).toEqual(
      motionJitter(MOTION_PROFILES.handheld, 0.42),
    );
  });
});

describe('feasibleDuration', () => {
  it('braucht fuer 6 m Dollyfahrt deutlich laenger als die Mindestdauer', () => {
    // maxTravelMps 1.2 => 6 m brauchen 5 s. Genau der Fall "geht in 2 s nicht".
    const d = feasibleDuration(MOTION_PROFILES.dolly, cam(), cam({ x: 6 }));
    expect(d).toBeCloseTo(5, 1);
  });

  it('rechnet den Track-Weg mit ein (Jib-Schwenk / Teleskop)', () => {
    const d = feasibleDuration(MOTION_PROFILES.technocrane, cam(), cam({ trackOffset: 4.35 }));
    // 4.35 m bei 1.45 m/s = 3 s.
    expect(d).toBeCloseTo(3, 1);
  });

  it('beruecksichtigt Schwenk, Hub und Zoom, nicht nur die Fahrt', () => {
    const rot = feasibleDuration(MOTION_PROFILES.jib, cam(), cam({ pan: 105 }));
    expect(rot).toBeCloseTo(3, 1); // 105° / 35°/s

    const lift = feasibleDuration(MOTION_PROFILES.jib, cam({ z: 0.5 }), cam({ z: 2.9 }));
    expect(lift).toBeCloseTo(3, 1); // 2.4 m / 0.8 m/s
  });

  it('nimmt immer die langsamste Achse', () => {
    // Kurze Fahrt, aber weiter Schwenk -> der Schwenk bestimmt die Dauer.
    const d = feasibleDuration(MOTION_PROFILES.dolly, cam(), cam({ x: 0.2, pan: 160 }));
    expect(d).toBeCloseTo(4, 1); // 160° / 40°/s
  });

  it('unterschreitet nie die Mindestdauer des Rigs', () => {
    // Winzige Bewegung auf dem Technocrane bleibt trotzdem eine ruhige Fahrt.
    expect(feasibleDuration(MOTION_PROFILES.technocrane, cam(), cam({ pan: 1 })))
      .toBe(MOTION_PROFILES.technocrane.minDurationS);
  });

  it('braucht auf schweren Rigs laenger als auf leichten', () => {
    const move = [cam(), cam({ x: 3, pan: 45 })] as const;
    expect(feasibleDuration(MOTION_PROFILES.technocrane, ...move))
      .toBeGreaterThan(feasibleDuration(MOTION_PROFILES.handheld, ...move));
  });

  it('ignoriert fehlende Felder statt NaN zu liefern', () => {
    const d = feasibleDuration(MOTION_PROFILES.tripod, {}, { pan: 30 });
    expect(Number.isFinite(d)).toBe(true);
  });

  it('rundet fuer die Anzeige auf eine Nachkommastelle', () => {
    const d = feasibleDurationRounded(MOTION_PROFILES.dolly, cam(), cam({ x: 6 }));
    expect(d).toBe(5);
    expect(Number.isInteger(d * 10)).toBe(true);
  });
});
