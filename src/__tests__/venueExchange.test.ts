import { describe, it, expect } from 'vitest';
import {
  toVenueExchange,
  fromVenueExchange,
  parseVenueExchange,
  VENUE_EXCHANGE_KIND,
  VENUE_EXCHANGE_VERSION,
  type VenueExchange,
} from '../utils/venueExchange';
import type { Venue, ReferencePerson, Wall, BackgroundPlan } from '../types';

const venue: Venue = {
  name: 'Halle A',
  widthM: 24,
  heightM: 14,
  stages: [{ id: 'st1', x: 8, y: 10, width: 6, height: 4, label: 'Buehne' }],
};
const persons: ReferencePerson[] = [
  { id: 'p1', x: 5, y: 6, height: 1.8, width: 0.5, label: 'Moderator', objectType: 'person' },
  { id: 'p2', x: 9, y: 7, height: 1.0, width: 1.2, label: 'Drumkit', objectType: 'drums', color: '#ff8800' },
];
const walls: Wall[] = [
  { id: 'w1', x1: 0, y1: 0, x2: 24, y2: 0, height: 3, label: 'Nordwand' },
];
const backgroundPlan: BackgroundPlan = {
  dataUrl: 'data:image/png;base64,AAAA',
  scaleX: 0.02, scaleY: 0.02, offsetX: 1, offsetY: 2, opacity: 0.6,
  widthPx: 1200, heightPx: 700,
};

const input = { venue, persons, walls, backgroundPlan, appVersion: '0.4.0', exportedAt: '2026-06-30T00:00:00.000Z' };

describe('venueExchange (MultiCam)', () => {
  it('exportiert ein gueltiges venue-exchange-Dokument', () => {
    const ex = toVenueExchange(input);
    expect(ex.kind).toBe(VENUE_EXCHANGE_KIND);
    expect(ex.formatVersion).toBe(VENUE_EXCHANGE_VERSION);
    expect(ex.app).toBe('multicam-planner');
    expect(ex.venue.persons).toHaveLength(2);
    expect(ex.venue.walls).toHaveLength(1);
    expect(ex.venue.stageObjects).toHaveLength(1);
    // Stage 2D-Tiefe wandert in depth.
    expect(ex.venue.stageObjects[0].depth).toBe(4);
    // Floor-Plan: Meter-pro-Pixel → reale Masse.
    expect(ex.venue.floorPlan?.widthMeters).toBeCloseTo(0.02 * 1200, 6);
    expect(ex.venue.floorPlan?.heightMeters).toBeCloseTo(0.02 * 700, 6);
  });

  it('Round-Trip erhaelt das geteilte Venue (inkl. Floor-Plan-Skalierung)', () => {
    const back = fromVenueExchange(toVenueExchange(input));
    expect(back.venue.name).toBe('Halle A');
    expect(back.venue.widthM).toBe(24);
    expect(back.venue.stages[0].height).toBe(4); // depth → multicam Stage.height
    expect(back.persons.map((p) => p.label)).toEqual(['Moderator', 'Drumkit']);
    expect(back.persons[1].objectType).toBe('drums');
    expect(back.walls[0].label).toBe('Nordwand');
    // Skalierung verlustfrei zurueck (isotrop).
    expect(back.backgroundPlan?.scaleX).toBeCloseTo(0.02, 9);
    expect(back.backgroundPlan?.scaleY).toBeCloseTo(0.02, 9);
    expect(back.backgroundPlan?.widthPx).toBe(1200);
  });

  it('importiert ein Fremd-Venue (Cross-App: erzeugt von light-planner)', () => {
    // So saehe eine von light-planner exportierte Datei aus (kanonische Form).
    const fromLight: VenueExchange = {
      kind: 'venue-exchange',
      formatVersion: 1,
      app: 'light-planner',
      appVersion: '1.0.0',
      exportedAt: '2026-06-30T00:00:00.000Z',
      venue: {
        name: 'Studio 1',
        persons: [{ id: 'lp1', x: 3, y: 4, height: 1.75, label: 'Talent', pose: 'standing', facing: 270 }],
        walls: [{ id: 'lw1', x1: 0, y1: 0, x2: 10, y2: 0, height: 4, label: 'Wand', reflectance: 0.5, color: '#cccccc' }],
        stageObjects: [{ id: 'ls1', x: 2, y: 2, width: 3, depth: 2, height: 0.4, label: 'Podest' }],
        floorPlan: {
          src: 'data:image/png;base64,BBBB', naturalWidth: 1000, naturalHeight: 800,
          widthMeters: 10, heightMeters: 8, offsetX: 0, offsetY: 0, opacity: 0.5, kind: 'image',
        },
      },
    };
    const r = fromVenueExchange(fromLight);
    expect(r.venue.name).toBe('Studio 1');
    expect(r.persons[0].label).toBe('Talent');
    expect(r.persons[0].objectType).toBe('person'); // Default, da light keine objectTypes kennt
    expect(r.walls[0].height).toBe(4);
    expect(r.venue.stages[0].height).toBe(2); // light depth → multicam Stage.height
    // Floor-Plan: reale Masse → Meter-pro-Pixel.
    expect(r.backgroundPlan?.scaleX).toBeCloseTo(10 / 1000, 9);
  });

  it('parseVenueExchange lehnt fremde Dateien ab', () => {
    expect(() => parseVenueExchange('{"kind":"mcplan"}')).toThrow();
    expect(() => parseVenueExchange(JSON.stringify(toVenueExchange(input)))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// ADR-005 (Verlustfrei oder laut), Inkrement 4.
//
// MultiCams Buehne ist eine flache 2D-Zone. Das Austauschformat kennt aber
// Podest-Hoehe, Drehung und Polygon-Umriss, und `height` ist dort PFLICHT.
// Der Export schrieb deshalb fuer jede Buehne `height: 0` — und das ist nicht
// dasselbe wie "weiss ich nicht": ein 0,6 m hohes Podest aus dem Light-Planner
// kam nach einem MultiCam-Round-Trip als flacher Boden zurueck. Dieselbe
// Klasse wie der Videohub-Dump: eine erfundene Zahl, keine fehlende.

describe('ADR-005 — fremde Buehnen-Felder ueberleben den MultiCam-Round-Trip', () => {
  const foreignVenue = (over: Record<string, unknown> = {}) => ({
    kind: 'venue-exchange' as const,
    formatVersion: 1 as const,
    app: 'light-planner',
    appVersion: '1.0.0',
    exportedAt: '2026-01-01T00:00:00.000Z',
    venue: {
      name: 'Halle',
      widthM: 30,
      heightM: 18,
      persons: [],
      walls: [],
      stageObjects: [
        { id: 'st1', x: 1, y: 2, width: 6, depth: 4, height: 0.6, label: 'Podest', ...over },
      ],
    },
  });

  const roundTrip = (over: Record<string, unknown> = {}) => {
    const imported = fromVenueExchange(foreignVenue(over));
    return toVenueExchange({
      venue: imported.venue,
      persons: imported.persons,
      walls: imported.walls,
      backgroundPlan: imported.backgroundPlan,
      appVersion: '1.0.0',
      exportedAt: '2026-01-02T00:00:00.000Z',
      stageForeign: imported.stageForeign,
    }).venue.stageObjects[0];
  };

  it('gibt die Podest-Hoehe unveraendert zurueck', () => {
    expect(roundTrip().height).toBe(0.6);
  });

  it('gibt Drehung und Polygon-Umriss zurueck', () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
    const out = roundTrip({ rotation: 45, points, height2: 1.2 });
    expect(out.rotation).toBe(45);
    expect(out.points).toEqual(points);
    expect(out.height2).toBe(1.2);
  });

  it('behaelt die eigene Geometrie als fuehrend', () => {
    // Aufheben heisst nicht Einfrieren: was MultiCam MODELLIERT, gewinnt.
    const out = roundTrip();
    expect(out.x).toBe(1);
    expect(out.width).toBe(6);
    expect(out.depth).toBe(4);
  });

  it('hebt fuer eine flache Buehne nichts auf', () => {
    // Ein Eintrag je Buehne waere Ballast — und die Behauptung, es habe etwas
    // zu bewahren gegeben. Hoehe 0 ist genau der Wert, den der Export ohnehin
    // schreibt.
    const imported = fromVenueExchange(foreignVenue({ height: 0 }));
    expect(imported.stageForeign).toEqual({});
  });

  it('schreibt weiterhin 0 fuer eine Buehne ohne aufgehobenen Wert', () => {
    // Eine in MultiCam entstandene Buehne IST flach. Dort ist 0 zutreffend
    // und keine Erfindung.
    const out = toVenueExchange({
      venue: { name: 'H', widthM: 10, heightM: 10, stages: [{ id: 'neu', x: 0, y: 0, width: 2, height: 2, label: '' }] },
      persons: [], walls: [], backgroundPlan: null,
      appVersion: '1.0.0', exportedAt: '2026-01-02T00:00:00.000Z',
    } as never).venue.stageObjects[0];
    expect(out.height).toBe(0);
    expect(out.rotation).toBeUndefined();
  });
});
