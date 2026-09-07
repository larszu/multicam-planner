import { describe, expect, it } from 'vitest';
import {
  REGISTRY_FINDING_LABEL,
  REGISTRY_UNSTATED,
  groupOf,
  matchGroups,
  normaliseMatchGroup,
  registryFindings,
  registryLines,
} from '../utils/paintRegistry';
import { cardExtraRows } from '../utils/cameraCardExtras';
import { normalisePaint } from '../utils/paintState';
import { NOTHING_SHARED, buildShiftReport, buildShiftReportHtml } from '../utils/shiftReport';
import { shiftReportFingerprint } from '../utils/documentContent';
import type { VenueCamera } from '../types';
import quelle from '../utils/paintRegistry.ts?raw';
import sidebarQuelle from '../components/Sidebar/Sidebar.tsx?raw';
import storeQuelle from '../store/useStore.ts?raw';
import panelQuelle from '../components/Export/ExportPanel.tsx?raw';

// ---------------------------------------------------------------------------
// Bedarf 47 (P2) — der Bildzustand bekommt eine Identitaet.
//
//   > Device-side storage is FIVE UNNAMED SLOTS on an SD card […] which scene
//   > file belongs to which position on which show is institutional memory.
//   > […] SYNCHRONIZE SETTINGS ACROSS MULTIPLE CAMERAS for uniform color
//   > grading.
//
// Der teuerste Fehler waere, die Gruppe als blosse Notiz zu fuehren: „diese
// vier sollen gleich aussehen" ist erst dann ein Plan, wenn jemand
// nachgerechnet hat, ob das ueber ihre Wege ueberhaupt geht.
// ---------------------------------------------------------------------------

const cam = (over: Partial<VenueCamera> = {}): VenueCamera =>
  ({
    id: over.id ?? 'c1',
    label: over.label ?? 'CAM 1',
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

const arten = (c: VenueCamera, alle: VenueCamera[] = [c]): string[] =>
  registryFindings(c, alle).map((f) => f.kind);

// ── 1. Wiederauffindbarkeit ────────────────────────────────────────────────

describe('wo der Bildzustand liegt', () => {
  it('meldet einen Zustand, den es unter keinem Namen gibt', () => {
    // Der haerteste Fall: kein Dateiname UND kein Platz. Bedarf 63 meldet
    // bereits „Angaben ohne Dateiname"; hier gibt es auch am Gerät keinen
    // Weg zurueck.
    const c = cam({ paint: { setBy: 'Vision-Engineer' } });
    expect(arten(c)).toContain('unfindable');
    const f = registryFindings(c, [c]).find((x) => x.kind === 'unfindable');
    expect(f?.text).toContain('weder einen Dateinamen noch einen Platz');
  });

  it('ein Platz allein reicht — der Beleg nennt genau diesen Fall', () => {
    // „five unnamed slots on an SD card". Ohne Dateinamen, aber auffindbar.
    expect(arten(cam({ paint: { slot: 'SD 3' } }))).not.toContain('unfindable');
    expect(arten(cam({ paint: { sceneFile: 'a.scene' } }))).not.toContain('unfindable');
  });

  it('ohne Bildzustand wird gar nichts gemeldet', () => {
    // Eine Position, fuer die niemand einen vorgesehen hat, bekommt keine
    // Frage nach seinem Platz gestellt.
    expect(arten(cam())).toEqual([]);
  });
});

describe('auf welchem Body', () => {
  const mitDatei = { sceneFile: 'CAM1.scene' };

  it('verlangt die Body-Nummer NUR, wenn das Modell mehrfach steht', () => {
    // Bei einem einzigen FX9 ist die Nummer die Antwort auf eine Frage, die
    // niemand hat — und genau solche Meldungen klickt man weg, mitsamt der
    // naechsten, die einen Grund hatte.
    const allein = cam({ paint: mitDatei });
    expect(arten(allein)).not.toContain('serial-unstated');

    const a = cam({ id: 'a', label: 'CAM 1', paint: mitDatei });
    const b = cam({ id: 'b', label: 'CAM 2', paint: mitDatei });
    expect(arten(a, [a, b])).toContain('serial-unstated');
    expect(registryFindings(a, [a, b])[0].text).toContain('CAM 2');
  });

  it('schweigt bei verschiedenen Modellen', () => {
    const a = cam({ id: 'a', paint: mitDatei });
    const b = cam({ id: 'b', label: 'CAM 2', cameraId: 'sony-fx3', paint: mitDatei });
    expect(arten(a, [a, b])).not.toContain('serial-unstated');
  });

  it('schweigt, sobald die Nummer dasteht', () => {
    const p = { ...mitDatei, bodySerial: 'FX9-0012' };
    const a = cam({ id: 'a', paint: p });
    const b = cam({ id: 'b', label: 'CAM 2', paint: p });
    expect(arten(a, [a, b])).not.toContain('serial-unstated');
  });

  it('verlangt sie nicht für einen Zustand, den es gar nicht gibt', () => {
    // Ohne Datei und ohne Platz ist `unfindable` die Meldung. Eine zweite
    // daneben („und die Body-Nummer fehlt auch") ist Rauschen an einem
    // Eintrag, der ohnehin verloren ist.
    const a = cam({ id: 'a', paint: { setBy: 'x' } });
    const b = cam({ id: 'b', label: 'CAM 2', paint: { setBy: 'x' } });
    expect(arten(a, [a, b])).toEqual(['unfindable']);
  });
});

// ── 2. Der Abgleich — der Teil, der rechnet ────────────────────────────────

describe('Abgleich-Gruppen', () => {
  const bm = (over: Partial<VenueCamera> = {}) =>
    cam({ controlPath: 'blackmagic', matchGroup: 'Bühne', ...over });
  const ptz = (over: Partial<VenueCamera> = {}) =>
    cam({ controlPath: 'panasonic-ptz', matchGroup: 'Bühne', ...over });

  it('rechnet den Schnitt der Gruppe, nicht der ganzen Show', () => {
    // Eine dritte Position ausserhalb der Gruppe darf ihren Schnitt nicht
    // verkleinern — sonst waere die Gruppe nur eine Beschriftung.
    const a = bm({ id: 'a', label: 'CAM 1' });
    const b = bm({ id: 'b', label: 'CAM 2' });
    const fremd = ptz({ id: 'c', label: 'CAM 3', matchGroup: 'Publikum' });
    const g = groupOf(a, [a, b, fremd]);
    expect(g?.members.map((m) => m.id)).toEqual(['a', 'b']);
    expect(g?.shared).toContain('colorTemp');
    expect(g?.split).toEqual([]);
  });

  it('meldet an der Position, die HERAUSFÄLLT', () => {
    // Der Fall aus dem Beleg: eine Panasonic-PTZ in einer Gruppe mit
    // Blackmagic-Bodies. Gemeinsam geht die Blende, sonst nichts.
    const a = bm({ id: 'a', label: 'CAM 1' });
    const p = ptz({ id: 'p', label: 'CAM 9' });
    const g = groupOf(p, [a, p]);
    expect(g?.shared).toEqual(['iris']);
    expect(arten(p, [a, p])).toContain('group-not-matchable');
    expect(registryFindings(p, [a, p])[0].text).toContain('Farbtemperatur');
    // Und die Blackmagic faellt an ihrer Stelle heraus: Farbbalken kann die
    // PTZ, die Blackmagic nicht.
    const gegen = registryFindings(a, [a, p]).find((f) => f.kind === 'group-not-matchable');
    expect(gegen?.text).toContain('Farbbalken');
  });

  it('schweigt in einer gleichartigen Gruppe', () => {
    const a = bm({ id: 'a', label: 'CAM 1' });
    const b = bm({ id: 'b', label: 'CAM 2' });
    expect(arten(a, [a, b])).toEqual([]);
  });

  it('meldet eine Gruppe mit nur einer Position', () => {
    // Ein verschriebener Name sieht aus wie eine Absicht und ist keine.
    const a = bm({ id: 'a', label: 'CAM 1', matchGroup: 'Bühen' });
    const b = bm({ id: 'b', label: 'CAM 2' });
    expect(arten(a, [a, b])).toEqual(['group-alone']);
  });

  it('leere Namen bilden keine Gruppe', () => {
    // Sonst laege jede Position ohne Gruppe in einer gemeinsamen — und die
    // meldete reihenweise „nicht abgleichbar".
    const a = cam({ id: 'a', matchGroup: '   ' });
    const b = cam({ id: 'b', label: 'CAM 2' });
    expect(matchGroups([a, b])).toEqual([]);
    expect(arten(a, [a, b])).toEqual([]);
  });

  it('rechnet den Schnitt NICHT selbst nach', () => {
    // Eine zweite Vorstellung davon, was „gemeinsam steuerbar" heisst, liefe
    // auseinander — dann saegte die Gruppe etwas anderes als die Flotte.
    expect(quelle).toMatch(/fleetMatch\(sortiert\)/);
    expect(quelle).toMatch(/shadingVerdict\(cam, fn\) !== 'im-bus'/);
  });

  it('gibt jeder Befundart eine Beschriftung', () => {
    for (const k of Object.keys(REGISTRY_FINDING_LABEL)) {
      expect(REGISTRY_FINDING_LABEL[k as never]).toBeTruthy();
    }
  });
});

// ── 3. Auf dem Blatt ───────────────────────────────────────────────────────

describe('was auf Karte und Blatt steht', () => {
  it('nennt fehlende Angaben, statt sie leer zu lassen', () => {
    const z = registryLines(cam({ paint: { sceneFile: 'a.scene' } }));
    expect(z).toHaveLength(2);
    expect(z[0]).toContain(REGISTRY_UNSTATED);
    expect(z[1]).toContain(REGISTRY_UNSTATED);
    expect(REGISTRY_UNSTATED).toBe('nicht angegeben');
  });

  it('ohne Bildzustand gibt es den Block nicht', () => {
    expect(registryLines(cam())).toEqual([]);
    expect(cardExtraRows(cam()).some((r) => r[0] === 'registry')).toBe(false);
    expect(cardExtraRows(cam({ paint: { slot: 'SD 3' } })).some((r) => r[0] === 'registry')).toBe(
      true,
    );
  });

  it('die Gruppen stehen EINMAL am Ende des Blattes', () => {
    const a = cam({ id: 'a', label: 'CAM 1', controlPath: 'blackmagic', matchGroup: 'Bühne' });
    const b = cam({ id: 'b', label: 'CAM 2', controlPath: 'blackmagic', matchGroup: 'Bühne' });
    const html = buildShiftReportHtml(buildShiftReport([a, b]));
    expect(html.split('Abgleich-Gruppen</h2>')).toHaveLength(2);
    expect(html).toContain('CAM 1, CAM 2');
  });

  it('ohne Gruppen steht der Abschnitt gar nicht da', () => {
    // Ein leerer Abschnitt liest sich als „es gibt keine nötigen", und das
    // waere eine Behauptung.
    const html = buildShiftReportHtml(buildShiftReport([cam()]));
    expect(html).not.toContain('Abgleich-Gruppen</h2>');
  });

  it('eine unabgleichbare Gruppe sagt es mit einem Satz', () => {
    const a = cam({ id: 'a', label: 'CAM 1', controlPath: 'none', matchGroup: 'Bühne' });
    const b = cam({ id: 'b', label: 'CAM 2', controlPath: 'blackmagic', matchGroup: 'Bühne' });
    const bericht = buildShiftReport([a, b]);
    expect(bericht.groups[0].shared).toEqual([]);
    expect(buildShiftReportHtml(bericht)).toContain(NOTHING_SHARED);
    expect(NOTHING_SHARED).toBe('nichts — diese Gruppe ist vom Pult aus nicht abgleichbar');
  });

  it('die neuen Angaben stehen in der Zeile', () => {
    const z = buildShiftReport([
      cam({ paint: { sceneFile: 'a.scene', slot: 'SD 3', bodySerial: 'FX9-1' }, matchGroup: 'B' }),
    ]).rows[0];
    expect(z.slot).toBe('SD 3');
    expect(z.bodySerial).toBe('FX9-1');
    expect(z.matchGroup).toBe('B');
  });

  it('der Fingerabdruck reagiert auf JEDES Feld der Zeile — gerechnet', () => {
    // Aufgezaehlt wuerde hier jemand ein Feld vergessen, und der Stempel
    // truege danach zwei verschiedene Blaetter unter derselben Zahl. Also
    // wird ueber die Schluessel der Zeile GELAUFEN.
    const basis = buildShiftReport([
      cam({ paint: { sceneFile: 'a.scene', slot: 'SD 3', bodySerial: 'FX9-1' } }),
    ]);
    const f = shiftReportFingerprint(basis);
    const keys = Object.keys(basis.rows[0]) as Array<keyof (typeof basis.rows)[0]>;
    expect(keys.length).toBeGreaterThan(8);
    for (const key of keys) {
      const kopie = structuredClone(basis);
      const w = kopie.rows[0][key];
      (kopie.rows[0] as unknown as Record<string, unknown>)[key] = Array.isArray(w)
        ? [...w, 'zusatz']
        : `${String(w)}#anders`;
      expect(shiftReportFingerprint(kopie), `Feld ${String(key)}`).not.toBe(f);
    }
  });

  it('und auf eine Gruppe, die auf einmal nicht mehr abgleichbar ist', () => {
    // Die Gruppen stehen NICHT eigens im Fingerabdruck — sie sind aus den
    // Zeilen ableitbar: wer dazugehoert, sagt `matchGroup`; ob sie aufgeht,
    // haengt am Fernsteuerweg, und jeder Unterschied dort erzeugt einen
    // anderen Befund in genau diesen Zeilen. Das wird hier gemessen statt
    // behauptet.
    const a = cam({ id: 'a', label: 'CAM 1', controlPath: 'blackmagic', matchGroup: 'Bühne' });
    const b = cam({ id: 'b', label: 'CAM 2', controlPath: 'blackmagic', matchGroup: 'Bühne' });
    const eins = shiftReportFingerprint(buildShiftReport([a, b]));
    const zwei = shiftReportFingerprint(
      buildShiftReport([a, { ...b, controlPath: 'panasonic-ptz' } as VenueCamera]),
    );
    expect(zwei).not.toBe(eins);
    // Und auch der blosse Gruppenwechsel einer Position ist ein anderes Blatt.
    const drei = shiftReportFingerprint(
      buildShiftReport([a, { ...b, matchGroup: 'Publikum' } as VenueCamera]),
    );
    expect(drei).not.toBe(eins);
  });

  it('die Register-Befunde stehen auf dem Übergabe-Blatt', () => {
    // Die naechste Schicht sucht sonst eine Datei, die es unter keinem Namen
    // gibt — und erfaehrt es erst, wenn sie danach sucht.
    const verloren = cam({ paint: { setBy: 'Vision-Engineer' } });
    const zeile = buildShiftReport([verloren]).rows[0];
    expect(zeile.findings.map((f) => f.label)).toContain(
      'Bildzustand ohne Dateiname und ohne Platz',
    );
  });

  it('auch die Kreuz-Prüfung des Registers erreicht das Blatt', () => {
    // Zwei gleiche Bodies sind EINZELN beide vollstaendig ausgefuellt. Ein
    // Blatt, das nur je Position schaut, uebersaehe es.
    const p = { sceneFile: 'CAM.scene', slot: 'SD 3' };
    const a = cam({ id: 'a', label: 'CAM 1', paint: p });
    const b = cam({ id: 'b', label: 'CAM 2', paint: p });
    const bericht = buildShiftReport([a, b]);
    for (const zeile of bericht.rows) {
      expect(zeile.findings.map((f) => f.label)).toContain(
        'Szenendatei ohne Body-Nummer bei gleichen Modellen',
      );
    }
    expect(bericht.withFindings.map((r) => r.cameraId)).toEqual(['a', 'b']);
  });
});

// ── 4. Laden und Verdrahtung ───────────────────────────────────────────────

describe('was beim Laden erhalten bleibt', () => {
  it('Platz und Body-Nummer überleben den Lade-Pfad', () => {
    // Ohne sie steht in der naechsten Sitzung ein Dateiname da und niemand
    // weiss mehr, auf welchem Body und an welchem Platz — genau der Zustand,
    // den der Bedarf abschafft.
    const p = normalisePaint({
      paint: { sceneFile: 'a.scene', slot: '  SD 3 ', bodySerial: ' FX9-1 ' },
    }).paint;
    expect(p?.slot).toBe('SD 3');
    expect(p?.bodySerial).toBe('FX9-1');
    expect(normalisePaint({ paint: { sceneFile: 'a.scene', slot: '  ' } }).paint?.slot).toBeUndefined();
  });
});

describe('normaliseMatchGroup', () => {
  it('nimmt einen Namen und wirft Leerraum weg', () => {
    expect(normaliseMatchGroup({ matchGroup: '  Bühne ' })).toEqual({ matchGroup: 'Bühne' });
    expect(normaliseMatchGroup({ matchGroup: '   ' })).toEqual({});
    expect(normaliseMatchGroup({ matchGroup: 42 })).toEqual({});
    expect(normaliseMatchGroup(null)).toEqual({});
  });

  it('läuft auf dem Lade-Pfad', () => {
    expect(storeQuelle).toMatch(/\.\.\.normaliseMatchGroup\(c\)/);
  });
});

describe('der Weg ist verdrahtet', () => {
  it('Platz, Body-Nummer und Gruppe sind eintragbar', () => {
    expect(sidebarQuelle).toMatch(/paint: \{ \.\.\.cam\.paint, slot: e\.target\.value \|\| undefined \}/);
    expect(sidebarQuelle).toMatch(
      /paint: \{ \.\.\.cam\.paint, bodySerial: e\.target\.value \|\| undefined \}/,
    );
    expect(sidebarQuelle).toMatch(/matchGroup: e\.target\.value \|\| undefined/);
    expect(sidebarQuelle).toMatch(/registryFindings\(cam, cameras\)/);
  });

  it('steht auf der gedruckten Karte', () => {
    expect(panelQuelle).toMatch(/\.\.\.registryLines\(targetCam\)/);
  });

  it('bleibt rein — keine Uhr, kein Store, kein IO', () => {
    expect(quelle).not.toMatch(/\bDate\.now\b|new Date\(|useStore|fetch\(/);
  });
});
