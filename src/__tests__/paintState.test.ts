import { describe, expect, it } from 'vitest';
import {
  PAINT_UNSTATED,
  checkPaint,
  normalisePaint,
  paintFromCamera,
  paintLines,
} from '../utils/paintState';
import { UNSTATED } from '../utils/cameraCardExtras';
import type { VenueCamera } from '../types';
import quelle from '../utils/paintState.ts?raw';
import sidebarQuelle from '../components/Sidebar/Sidebar.tsx?raw';
import panelQuelle from '../components/Export/ExportPanel.tsx?raw';
import extrasQuelle from '../utils/cameraCardExtras.ts?raw';
import storeQuelle from '../store/useStore.ts?raw';

// ---------------------------------------------------------------------------
// Der Bildzustand gehoert zur Position (Bedarf 63, P2).
//
//   > Shading is done live […]; THE RESULTING SCENE FILE LIVES ON A CARD OR
//   > IN DEVICE MEMORY WITH NO RECORD OF WHICH POSITION OR SHOW IT BELONGS TO.
//
// Der teuerste Fehler waere hier eine Warnung auf jedem korrekten Aufbau:
// dass der Bildzustand vom aktuellen abweicht, ist der Normalfall. Geprueft
// wird nur, was die Datei UNBRAUCHBAR macht — und der grosse Teil dieser
// Tests haelt fest, was NICHT gemeldet wird.
// ---------------------------------------------------------------------------

const cam = (over: Partial<VenueCamera> = {}): VenueCamera =>
  ({
    id: 'c1',
    label: 'CAM 1',
    cameraId: 'fx9',
    lensId: 'canon-24-105',
    x: 0,
    y: 0,
    z: 1.5,
    pan: 0,
    tilt: 0,
    focalLength: 50,
    aperture: 4,
    focusDistance: 5,
    color: '#fff',
    extenderActive: 1,
    ...over,
  }) as VenueCamera;

/** Ein vollstaendig ausgefuellter Bildzustand, passend zur Kamera oben. */
const voll = {
  sceneFile: 'CAM1_Tag1.scene',
  setAt: '2026-09-06',
  setBy: 'Vision-Engineer',
  reference: 'Graukarte, 5600 K, Grundlicht 100 %',
  savedWith: { cameraId: 'fx9', lensId: 'canon-24-105' },
};

describe('Bedarf 63 — der Bildzustand der Position', () => {
  // -- 1 --------------------------------------------------------------------
  it('ohne vorgesehenen Bildzustand gibt es keine Frage und keinen Block', () => {
    // Eine Warnung ohne Anlass wird weggeklickt, und danach auch die mit
    // Anlass. Eine Position ohne Eintrag bekommt deshalb gar nichts.
    expect(checkPaint(cam(), [])).toEqual([]);
    expect(paintLines(cam())).toEqual([]);
  });

  // -- 2 --------------------------------------------------------------------
  it('ein vollstaendiger, passender Eintrag meldet nichts', () => {
    expect(checkPaint(cam({ paint: voll }), [])).toEqual([]);
  });

  it('ein anderer AKTUELLER Zustand ist kein Befund', () => {
    // Der Bildzustand ist nicht der Live-Zustand. Ein Unterschied in
    // Brennweite, Blende oder Position ist der Normalfall — und keine
    // dieser Aenderungen macht die Szenendatei unbrauchbar.
    const bewegt = cam({ paint: voll, focalLength: 105, aperture: 8, x: 9, z: 2.4 });
    expect(checkPaint(bewegt, [])).toEqual([]);
  });

  // -- 3 --------------------------------------------------------------------
  it('ein anderer Body macht die Datei unbrauchbar', () => {
    const anders = cam({ paint: voll, cameraId: 'ursa-broadcast' });
    const b = checkPaint(anders, []);
    expect(b.map((f) => f.kind)).toEqual(['body-changed']);
    expect(b[0].text).toContain('lädt sie nicht');
  });

  it('ein anderes Objektiv ist ein WEICHERER Fall und heisst anders', () => {
    const anders = cam({ paint: voll, lensId: 'sigma-18-35' });
    const b = checkPaint(anders, []);
    expect(b.map((f) => f.kind)).toEqual(['lens-changed']);
    // Sie laedt — das steht im Text, damit niemand sie fuer wertlos haelt.
    expect(b[0].text).toContain('lädt und wirkt');
  });

  it('bei anderem Body wird das Objektiv nicht auch noch gemeldet', () => {
    // Zwei Befunde fuer einen Sachverhalt sind einer zu viel: wenn der Body
    // nicht passt, ist die Objektiv-Frage gegenstandslos.
    const anders = cam({ paint: voll, cameraId: 'ursa-broadcast', lensId: 'sigma-18-35' });
    expect(checkPaint(anders, []).map((f) => f.kind)).toEqual(['body-changed']);
  });

  it('ein anderer Sensor-Modus meldet sich, ein gleicher nicht', () => {
    const mitModus = {
      ...voll,
      savedWith: { cameraId: 'fx9', lensId: 'canon-24-105', sensorModeIndex: 1 },
    };
    expect(checkPaint(cam({ paint: mitModus, sensorModeIndex: 1 }), [])).toEqual([]);
    const gewechselt = checkPaint(cam({ paint: mitModus, sensorModeIndex: 0 }), []);
    expect(gewechselt.map((f) => f.kind)).toEqual(['sensor-mode-changed']);
    // Ohne gesetzten Index gilt der Vorgabe-Sensor, also Index 0 — auch das
    // ist ein Wechsel und wird gemeldet.
    expect(checkPaint(cam({ paint: mitModus }), []).map((f) => f.kind)).toEqual([
      'sensor-mode-changed',
    ]);
  });

  it('ohne Abgleich-Angabe wird nichts behauptet', () => {
    // `savedWith` fehlt: dann ist nicht bekannt, womit abgeglichen wurde —
    // und „unbekannt" ist kein Grund, „passt nicht" zu melden.
    const ohne = { ...voll, savedWith: undefined };
    expect(checkPaint(cam({ paint: ohne, cameraId: 'ursa-broadcast' }), [])).toEqual([]);
  });

  // -- 4 --------------------------------------------------------------------
  it('ein Dateiname ohne Datum, Urheber und Referenz ist der Befund selbst', () => {
    const nurName = checkPaint(cam({ paint: { sceneFile: 'irgendwas.scene' } }), []);
    expect(nurName.map((f) => f.kind).sort()).toEqual([
      'author-unstated',
      'date-unstated',
      'reference-unstated',
    ]);
  });

  it('Angaben ohne Dateinamen sind eine Notiz ueber nichts', () => {
    const ohneDatei = checkPaint(cam({ paint: { setBy: 'jemand', setAt: '2026-09-06' } }), []);
    expect(ohneDatei.map((f) => f.kind)).toEqual(['file-unstated']);
    // Und die drei „fehlt"-Befunde kommen NICHT dazu: ohne Datei ist die
    // Frage nach ihrem Datum gegenstandslos.
    expect(ohneDatei).toHaveLength(1);
  });

  // -- 5 --------------------------------------------------------------------
  it('dieselbe Datei auf demselben Body ist erlaubt', () => {
    // Kameras aneinander anzugleichen ist der Normalfall — eine Warnung
    // darauf staende auf jedem sauberen Aufbau.
    const a = cam({ id: 'c1', label: 'CAM 1', paint: voll });
    const b = cam({ id: 'c2', label: 'CAM 2', paint: voll });
    expect(checkPaint(a, [a, b])).toEqual([]);
  });

  it('dieselbe Datei auf verschiedenen Bodies ist einer zu viel', () => {
    const a = cam({ id: 'c1', label: 'CAM 1', paint: voll });
    const b = cam({
      id: 'c2',
      label: 'CAM 2',
      cameraId: 'ursa-broadcast',
      paint: { ...voll, savedWith: { cameraId: 'ursa-broadcast', lensId: 'canon-24-105' } },
    });
    const befunde = checkPaint(a, [a, b]);
    expect(befunde.map((f) => f.kind)).toEqual(['file-across-bodies']);
    expect(befunde[0].text).toContain('„CAM 2"');
  });

  // -- 6 --------------------------------------------------------------------
  it('der Abgleich wird aus der Position genommen, nicht getippt', () => {
    const p = paintFromCamera(
      cam({ sensorModeIndex: 2 }),
      'CAM1_Tag1.scene',
      '2026-09-06',
      'Vision-Engineer',
      'Graukarte, 5600 K',
    );
    expect(p.savedWith).toEqual({ cameraId: 'fx9', lensId: 'canon-24-105', sensorModeIndex: 2 });
    // Der Zeitstempel kommt HEREIN — sonst liesse sich dieselbe Ableitung
    // nicht zweimal gleich bauen.
    expect(p.setAt).toBe('2026-09-06');
    expect(quelle).not.toMatch(/new Date\(|Date\.now/);
    // Leere Angaben werden nicht als leere Strings gespeichert.
    const knapp = paintFromCamera(cam(), 'x.scene', '2026-09-06', '  ', '');
    expect(knapp.setBy).toBeUndefined();
    expect(knapp.reference).toBeUndefined();
  });

  // -- 7 --------------------------------------------------------------------
  it('das Blatt zeigt alle vier Zeilen, auch die leeren', () => {
    const zeilen = paintLines(cam({ paint: { sceneFile: 'CAM1.scene' } }));
    expect(zeilen).toHaveLength(4);
    expect(zeilen[0]).toContain('CAM1.scene');
    // Drei „nicht angegeben" — eine weggelassene Zeile liest sich als „dazu
    // gibt es nichts zu sagen", und genau daran scheitert der Zettel heute.
    expect(zeilen.filter((l) => l.includes(PAINT_UNSTATED))).toHaveLength(3);
    // EIN Wert, zwei Namen: die Karte und dieser Block sagen dasselbe Wort.
    expect(UNSTATED).toBe(PAINT_UNSTATED);
  });

  // -- 8 --------------------------------------------------------------------
  it('beim Laden faellt raus, was nicht lesbar ist', () => {
    expect(normalisePaint({ paint: voll })).toEqual({ paint: voll });
    // Bedarf 50 — das Bedienfeld ueberlebt das Laden. Ohne diese Zeile fiel
    // es still weg, und auf dem Uebergabe-Blatt stuende „nicht angegeben",
    // obwohl es dranstand. Nachgemessen: die Gegenprobe ueberlebte.
    expect(
      normalisePaint({ paint: { sceneFile: 'x.scene', panel: 'RCP 3, Seite 2' } }),
    ).toEqual({ paint: { sceneFile: 'x.scene', panel: 'RCP 3, Seite 2' } });
    expect(normalisePaint({ paint: { sceneFile: 'x.scene', panel: '   ' } })).toEqual({
      paint: { sceneFile: 'x.scene' },
    });
    expect(normalisePaint({})).toEqual({});
    expect(normalisePaint({ paint: {} })).toEqual({});
    expect(normalisePaint({ paint: { sceneFile: '   ' } })).toEqual({});
    // Ein halber Abgleich taeuschte eine Pruefung vor, die nicht stattfand:
    // ein Modus-Index, der keine ganze Zahl ist, fliegt raus, der Rest bleibt.
    expect(
      normalisePaint({
        paint: { sceneFile: 'x.scene', savedWith: { cameraId: 'fx9', sensorModeIndex: 'zwei' } },
      }),
    ).toEqual({ paint: { sceneFile: 'x.scene', savedWith: { cameraId: 'fx9' } } });
    // Ein leeres `savedWith` wird gar nicht erst angelegt.
    expect(normalisePaint({ paint: { sceneFile: 'x.scene', savedWith: {} } })).toEqual({
      paint: { sceneFile: 'x.scene' },
    });
  });

  // -- 9 --------------------------------------------------------------------
  it('der Weg ist verdrahtet', () => {
    expect(storeQuelle).toMatch(/normalisePaint\(c\)/);
    expect(sidebarQuelle).toMatch(/checkPaint\(cam, cameras\)/);
    // Der Bildzustand steht auf dem Blatt UND im Fingerabdruck: eine andere
    // Szenendatei ist ein anderes Blatt, auch bei gleicher Optik.
    expect(panelQuelle).toMatch(/ctx\.fillText\('BILDZUSTAND'/);
    expect(extrasQuelle).toMatch(/\['paint', \.\.\.paintLines\(cam\)\]/);
    // Rein: kein IO, kein Store.
    expect(quelle).not.toMatch(/localStorage|useStore|window\./);
  });
});
