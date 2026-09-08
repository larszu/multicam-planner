// ───────────────────────────────────────────────────────────────────────────
// Was ein Lager-Import ÄNDERN WÜRDE — vor dem Import (E-15, 2026-09-08).
//
// DER BEFUND (B-22). `doImport` stellte genau EINE Ja/Nein-Frage:
// „Bestehenden Bestand ERSETZEN? Abbrechen = zusammenführen (merge)." `true`
// hiess ersetzen, `false` hiess ZUSAMMENFÜHREN — importiert wurde in beiden
// Fällen. Einen Weg, an dieser Stelle noch abzubrechen, gab es nicht. In der
// Suite hat `suite#154` das Zwischenmaß gebracht (Escape und Hintergrund-Klick
// führen nicht mehr zusammen); hier stand die Rückfrage unverändert.
//
// ZEICHENGLEICH ZUM light-planner (`light#97`) bis auf die Semikolons — so wie
// `merge.ts` es schon ist. Das Format ist app-übergreifend, also muss auch
// die Auskunft darüber, was ein Import täte, in allen Apps dieselbe sein.
// Eine Vorschau, die im MultiCam-Planer anders rechnet als im Light-Planer,
// wäre über dieselbe Datei zwei verschiedene Aussagen.
//
// DIE ENTSCHEIDUNG (E-15, vom Eigentümer bestätigt): ein VORSCHAU-SCHRITT,
// dieselbe Bauform wie beim Ablauf-Import — es gibt genau EINEN Weg an die
// Daten, und der führt über eine bestätigte Vorschau.
//
// Der Drei-Wege-Dialog schied aus, weil er fragt, bevor der Nutzer sehen
// kann, worüber er entscheidet: „zusammenführen oder ersetzen?" ist ohne die
// Liste der betroffenen Positionen nicht beantwortbar. Ein Undo für den
// Lager-Store schied aus, weil der Bestand projektübergreifend ist — ein
// Rückgängig, das zwischen zwei Projekten wirkt, ist keine Aktion mehr,
// sondern eine Zeitreise.
//
// ═══════════════════════════════════════════════════════════════════════
// WAS DIESE DATEI RECHNET — UND WAS SIE BEWUSST NICHT TUT
// ═══════════════════════════════════════════════════════════════════════
//
// Sie sagt VORHER, was jeder der beiden Modi täte, und zwar mit denselben
// Funktionen, die es danach tun (`mergeById`). Eine Vorschau, die anders
// rechnet als der Import, ist schlimmer als keine: sie sieht nach Prüfung
// aus und ist eine zweite Meinung.
//
// Sie schreibt nichts. Kein Store, kein `localStorage`, keine Datei.
// ───────────────────────────────────────────────────────────────────────────

import { mergeById, mergeDefined } from './merge';

export type ImportMode = 'merge' | 'replace'

/** Was mit einer Datensatz-Sorte geschähe. */
export interface SortenVorschau {
  /** Ids, die es lokal noch nicht gibt. */
  neu: string[]
  /** Ids, die es gibt und deren Inhalt sich ändern würde. */
  geaendert: string[]
  /** Ids, die es gibt und die unverändert blieben. */
  gleich: string[]
  /**
   * Ids, die WEGFIELEN. Nur im Modus `replace` — und das ist die Zahl, wegen
   * der es diese Vorschau gibt: sie ist im Dialog sonst nirgends abzulesen,
   * und sie ist die einzige, die nicht rückgängig zu machen ist.
   */
  entfernt: string[]
  /**
   * Ids, die lokal stehen und in der Datei NICHT vorkommen — und die der
   * Modus `merge` deshalb gar nicht anfasst.
   *
   * Dieselbe Menge steht im Modus `replace` unter `entfernt`. Genau darin
   * besteht der Unterschied zwischen den beiden Antworten, und er ist sonst
   * nirgends abzulesen: dieselben Datensätze, einmal unberührt, einmal weg.
   * Ohne diese Kategorie hätte die Vorschau eine stille dritte Sorte gehabt
   * — Ids, die in keiner Liste vorkommen —, und „steht nicht in der Liste"
   * ist keine Auskunft, die jemand richtig raten kann.
   */
  unberuehrt: string[]
}

export const LEERE_SORTE: SortenVorschau = {
  neu: [],
  geaendert: [],
  gleich: [],
  entfernt: [],
  unberuehrt: [],
};

export interface ImportVorschau {
  items: SortenVorschau
  nodes: SortenVorschau
  sets: SortenVorschau
  units: SortenVorschau
}

/** Die vier Sorten, in der Reihenfolge, in der der Dialog sie zeigt. */
export const VORSCHAU_SORTEN = ['items', 'nodes', 'sets', 'units'] as const;
export type VorschauSorte = (typeof VORSCHAU_SORTEN)[number]

/**
 * Inhaltsgleich — FELDWEISE, nicht ueber `JSON.stringify`.
 *
 * Warum das kein Detail ist: im Modus `replace` steht der eingehende Datensatz
 * gegen den vorhandenen, und der eingehende kommt aus einer fremden Datei.
 * Zwei inhaltsgleiche Datensaetze mit anderer Feld-Reihenfolge — `{id, model}`
 * gegen `{model, id}` — waeren als Zeichenkette verglichen „geaendert"
 * gewesen. Dann meldete die Vorschau Arbeit, die keine ist, und die eine Zahl,
 * auf die es ankommt (`entfernt`), ginge im Rauschen unter. Dieselbe Falle
 * steckte im Seed-Abgleich der Suite (`mergeSeedPatch`).
 *
 * `undefined` zaehlt als „Feld nicht da": eine v1-Datei, die `deviceTypeId`
 * gar nicht kennt, ist inhaltsgleich zu einer, die es auf `undefined` setzt.
 * Arrays bleiben reihenfolge-empfindlich — eine sortierte Id-Liste IST Inhalt.
 */
const gleichWert = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((x, i) => gleichWert(x, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const felder = (o: object): string[] =>
      Object.keys(o).filter((k) => (o as Record<string, unknown>)[k] !== undefined)
    const ka = felder(a);
    const kb = felder(b);
    if (ka.length !== kb.length) return false
    return ka.every((k) =>
      gleichWert((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
    )
  }
  return false;
}

const gleichInhalt = <T extends object>(a: T, b: T): boolean => gleichWert(a, b);

/**
 * Eine Sorte vergleichen.
 *
 * `geaendert` heisst: der Datensatz nach dem Import unterscheidet sich vom
 * jetzigen. Gerechnet wird er mit `mergeDefined` — derselben Funktion, die
 * der Import benutzt. Wer hier „eingehender Datensatz != vorhandener" rechnete,
 * meldete jede v1-Datei als Änderung, obwohl sie feldweise nichts wegnimmt.
 */
export const sortenVorschau = <T extends { id: string }>(
  vorhanden: readonly T[],
  eingehend: readonly T[],
  mode: ImportMode,
): SortenVorschau => {
  const lokal = new Map(vorhanden.map((x) => [x.id, x]));
  const kommt = new Map(eingehend.map((x) => [x.id, x]));

  const neu: string[] = [];
  const geaendert: string[] = [];
  const gleich: string[] = [];

  for (const [id, ein] of kommt) {
    const da = lokal.get(id);
    if (!da) {
      neu.push(id)
      continue
    }
    const nachher = mode === 'replace' ? ein : mergeDefined(da, ein);
    if (gleichInhalt(da, nachher)) gleich.push(id)
    else geaendert.push(id)
  }

  // Nur `replace` entfernt. `merge` haengt an und schreibt fort — es nimmt
  // nie etwas weg, und genau deshalb ist es die harmlosere der beiden
  // Antworten. Dieselbe Menge, zwei Namen: was hier `unberuehrt` heisst,
  // heisst dort `entfernt`.
  const nurLokal = [...lokal.keys()].filter((id) => !kommt.has(id));

  return {
    neu,
    geaendert,
    gleich,
    entfernt: mode === 'replace' ? nurLokal : [],
    unberuehrt: mode === 'replace' ? [] : nurLokal,
  }
}

export interface Bestand {
  items: readonly { id: string }[]
  nodes: readonly { id: string }[]
  sets: readonly { id: string }[]
  units: readonly { id: string }[]
}

/** Die vollständige Vorschau für einen Modus. */
export const importVorschau = (
  vorhanden: Bestand,
  eingehend: Partial<Bestand>,
  mode: ImportMode,
): ImportVorschau => ({
  items: sortenVorschau(vorhanden.items, eingehend.items ?? [], mode),
  nodes: sortenVorschau(vorhanden.nodes, eingehend.nodes ?? [], mode),
  sets: sortenVorschau(vorhanden.sets, eingehend.sets ?? [], mode),
  units: sortenVorschau(vorhanden.units, eingehend.units ?? [], mode),
});

/** Die Zahlen, die im Kopf der Vorschau stehen. */
export interface VorschauSumme {
  neu: number
  geaendert: number
  gleich: number
  entfernt: number
  unberuehrt: number
}

/** Summe über alle vier Sorten. */
export const vorschauSumme = (v: ImportVorschau): VorschauSumme => {
  const summe: VorschauSumme = { neu: 0, geaendert: 0, gleich: 0, entfernt: 0, unberuehrt: 0 };
  for (const sorte of VORSCHAU_SORTEN) {
    summe.neu += v[sorte].neu.length;
    summe.geaendert += v[sorte].geaendert.length;
    summe.gleich += v[sorte].gleich.length;
    summe.entfernt += v[sorte].entfernt.length;
    summe.unberuehrt += v[sorte].unberuehrt.length;
  }
  return summe;
}

/**
 * Ändert dieser Import überhaupt etwas?
 *
 * Wozu: eine Vorschau, die „0 neu, 0 geändert, 0 entfernt" zeigt, soll das
 * SAGEN und nicht als leere Liste dastehen. „Nichts zu tun" ist eine Antwort;
 * eine leere Fläche sieht aus wie ein Fehler.
 */
export const vorschauIstLeer = (v: ImportVorschau): boolean => {
  const s = vorschauSumme(v);
  // `gleich` und `unberuehrt` stehen bewusst NICHT in dieser Zeile. Eine
  // Datei, die zwanzig Datensaetze bringt und keinen davon aendert, aendert
  // nichts — wer sie mitzaehlte, machte aus „nichts zu tun" ein „zwanzig
  // Objekte", und der Nutzer bestaetigte einen Import, der nur so aussieht
  // wie einer.
  return s.neu === 0 && s.geaendert === 0 && s.entfernt === 0;
}

/**
 * Die Vorschau ist mit demselben Werkzeug gerechnet wie der Import.
 *
 * Diese Funktion existiert NUR fuer den Test: sie fuehrt den Import auf
 * reinen Daten aus, damit sich Vorschau und Ergebnis gegeneinander pruefen
 * lassen, ohne den Store anzufassen. Eine Vorschau, die niemand gegen das
 * Ergebnis haelt, ist eine Behauptung.
 */
export const wendeAn = <T extends { id: string }>(
  vorhanden: readonly T[],
  eingehend: readonly T[],
  mode: ImportMode,
): T[] => (mode === 'replace' ? [...eingehend] : mergeById([...vorhanden], [...eingehend]));
