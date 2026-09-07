import { describe, expect, it } from 'vitest';
import {
  NO_FAULTS,
  PAINT_SOURCE_NOTE,
  buildShiftReport,
  buildShiftReportHtml,
} from '../utils/shiftReport';
import { shiftReportFingerprint } from '../utils/documentContent';
import type { VenueCamera } from '../types';
import quelle from '../utils/shiftReport.ts?raw';
import headerQuelle from '../components/Layout/Header.tsx?raw';
import sidebarQuelle from '../components/Sidebar/Sidebar.tsx?raw';
import storyboardQuelle from '../utils/storyboard.ts?raw';

// ---------------------------------------------------------------------------
// Die Schicht-Uebergabe (Bedarf 50, P2).
//
//   > Nothing about the shading position is written down: not the final
//   > paint, not the camera-to-panel mapping, not the fault list. SHOW-TIME
//   > CHANGES ARE VERBAL AND INVISIBLE TO EVERY DOCUMENT.
//
// Der teuerste Fehler waere hier, dem Blatt zu glauben, es habe die Kamera
// gefragt. Diese Anwendung liest keine aus — und der Bedarf verlangt genau
// deshalb, dass das AUF dem Blatt steht.
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
    // Rigging und Comms vollstaendig, damit die Karten-Befunde nicht jede
    // Zeile fluten — geprueft wird hier das Uebergabe-Blatt, nicht sie.
    rigging: { riser: '4x4', riserHeightM: 0.4, loadLimitKg: 300, access: 'level', powerDrop: 'A1' },
    comms: { channel: 'C', beltpackId: 'BP1', batteryPlan: 'Wechsel 18:00' },
    // Bedarf 48: ein Fernsteuerweg, der Farbtemperatur UND Schwarzabgleich
    // kann — sonst meldete jede Zeile dieses Blattes zu Recht die beiden
    // Luecken, und geprueft wuerde hier die Uebergabe, nicht sie.
    controlPath: 'blackmagic',
    ...over,
  }) as VenueCamera;

const voll = {
  sceneFile: 'CAM1_Tag1.scene',
  setAt: '2026-09-06',
  setBy: 'Vision-Engineer',
  reference: 'Graukarte, 5600 K',
  panel: 'RCP 3, Seite 2',
  // Bedarf 47: beide Fixture-Positionen tragen dasselbe MODELL (`fx9`), und
  // ohne Body-Nummer meldete das Register an beiden zu Recht, dass die Datei
  // auf beiden laedt und auf einem stimmt. Geprueft wird hier die Uebergabe,
  // nicht sie.
  bodySerial: 'FX9-0012',
  savedWith: { cameraId: 'fx9', lensId: 'canon-24-105' },
};

describe('Bedarf 50 — die Schicht-Übergabe', () => {
  // -- 1 --------------------------------------------------------------------
  it('sagt auf dem Blatt, dass nichts zurückgelesen wurde', () => {
    // Der Satz, den der Bedarf woertlich verlangt. Er steht IM Bericht (also
    // im Fingerabdruck und im Druck) und nicht nur im Kommentar.
    const r = buildShiftReport([cam({ paint: voll })]);
    expect(r.paintSource).toBe(PAINT_SOURCE_NOTE);
    expect(PAINT_SOURCE_NOTE).toContain('Nicht zurückgelesen');
    expect(buildShiftReportHtml(r)).toContain('Nicht zurückgelesen');
  });

  // -- 2 --------------------------------------------------------------------
  it('führt die drei Dinge, die heute nirgends stehen', () => {
    const r = buildShiftReport([cam({ paint: voll, faults: ['Sucher flackert ab 19:10'] })]);
    const z = r.rows[0];
    expect(z.sceneFile).toBe('CAM1_Tag1.scene');
    expect(z.panel).toBe('RCP 3, Seite 2');
    expect(z.faults).toEqual(['Sucher flackert ab 19:10']);
  });

  it('nennt fehlende Angaben, statt sie leer zu lassen', () => {
    const z = buildShiftReport([cam()]).rows[0];
    expect(z.sceneFile).toBe('nicht angegeben');
    expect(z.panel).toBe('nicht angegeben');
    // Keine Fehler ist etwas anderes als „keine Angabe" — und das Blatt sagt
    // es auch so.
    expect(z.faults).toEqual([]);
    expect(buildShiftReportHtml(buildShiftReport([cam()]))).toContain(NO_FAULTS);
    expect(NO_FAULTS).toBe('keine gemeldet');
  });

  it('leere Fehlerzeilen fallen weg', () => {
    const z = buildShiftReport([cam({ faults: ['  ', 'echt', ''] })]).rows[0];
    expect(z.faults).toEqual(['echt']);
  });

  // -- 3 --------------------------------------------------------------------
  it('führt die Befunde der bestehenden Prüfungen zusammen', () => {
    // Das ist der Teil, den der Bedarf als „exists nowhere today" bezeichnet:
    // die Pruefungen gibt es, aber jede sieht man nur an der ausgewaehlten
    // Kamera. Hier stehen sie fuer ALLE Positionen auf einem Blatt.
    const ohneAngaben = cam({
      paint: { sceneFile: 'x.scene' },
      rigging: undefined,
      comms: undefined,
    });
    const r = buildShiftReport([ohneAngaben]);
    const arten = r.rows[0].findings.map((f) => f.label);
    // Aus `checkPaint`
    expect(arten).toContain('Szenendatei ohne Datum');
    // Aus `cardFindings`
    expect(arten).toContain('Keine Rigging-Angaben — der Operator erfährt es vor Ort');
    // Und die Befunde werden nicht neu gerechnet, sondern gelesen.
    expect(quelle).toMatch(/checkPaint\(cam, cameras\)/);
    expect(quelle).toMatch(/cardFindings\(cam, cameras\)/);
  });

  it('Positionen mit Befund werden GERECHNET', () => {
    // Eigene Beltpacks: mit demselben meldete `cardFindings` an BEIDEN
    // Positionen zu Recht einen Befund — nachgemessen, und genau deshalb
    // steht die Kreuz-Pruefung mit auf dem Blatt.
    const sauber = cam({ id: 'c1', label: 'CAM 1', paint: voll });
    const offen = cam({
      id: 'c2',
      label: 'CAM 2',
      comms: { channel: 'D', beltpackId: 'BP2', batteryPlan: 'Wechsel 18:00' },
      paint: { sceneFile: 'y.scene', savedWith: { cameraId: 'fx9', lensId: 'canon-24-105' } },
    });
    const r = buildShiftReport([sauber, offen]);
    expect(r.withFindings.map((x) => x.cameraId)).toEqual(['c2']);
    // Wer die Angaben nachtraegt, sieht den Eintrag von selbst verschwinden.
    const danach = buildShiftReport([
      sauber,
      cam({
        id: 'c2',
        label: 'CAM 2',
        comms: { channel: 'D', beltpackId: 'BP2', batteryPlan: 'Wechsel 18:00' },
        paint: voll,
      }),
    ]);
    expect(danach.withFindings).toEqual([]);
  });

  it('die Kreuz-Prüfung zwischen Positionen steht mit auf dem Blatt', () => {
    // Zwei Positionen, die dasselbe Beltpack fordern, sind EINZELN beide
    // vollstaendig ausgefuellt. Nur im Vergleich faellt es auf — und ein
    // Uebergabe-Blatt, das nur je Position schaut, uebersaehe es.
    const a = cam({ id: 'c1', label: 'CAM 1', paint: voll });
    const b = cam({ id: 'c2', label: 'CAM 2', paint: voll });
    const r = buildShiftReport([a, b]);
    expect(r.withFindings.map((x) => x.cameraId)).toEqual(['c1', 'c2']);
    for (const zeile of r.rows) {
      expect(zeile.findings.map((f) => f.label)).toContain(
        'Zwei Positionen fordern dasselbe Beltpack',
      );
    }
  });

  it('eine Position ohne Befund bekommt keine Beruhigungszeile', () => {
    // „Keine Befunde" an jeder Position ist die Sorte Beruhigung, die man
    // nach dem dritten Mal nicht mehr liest — und danach auch die Zeile
    // nicht, an der etwas steht.
    const html = buildShiftReportHtml(buildShiftReport([cam({ paint: voll })]));
    expect(html).not.toContain('Nicht wie geplant');
    const mitBefund = buildShiftReportHtml(
      buildShiftReport([cam({ paint: { sceneFile: 'y.scene' } })]),
    );
    expect(mitBefund).toContain('Nicht wie geplant');
  });

  // -- 4 --------------------------------------------------------------------
  it('derselbe Plan ergibt zweimal dasselbe Blatt', () => {
    const a = cam({ id: 'c1', label: 'CAM 1', paint: voll });
    const b = cam({ id: 'c2', label: 'CAM 2', paint: voll });
    const eins = buildShiftReport([a, b]);
    const zwei = buildShiftReport([b, a]);
    expect(zwei.rows).toEqual(eins.rows);
    expect(shiftReportFingerprint(zwei)).toBe(shiftReportFingerprint(eins));
  });

  // -- 5 --------------------------------------------------------------------
  it('der Fingerabdruck reagiert auf alles, was auf dem Blatt steht', () => {
    const basis = buildShiftReport([cam({ paint: voll })]);
    const f = shiftReportFingerprint(basis);
    const anders = (over: Partial<VenueCamera>) =>
      shiftReportFingerprint(buildShiftReport([cam({ paint: voll, ...over })]));
    // Der Fall, um den es geht: zwei Blaetter derselben Show, und auf einem
    // steht ein Fehler, den das andere nicht kennt.
    expect(anders({ faults: ['Sucher flackert'] })).not.toBe(f);
    expect(anders({ paint: { ...voll, panel: 'RCP 1' } })).not.toBe(f);
    expect(anders({ paint: { ...voll, sceneFile: 'anders.scene' } })).not.toBe(f);
    expect(anders({ label: 'CAM 9' })).not.toBe(f);
    // Auch ein Befund, der dazukommt, ist ein anderes Blatt.
    expect(anders({ rigging: undefined })).not.toBe(f);
    // Und die Herkunfts-Angabe geht mit ein — sie bestimmt die Lesart.
    expect(
      shiftReportFingerprint({ ...basis, paintSource: 'irgendwas anderes' }),
    ).not.toBe(f);
  });

  // -- 6 --------------------------------------------------------------------
  it('das HTML maskiert, was der Nutzer eingetippt hat', () => {
    const html = buildShiftReportHtml(
      buildShiftReport([cam({ label: 'CAM <1> & "A"', faults: ['<script>alert(1)</script>'] })]),
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('CAM &lt;1&gt; &amp; &quot;A&quot;');
  });

  // -- 7 --------------------------------------------------------------------
  it('gedruckt wird über EINE Stelle', () => {
    // Der unsichtbare Rahmen, das Warten auf die Bilder, das Aufraeumen —
    // eine zweite Kopie liefe bei der naechsten Chrome-Eigenart auseinander.
    expect(storyboardQuelle).toMatch(/export function printHtml\(html: string\): void/);
    expect(storyboardQuelle).toMatch(/printHtml\(buildStoryboardHtml\(/);
    expect(quelle).toMatch(/printHtml\(buildShiftReportHtml\(/);
    // Und maskiert wird mit derselben Funktion.
    expect(storyboardQuelle).toMatch(/export const esc =/);
    expect(quelle).toMatch(/import \{ esc, printHtml \} from '\.\/storyboard'/);
  });

  // -- 8 --------------------------------------------------------------------
  it('der Weg ist verdrahtet', () => {
    expect(headerQuelle).toMatch(/printShiftReport\(bericht, s\.venue\.name, stamp\)/);
    // Der Stempel kommt aus DERSELBEN Ableitung wie der Bericht.
    expect(headerQuelle).toMatch(/current: shiftReportFingerprint\(bericht\)/);
    // Die beiden neuen Felder sind eintragbar.
    expect(sidebarQuelle).toMatch(/paint: \{ \.\.\.cam\.paint, panel: e\.target\.value \|\| undefined \}/);
    expect(sidebarQuelle).toMatch(/faults: e\.target\.value/);
    // Rein: keine Uhr, kein Store.
    expect(quelle).not.toMatch(/\bDate\.now\b|new Date\(|useStore/);
  });
});
