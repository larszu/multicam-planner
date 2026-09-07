// ───────────────────────────────────────────────────────────────────────────
// Was auf den gedruckten Blaettern steht (ADR-004 Regel 1).
//
// Der Fingerabdruck laeuft ueber DEN INHALT DES DOKUMENTS, nicht ueber das
// Projekt. Das ist die Regel, an der sich der Nutzen entscheidet: eine
// verschobene Kamera 3 aendert nichts auf der Karte von Kamera 1. Wuerde sie
// die Karte als veraltet markieren, waere der Hinweis nach einer Woche
// Rauschen — und ein Hinweis, den alle wegklicken, ist schlimmer als keiner.
//
// Umgekehrt gilt genauso streng: was auf dem Blatt zu SEHEN ist, muss
// eingehen. Die Kamerakarte zeigt unten die Liste aller Kameras des Projekts;
// aendert dort ein Objektiv, ist es ein anderes Blatt, auch wenn die eigene
// Kamera unveraendert blieb. Deshalb steht diese Liste hier mit drin.
// ───────────────────────────────────────────────────────────────────────────
import type { Shot, Shotlist } from '../types';
import { documentFingerprint, type StampCell } from './documentStamp';
import { shotOpticsLabel, shotTransitionLabel } from './storyboard';

/** Eine Kamerazeile, wie sie in der Uebersicht der Karte erscheint. */
export interface CameraSummaryRow {
  id: string;
  label: string;
  camera: string;
  lens: string;
}

/**
 * Fingerabdruck der Kamerakarte aus dem Export-Panel.
 *
 * Die drei Kacheln (2D-Plan, 3D-Ansicht, Kamera-Vorschau) sind Renderings
 * genau dieses Zustands — sie brauchen keine eigenen Zeilen, sie bekaemen
 * dieselben. Was sie zeigen, steht in `optik` und `position`.
 */
export const cameraSheetFingerprint = (input: {
  /** Beschriftung der Kamera und ihre Variante, so wie in der Kopfzeile. */
  label: string;
  camera: string;
  lens: string;
  /** Zeilen des Rechenblocks (Brennweite, Blende, FOV, Schaerfentiefe …). */
  optik: StampCell[];
  /** Aufstellung: x, y, z, pan, tilt. */
  position: StampCell[];
  adapter?: string;
  notes?: string;
  /** Die Kameraliste am Fuss der Karte. */
  alle: CameraSummaryRow[];
  /**
   * Bedarf 14 — die Preset-Tabelle, wenn die Karte eine zeigt.
   *
   * Sie steht auf dem Blatt, also geht sie ein. Genau darum geht es in
   * diesem Modul: was zu SEHEN ist, muss in den Fingerabdruck. Eine Karte,
   * auf der Preset 3 „Pult" heisst und eine zweite, auf der es „Publikum"
   * heisst, sind zwei Blaetter — auch wenn Kamera und Optik gleich blieben.
   *
   * Leer, wenn die Karte keine Tabelle hat. Dann faellt der Block weg und
   * der Fingerabdruck bleibt der, den dieselbe Karte vorher hatte.
   */
  presets?: StampCell[][];
  /**
   * Bedarfe 59/60/61 — Rigging, Comms und Kit der Position.
   *
   * Sie stehen auf dem Blatt, also gehen sie ein. Der Fall, um den es geht:
   * zwei Karten derselben Kamera, gleiche Optik, gleiche Position — und ein
   * anderer Comms-Kanal. Ohne diese Zeilen traegen beide denselben Stempel,
   * und der Operator mit dem aelteren Blatt schaltet auf den falschen Kanal.
   */
  extras?: StampCell[][];
  /**
   * Bedarf 58 — der Deckungsauftrag und das Urteil ueber die Optik.
   *
   * Dieselbe Regel, und hier faellt sie besonders auf: das Urteil wird aus
   * Standort, Motiv, Sensor und Objektivbereich GERECHNET. Ein verschobenes
   * Motiv aendert es, ohne dass jemand an der Kamera etwas angefasst haette —
   * und dann steht auf dem alten Blatt „erreichbar", wo inzwischen „reicht
   * nicht heran" gilt. Ohne diese Zeilen truege es denselben Stempel.
   *
   * Leer, wenn die Position keinen Auftrag hat; dann faellt der Block auf dem
   * Blatt weg und hier ebenso.
   */
  coverage?: StampCell[];
}): string =>
  documentFingerprint(
    ['kamerakarte'],
    [
      ['kopf', input.label, input.camera, input.lens],
      ['optik', ...input.optik],
      ['pos', ...input.position],
      ...(input.presets ?? []).map((zeile) => ['preset', ...zeile] as StampCell[]),
      ...(input.extras ?? []),
      ...(input.coverage && input.coverage.length > 0
        ? [['deckung', ...input.coverage] as StampCell[]]
        : []),
      ['adapter', input.adapter ?? ''],
      ['notiz', input.notes ?? ''],
      // Nach `id` sortiert: die Reihenfolge im Store ist eine
      // Bearbeitungs-Reihenfolge. Auf dem Blatt stehen dieselben Kameras,
      // egal in welcher Folge sie angelegt wurden — ein Stempel, der darauf
      // anschlaegt, meldet eine Abweichung, die keiner gemacht hat.
      ...[...input.alle]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((c) => ['cam', c.id, c.label, c.camera, c.lens] as StampCell[]),
    ],
  );

/**
 * Fingerabdruck der Schicht-Uebergabe (Bedarf 50).
 *
 * Dieselbe Regel wie ueberall hier: was auf dem Blatt zu SEHEN ist, geht ein.
 * Der Fall, um den es geht, ist der teuerste dieses Dokuments — zwei
 * Uebergabe-Blaetter derselben Show, gleiche Positionen, und auf einem steht
 * ein Fehler, der auf dem anderen fehlt. Ohne diese Zeilen truegen beide
 * denselben Stempel, und die naechste Schicht liest das aeltere.
 *
 * Der Herkunfts-Satz geht MIT ein: er ist Teil des Blattes und bestimmt, wie
 * alles darunter zu lesen ist.
 */
export const shiftReportFingerprint = (report: {
  paintSource: string;
  rows: Array<{
    cameraId: string;
    label: string;
    sceneFile: string;
    setAt: string;
    setBy: string;
    reference: string;
    panel: string;
    faults: string[];
    findings: Array<{ label: string; text: string }>;
  }>;
}): string =>
  documentFingerprint(
    ['schicht-uebergabe', report.paintSource],
    report.rows.map((r) => [
      r.cameraId,
      r.label,
      r.sceneFile,
      r.setAt,
      r.setBy,
      r.reference,
      r.panel,
      r.faults.join('|'),
      r.findings.map((f) => `${f.label}: ${f.text}`).join('|'),
    ]),
  );

/**
 * Fingerabdruck des Storyboards (Kontaktbogen wie Druckfassung).
 *
 * Beide Ausgabewege zeigen dieselben Angaben je Kachel, deshalb reicht eine
 * Rechnung fuer beide — und das ist der Punkt: ein PNG und ein Ausdruck
 * desselben Standes muessen dieselben acht Zeichen tragen, sonst vergleicht
 * man am Telefon zwei Zahlen, die nicht vergleichbar sind.
 *
 * Der Framegrab geht als „gibt es / gibt es nicht" ein, nicht als Bild-Inhalt.
 * Ein Bild, das neu aufgenommen wurde, sieht auf dem Blatt anders aus — aber
 * eine data-URL zeichenweise durch den Hash zu schicken, kostet bei zwoelf
 * Kacheln Megabytes und beantwortet dieselbe Frage nicht besser: die
 * Shot-Daten daneben aendern sich mit.
 */
export const storyboardFingerprint = (shotlist: Shotlist): string =>
  documentFingerprint(
    ['storyboard', shotlist.name ?? ''],
    shotlist.shots.map((shot: Shot, i: number) => [
      i + 1,
      shot.name ?? '',
      shotOpticsLabel(shot),
      shotTransitionLabel(shot),
      shot.note ?? '',
      shot.thumbnail ? 'grab' : '',
    ]),
  );
