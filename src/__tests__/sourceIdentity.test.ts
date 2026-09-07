// ───────────────────────────────────────────────────────────────────────────
// Wem gehoert dieses Bild? (Bedarf 130, P4)
//
//   > After a NIC outage and an OBS restart, NDI PORTS WERE RESHUFFLED and
//   > receivers displayed INCORRECT SCENE LABELS — the label says one camera,
//   > the picture is another, so A SHADING CORRECTION LANDS ON THE WRONG
//   > CAMERA.
//
// Beleg: `zbynekdrlik/camera-box#1180` (August 2026, im eigenen Tracker eines
// Live-Produktions-Teams als P0).
//
// WAS HIER GEPRÜFT WIRD, und warum jede Zeile davon nötig ist:
//
//  1. EIN POSITIONS-TREFFER IST KEIN TREFFER. Das ist der ganze Bedarf: die
//     Position in der Liste ist genau das, was vertauscht wurde. Ein Abgleich,
//     der darauf grün wird, hat den Fehler eingebaut statt gefunden.
//
//  2. STARK SCHLÄGT SCHWACH — ÜBER ALLE KAMERAS. Erst werden alle
//     Geräte-Kennungen vergeben, dann alle Rechner+Namen. Sonst schnappt sich
//     die erste Kamera der Liste eine Quelle auf einer schwachen
//     Übereinstimmung weg, die zu einer späteren eindeutig gepasst hätte.
//
//  3. EINE QUELLE GEHÖRT HÖCHSTENS EINER KAMERA. Ohne diese Regel melden zwei
//     Kameras denselben Zulauf als ihren, beide sehen in Ordnung aus — und
//     eine von beiden bleibt schwarz.
//
//  4. EIN LEERES MERKMAL PASST NIE. Zwei Kameras ohne Geräte-Kennung hätten
//     sonst dieselbe, und der Abgleich erklärte beide für wiedererkannt.
//
//  5. KEINE KENNUNG IST KEIN FEHLER, ABER AUCH KEIN HAKEN. „Nicht prüfbar"
//     ist ein eigenes Urteil und nicht „in Ordnung".
//
//  6. DER GENANNTE FEHLERFALL WIRD WIRKLICH GEFUNDEN. Zwei Kameras, deren
//     Quellen nach einem Neustart die Plätze getauscht haben: der Abgleich
//     muss sie richtig zuordnen und nicht der Reihenfolge folgen.
//
//  7. WAS NICHT LESBAR IST, WIRD GEMELDET. Eine stillschweigend verworfene
//     Zeile ist eine Kamera, die nachher fehlt.
//
//  8. DER WEG IST VERDRAHTET.
// ───────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import sidebarSrc from '../components/Sidebar/Sidebar.tsx?raw';
import typesSrc from '../types/index.ts?raw';
import {
  FACET_LABEL,
  FACET_ORDER,
  RECONCILE_HEADERS,
  TRUSTED_FACETS,
  VERDICT_LABEL,
  hasIdentity,
  parseSourceList,
  reconcile,
  reconcileTable,
  sourceLabel,
  type DiscoveredSource,
  type PlannedSource,
} from '../utils/sourceIdentity';

const cam = (
  cameraId: string,
  label: string,
  identity?: PlannedSource['identity'],
  lastIndex?: number,
): PlannedSource => ({ cameraId, label, identity, lastIndex });

const src = (index: number, host?: string, sourceName?: string, extra: Partial<DiscoveredSource> = {}): DiscoveredSource =>
  ({ index, ...(host ? { host } : {}), ...(sourceName ? { sourceName } : {}), ...extra });

describe('Bedarf 130 — Quellen-Identität', () => {
  it('1. ein Positions-Treffer ist kein Treffer', () => {
    // Die Kamera stand beim letzten Mal an Position 0 — und dort steht jetzt
    // eine Quelle, die sonst nichts mit ihr zu tun hat.
    const r = reconcile(
      [cam('c1', 'CAM 1', { sourceName: 'CAM 1' }, 0)],
      [src(0, 'REGIE-PC', 'IRGENDWAS')],
    );
    expect(r.rows[0].facet).toBe('index');
    // NICHT `confirmed`. Genau hier entsteht der Fehler aus dem Beleg.
    expect(r.rows[0].verdict).toBe('weak');
    expect(r.rows[0].message).toMatch(/keine Identität/);
    expect(r.needsLook).toBe(1);
    // Und die Rangfolge sagt dasselbe noch einmal: die Position traegt nicht.
    expect(TRUSTED_FACETS.has('index')).toBe(false);
    expect(TRUSTED_FACETS.has('address')).toBe(false);
    expect([...TRUSTED_FACETS]).toEqual(
      expect.arrayContaining(['deviceId', 'hostAndName', 'sourceName']),
    );
    // Die Position steht am ENDE der Rangfolge — sie wird zuletzt probiert.
    expect(FACET_ORDER[FACET_ORDER.length - 1]).toBe('index');
    expect(FACET_ORDER[0]).toBe('deviceId');
  });

  it('2. stark schlägt schwach, über alle Kameras hinweg', () => {
    // CAM 1 steht zuerst und passt SCHWACH auf die Quelle, die CAM 2 STARK
    // gehoert. Wuerde Kamera fuer Kamera abgeglichen, nähme CAM 1 sie weg.
    const r = reconcile(
      [
        cam('c1', 'CAM 1', { address: '10.0.0.7' }),
        cam('c2', 'CAM 2', { deviceId: 'SN-4711' }),
      ],
      [src(0, 'REGIE-PC', 'CAM 2', { deviceId: 'SN-4711', address: '10.0.0.7' })],
    );
    const c2 = r.rows.find((x) => x.cameraId === 'c2')!;
    const c1 = r.rows.find((x) => x.cameraId === 'c1')!;
    expect(c2.verdict).toBe('confirmed');
    expect(c2.facet).toBe('deviceId');
    // Und CAM 1 bekommt sie NICHT — sie ist vergeben.
    expect(c1.matched).toBeNull();
    expect(c1.verdict).toBe('missing');
  });

  it('3. eine Quelle gehört höchstens einer Kamera', () => {
    // Zwei Kameras mit demselben Quellennamen, eine Quelle im Netz.
    const r = reconcile(
      [cam('c1', 'CAM 1', { sourceName: 'CAM' }), cam('c2', 'CAM 2', { sourceName: 'CAM' })],
      [src(0, 'REGIE-PC', 'CAM')],
    );
    const zugeteilt = r.rows.filter((x) => x.matched !== null);
    expect(zugeteilt).toHaveLength(1);
    // Die andere sagt, dass sie nichts hat — und sieht nicht in Ordnung aus.
    const offen = r.rows.find((x) => x.matched === null)!;
    expect(offen.verdict).toBe('missing');
  });

  it('4. ein leeres Merkmal passt nie', () => {
    // Beide Kameras ohne Geraete-Kennung, die Quelle ebenfalls ohne. Ein
    // naiver Vergleich `undefined === undefined` erklaerte beide fuer erkannt.
    const r = reconcile(
      [cam('c1', 'CAM 1', { deviceId: '' }), cam('c2', 'CAM 2', {})],
      [src(0)],
    );
    expect(r.rows.every((x) => x.matched === null)).toBe(true);
    // Auch Rechner+Name braucht BEIDES: nur ein Rechner reicht nicht.
    const halb = reconcile(
      [cam('c1', 'CAM 1', { host: 'REGIE-PC' })],
      [src(0, 'REGIE-PC', 'CAM 9')],
    );
    expect(halb.rows[0].facet).not.toBe('hostAndName');
    expect(halb.rows[0].matched).toBeNull();
  });

  it('5. keine Kennung ist kein Fehler, aber auch kein Haken', () => {
    const r = reconcile([cam('c1', 'CAM 1')], [src(0, 'REGIE-PC', 'CAM 1')]);
    expect(r.rows[0].verdict).toBe('no-identity');
    expect(r.rows[0].verdict).not.toBe('confirmed');
    expect(r.rows[0].message).toMatch(/nichts zu prüfen/);
    expect(hasIdentity(cam('x', 'X'))).toBe(false);
    expect(hasIdentity(cam('x', 'X', { sourceName: ' ' }))).toBe(false);
    expect(hasIdentity(cam('x', 'X', { sourceName: 'CAM 1' }))).toBe(true);
    // Die Quelle bleibt dann unzugeordnet und steht als solche im Bericht —
    // sonst waere sie einfach verschwunden.
    expect(r.unexpected).toHaveLength(1);
    // Jedes Urteil hat einen Text, und keiner ist leer.
    for (const v of ['confirmed', 'weak', 'missing', 'no-identity'] as const) {
      expect(VERDICT_LABEL[v].length).toBeGreaterThan(5);
    }
    for (const f of FACET_ORDER) expect(FACET_LABEL[f].length).toBeGreaterThan(3);
  });

  it('6. der genannte Fehlerfall wird wirklich gefunden', () => {
    // DER FALL AUS DEM BELEG: nach dem Neustart haben CAM 1 und CAM 2 in der
    // Liste die Plaetze getauscht. Wer der Reihenfolge folgt, ordnet beide
    // falsch zu — und der Bildtechniker zieht die falsche Blende.
    const planned = [
      cam('c1', 'CAM 1', { host: 'REGIE-PC', sourceName: 'CAM 1' }, 0),
      cam('c2', 'CAM 2', { host: 'REGIE-PC', sourceName: 'CAM 2' }, 1),
    ];
    const nachNeustart = [src(0, 'REGIE-PC', 'CAM 2'), src(1, 'REGIE-PC', 'CAM 1')];
    const r = reconcile(planned, nachNeustart);

    const c1 = r.rows.find((x) => x.cameraId === 'c1')!;
    const c2 = r.rows.find((x) => x.cameraId === 'c2')!;
    expect(c1.verdict).toBe('confirmed');
    expect(c2.verdict).toBe('confirmed');
    // Und zwar RICHTIG zugeordnet: CAM 1 haengt jetzt an Position 1.
    expect(c1.matched?.index).toBe(1);
    expect(c2.matched?.index).toBe(0);
    expect(r.needsLook).toBe(0);
    expect(r.unexpected).toHaveLength(0);

    // Die Gegenprobe: OHNE die Namen — nur mit der Position — waere genau der
    // Fehler herausgekommen, den der Beleg beschreibt. Das ist der Grund,
    // warum ein Positions-Treffer nie `confirmed` wird.
    const nurPosition = reconcile(
      [cam('c1', 'CAM 1', undefined, 0), cam('c2', 'CAM 2', undefined, 1)],
      nachNeustart,
    );
    expect(nurPosition.rows.every((x) => x.verdict !== 'confirmed')).toBe(true);
  });

  it('7. was nicht lesbar ist, wird gemeldet', () => {
    const p = parseSourceList([
      'REGIE-PC (CAM 1)',
      '2. REGIE-PC (CAM 2)  10.0.0.42',
      'CAM 3',
      '   ',
      '???',
    ].join('\n'));

    expect(p.sources).toHaveLength(4);
    expect(p.sources[0]).toMatchObject({ index: 0, host: 'REGIE-PC', sourceName: 'CAM 1' });
    // Der vorangestellte Listen-Index wird abgeschnitten und NICHT als
    // Position uebernommen: die Nummer im Text ist die von damals.
    expect(p.sources[1]).toMatchObject({ index: 1, host: 'REGIE-PC', sourceName: 'CAM 2', address: '10.0.0.42' });
    // Ohne Klammer ist alles der Name — geraten wird kein Rechner dazu.
    expect(p.sources[2]).toMatchObject({ index: 2, sourceName: 'CAM 3' });
    expect(p.sources[2].host).toBeUndefined();
    // Leerzeilen sind keine Quellen und auch keine Warnung.
    // „???" dagegen ist eine Zeile, aus der jemand etwas gemeint hat.
    expect(p.sources[3]).toMatchObject({ index: 3, sourceName: '???' });
    expect(p.warnings).toHaveLength(0);

    // Eine Zeile, die wirklich nichts hergibt, wird GEMELDET.
    const leer = parseSourceList('(  )');
    expect(leer.sources).toHaveLength(0);
    expect(leer.warnings).toHaveLength(1);
    expect(leer.warnings[0].line).toBe(1);
    expect(leer.warnings[0].reason.length).toBeGreaterThan(20);

    // Die Positionen sind luecklos und folgen der gelesenen Reihenfolge —
    // sonst zeigte der Bericht auf eine Zeile, die es nicht gibt.
    const mitLuecke = parseSourceList('A\n(  )\nB');
    expect(mitLuecke.sources.map((s) => s.index)).toEqual([0, 1]);
    expect(mitLuecke.warnings).toHaveLength(1);
  });

  it('7b. eine Quelle heisst auf dem Blatt, wie sie im Empfänger heisst', () => {
    expect(sourceLabel(src(0, 'REGIE-PC', 'CAM 1'))).toBe('REGIE-PC (CAM 1)');
    expect(sourceLabel(src(0, undefined, 'CAM 1'))).toBe('CAM 1');
    expect(sourceLabel(src(0, 'REGIE-PC'))).toBe('REGIE-PC');
    expect(sourceLabel(src(0, undefined, undefined, { address: '10.0.0.9' }))).toBe('10.0.0.9');
    // Ohne jedes Merkmal bleibt die Position — und sie tritt nicht als Name
    // auf, sondern wird als das benannt, was sie ist.
    expect(sourceLabel(src(3))).toMatch(/Position 3/);

    const tb = reconcileTable(reconcile([cam('c1', 'CAM 1')], []));
    expect(tb.header).toEqual([...RECONCILE_HEADERS]);
    expect(tb.rows).toHaveLength(1);
    // Wo nichts zugeordnet ist, steht ein Zeichen und keine leere Zelle.
    expect(tb.rows[0][2]).not.toBe('');
    expect(tb.rows[0][3]).not.toBe('');
  });

  it('8. der Weg ist verdrahtet', () => {
    // Der Plan ist die Autoritaet: die Kennung steht am Projekt.
    expect(typesSrc).toMatch(/source\?: SourceIdentity;/);
    expect(typesSrc).toMatch(/lastSourceIndex\?: number;/);

    // Der Abgleich laeuft ueber ALLE Kameras und nicht nur ueber die
    // ausgewaehlte: eine Vertauschung betrifft immer zwei.
    expect(sidebarSrc).toMatch(/reconcile\(\s*cameras\.map/);
    expect(sidebarSrc).toMatch(/parseSourceList\(sourceListText\)/);
    // Was nicht lesbar war, steht in der Ansicht.
    expect(sidebarSrc).toMatch(/quellenListe\.warnings\.length > 0/);
    // Unerwartete Quellen auch: sie sind der Zwilling einer fehlenden.
    expect(sidebarSrc).toMatch(/quellenAbgleich\.unexpected\.length > 0/);
    expect(sidebarSrc).toMatch(/quellenAbgleich\.needsLook > 0/);
    // Und das Urteil wird nicht selbst nachgebaut, sondern gelesen.
    expect(sidebarSrc).toMatch(/VERDICT_LABEL\[meineZeile\.verdict\]/);
  });
});
