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
}): string =>
  documentFingerprint(
    ['kamerakarte'],
    [
      ['kopf', input.label, input.camera, input.lens],
      ['optik', ...input.optik],
      ['pos', ...input.position],
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
