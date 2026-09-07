// ───────────────────────────────────────────────────────────────────────────
// Bedarf 50 (P2) — das Blatt fuer die Schicht- und Show-Uebergabe.
//
// ─── DER BEFUND ────────────────────────────────────────────────────────────
//
//   > Nothing about the shading position is written down: not the final
//   > paint, not the camera-to-panel mapping, not the fault list. SHOW-TIME
//   > CHANGES ARE VERBAL AND INVISIBLE TO EVERY DOCUMENT; even restoring one
//   > production laptop needs a hand-written eight-item state checklist.
//
// Die Bedarfs-Datenbank nennt die Massnahme und ihren Preis:
//
//   > Generate a show/shift report: paint per camera (or an explicit
//   > 'UNREAD - PROTOCOL IS WRITE-ONLY'), camera-to-panel mapping, faults,
//   > deltas against the plan. CHEAP FOR A DOCUMENTATION PRODUCT, and it
//   > exists nowhere today.
//
// ─── DIE HERKUNFT STEHT EINMAL OBEN UND NICHT JE ZEILE ─────────────────────
//
// Der Bedarf verlangt ausdruecklich, dass ein Bildzustand als „nicht
// zurueckgelesen" kenntlich ist. Diese Anwendung liest KEINE Kamera aus — und
// zwar keine, nie. Deshalb steht die Auskunft EINMAL am Kopf des Blattes
// (`PAINT_SOURCE_NOTE`) und nicht als Feld je Position.
//
// Ein Feld je Position waere die schlechtere Loesung, und nicht nur die
// aufwendigere: es liesse sich auf „zurueckgelesen" stellen, ohne dass je
// etwas gelesen wurde. Eine Zusicherung, die jemand von Hand aussprechen
// kann, ist keine.
//
// ─── „DELTAS AGAINST THE PLAN" — WAS HIER GEHT UND WAS NICHT ───────────────
//
// Ein Vergleich gegen einen frueheren STAND geht nicht: dieser Planer fuehrt
// `projectVersion` als Zaehler und keine Schnappschuesse (so steht es
// ausdruecklich in ADR-004 Inkrement 4 — „nennt bewusst keine Revision, weil
// `projectVersion` Aenderungen ZAEHLT statt Staende festzuschreiben").
// Einen Diff zu behaupten, der keinen Bezugspunkt hat, waere schlimmer als
// keiner.
//
// Was dagegen sehr wohl geht, ist die andere Lesart derselben Frage: WAS IST
// NICHT SO, WIE DER PLAN ES VORSIEHT. Das wissen die vorhandenen Pruefungen
// bereits — nur weiss es jede fuer sich, und sichtbar ist es ausschliesslich
// in der Leiste der gerade ausgewaehlten Kamera. Dieses Blatt fuehrt sie
// zusammen: fuer ALLE Positionen, in einem Dokument, das jemand ausdrucken
// und weiterreichen kann. Genau das ist der Teil, den der Bedarf als „exists
// nowhere today" bezeichnet.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────
import type { VenueCamera } from '../types';
import { PAINT_UNSTATED, checkPaint, type PaintFinding } from './paintState';
import { PAINT_FINDING_LABEL } from './paintState';
import { CARD_FINDING_LABEL, cardFindings, type CardFinding } from './cameraCardExtras';
import {
  SHADING_FINDING_LABEL,
  shadingFindings,
  type ShadingFinding,
} from './shadingCapability';
import { PAINT_FUNCTION_LABEL } from './shadingCapability';
import {
  REGISTRY_FINDING_LABEL,
  matchGroups,
  registryFindings,
  type MatchGroup,
  type RegistryFinding,
} from './paintRegistry';
import { esc, printHtml } from './storyboard';
import { stampLine, type DocumentStamp } from './documentStamp';

/**
 * Woher die Bildzustaende auf diesem Blatt stammen.
 *
 * Der Satz, den der Bedarf woertlich verlangt — einmal, am Kopf, fuer alle
 * Positionen. Er ist eine Tatsache ueber diese ANWENDUNG und keine Angabe je
 * Kamera: es gibt keinen Weg, auf dem hier je ein Wert vom Geraet kaeme.
 */
export const PAINT_SOURCE_NOTE =
  'Nicht zurückgelesen — diese Anwendung liest keine Kamera aus. ' +
  'Alle Angaben sind das, was im Plan steht.';

/** Was in einer Zelle steht, fuer die niemand etwas eingetragen hat. */
export const SHIFT_UNSTATED = PAINT_UNSTATED;

/** Was in der Fehler-Spalte steht, wenn nichts gemeldet wurde. */
export const NO_FAULTS = 'keine gemeldet';

/**
 * Was bei einer Abgleich-Gruppe steht, in der sich NICHTS gemeinsam
 * einstellen laesst.
 *
 * Ein Satz und keine leere Zelle: eine leere Zelle liest sich als „noch nicht
 * ausgefuellt", und genau dieser Fall ist der, in dem jemand in der Probe
 * feststellt, dass die Gruppe nicht zusammengeht.
 */
export const NOTHING_SHARED = 'nichts — diese Gruppe ist vom Pult aus nicht abgleichbar';

/** Ein Befund auf dem Blatt, egal aus welcher Pruefung er kommt. */
export interface ShiftFinding {
  /** Kurzform der Art, wie sie in der jeweiligen Pruefung heisst. */
  label: string;
  text: string;
}

export interface ShiftRow {
  cameraId: string;
  label: string;
  /** Dateiname des Bildzustands — oder „nicht angegeben". */
  sceneFile: string;
  /** Datum, Urheber, Referenz — jeweils Klartext oder „nicht angegeben". */
  setAt: string;
  setBy: string;
  reference: string;
  /** Welches Bedienfeld diese Position schattiert. */
  panel: string;
  /** Bedarf 47 — wo der Zustand am Geraet liegt, wenn er keine Datei ist. */
  slot: string;
  /** Bedarf 47 — auf welchem Body er gesetzt wurde. */
  bodySerial: string;
  /** Bedarf 47 — mit wem diese Position gleich aussehen soll. */
  matchGroup: string;
  /** Was waehrend der Show kaputtgegangen ist. Leer heisst: nichts gemeldet. */
  faults: string[];
  /**
   * Was an dieser Position nicht so ist, wie der Plan es vorsieht —
   * zusammengefuehrt aus den vorhandenen Pruefungen.
   */
  findings: ShiftFinding[];
}

export interface ShiftReport {
  /** Eine Zeile je Position, nach Beschriftung sortiert. */
  rows: ShiftRow[];
  /**
   * Bedarf 47 — die Abgleich-Gruppen samt dem, was sich in ihnen ueberhaupt
   * gemeinsam einstellen laesst. GERECHNET, nicht gefuehrt.
   */
  groups: MatchGroup[];
  /** Der Herkunfts-Satz. Steht IM Bericht, damit er mitgedruckt wird. */
  paintSource: typeof PAINT_SOURCE_NOTE;
  /** Positionen mit mindestens einem Befund — GERECHNET, nicht gefuehrt. */
  withFindings: ShiftRow[];
}

const text = (v: string | undefined): string => (v ?? '').trim() || SHIFT_UNSTATED;

const ausPaint = (f: PaintFinding): ShiftFinding => ({
  label: PAINT_FINDING_LABEL[f.kind],
  text: f.text,
});

const ausKarte = (f: CardFinding): ShiftFinding => ({
  label: CARD_FINDING_LABEL[f.kind],
  text: f.text,
});

const ausSchattierung = (f: ShadingFinding): ShiftFinding => ({
  label: SHADING_FINDING_LABEL[f.kind],
  text: f.text,
});

const ausRegister = (f: RegistryFinding): ShiftFinding => ({
  label: REGISTRY_FINDING_LABEL[f.kind],
  text: f.text,
});

/**
 * Das Blatt fuer die Uebergabe.
 *
 * Die Befunde kommen aus den BESTEHENDEN Pruefungen und werden hier nicht
 * neu gerechnet. Eine zweite Vorstellung davon, was „fehlt" heisst, liefe
 * unweigerlich auseinander — und dann meldete die Leiste etwas anderes als
 * das Blatt, das jemand mit in die naechste Schicht nimmt.
 */
export const buildShiftReport = (cameras: readonly VenueCamera[]): ShiftReport => {
  const rows: ShiftRow[] = cameras.map((cam) => {
    const p = cam.paint;
    return {
      cameraId: cam.id,
      label: cam.label,
      sceneFile: text(p?.sceneFile),
      setAt: text(p?.setAt),
      setBy: text(p?.setBy),
      reference: text(p?.reference),
      panel: text(p?.panel),
      slot: text(p?.slot),
      bodySerial: text(p?.bodySerial),
      matchGroup: text(cam.matchGroup),
      faults: (cam.faults ?? []).map((f) => f.trim()).filter(Boolean),
      findings: [
        ...checkPaint(cam, cameras).map(ausPaint),
        ...cardFindings(cam, cameras).map(ausKarte),
        // Bedarf 48 — was diese Position ueber ihren Fernsteuerweg NICHT
        // kann. Gehoert auf dieses Blatt und nicht nur in die Leiste: die
        // naechste Schicht greift sonst am Pult nach einem Regler, den es
        // fuer diese Kamera gar nicht gibt.
        ...shadingFindings(cam, cameras).map(ausSchattierung),
        // Bedarf 47 — was der Wiederauffindbarkeit im Weg steht, und wo die
        // Abgleich-Absicht nicht aufgeht. Auf dieses Blatt und nicht nur in
        // die Leiste: die naechste Schicht sucht sonst eine Datei, die es
        // unter keinem Namen gibt.
        ...registryFindings(cam, cameras).map(ausRegister),
      ],
    };
  });

  // Feste Ordnung, damit derselbe Plan zweimal dasselbe Blatt ergibt
  // (ADR-004). Die Reihenfolge im Store ist eine Bearbeitungs-Reihenfolge.
  rows.sort(
    (a, b) => a.label.localeCompare(b.label, 'de') || a.cameraId.localeCompare(b.cameraId),
  );

  return {
    rows,
    groups: matchGroups(cameras),
    paintSource: PAINT_SOURCE_NOTE,
    withFindings: rows.filter((r) => r.findings.length > 0),
  };
};

/**
 * Das Blatt als druckbares HTML.
 *
 * A4 hoch und eine Tabelle je Position statt eines Rasters: dieses Blatt wird
 * gelesen und nicht betrachtet — es geht in die Hand der naechsten Schicht.
 *
 * Der Herkunfts-Satz steht ganz oben, weil er die Lesart aller Zahlen
 * darunter bestimmt.
 */
export const buildShiftReportHtml = (
  report: ShiftReport,
  venueName?: string,
  stamp?: DocumentStamp,
): string => {
  const zeilen = report.rows
    .map((r) => {
      const fehler =
        r.faults.length > 0
          ? `<ul class="list">${r.faults.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`
          : `<span class="dim">${esc(NO_FAULTS)}</span>`;
      // Befunde nur, wo es welche gibt — eine Zeile „keine Befunde" an jeder
      // Position waere die Sorte Beruhigung, die man nach dem dritten Mal
      // nicht mehr liest.
      const befunde =
        r.findings.length > 0
          ? `<tr><th>Nicht wie geplant</th><td><ul class="list warn">${r.findings
              .map((f) => `<li><b>${esc(f.label)}:</b> ${esc(f.text)}</li>`)
              .join('')}</ul></td></tr>`
          : '';
      return `<section class="pos">
  <h2>${esc(r.label)}</h2>
  <table>
    <tr><th>Szenendatei</th><td>${esc(r.sceneFile)}</td></tr>
    <tr><th>Gesetzt am</th><td>${esc(r.setAt)}</td></tr>
    <tr><th>Gesetzt von</th><td>${esc(r.setBy)}</td></tr>
    <tr><th>Referenz</th><td>${esc(r.reference)}</td></tr>
    <tr><th>Bedienfeld</th><td>${esc(r.panel)}</td></tr>
    <tr><th>Platz am Gerät</th><td>${esc(r.slot)}</td></tr>
    <tr><th>Body-Nr.</th><td>${esc(r.bodySerial)}</td></tr>
    <tr><th>Abgleich-Gruppe</th><td>${esc(r.matchGroup)}</td></tr>
    <tr><th>Fehler</th><td>${fehler}</td></tr>
    ${befunde}
  </table>
</section>`;
    })
    .join('\n');

  // Bedarf 47 — die Gruppen ans Ende, EINMAL. Sie sind eine Aussage ueber die
  // Show und nicht ueber eine Position; an jeder Zeile wiederholt waeren sie
  // dieselbe Tapete, die den Rest des Blattes mit ungelesen macht. Ohne
  // Gruppen steht hier nichts: ein leerer Abschnitt „Abgleich-Gruppen" liest
  // sich als „es gibt keine noetigen", und das ist eine Behauptung.
  const gruppen =
    report.groups.length === 0
      ? ''
      : `<section class="pos">
  <h2>Abgleich-Gruppen</h2>
  <table>
${report.groups
  .map((g) => {
    const wer = g.members.map((m) => esc(m.label)).join(', ');
    const kann =
      g.shared.length > 0
        ? g.shared.map((f) => esc(PAINT_FUNCTION_LABEL[f])).join(', ')
        : `<span class="dim">${esc(NOTHING_SHARED)}</span>`;
    return `    <tr><th>${esc(g.name)}</th><td>${wer}<br /><span class="dim">gemeinsam einstellbar:</span> ${kann}</td></tr>`;
  })
  .join('\n')}
  </table>
</section>`;

  const sub = [venueName, `${report.rows.length} Positionen`]
    .filter((v): v is string => !!v)
    .map(esc)
    .join(' · ');

  return `<!doctype html><html lang="de"><head><meta charset="utf-8" />
<title>Schicht-Übergabe</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; margin: 0; color: #111; }
  h1 { font-size: 18pt; margin: 0 0 2mm; }
  .sub { color: #666; font-size: 10pt; margin-bottom: 3mm; }
  .herkunft { border-left: 1mm solid #999; padding: 2mm 3mm; color: #333; font-size: 9.5pt; margin-bottom: 6mm; }
  .pos { break-inside: avoid; margin-bottom: 5mm; border: 0.3mm solid #ccc; border-radius: 2mm; padding: 3mm; }
  h2 { font-size: 12pt; margin: 0 0 2mm; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { text-align: left; width: 32mm; vertical-align: top; color: #555; font-weight: 600; padding: 0.6mm 0; }
  td { padding: 0.6mm 0; }
  .dim { color: #888; }
  .list { margin: 0; padding-left: 4mm; }
  .warn li { color: #8a5a00; }
  .stamp { position: fixed; bottom: 0; left: 0; right: 0; color: #888; font-size: 8pt; }
</style></head><body>
${stamp ? `<div class="stamp">${esc(stampLine(stamp))}</div>` : ''}
<h1>Schicht-Übergabe</h1>
<div class="sub">${sub}</div>
<div class="herkunft">${esc(report.paintSource)}</div>
${zeilen}
${gruppen}
</body></html>`;
};

/** Das Blatt drucken — ueber dieselbe Stelle wie das Storyboard. */
export const printShiftReport = (
  report: ShiftReport,
  venueName?: string,
  stamp?: DocumentStamp,
): void => printHtml(buildShiftReportHtml(report, venueName, stamp));
