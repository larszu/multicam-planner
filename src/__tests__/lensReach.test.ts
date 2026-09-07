import { describe, expect, it } from 'vitest';
import {
  FRAMINGS,
  coverageLines,
  normaliseCoverage,
  reachRanges,
  reachReport,
  reachText,
  reachVerdict,
  requiredFocalMm,
  subjectDistanceM,
  type ReachOptics,
} from '../utils/lensReach';
import { imageWidthAtDistance } from '../utils/fov';
import type { ReferencePerson, SensorSize, VenueCamera } from '../types';
import quelle from '../utils/lensReach.ts?raw';
import sidebarQuelle from '../components/Sidebar/Sidebar.tsx?raw';
import exportQuelle from '../components/Export/ExportPanel.tsx?raw';
import storeQuelle from '../store/useStore.ts?raw';

// ---------------------------------------------------------------------------
// Bedarf 58 -- kommt die Optik an dieser Position an den Ausschnitt heran?
//
//   > Lens choice per position is guessed from experience or checked ad hoc
//   > with an online focal-length calculator; the wrong glass shows up on the
//   > truck.
//
// Der teuerste Fehler waere hier eine Rechnung, die der Vorschau
// widerspricht: die Leiste zeigte einen Bildausschnitt, die Warnung
// behauptete etwas anderes, und der Nutzer glaubte demjenigen, der ihm
// gerade passt. Deshalb steht die Rueckrechnung gegen `fov.ts` an erster
// Stelle -- sie haelt die beiden Richtungen derselben Beziehung zusammen.
// ---------------------------------------------------------------------------

/** Kleinbild. */
const KB: SensorSize = { name: 'FF', widthMm: 36, heightMm: 24, cropFactor: 1 };
/** 2/3"-B4-Chip -- derselbe Ausschnitt verlangt dort ein Viertel der Brennweite. */
const B4: SensorSize = { name: '2/3"', widthMm: 9.59, heightMm: 5.39, cropFactor: 3.75 };

const optik = (
  focalLengthMin: number,
  focalLengthMax: number,
  extenderFactors?: number[],
  sensor: SensorSize = KB,
): ReachOptics => ({ sensor, lens: { focalLengthMin, focalLengthMax, extenderFactors } });

const kamera = (over: Partial<VenueCamera> = {}): VenueCamera =>
  ({
    id: 'c1',
    label: 'CAM 1',
    cameraId: 'x',
    lensId: 'l',
    x: 0,
    y: 0,
    z: 1.5,
    pan: 0,
    tilt: 0,
    focalLength: 50,
    aperture: 2.8,
    focusDistance: 10,
    color: '#fff',
    extenderActive: 1,
    ...over,
  }) as VenueCamera;

const motiv = (over: Partial<ReferencePerson> = {}): ReferencePerson =>
  ({
    id: 'p1',
    x: 20,
    y: 0,
    width: 0.5,
    height: 1.8,
    label: 'Sänger',
    objectType: 'person',
    ...over,
  }) as ReferencePerson;

describe('Bedarf 58 — Reichweite der Optik', () => {
  // -- 1 --------------------------------------------------------------------
  it('rechnet exakt rückwärts, was fov.ts vorwärts rechnet', () => {
    // Die Zusicherung, an der alles haengt: dieselbe Beziehung in zwei
    // Richtungen. Waere hier eine eigene Naeherung eingebaut, zeigte die
    // Vorschau etwas anderes als die Warnung -- und niemand faende es.
    for (const f of [8, 24, 50, 200, 900]) {
      for (const d of [1.5, 12, 47.3]) {
        const breite = imageWidthAtDistance(KB.widthMm, f, d);
        expect(requiredFocalMm(d, KB.widthMm, breite)).toBeCloseTo(f, 9);
      }
    }
  });

  // -- 2 --------------------------------------------------------------------
  it('das Beispiel aus dem Beleg gilt nur für EINEN Sensor', () => {
    // „rund 180-200 mm, um aus 100 ft eine Buehnenbreite von 10 ft zu fuellen"
    // — das setzt einen 18 bis 20 mm breiten Sensor voraus. Genau deshalb ist
    // eine Faustregel aus einem allgemeinen Rechner fuer jeden anderen Body
    // falsch, und genau deshalb gehoert die Rechnung in den Plan.
    const d = 30.5;
    const w = 3.05;
    expect(requiredFocalMm(d, 18, w)).toBeCloseTo(180, 0);
    expect(requiredFocalMm(d, 20, w)).toBeCloseTo(200, 0);
    // Derselbe Aufbau, andere Kamera — andere Antwort.
    expect(requiredFocalMm(d, KB.widthMm, w)).toBeCloseTo(360, 0);
    expect(requiredFocalMm(d, B4.widthMm, w)).toBeCloseTo(95.9, 1);
  });

  // -- 3 --------------------------------------------------------------------
  it('nimmt die Sensor-Achse, die die Einstellung fordert', () => {
    // Breite und Hoehe sind verschiedene Masse; wer immer die Breite nimmt,
    // meldet an jeder Nahaufnahme eine Reserve, die es nicht gibt.
    const quer = reachVerdict({ distanceM: 10, axis: 'width', extentM: 2, optics: optik(10, 500) });
    const hoch = reachVerdict({ distanceM: 10, axis: 'height', extentM: 2, optics: optik(10, 500) });
    expect(quer.kind).toBe('reachable');
    expect(hoch.kind).toBe('reachable');
    if (quer.kind === 'reachable' && hoch.kind === 'reachable') {
      expect(quer.requiredMm).toBeCloseTo(180, 6); // 10 · 36 / 2
      expect(hoch.requiredMm).toBeCloseTo(120, 6); // 10 · 24 / 2
    }
  });

  // -- 4 --------------------------------------------------------------------
  it('benennt zu kurz, zu weit und erreichbar getrennt', () => {
    // 20 m, 0,63 m Hoehe (Nah auf 1,8 m) -> 24·20/0,63 = 762 mm.
    const zuKurz = reachVerdict({ distanceM: 20, axis: 'height', extentM: 0.63, optics: optik(24, 105) });
    expect(zuKurz.kind).toBe('too-long');
    if (zuKurz.kind === 'too-long') {
      expect(zuKurz.longestMm).toBe(105);
      expect(zuKurz.requiredMm).toBeGreaterThan(700);
    }

    // 3 m, 6 m Breite -> 18 mm; ein 24-70 geht nicht weit genug auf.
    const zuEng = reachVerdict({ distanceM: 3, axis: 'width', extentM: 6, optics: optik(24, 70) });
    expect(zuEng.kind).toBe('too-wide');
    if (zuEng.kind === 'too-wide') expect(zuEng.widestMm).toBe(24);

    const passt = reachVerdict({ distanceM: 10, axis: 'width', extentM: 6, optics: optik(24, 70) });
    expect(passt.kind).toBe('reachable');
    if (passt.kind === 'reachable') expect(passt.extender).toBe(1);
  });

  // -- 5 --------------------------------------------------------------------
  it('nennt den Extender, wenn es ohne ihn nicht geht', () => {
    // 40 m, 0,63 m -> 1524 mm. Ein 24-800 schafft das nur mit dem 2×.
    const v = reachVerdict({ distanceM: 40, axis: 'height', extentM: 0.63, optics: optik(24, 800, [1.5, 2]) });
    expect(v.kind).toBe('reachable');
    if (v.kind === 'reachable') expect(v.extender).toBe(2);

    // Und wenn es OHNE geht, wird keiner verlangt: der kleinste Bereich, der
    // traegt, gewinnt — ein Extender waere ein Teil mehr und Licht weniger.
    const ohne = reachVerdict({ distanceM: 10, axis: 'height', extentM: 0.63, optics: optik(24, 800, [1.5, 2]) });
    expect(ohne.kind).toBe('reachable');
    if (ohne.kind === 'reachable') expect(ohne.extender).toBe(1);
  });

  // -- 6 --------------------------------------------------------------------
  it('die Lücke zwischen zwei Extender-Stufen heisst nicht „zu kurz"', () => {
    // Festbrennweite 50 mm mit 2×: sie kann 50 und 100, aber nicht 70.
    // „too-long" waere hier eine Fehlauskunft — sie legte laengeres Glas
    // nahe, obwohl das vorhandene lang genug IST.
    const v = reachVerdict({ distanceM: 10, axis: 'width', extentM: 36 / 7, optics: optik(50, 50, [2]) });
    expect(v.kind).toBe('in-gap');
    if (v.kind === 'in-gap') {
      expect(v.requiredMm).toBeCloseTo(70, 6);
      expect(v.belowMm).toBe(50);
      expect(v.aboveMm).toBe(100);
    }
  });

  it('ein Zoom mit Extender hat keine Lücke', () => {
    // 8-900 mit 2× ergibt 8-900 und 16-1800: die Bereiche ueberlappen.
    expect(reachRanges({ focalLengthMin: 8, focalLengthMax: 900, extenderFactors: [2] })).toEqual([
      { extender: 1, minMm: 8, maxMm: 900 },
      { extender: 2, minMm: 16, maxMm: 1800 },
    ]);
    const v = reachVerdict({ distanceM: 30, axis: 'height', extentM: 0.5, optics: optik(8, 900, [2]) });
    expect(v.kind).toBe('reachable'); // 1440 mm
  });

  // -- 7 --------------------------------------------------------------------
  it('jeder Fall ohne Urteil hat einen Namen', () => {
    const basis = { distanceM: 10, axis: 'height' as const, extentM: 1 };
    expect(reachVerdict({ ...basis, optics: null })).toEqual({
      kind: 'not-computable',
      reason: 'no-optics',
    });
    expect(reachVerdict({ ...basis, extentM: 0, optics: optik(24, 70) })).toEqual({
      kind: 'not-computable',
      reason: 'no-extent',
    });
    expect(reachVerdict({ ...basis, distanceM: 0, optics: optik(24, 70) })).toEqual({
      kind: 'not-computable',
      reason: 'no-distance',
    });
    // Und keiner davon liest sich als „geht schon".
    for (const v of [
      reachVerdict({ ...basis, optics: null }),
      reachVerdict({ ...basis, extentM: 0, optics: optik(24, 70) }),
    ]) {
      expect(v.kind).not.toBe('reachable');
    }
  });

  // -- 8 --------------------------------------------------------------------
  it('die Entfernung folgt der gefahrenen Position und der Höhe', () => {
    const p = motiv({ x: 20, y: 0, height: 2 });
    // Ohne Fahrweg: 20 m waagerecht, 0,5 m Hoehenunterschied (1,5 → 1,0).
    expect(subjectDistanceM(kamera({ z: 1.5 }), p)).toBeCloseTo(Math.hypot(20, 0.5), 6);
    // Mit Fahrweg: die Kamera steht dort, wo sie GEFAHREN ist. Ohne diese
    // Regel rechnete der Plan gegen einen Standort, an dem niemand steht.
    expect(subjectDistanceM(kamera({ z: 1.5, trackOffset: 5, pan: 0 }), p)).toBeCloseTo(
      Math.hypot(15, 0.5),
      6,
    );
  });

  // -- 9 --------------------------------------------------------------------
  it('eine Position ohne Auftrag ist kein Befund', () => {
    // Die Regel, die diese Datei am ehesten kaputtmacht: eine Warnung ohne
    // Anlass wird weggeklickt, und danach auch die mit Anlass.
    const bericht = reachReport({
      cameras: [kamera({ id: 'c1', label: 'CAM 1' })],
      persons: [motiv()],
      optics: () => optik(24, 70),
    });
    expect(bericht.rows).toHaveLength(0);
    expect(bericht.problems).toHaveLength(0);
    expect(bericht.unstated).toEqual([{ cameraId: 'c1', cameraLabel: 'CAM 1' }]);
  });

  // -- 10 -------------------------------------------------------------------
  it('die Befunde werden aus den Zeilen GERECHNET', () => {
    const nah = kamera({
      id: 'c1',
      label: 'CAM 1',
      coverage: { subjectId: 'p1', framing: 'detail' },
    });
    const weit = kamera({
      id: 'c2',
      label: 'CAM 2',
      coverage: { subjectId: 'p1', framing: 'wide' },
    });
    const bericht = reachReport({
      cameras: [weit, nah],
      persons: [motiv()],
      optics: () => optik(24, 300),
    });
    // Sortiert nach Kamera-Beschriftung, nicht nach Eingabe-Reihenfolge.
    expect(bericht.rows.map((r) => r.cameraId)).toEqual(['c1', 'c2']);
    // Totale auf 1,8 m aus ~20 m: 2,88 m Hoehe -> 167 mm, das kann das 24-300.
    // Detail: 0,324 m -> 1482 mm, das kann es nicht.
    expect(bericht.problems.map((r) => r.cameraId)).toEqual(['c1']);
    // Und mit laengerem Glas verschwindet der Befund von selbst.
    const mitTele = reachReport({
      cameras: [weit, nah],
      persons: [motiv()],
      optics: () => optik(24, 1600),
    });
    expect(mitTele.problems).toHaveLength(0);
  });

  // -- 11 -------------------------------------------------------------------
  it('erreichbar-nur-mit-Extender ist kein Fehler, aber eine Ansage', () => {
    const bericht = reachReport({
      cameras: [kamera({ coverage: { subjectId: 'p1', framing: 'close' } })],
      persons: [motiv()],
      optics: () => optik(24, 800, [2]),
    });
    // 0,63 m aus ~20 m -> 762 mm: das kann das Objektiv ohne Extender.
    expect(bericht.needsExtender).toHaveLength(0);
    const fern = reachReport({
      cameras: [kamera({ coverage: { subjectId: 'p1', framing: 'close' } })],
      persons: [motiv({ x: 35 })],
      optics: () => optik(24, 800, [2]),
    });
    expect(fern.problems).toHaveLength(0);
    expect(fern.needsExtender.map((e) => e.extender)).toEqual([2]);
  });

  // -- 12 -------------------------------------------------------------------
  it('ein Auftrag auf ein gelöschtes Motiv verschwindet nicht', () => {
    const bericht = reachReport({
      cameras: [kamera({ coverage: { subjectId: 'weg', framing: 'full' } })],
      persons: [motiv()],
      optics: () => optik(24, 70),
    });
    expect(bericht.rows).toHaveLength(1);
    expect(bericht.rows[0].verdict).toEqual({ kind: 'not-computable', reason: 'no-subject' });
    expect(bericht.problems).toHaveLength(1);
    expect(bericht.unstated).toHaveLength(0);
  });

  // -- 13 -------------------------------------------------------------------
  it('die Einstellungsgrößen rechnen gegen das Mass des Motivs', () => {
    // `footprint` nimmt die BREITE — der Fall aus dem Beleg. Alle anderen die
    // Hoehe. Wer das vertauscht, meldet an jedem Buehnenmotiv Unsinn.
    expect(FRAMINGS.footprint.axis).toBe('width');
    const p = motiv({ width: 3, height: 1.8 });
    const breit = reachReport({
      cameras: [kamera({ coverage: { subjectId: 'p1', framing: 'footprint' } })],
      persons: [p],
      optics: () => optik(24, 800),
    });
    expect(breit.rows[0].axis).toBe('width');
    expect(breit.rows[0].extentM).toBeCloseTo(3, 6);

    const hoch = reachReport({
      cameras: [kamera({ coverage: { subjectId: 'p1', framing: 'full' } })],
      persons: [p],
      optics: () => optik(24, 800),
    });
    expect(hoch.rows[0].axis).toBe('height');
    expect(hoch.rows[0].extentM).toBeCloseTo(1.8 * FRAMINGS.full.factor, 6);
  });

  it('das eigene Mass sticht die Konvention', () => {
    const bericht = reachReport({
      cameras: [
        kamera({ coverage: { subjectId: 'p1', framing: 'custom', extentM: 4, axis: 'width' } }),
      ],
      persons: [motiv({ width: 3, height: 1.8 })],
      optics: () => optik(24, 800),
    });
    expect(bericht.rows[0].extentM).toBe(4);
    expect(bericht.rows[0].axis).toBe('width');
  });

  it('ein eigenes Mass ohne Zahl ist kein Auftrag ohne Urteil', () => {
    const bericht = reachReport({
      cameras: [kamera({ coverage: { subjectId: 'p1', framing: 'custom' } })],
      persons: [motiv()],
      optics: () => optik(24, 800),
    });
    expect(bericht.rows[0].verdict).toEqual({ kind: 'not-computable', reason: 'no-extent' });
  });

  // -- 14 -------------------------------------------------------------------
  it('das Blatt trägt die Bemessungsgrundlage, nicht nur das Urteil', () => {
    const bericht = reachReport({
      cameras: [kamera({ coverage: { subjectId: 'p1', framing: 'close' } })],
      persons: [motiv()],
      optics: () => optik(24, 70),
    });
    const zeilen = coverageLines(bericht.rows[0]);
    expect(zeilen).toHaveLength(3);
    expect(zeilen[0]).toContain('Sänger');
    expect(zeilen[1]).toMatch(/0,63 m Höhe aus 20,0[01] m/);
    expect(zeilen[2]).toContain('reicht nicht heran');
    // Ohne Auftrag steht dort NICHTS -- eine leere Zeile waere eine Frage,
    // die niemand gestellt hat.
    expect(coverageLines(null)).toEqual([]);

    // Und der Klartext nennt Kamera, Auftrag und Grundlage in einem Satz.
    expect(reachText(bericht.rows[0])).toContain('„CAM 1"');
    expect(reachText(bericht.rows[0])).toContain('Nah auf „Sänger"');
  });

  // -- 15 -------------------------------------------------------------------
  it('beim Laden fällt raus, was nicht lesbar ist — aber nicht der Befund', () => {
    expect(normaliseCoverage({ coverage: { subjectId: 'p1', framing: 'full' } })).toEqual({
      coverage: { subjectId: 'p1', framing: 'full' },
    });
    // Unbekannte Stufe (neuere Fassung) und leeres Motiv: ganz weg.
    expect(normaliseCoverage({ coverage: { subjectId: 'p1', framing: 'ultra' } })).toEqual({});
    expect(normaliseCoverage({ coverage: { subjectId: '  ', framing: 'full' } })).toEqual({});
    expect(normaliseCoverage({})).toEqual({});
    // Ein Motiv, das es nicht mehr gibt, BLEIBT: das ist ein Befund und kein
    // Ladefehler. Wegwerfen loeschte den einzigen Hinweis darauf.
    expect(normaliseCoverage({ coverage: { subjectId: 'geloescht', framing: 'wide' } })).toEqual({
      coverage: { subjectId: 'geloescht', framing: 'wide' },
    });
    // Unbrauchbare Masse fallen weg, der Auftrag bleibt (-> `no-extent`).
    expect(
      normaliseCoverage({ coverage: { subjectId: 'p1', framing: 'custom', extentM: -2, axis: 'quer' } }),
    ).toEqual({ coverage: { subjectId: 'p1', framing: 'custom' } });
  });

  // -- 16 -------------------------------------------------------------------
  it('der Weg ist verdrahtet, und zwar über die Engstelle', () => {
    // Wer hier eine zweite Rechnung aufmacht, bekommt auf dem Blatt etwas
    // anderes als auf dem Schirm. Beide Aufrufer gehen durch `reachReport`.
    expect(sidebarQuelle).toMatch(/reachReport\(\{/);
    expect(exportQuelle).toMatch(/reachReport\(\{/);
    expect(sidebarQuelle).not.toMatch(/requiredFocalMm/);
    expect(exportQuelle).not.toMatch(/requiredFocalMm/);
    // Der Auftrag wird beim Laden normalisiert.
    expect(storeQuelle).toMatch(/normaliseCoverage\(c\)/);
    // Und die Karte traegt die Zeilen in den Fingerabdruck: was zu sehen ist,
    // geht ein (ADR-004 Regel 1).
    expect(exportQuelle).toMatch(/coverage: deckungZeilen/);
    // Rein: kein IO, keine Uhr, kein Store.
    expect(quelle).not.toMatch(/\bDate\.now\b|localStorage|useStore/);
  });
});
