import { describe, expect, it } from 'vitest';
import {
  RIGS,
  TRACK_SECTIONS_M,
  getRigById,
  rigsForType,
  trackSectionPlan,
  type CameraRig,
} from '../data/rigs';
import { clampHeight, clampTrack, hasTrack, rigLimits } from '../utils/rigLimits';
import { MOTION_PROFILES, profileForMount } from '../utils/motionProfile';
import { MOUNT_TYPE_LABELS, type CameraMountType, type VenueCamera } from '../types';

// Rig-Katalog: konkrete Geraete mit echten Maßen. Die Kategorie
// (CameraMountType) bestimmt den Bewegungsstil, das Rig die Grenzen.

const FT = 0.3048;

describe('Katalog-Integritaet', () => {
  it('hat eindeutige Ids', () => {
    const ids = RIGS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('nennt fuer jedes Rig einen sinnvollen Hoehenbereich', () => {
    for (const r of RIGS) {
      expect(r.maxHeightM).toBeGreaterThan(r.minHeightM);
      expect(r.minHeightM).toBeGreaterThanOrEqual(0);
    }
  });

  it('verweist nur auf Kategorien, die es gibt — samt Bewegungsprofil', () => {
    for (const r of RIGS) {
      expect(MOUNT_TYPE_LABELS[r.type]).toBeDefined();
      expect(MOTION_PROFILES[r.type]).toBeDefined();
    }
  });

  it('deckt jede Montage-Kategorie mit mindestens einem Rig ab', () => {
    // Sonst haette der Nutzer eine Kategorie ohne auswaehlbares Modell.
    for (const m of Object.keys(MOUNT_TYPE_LABELS) as CameraMountType[]) {
      expect(rigsForType(m).length, `keine Rigs fuer ${m}`).toBeGreaterThan(0);
    }
  });

  it('findet Rigs per Id und meldet Unbekanntes als undefined', () => {
    expect(getRigById('techno-22')?.name).toBe('Technocrane 22′');
    expect(getRigById('gibtsnicht')).toBeUndefined();
    expect(getRigById(undefined)).toBeUndefined();
  });
});

describe('Jimmy Jib Triangle', () => {
  const jibs = RIGS.filter((r) => r.id.startsWith('jimmyjib-triangle-'));

  it('fuehrt die lieferbaren Laengen 6–40 ft', () => {
    const feet = jibs
      .map((r) => Number(r.id.replace('jimmyjib-triangle-', '').replace('ft', '')))
      .sort((a, b) => a - b);
    expect(feet).toEqual([6, 9, 12, 15, 18, 24, 30, 40]);
  });

  it('rechnet den Ausleger korrekt in Meter um', () => {
    const j18 = getRigById('jimmyjib-triangle-18ft') as CameraRig;
    expect(j18.armLengthM).toBeCloseTo(18 * FT, 2);
  });

  it('reicht mit laengerem Ausleger hoeher', () => {
    const short = getRigById('jimmyjib-triangle-12ft') as CameraRig;
    const long = getRigById('jimmyjib-triangle-30ft') as CameraRig;
    expect(long.maxHeightM).toBeGreaterThan(short.maxHeightM);
  });

  it('senkt die Nutzlast beim 40-ft-Ausleger ab', () => {
    // Datenblatt: bis 30 ft ~50 lb, bei 40 ft nur ~25 lb.
    expect(getRigById('jimmyjib-triangle-40ft')!.payloadKg!).toBeLessThan(
      getRigById('jimmyjib-triangle-30ft')!.payloadKg!,
    );
  });
});

describe('Technocrane', () => {
  it('fuehrt mehrere Laengen mit Teleskopweg', () => {
    const cranes = rigsForType('technocrane');
    expect(cranes.length).toBeGreaterThanOrEqual(6);
    for (const c of cranes) expect(c.telescopeM!).toBeGreaterThan(0);
  });

  it('bildet die Datenblattwerte des Techno 22 ab', () => {
    const t22 = getRigById('techno-22') as CameraRig;
    expect(t22.maxHeightM).toBeCloseTo(24 * FT, 2);   // 24' Objektivhoehe
    expect(t22.telescopeM).toBeCloseTo(15.5 * FT, 2); // 15'6" Teleskopweg
    expect(t22.armLengthM).toBeCloseTo(27.08 * FT, 2); // 27'1" Arm
  });

  it('steigt in Hoehe und Teleskopweg mit der Baugroesse', () => {
    const t15 = getRigById('techno-15') as CameraRig;
    const st30 = getRigById('supertechno-30') as CameraRig;
    const st75 = getRigById('supertechno-75') as CameraRig;
    expect(st30.maxHeightM).toBeGreaterThan(t15.maxHeightM);
    expect(st75.maxHeightM).toBeGreaterThan(st30.maxHeightM);
    expect(st75.telescopeM!).toBeGreaterThan(st30.telescopeM!);
  });
});

describe('Dolly-Schienen aus Sektionen', () => {
  it('kennt die gaengigen Sektionen 4/8/10 ft', () => {
    const inFeet = TRACK_SECTIONS_M.map((m) => Math.round(m / FT));
    expect(inFeet).toEqual([4, 8, 10]);
  });

  it('legt eine Wunschlaenge aus groessten Sektionen zuerst', () => {
    const plan = trackSectionPlan(10 * FT); // genau eine 10-ft-Sektion
    expect(plan.total).toBeCloseTo(10 * FT, 2);
    expect(plan.sections).toEqual([{ lengthM: TRACK_SECTIONS_M[2], count: 1 }]);
  });

  it('kombiniert Sektionen fuer Zwischenlaengen', () => {
    const plan = trackSectionPlan(18 * FT); // 10 + 8
    expect(plan.total).toBeCloseTo(18 * FT, 2);
    expect(plan.sections.reduce((n, s) => n + s.count, 0)).toBe(2);
  });

  it('rundet nach OBEN auf, statt die Strecke zu kuerzen', () => {
    // 5 ft gewuenscht: eine 4-ft-Sektion reicht nicht, also kommt eine zweite
    // dazu — eine zu kurze Schiene waere im Aufbau nutzlos.
    const plan = trackSectionPlan(5 * FT);
    expect(plan.total).toBeGreaterThanOrEqual(5 * FT - 1e-9);
  });

  it('liefert fuer 0 eine leere Strecke', () => {
    expect(trackSectionPlan(0).total).toBe(0);
    expect(trackSectionPlan(-5).total).toBe(0);
  });
});

describe('rigLimits — Rangfolge der Quellen', () => {
  const cam = (over: Partial<VenueCamera> = {}) =>
    ({ mountType: 'dolly', ...over }) as VenueCamera;

  it('nutzt ohne Rig die Kategorie-Defaults', () => {
    const l = rigLimits({ mountType: 'tripod' });
    expect(l.rig).toBeUndefined();
    expect(l.maxHeightM).toBeGreaterThan(l.minHeightM);
  });

  it('uebernimmt die Maße des gewaehlten Rigs', () => {
    const l = rigLimits({ mountType: 'technocrane', rigId: 'supertechno-75' });
    expect(l.rig?.id).toBe('supertechno-75');
    expect(l.maxHeightM).toBeCloseTo(80 * FT, 1);
    expect(l.telescopeM!).toBeGreaterThan(10);
  });

  it('ignoriert ein Rig, das nicht zur Montage passt', () => {
    // Sonst blieben nach dem Umschalten der Montage falsche Grenzen haengen.
    const l = rigLimits({ mountType: 'tripod', rigId: 'supertechno-75' });
    expect(l.rig).toBeUndefined();
    expect(l.maxHeightM).toBeLessThan(3);
  });

  it('laesst die eigene Schienenlaenge alles ueberschreiben', () => {
    const l = rigLimits({ mountType: 'dolly', rigId: 'fisher-10', trackLengthM: 12.5 });
    expect(l.trackM).toBe(12.5);
    expect(l.trackIsCustom).toBe(true);
  });

  it('markiert den Rig-Vorschlag als nicht-eigene Laenge', () => {
    const l = rigLimits({ mountType: 'dolly', rigId: 'fisher-10' });
    expect(l.trackIsCustom).toBe(false);
    expect(l.trackM).toBeGreaterThan(0);
  });

  it('erkennt Rigs ohne Fahrweg', () => {
    expect(hasTrack(rigLimits({ mountType: 'tripod' }))).toBe(false);
    expect(hasTrack(rigLimits({ mountType: 'dolly' }))).toBe(true);
  });

  it('klemmt Hoehe und Fahrweg in die Grenzen', () => {
    const l = rigLimits({ mountType: 'tripod', rigId: 'tripod-baby' });
    expect(clampHeight(l, 99)).toBe(l.maxHeightM);
    expect(clampHeight(l, -5)).toBe(l.minHeightM);

    // 4 m gelegte Schiene = 2 m Fahrweg nach jeder Seite (Mitte = Parkposition).
    const d = rigLimits({ mountType: 'dolly', trackLengthM: 4 });
    expect(clampTrack(d, 99)).toBe(2);
    expect(clampTrack(d, -99)).toBe(-2);
    expect(clampTrack(rigLimits({ mountType: 'tripod' }), 5)).toBe(0);
  });

  it('trennt Schienenlaenge und Fahrweg', () => {
    // Bei der Schiene ist die Angabe die gelegte Strecke — der Wagen faehrt
    // von der Mitte aus nur die Haelfte in jede Richtung.
    const rail = rigLimits({ mountType: 'dolly', trackLengthM: 12 });
    expect(rail.railLengthM).toBe(12);
    expect(rail.travelM).toBe(6);

    // Beim Jib/Kran ist die Angabe dagegen der Weg selbst, keine Schiene.
    const jib = rigLimits({ mountType: 'jib', rigId: 'jimmyjib-triangle-18ft' });
    expect(jib.railLengthM).toBe(0);
    expect(jib.travelM).toBe(jib.trackM);
  });

  it('liefert fuer jede Kamera ein Bewegungsprofil zur Kategorie', () => {
    const l = rigLimits(cam({ mountType: 'cablecam', rigId: 'spidercam-field' }));
    expect(profileForMount(l.type)).toBe(MOTION_PROFILES.cablecam);
  });
});
