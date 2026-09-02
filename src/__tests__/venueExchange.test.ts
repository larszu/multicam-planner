import { describe, it, expect } from 'vitest';
import {
  toVenueExchange,
  fromVenueExchange,
  mergeOwnWallFields,
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

// ---------------------------------------------------------------------------
// ADR-005, Inkrement 4 — zweiter Fall derselben Naht.
//
// MultiCams BackgroundPlan ist eine Bitmap mit Massstab und Versatz: kein Name,
// kein Sperr-Flag, keine Seitenzahl, keine Angabe ueber die Quelle. Der Export
// schrieb deshalb unbedingt `kind: 'image'`. Fuer einen in MultiCam
// hochgeladenen Plan stimmt das; fuer einen aus dem Light-Planner uebernommenen
// PDF-Grundriss nicht — aus Seite 3 von 5 eines gesperrten Plans wurde ein
// namenloses, entsperrtes Bild ohne Seitenbezug.

describe('ADR-005 — fremde Gebaeudeplan-Felder ueberleben den Round-Trip', () => {
  const pdfVenue = (fp: Record<string, unknown> = {}) => ({
    kind: 'venue-exchange' as const,
    formatVersion: 1 as const,
    app: 'light-planner',
    appVersion: '1.0.0',
    exportedAt: '2026-01-01T00:00:00.000Z',
    venue: {
      name: 'Halle', widthM: 20, heightM: 12, persons: [], walls: [], stageObjects: [],
      floorPlan: {
        src: 'data:image/png;base64,AAA', naturalWidth: 800, naturalHeight: 600,
        widthMeters: 20, heightMeters: 15, offsetX: 0, offsetY: 0, opacity: 0.5,
        name: 'EG_Grundriss.pdf', locked: true, kind: 'pdf', pageCount: 5, pageIndex: 2,
        ...fp,
      },
    },
  }) as unknown as VenueExchange;

  const roundTrip = (fp: Record<string, unknown> = {}) => {
    const imported = fromVenueExchange(pdfVenue(fp));
    return toVenueExchange({
      venue: imported.venue, persons: imported.persons, walls: imported.walls,
      backgroundPlan: imported.backgroundPlan,
      appVersion: '1.0.0', exportedAt: '2026-01-02T00:00:00.000Z',
      stageForeign: imported.stageForeign,
      floorPlanForeign: imported.floorPlanForeign,
    }).venue.floorPlan;
  };

  it('behaelt die PDF-Herkunft statt alles zum Bild zu erklaeren', () => {
    expect(roundTrip()?.kind).toBe('pdf');
  });

  it('behaelt Seite, Seitenzahl, Name und Sperre', () => {
    const out = roundTrip();
    expect(out?.pageIndex).toBe(2);
    expect(out?.pageCount).toBe(5);
    expect(out?.name).toBe('EG_Grundriss.pdf');
    expect(out?.locked).toBe(true);
  });

  it('behaelt die eigene Kalibrierung als fuehrend', () => {
    // Aufheben heisst nicht Einfrieren: Massstab und Versatz modelliert
    // MultiCam, die gewinnen.
    const out = roundTrip();
    expect(out?.naturalWidth).toBe(800);
    expect(out?.widthMeters).toBe(20);
    expect(out?.opacity).toBe(0.5);
  });

  it('hebt ein blosses kind image nicht auf', () => {
    // Das ist der Wert, den der Export ohnehin schreibt. Ihn zu speichern
    // hiesse zu behaupten, eine fremde App habe ihn gesetzt.
    const imported = fromVenueExchange(
      pdfVenue({ kind: 'image', name: undefined, locked: undefined, pageCount: undefined, pageIndex: undefined }),
    );
    expect(imported.floorPlanForeign).toEqual({});
  });

  it('schreibt weiterhin kind image fuer einen eigenen Plan', () => {
    const out = toVenueExchange({
      venue: { name: 'H', widthM: 10, heightM: 10, stages: [] },
      persons: [], walls: [],
      backgroundPlan: {
        dataUrl: 'data:image/png;base64,BBB', scaleX: 0.02, scaleY: 0.02,
        offsetX: 0, offsetY: 0, opacity: 1, widthPx: 500, heightPx: 500,
      },
      appVersion: '1.0.0', exportedAt: 't',
    } as never).venue.floorPlan;
    expect(out?.kind).toBe('image');
    expect(out?.pageIndex).toBeUndefined();
    expect(out?.name).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ADR-005 — der Wand-Datenpfad. Drei verschiedene Fehler an einer Stelle.

describe('ADR-005 — Waende ueberleben den Venue-Round-Trip', () => {
  const wallVenue = (over: Record<string, unknown> = {}) => ({
    kind: 'venue-exchange' as const, formatVersion: 1 as const, app: 'light-planner',
    appVersion: '1.0.0', exportedAt: 't',
    venue: {
      name: 'Halle', widthM: 20, heightM: 12, persons: [], stageObjects: [],
      walls: [{
        id: 'w1', x1: 0, y1: 0, x2: 12, y2: 0, height: 4, label: 'Nord',
        cx: 6, cy: 2, reflectance: 0.9, color: '#3366ff', ...over,
      }],
    },
  }) as unknown as VenueExchange;

  const exportWalls = (
    walls: Wall[],
    wallForeign: Record<string, { cx?: number; cy?: number; reflectance?: number }> = {},
  ) => toVenueExchange({
    venue: { name: 'H', widthM: 20, heightM: 12, stages: [] },
    persons: [], walls, backgroundPlan: null,
    appVersion: '1.0.0', exportedAt: 't', wallForeign,
  } as never).venue.walls;

  it('haelt Kruemmung und Reflexionsgrad ueber den Round-Trip', () => {
    // Eine fehlende Kruemmung heisst nicht "unbekannt", sondern GERADE — die
    // gebogene Wand kam als Strecke zurueck.
    const imported = fromVenueExchange(wallVenue());
    expect(imported.wallForeign['w1']).toEqual({ cx: 6, cy: 2, reflectance: 0.9 });
    const out = exportWalls(imported.walls, imported.wallForeign)[0];
    expect(out.cx).toBe(6);
    expect(out.cy).toBe(2);
    expect(out.reflectance).toBe(0.9);
  });

  it('schreibt die eigene Wandfarbe, die es bisher verschwieg', () => {
    // `color` modelliert MultiCam selbst und liess es trotzdem weg: eine blau
    // gestrichene Wand kam nach einem Venue-Round-Trip grau zurueck.
    const out = exportWalls([
      { id: 'w1', x1: 0, y1: 0, x2: 5, y2: 0, height: 3, label: '', color: '#3366ff' },
    ] as unknown as Wall[])[0];
    expect(out.color).toBe('#3366ff');
  });

  it('liest die Wandfarbe auch wieder ein', () => {
    expect(fromVenueExchange(wallVenue()).walls[0].color).toBe('#3366ff');
  });

  it('hebt fuer eine gerade Wand ohne Reflexionsgrad nichts auf', () => {
    const imported = fromVenueExchange(
      wallVenue({ cx: undefined, cy: undefined, reflectance: undefined }),
    );
    expect(imported.wallForeign).toEqual({});
  });

  it('rettet die eigenen Wand-Muster vor der Projektion (Regel 2)', () => {
    // Der Kern: importVenueExchange setzte `walls` im Ganzen neu, und jeder
    // Venue-Import loeschte damit die Muster, die der Nutzer eingerichtet hatte.
    const own = [{
      id: 'w1', x1: 0, y1: 0, x2: 5, y2: 0, height: 3, label: '',
      pattern: 'image', patternImage: 'data:image/png;base64,AAA',
      patternFit: 'stretch', patternRows: 4,
    }] as unknown as Wall[];
    const merged = mergeOwnWallFields(fromVenueExchange(wallVenue()), { walls: own });
    expect(merged.walls[0].pattern).toBe('image');
    expect(merged.walls[0].patternImage).toBe('data:image/png;base64,AAA');
    expect(merged.walls[0].patternFit).toBe('stretch');
    expect(merged.walls[0].patternRows).toBe(4);
  });

  it('laesst die Projektion bei Geometrie und Farbe gewinnen', () => {
    // Aufheben heisst nicht Einfrieren: hat der Nachbar die Wand verlaengert
    // oder umgestrichen, gilt das.
    const own = [{ id: 'w1', x1: 0, y1: 0, x2: 5, y2: 0, height: 3, label: '', color: '#ff0000' }] as unknown as Wall[];
    const merged = mergeOwnWallFields(fromVenueExchange(wallVenue()), { walls: own });
    expect(merged.walls[0].x2).toBe(12);
    expect(merged.walls[0].color).toBe('#3366ff');
  });

  it('holt eine geloeschte Wand nicht zurueck', () => {
    const own = [{ id: 'w9', x1: 0, y1: 0, x2: 1, y2: 0, height: 3, label: '' }] as unknown as Wall[];
    const merged = mergeOwnWallFields(fromVenueExchange(wallVenue()), { walls: own });
    expect(merged.walls.map((w) => w.id)).toEqual(['w1']);
  });
});
