import { describe, expect, it } from 'vitest';
import { hasRail, rigSkeleton, type RigSegment, type RigSkeleton } from '../utils/rigGeometry';
import { rigLimits } from '../utils/rigLimits';
import { MOUNT_TYPE_LABELS, type CameraMountType } from '../types';
import { RIGS } from '../data/rigs';

// Das Skelett ist die gemeinsame Quelle fuer die 2D-Draufsicht und die
// 3D-Ansicht. Wenn es hier stimmt, koennen die beiden nicht auseinanderlaufen.

const skel = (
  mountType: CameraMountType,
  over: { rigId?: string; trackLengthM?: number; heightM?: number; offsetM?: number } = {},
): RigSkeleton =>
  rigSkeleton(rigLimits({ mountType, rigId: over.rigId, trackLengthM: over.trackLengthM }), {
    heightM: over.heightM ?? 1.5,
    offsetM: over.offsetM ?? 0,
  });

const roles = (s: RigSkeleton) => new Set(s.segments.map((x) => x.role));
const len = (g: RigSegment) => Math.hypot(g.b.f - g.a.f, g.b.l - g.a.l, g.b.h - g.a.h);

describe('Skelett — allgemeine Zusicherungen', () => {
  it('liefert fuer jede Montage-Kategorie Geometrie', () => {
    for (const m of Object.keys(MOUNT_TYPE_LABELS) as CameraMountType[]) {
      const s = skel(m);
      expect(s.segments.length, `keine Segmente fuer ${m}`).toBeGreaterThan(0);
    }
  });

  it('setzt den Kopf auf Objektivhoehe und Fahrweg-Offset', () => {
    const s = skel('dolly', { heightM: 1.35, offsetM: 1.2 });
    expect(s.head).toEqual({ f: 1.2, l: 0, h: 1.35 });
  });

  it('haelt alle Bauteile auf oder ueber dem Boden', () => {
    for (const r of RIGS) {
      const s = rigSkeleton(rigLimits({ mountType: r.type, rigId: r.id }), {
        heightM: (r.minHeightM + r.maxHeightM) / 2,
      });
      for (const g of s.segments) {
        expect(g.a.h, `${r.id} ${g.role}`).toBeGreaterThanOrEqual(0);
        expect(g.b.h, `${r.id} ${g.role}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('erzeugt keine entarteten Bauteile', () => {
    for (const r of RIGS) {
      const s = rigSkeleton(rigLimits({ mountType: r.type, rigId: r.id }), { heightM: r.maxHeightM });
      for (const g of s.segments) {
        expect(g.thicknessM, `${r.id} ${g.role}`).toBeGreaterThan(0);
        // Raeder und das Lot sind senkrecht (Laenge > 0), nichts ist ein Punkt.
        expect(len(g), `${r.id} ${g.role}`).toBeGreaterThan(0);
      }
    }
  });

  it('benennt das Rig, sonst die Kategorie', () => {
    expect(skel('jib', { rigId: 'jimmyjib-triangle-30ft' }).label).toBe('Jimmy Jib Triangle 30 ft');
    expect(skel('jib').label).toBe(MOUNT_TYPE_LABELS.jib);
  });
});

describe('Stativ und Pedestal', () => {
  it('stellt das Stativ auf drei Beine bis zum Boden', () => {
    const s = skel('tripod', { rigId: 'tripod-standard', heightM: 1.6 });
    const legs = s.segments.filter((g) => g.role === 'leg');
    expect(legs).toHaveLength(3);
    for (const l of legs) expect(l.b.h).toBe(0);
    // Fußabdruck = Beinspreizung des Rigs (0.9 m).
    expect(s.footprint?.l).toBeCloseTo(0.9, 2);
  });

  it('spreizt das Baby-Stativ enger als das hohe Stativ', () => {
    const baby = skel('tripod', { rigId: 'tripod-baby', heightM: 0.6 });
    const tall = skel('tripod', { rigId: 'tripod-tall', heightM: 2.2 });
    expect(baby.footprint!.l).toBeLessThan(tall.footprint!.l);
  });

  it('gibt dem Pedestal Saeule und Rollen', () => {
    const s = skel('pedestal', { rigId: 'ped-vinten-osprey', heightM: 1.4 });
    expect(roles(s).has('mast')).toBe(true);
    expect(s.segments.filter((g) => g.role === 'wheel')).toHaveLength(3);
  });
});

describe('Schiene', () => {
  it('legt die Schiene symmetrisch um die Parkposition', () => {
    const s = skel('dolly', { trackLengthM: 10 });
    expect(hasRail(s)).toBe(true);
    const rails = s.segments.filter((g) => g.role === 'rail');
    expect(rails).toHaveLength(2); // zwei Straenge
    // Gelegt wird aus ganzen Sektionen, also mindestens die Wunschlaenge.
    expect(s.railSpanM).toBeGreaterThanOrEqual(10);
    for (const r of rails) {
      expect(r.a.f).toBeCloseTo(-s.railSpanM / 2, 6);
      expect(r.b.f).toBeCloseTo(s.railSpanM / 2, 6);
    }
  });

  it('setzt Schwellen an die Sektionsstoeße', () => {
    const s = skel('dolly', { trackLengthM: 6.1 }); // 2 × 10 ft
    // Stoeße = Sektionsgrenzen inklusive beider Enden.
    expect(s.sleeperF.length).toBe(3);
    expect(s.sleeperF[0]).toBeCloseTo(-s.sleeperF[2], 6);
    expect(s.segments.filter((g) => g.role === 'sleeper')).toHaveLength(3);
  });

  it('faehrt den Wagen mit dem Offset, laesst die Schiene aber stehen', () => {
    const s = skel('dolly', { trackLengthM: 8, offsetM: 3 });
    const rail = s.segments.find((g) => g.role === 'rail')!;
    expect(rail.a.f).toBeCloseTo(-s.railSpanM / 2, 6);
    expect(rail.b.f).toBeCloseTo(s.railSpanM / 2, 6);
    const chassis = s.segments.find((g) => g.role === 'body')!;
    expect((chassis.a.f + chassis.b.f) / 2).toBeCloseTo(3, 2);
  });

  it('haengt den Slider zwischen zwei Fuesse unter die Kamera', () => {
    const s = skel('slider', { rigId: 'slider-150', heightM: 1.2 });
    const rail = s.segments.find((g) => g.role === 'rail')!;
    expect(len(rail)).toBeCloseTo(1.5, 2);
    expect(rail.a.h).toBeLessThan(1.2);
    expect(s.segments.filter((g) => g.role === 'leg')).toHaveLength(2);
  });

  it('kennt bei Stativen keine Schiene', () => {
    expect(hasRail(skel('tripod'))).toBe(false);
    expect(skel('tripod').sleeperF).toEqual([]);
  });
});

describe('Jib und Technocrane', () => {
  it('setzt den Drehpunkt hinter die Kamera und verbindet ihn mit dem Kopf', () => {
    const s = skel('jib', { rigId: 'jimmyjib-triangle-18ft', heightM: 4 });
    const arm = s.segments.find((g) => g.role === 'arm')!;
    expect(arm.b).toEqual(s.head);
    expect(arm.a.f).toBeLessThan(0); // Drehpunkt liegt hinten
    expect(roles(s).has('weight')).toBe(true);
  });

  it('macht den Ausleger mit der Rig-Laenge laenger', () => {
    const arm12 = skel('jib', { rigId: 'jimmyjib-triangle-12ft', heightM: 3 }).segments.find((g) => g.role === 'arm')!;
    const arm30 = skel('jib', { rigId: 'jimmyjib-triangle-30ft', heightM: 3 }).segments.find((g) => g.role === 'arm')!;
    expect(len(arm30)).toBeGreaterThan(len(arm12) * 2);
  });

  it('haelt die Auslegerlaenge auf dem Datenblattwert, egal wie hoch die Kamera steht', () => {
    // Der horizontale Anteil folgt aus Pythagoras — der Ausleger selbst bleibt
    // so lang, wie das Rig ihn hat.
    const arm = 18 * 0.3048;
    for (const heightM of [1, 3, 6, 9]) {
      const g = skel('jib', { rigId: 'jimmyjib-triangle-18ft', heightM }).segments.find((x) => x.role === 'arm')!;
      expect(len(g)).toBeLessThanOrEqual(arm + 0.01);
    }
  });

  it('zeigt beim Teleskopkran das Innenrohr und ein fahrbares Chassis', () => {
    const s = skel('technocrane', { rigId: 'supertechno-30', heightM: 7 });
    expect(roles(s).has('telescope')).toBe(true);
    expect(s.segments.filter((g) => g.role === 'wheel')).toHaveLength(4);
    const tele = s.segments.find((g) => g.role === 'telescope')!;
    expect(tele.b).toEqual(s.head);
  });

  it('stellt den klassischen Jib auf ein Dreibein statt auf Raeder', () => {
    const s = skel('jib', { rigId: 'jimmyjib-triangle-12ft', heightM: 3 });
    expect(s.segments.filter((g) => g.role === 'leg')).toHaveLength(3);
    expect(roles(s).has('wheel')).toBe(false);
  });
});

describe('Fliegend, fahrend, getragen', () => {
  it('spannt bei der Cable-Cam vier Seile nach oben', () => {
    const s = skel('cablecam', { rigId: 'spidercam-field', heightM: 12 });
    const wires = s.segments.filter((g) => g.role === 'wire');
    expect(wires).toHaveLength(4);
    for (const w of wires) expect(w.b.h).toBeGreaterThan(12);
  });

  it('gibt der Drohne vier Rotorarme und ein Lot zum Boden', () => {
    const s = skel('drone', { heightM: 20 });
    expect(s.segments.filter((g) => g.role === 'wire')).toHaveLength(4);
    const plumb = s.segments.find((g) => g.role === 'plumb')!;
    expect(plumb.b.h).toBe(0);
  });

  it('waechst bei der Scherenbuehne mit der Hubhoehe', () => {
    const low = skel('scissorlift', { rigId: 'scissorlift-8', heightM: 2 });
    const high = skel('scissorlift', { rigId: 'scissorlift-8', heightM: 8 });
    const scissors = (s: RigSkeleton) => s.segments.filter((g) => g.role === 'leg').length;
    expect(scissors(high)).toBeGreaterThan(scissors(low));
  });

  it('stellt getragene Rigs als Operator mit Kamera davor dar', () => {
    for (const m of ['handheld', 'steadicam', 'gimbal'] as CameraMountType[]) {
      const s = skel(m, { heightM: 1.6 });
      const body = s.segments.find((g) => g.role === 'body')!;
      expect(body.a.h).toBe(0); // Operator steht auf dem Boden
      expect(s.segments.find((g) => g.role === 'arm')!.b).toEqual(s.head);
    }
  });

  it('haengt die feste Montage an eine Platte hinter der Kamera', () => {
    const s = skel('fixed', { rigId: 'fixed-wall', heightM: 6 });
    const arm = s.segments.find((g) => g.role === 'arm')!;
    expect(arm.b.f).toBeLessThan(0);
    expect(arm.a.h).toBeCloseTo(6, 6);
  });
});
