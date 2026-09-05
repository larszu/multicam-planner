// ───────────────────────────────────────────────────────────────────────────
// Ein Ausdruck sagt seinen Stand (ADR-004, Roadmap-Initiative 4).
//
// DAS PROBLEM. Zwei Kamerakarten derselben Position, zwei Tage auseinander
// gedruckt, sehen identisch aus. Am Set entscheidet dann, wer das juengere
// Blatt in der Hand haelt — und niemand kann es einem Blatt ansehen.
//
// Papier ist dabei ausdruecklich NICHT das Problem. Die Rollen-Recherche ist an
// der Stelle eindeutig: Papier wird behalten, weil es ohne Akku funktioniert
// und sich nicht unter der Hand aendert. Wer den Zettel wegnimmt, nimmt genau
// die Eigenschaft weg, wegen der er da ist. Der Fehler ist, dass er unsichtbar
// veraltet.
//
// WARUM DIE VORHANDENE „Project v47" NICHT REICHT. `projectVersion` zaehlt
// Aenderungen seit dem Laden. Zwei Leute, die dieselbe Datei laden und
// unterschiedlich weiterarbeiten, kommen beide bei v47 an — mit verschiedenem
// Inhalt. Eine Zahl, die kollidieren kann, beantwortet die Frage „habe ich das
// juengere Blatt?" nicht; ein Fingerabdruck ueber den Inhalt schon.
//
// WARUM KEIN KRYPTO-HASH. Der Stempel schuetzt vor Verwechslung, nicht vor
// Faelschung. Acht Hex-Zeichen (FNV-1a, 32 Bit) kann ein Mensch am Telefon
// vorlesen und mit dem Bildschirm vergleichen — der Rueckweg vom Papier
// funktioniert damit ohne Scanner, ohne App und ohne Netz, also unter genau
// den Bedingungen, unter denen Papier ueberhaupt gewaehlt wurde. Ein SHA-256
// waeren 64 Zeichen, die niemand vorliest.
//
// GLEICHE ABLEITUNG WIE IM CABLE- UND LIGHT-PLANNER. Dieselben Trennzeichen,
// dieselbe Hash-Funktion, dasselbe Zeilenformat. Zwei Apps, die verschiedene
// Staende desselben Projekts verschieden benennen, waeren schlimmer als gar
// kein Stempel: man vergliche zwei Zahlen, die nichts miteinander zu tun
// haben, und hielte das Ergebnis fuer eine Aussage.
// ───────────────────────────────────────────────────────────────────────────

export interface DocumentStamp {
  /** Projektname, wie er auf dem Blatt steht. */
  project: string;
  /** Label eines festgeschriebenen Standes, sonst nicht gesetzt. */
  revision?: string;
  /**
   * Der Plan weicht vom festgeschriebenen Stand ab. Ohne Revision IMMER
   * `false`: keine Behauptung ohne Bezugspunkt — eine erfundene Abweichung ist
   * derselbe Schaden wie ein erfundener Zustand.
   */
  drifted: boolean;
  /** Zeitpunkt der Erzeugung (ISO). */
  printedAt: string;
  /** 8 Hex-Zeichen ueber den Inhalt — der eigentliche Vergleichswert. */
  fingerprint: string;
}

/** FNV-1a, 32 Bit, als 8 Hex-Zeichen. */
export const fingerprint = (input: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    // FNV-Prime 16777619, in 32-Bit-Arithmetik ohne BigInt.
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

/**
 * Trenner zwischen Zellen und Zeilen.
 *
 * Unit-/Record-Separator und kein Semikolon: Zellen enthalten Semikolons,
 * Kommas und Zeilenumbrueche (Shot-Notizen zum Beispiel). Ein Trenner, der im
 * Inhalt vorkommen kann, macht zwei verschiedene Dokumente gleich — genau das,
 * was ein Fingerabdruck nicht darf.
 */
const SEP = '\u001F';
const ROW_SEP = '\u001E';

export type StampCell = string | number | null | undefined;

const joinRows = (headers: string[], rows: StampCell[][]): string =>
  [headers, ...rows]
    .map((row) => row.map((c) => (c === null || c === undefined ? '' : String(c))).join(SEP))
    .join(ROW_SEP);

/** Fingerabdruck ueber den Inhalt eines Zeilen-Dokuments. */
export const documentFingerprint = (headers: string[], rows: StampCell[][]): string =>
  fingerprint(joinRows(headers, rows));

/**
 * Der Stempel selbst.
 *
 * `atRevision` ist der Fingerabdruck DESSELBEN Dokuments zum festgeschriebenen
 * Stand. Fehlt er, gibt es nichts, wovon abgewichen werden koennte.
 */
export const buildStamp = (args: {
  project: string;
  revision?: string;
  current: string;
  atRevision?: string;
  now: Date;
}): DocumentStamp => ({
  project: args.project || '—',
  ...(args.revision ? { revision: args.revision } : {}),
  drifted: !!args.revision && !!args.atRevision && args.atRevision !== args.current,
  printedAt: args.now.toISOString(),
  fingerprint: args.current,
});

/**
 * Der uebliche Weg zum Stempel: Fingerabdruck jetzt, Fingerabdruck zum Stand.
 *
 * `buildStamp` laesst eine Revision ohne Vergleichswert zu; hier haengen Label
 * und Vergleichswert am selben Objekt: wer den Stand nennt, liefert ihn auch.
 *
 * Der MultiCam-Planner kennt heute keinen festgeschriebenen Stand — er zaehlt
 * Aenderungen, statt sie festzuschreiben. Der Parameter ist trotzdem da und
 * nicht wegoptimiert: kaeme ein Schnappschuss dazu, waere sonst der Stempel
 * die Stelle, die man beim Nachziehen uebersieht.
 */
export const stampForStand = (args: {
  project: string;
  /** Fingerabdruck des Dokuments, so wie es gerade gedruckt wird. */
  current: string;
  /** Label des festgeschriebenen Standes und derselbe Fingerabdruck daraus. */
  committed?: { label: string; fingerprint: string };
  now: Date;
}): DocumentStamp =>
  buildStamp({
    project: args.project,
    revision: args.committed?.label,
    current: args.current,
    atRevision: args.committed?.fingerprint,
    now: args.now,
  });

/** Datum/Uhrzeit kurz und lesbar (lokal), fuer die Fusszeile. */
const fmtStampDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * Eine Zeile fuer Fusszeilen und Kopfbloecke.
 *
 * Der Revisions-Teil ist der Punkt: steht nur „Rev 2" auf dem Blatt, liest sich
 * das als *dieser Ausdruck ist Rev 2*. Weicht der Plan ab, sagt der Stempel das
 * hin — sonst behauptet das Papier einen Stand, den es nicht hat.
 */
export const stampLine = (stamp: DocumentStamp): string => {
  const parts = [stamp.project];
  if (stamp.revision) parts.push(stamp.drifted ? `${stamp.revision} + Änderungen` : stamp.revision);
  parts.push(fmtStampDate(stamp.printedAt));
  parts.push(`#${stamp.fingerprint}`);
  return parts.join('  ·  ');
};
