// ───────────────────────────────────────────────────────────────────────────
// Bedarf 58 (P2) — kommt DIESE Optik an DIESER Position an den geforderten
// Ausschnitt heran?
//
// ─── DER BEFUND ────────────────────────────────────────────────────────────
//
//   > Lens choice per position is guessed from experience or checked ad hoc
//   > with an online focal-length calculator; THE WRONG GLASS SHOWS UP ON THE
//   > TRUCK.
//
// Der Beleg der Datenbank ist ein durchgerechnetes Theater-Beispiel: rund
// 180–200 mm, um aus etwa 100 ft (30,5 m) eine Buehnenbreite von 10 ft (3,05 m)
// zu fuellen. Die Rechnung ist trivial — nur macht sie heute niemand IM PLAN,
// sondern in einem fremden Rechner im Browser, mit von Hand abgetippter
// Entfernung. Und was dabei herauskommt, steht auf keinem Blatt.
//
// ─── UND DAS BEISPIEL ZEIGT GENAU, WARUM DAS NICHT REICHT ──────────────────
//
// `f = d·s/W` heisst hier `f = 10·s`: die genannten 180–200 mm setzen einen
// **18 bis 20 mm breiten Sensor** voraus. Das ist Super-16-/MFT-Klasse. Auf
// Super-35 (24,9 mm) verlangt dieselbe Geometrie 249 mm, auf Kleinbild
// (36 mm) sind es 360 mm, auf einem 2/3"-B4-Chip (9,6 mm) nur 96 mm.
//
// Eine Faustregel aus einem allgemeinen Rechner ist damit fuer genau EINEN
// Sensor richtig und fuer jeden anderen falsch — und welcher Sensor an dieser
// Position steht, weiss der Plan, nicht der Rechner im Browser. Das ist der
// eigentliche Grund, warum diese Rechnung hierher gehoert.
//
// Die Datenbank sagt auch, was zu bauen ist:
//
//   > Add a lib/ calculation: position-to-subject distance + sensor + lens
//   > range -> achievable framing, with a warning when the assigned lens
//   > cannot make the assigned shot. Feeds the kit list.
//
// ─── WARUM DIE RECHNUNG EXAKT IST UND NICHT GENAEHERT ──────────────────────
//
// `fov.ts` rechnet vorwaerts: `imageWidthAtDistance(s, f, d) = 2·d·tan(β/2)`
// mit `β = 2·atan(s/2f)`. Das kuerzt sich zu **W = d·s/f** — die Tangens- und
// Arkustangens-Schritte heben sich exakt auf. Die Umkehrung ist damit
// ebenfalls exakt:
//
//     f = d · s / W
//
// Das ist kein Detail, sondern der Grund, warum diese Datei ueberhaupt neben
// `fov.ts` stehen darf: Vorschau und Pruefung koennen sich nicht
// widersprechen, weil sie dieselbe Beziehung in zwei Richtungen lesen. Eine
// eigene Naeherung — „Kleinwinkel", eine Tabelle, ein Faktor — haette genau
// den Fehler eingebaut, den ein Planer nie findet: die Vorschau zeigt etwas
// anderes als die Warnung.
//
// ─── DIE ENGSTELLE ─────────────────────────────────────────────────────────
//
// `reachVerdict` entscheidet als EINZIGE Stelle, ob ein Ausschnitt erreichbar
// ist. Sidebar, Kamerakarte und jede kuenftige Auswertung lesen dasselbe
// Urteil. Zwei Rechnungen ueber dieselbe Optik koennten sich unterscheiden —
// und dann stuende auf dem Blatt etwas anderes als auf dem Schirm.
//
// ─── WAS BEWUSST KEIN BEFUND IST ───────────────────────────────────────────
//
// Eine Position OHNE Auftrag. Wer nicht gesagt hat, welchen Ausschnitt eine
// Kamera liefern muss, hat keine Anforderung gestellt — und eine Warnung ohne
// Anlass wird weggeklickt, und danach auch die mit Anlass. Solche Positionen
// stehen deshalb in `unstated`: zaehlbar, aber kein Fehler.
//
// ─── WARUM DER EXTENDER ZUM URTEIL GEHOERT ─────────────────────────────────
//
// Ein Extender verschiebt den ganzen Bereich (`min·k` bis `max·k`) und ist ein
// eigenes Teil, das auf dem Wagen liegen muss. „Erreichbar" und „erreichbar,
// aber nur mit dem 2×" sind darum verschiedene Auskuenfte — die zweite ist
// eine Aussage fuer die Kit-Liste, und genau dahin will der Bedarf („Feeds the
// kit list").
//
// Und es gibt den Fall dazwischen: eine Festbrennweite mit Extender kann
// 50 mm und 100 mm, aber nicht 70. Ihn als „zu kurz" zu melden waere falsch —
// das legte laengeres Glas nahe, obwohl das vorhandene lang genug IST und der
// Ausschnitt trotzdem nicht getroffen wird. Deshalb hat er einen eigenen
// Namen (`in-gap`) und nennt beide Nachbarn.
//
// ─── DIE EINSTELLUNGSGROESSEN SIND EINE KONVENTION, UND DAS STEHT DA ───────
//
// Die Faktoren unten sind die ueblichen Einstellungsgroessen als Anteil der
// Motivhoehe. Sie sind KEINE Messung, und deshalb steht in jeder Ausgabe das
// Mass in Metern daneben, das sie ergeben haben: wer sie fuer falsch haelt,
// sieht sofort, worueber er streitet, und kann `custom` mit dem eigenen Mass
// setzen. Ein Faktor, der nur im Code steht und dessen Ergebnis nirgends
// auftaucht, waere eine Behauptung.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────

import type { CoverageAssignment, FramingName, Lens, ReachAxis, ReferencePerson, SensorSize, VenueCamera } from '../types';
import { effectiveCameraPos } from './camera';

/** Was diese Rechnung von einem Motiv braucht. */
export type ReachSubject = Pick<ReferencePerson, 'id' | 'label' | 'x' | 'y' | 'width' | 'height'>;

/** Was sie von einer Optik braucht. */
export interface ReachOptics {
  sensor: SensorSize;
  lens: Pick<Lens, 'focalLengthMin' | 'focalLengthMax' | 'extenderFactors'>;
}

/**
 * Die Einstellungsgroessen als Anteil des Motivmasses.
 *
 * `height`-Achse fuer die Personen-Einstellungen (Totale bis Detail),
 * `width`-Achse fuer „die volle Breite dieses Motivs" — das ist der Fall aus
 * dem Beleg: ein Objekt mit 3 m Breite auf der Buehne, das ganz ins Bild soll.
 */
export const FRAMINGS: Readonly<
  Record<Exclude<FramingName, 'custom'>, { axis: ReachAxis; factor: number; label: string }>
> = {
  wide: { axis: 'height', factor: 1.6, label: 'Totale' },
  full: { axis: 'height', factor: 1.15, label: 'Ganze Figur' },
  medium: { axis: 'height', factor: 0.6, label: 'Halbnah' },
  close: { axis: 'height', factor: 0.35, label: 'Nah' },
  detail: { axis: 'height', factor: 0.18, label: 'Detail' },
  footprint: { axis: 'width', factor: 1, label: 'Volle Breite' },
};

export const FRAMING_LABEL: Readonly<Record<FramingName, string>> = {
  wide: FRAMINGS.wide.label,
  full: FRAMINGS.full.label,
  medium: FRAMINGS.medium.label,
  close: FRAMINGS.close.label,
  detail: FRAMINGS.detail.label,
  footprint: FRAMINGS.footprint.label,
  custom: 'Eigenes Mass',
};

/** Warum kein Urteil moeglich war. Jeder Fall hat einen Namen. */
export type ReachUnknown =
  /** Der Auftrag nennt ein Motiv, das es im Plan nicht (mehr) gibt. */
  | 'no-subject'
  /** Body oder Optik sind nicht aufloesbar. */
  | 'no-optics'
  /** Das Motiv hat auf der geforderten Achse kein Mass (0 oder fehlend). */
  | 'no-extent'
  /** Kamera und Motiv stehen auf demselben Punkt. */
  | 'no-distance';

export const UNKNOWN_REASON: Readonly<Record<ReachUnknown, string>> = {
  'no-subject': 'Das beauftragte Motiv gibt es im Plan nicht mehr',
  'no-optics': 'Body oder Optik sind nicht aufgelöst',
  'no-extent': 'Für diesen Ausschnitt gibt es kein Maß',
  'no-distance': 'Kamera und Motiv stehen auf demselben Punkt',
};

export type ReachVerdict =
  /** Erreichbar — mit diesem Extender (1 = ohne). */
  | { kind: 'reachable'; requiredMm: number; extender: number }
  /** Das Objektiv geht nicht weit genug auf: es braucht WEITERES Glas. */
  | { kind: 'too-wide'; requiredMm: number; widestMm: number }
  /** Das Objektiv reicht nicht heran: es braucht LAENGERES Glas. */
  | { kind: 'too-long'; requiredMm: number; longestMm: number }
  /** Zwischen zwei Extender-Bereichen — laengeres Glas hilft hier nicht. */
  | { kind: 'in-gap'; requiredMm: number; belowMm: number; aboveMm: number }
  /** Kein Urteil, und der Grund steht dabei. */
  | { kind: 'not-computable'; reason: ReachUnknown };

/**
 * Die Brennweite, die diesen Ausschnitt aus dieser Entfernung genau fuellt.
 *
 * `f = d · s / W` — die exakte Umkehrung von `imageWidthAtDistance` in
 * `fov.ts`, siehe Kopf dieser Datei.
 */
export function requiredFocalMm(distanceM: number, sensorMm: number, extentM: number): number {
  return (distanceM * sensorMm) / extentM;
}

/** Die erreichbaren Brennweitenbereiche, nach Extender aufsteigend. */
export function reachRanges(
  lens: Pick<Lens, 'focalLengthMin' | 'focalLengthMax' | 'extenderFactors'>,
): { extender: number; minMm: number; maxMm: number }[] {
  const faktoren = [1, ...(lens.extenderFactors ?? [])]
    .filter((k) => Number.isFinite(k) && k > 0)
    .sort((a, b) => a - b);
  const einmalig = faktoren.filter((k, i) => i === 0 || k !== faktoren[i - 1]);
  return einmalig.map((k) => ({
    extender: k,
    minMm: lens.focalLengthMin * k,
    maxMm: lens.focalLengthMax * k,
  }));
}

const EPS = 1e-6;

/**
 * DIE ENGSTELLE. Erreicht diese Optik diesen Ausschnitt?
 *
 * Die Faelle sind erschoepfend und schliessen sich aus: unter dem kleinsten
 * Bereich, ueber dem groessten, in einer Luecke dazwischen, oder in einem
 * Bereich — und dann mit dem KLEINSTEN Extender, der ihn traegt (der
 * groessere waere ein Teil mehr auf dem Wagen und zwei Blenden weniger Licht).
 */
export function reachVerdict(input: {
  distanceM: number;
  axis: ReachAxis;
  extentM: number;
  optics: ReachOptics | null;
}): ReachVerdict {
  const { distanceM, axis, extentM, optics } = input;
  if (!optics) return { kind: 'not-computable', reason: 'no-optics' };
  if (!(extentM > 0) || !Number.isFinite(extentM)) {
    return { kind: 'not-computable', reason: 'no-extent' };
  }
  if (!(distanceM > EPS) || !Number.isFinite(distanceM)) {
    return { kind: 'not-computable', reason: 'no-distance' };
  }

  const sensorMm = axis === 'width' ? optics.sensor.widthMm : optics.sensor.heightMm;
  if (!(sensorMm > 0)) return { kind: 'not-computable', reason: 'no-optics' };

  const noetig = requiredFocalMm(distanceM, sensorMm, extentM);
  const bereiche = reachRanges(optics.lens);
  if (bereiche.length === 0) return { kind: 'not-computable', reason: 'no-optics' };

  const erster = bereiche[0];
  const letzter = bereiche[bereiche.length - 1];
  if (noetig < erster.minMm - EPS) {
    return { kind: 'too-wide', requiredMm: noetig, widestMm: erster.minMm };
  }
  if (noetig > letzter.maxMm + EPS) {
    return { kind: 'too-long', requiredMm: noetig, longestMm: letzter.maxMm };
  }
  const treffer = bereiche.find((b) => noetig >= b.minMm - EPS && noetig <= b.maxMm + EPS);
  if (treffer) return { kind: 'reachable', requiredMm: noetig, extender: treffer.extender };

  // Weder darunter noch darueber und in keinem Bereich: die Luecke zwischen
  // zwei Extender-Stufen. Beide Nachbarn werden genannt, weil die Abhilfe von
  // ihnen abhaengt — naeher rangehen oder weiter weg, nicht laengeres Glas.
  const unten = bereiche.filter((b) => b.maxMm < noetig).map((b) => b.maxMm);
  const oben = bereiche.filter((b) => b.minMm > noetig).map((b) => b.minMm);
  return {
    kind: 'in-gap',
    requiredMm: noetig,
    belowMm: Math.max(...unten),
    aboveMm: Math.min(...oben),
  };
}

/**
 * Entfernung Kamera → Motiv, dreidimensional.
 *
 * Der Standort kommt aus `effectiveCameraPos` — eine Kamera auf Dolly oder
 * Kran steht dort, wo sie GEFAHREN ist, nicht dort, wo sie geparkt wurde;
 * dieselbe Regel wie in `sightline.ts`.
 *
 * Das Motiv wird auf halber Hoehe angesetzt, also in seiner Mitte. Bei einer
 * Nahaufnahme sitzt der wirkliche Bildmittelpunkt hoeher (am Kopf); der
 * Unterschied betraegt bei 20 m Lauf 0,04 % und bei 3 m 1,8 % und liegt damit
 * unter der Rasterung jedes realen Objektivs. Er wird hier bewusst nicht
 * modelliert — eine Genauigkeit vorzutaeuschen, die die Eingangsdaten nicht
 * haben, ist schlimmer als die Naeherung zu benennen.
 */
export function subjectDistanceM(cam: VenueCamera, subject: ReachSubject): number {
  const pos = effectiveCameraPos(cam);
  return Math.hypot(subject.x - pos.x, subject.y - pos.y, subject.height / 2 - cam.z);
}

/** Welches Mass auf welcher Achse der Auftrag fordert. */
export function assignedExtent(
  assignment: CoverageAssignment,
  subject: ReachSubject,
): { axis: ReachAxis; extentM: number } {
  if (assignment.framing === 'custom') {
    return { axis: assignment.axis ?? 'height', extentM: assignment.extentM ?? 0 };
  }
  const f = FRAMINGS[assignment.framing];
  const mass = f.axis === 'width' ? subject.width : subject.height;
  return { axis: f.axis, extentM: mass * f.factor };
}

/** Eine Position mit Auftrag, samt Urteil. */
export interface CoverageRow {
  cameraId: string;
  cameraLabel: string;
  subjectId: string;
  /** Der Name des Motivs — oder seine Kennung, wenn es das Motiv nicht gibt. */
  subjectLabel: string;
  framing: FramingName;
  axis: ReachAxis;
  /** Was ins Bild passen muss (Meter). 0, wenn nicht bestimmbar. */
  extentM: number;
  /** Entfernung Kamera → Motiv (Meter). 0, wenn das Motiv fehlt. */
  distanceM: number;
  verdict: ReachVerdict;
}

export interface ReachReport {
  /** Alle Positionen MIT Auftrag, nach Kamera sortiert. */
  rows: CoverageRow[];
  /** Die Teilmenge, deren Auftrag nicht erfuellt ist — GERECHNET, nicht gefuehrt. */
  problems: CoverageRow[];
  /**
   * Erreichbar, aber nur mit Extender. Kein Fehler — eine Ansage fuer die
   * Kit-Liste: das Teil muss mit auf den Wagen.
   */
  needsExtender: { row: CoverageRow; extender: number }[];
  /** Positionen ohne Auftrag. Kein Befund, aber zaehlbar. */
  unstated: { cameraId: string; cameraLabel: string }[];
}

export interface ReachInput {
  cameras: readonly VenueCamera[];
  persons: readonly ReachSubject[];
  /** Wie Body und Optik einer Position aufgeloest werden. `null` = nicht aufloesbar. */
  optics: (cam: VenueCamera) => ReachOptics | null;
}

/**
 * Der ganze Plan auf einmal.
 *
 * `problems` wird aus `rows` GERECHNET und nicht mitgefuehrt: wer eine Optik
 * tauscht oder die Kamera verschiebt, sieht den Befund von selbst
 * verschwinden. Eine zweite, gepflegte Liste koennte dagegen recht behalten,
 * nachdem das Problem weg ist.
 */
export function reachReport(input: ReachInput): ReachReport {
  const motive = new Map(input.persons.map((p) => [p.id, p]));
  const rows: CoverageRow[] = [];
  const unstated: { cameraId: string; cameraLabel: string }[] = [];

  for (const cam of input.cameras) {
    const auftrag = cam.coverage;
    if (!auftrag) {
      unstated.push({ cameraId: cam.id, cameraLabel: cam.label });
      continue;
    }
    const motiv = motive.get(auftrag.subjectId);
    if (!motiv) {
      rows.push({
        cameraId: cam.id,
        cameraLabel: cam.label,
        subjectId: auftrag.subjectId,
        subjectLabel: auftrag.subjectId,
        framing: auftrag.framing,
        axis: auftrag.axis ?? 'height',
        extentM: 0,
        distanceM: 0,
        verdict: { kind: 'not-computable', reason: 'no-subject' },
      });
      continue;
    }
    const { axis, extentM } = assignedExtent(auftrag, motiv);
    const distanceM = subjectDistanceM(cam, motiv);
    rows.push({
      cameraId: cam.id,
      cameraLabel: cam.label,
      subjectId: motiv.id,
      subjectLabel: motiv.label,
      framing: auftrag.framing,
      axis,
      extentM,
      distanceM,
      verdict: reachVerdict({ distanceM, axis, extentM, optics: input.optics(cam) }),
    });
  }

  rows.sort((a, b) => a.cameraLabel.localeCompare(b.cameraLabel, 'de') || a.cameraId.localeCompare(b.cameraId));
  unstated.sort((a, b) => a.cameraLabel.localeCompare(b.cameraLabel, 'de') || a.cameraId.localeCompare(b.cameraId));

  return {
    rows,
    problems: rows.filter((r) => r.verdict.kind !== 'reachable'),
    needsExtender: rows
      .filter((r) => r.verdict.kind === 'reachable' && r.verdict.extender > 1)
      .map((r) => ({ row: r, extender: (r.verdict as { extender: number }).extender })),
    unstated,
  };
}

const mm = (v: number): string => `${Math.round(v)} mm`;
const m = (v: number): string => `${v.toFixed(2).replace('.', ',')} m`;

/**
 * Das Urteil im Klartext. Kanonisches Deutsch — es landet auch auf Blaettern,
 * und dort steht IMMER das geforderte Mass und die Entfernung dabei: wer die
 * Zahl anzweifelt, soll sehen, woraus sie kommt.
 */
export function reachText(row: CoverageRow): string {
  const was = `${FRAMING_LABEL[row.framing]} auf „${row.subjectLabel}"`;
  if (row.verdict.kind === 'not-computable') {
    return `${cam(row)} soll ${was} liefern: ${verdictShort(row.verdict)}`;
  }
  const woraus = `${m(row.extentM)} ${row.axis === 'width' ? 'Breite' : 'Höhe'} aus ${m(row.distanceM)}`;
  return `${cam(row)} soll ${was} liefern (${woraus}): ${verdictShort(row.verdict)}`;
}

const cam = (row: CoverageRow): string => `„${row.cameraLabel}"`;

/**
 * Die Zeilen der Kamerakarte.
 *
 * Es sind ZWEI: der Auftrag und das Urteil. Nur das Urteil zu drucken hiesse,
 * dem Blatt eine Bewertung ohne ihre Bemessungsgrundlage zu geben — und wer
 * vor Ort steht, muss den Auftrag lesen koennen, um zu merken, dass er nicht
 * mehr stimmt.
 *
 * Ohne Auftrag steht hier NICHTS. Anders als bei Rigging und Comms ist das
 * kein Verschweigen: dort fehlt eine Angabe, die es geben muesste, hier fehlt
 * eine Anforderung, die niemand gestellt hat.
 */
export function coverageLines(row: CoverageRow | null): string[] {
  if (!row) return [];
  return [
    `Auftrag:     ${FRAMING_LABEL[row.framing]} auf „${row.subjectLabel}"`,
    `Maß:         ${m(row.extentM)} ${row.axis === 'width' ? 'Breite' : 'Höhe'} aus ${m(row.distanceM)}`,
    `Optik:       ${verdictShort(row.verdict)}`,
  ];
}

/** Das Urteil in einer Zeile, ohne Bemessungsgrundlage — die steht darueber. */
export function verdictShort(v: ReachVerdict): string {
  switch (v.kind) {
    case 'reachable':
      return v.extender > 1
        ? `${mm(v.requiredMm)} nötig — erreichbar mit dem ${v.extender}×-Extender`
        : `${mm(v.requiredMm)} nötig — erreichbar`;
    case 'too-long':
      return `${mm(v.requiredMm)} nötig, Optik endet bei ${mm(v.longestMm)} — reicht nicht heran`;
    case 'too-wide':
      return `${mm(v.requiredMm)} nötig, Optik beginnt bei ${mm(v.widestMm)} — geht nicht weit genug auf`;
    case 'in-gap':
      return `${mm(v.requiredMm)} nötig, Optik kann ${mm(v.belowMm)} und ${mm(v.aboveMm)} — nichts dazwischen`;
    case 'not-computable':
      return `kein Urteil — ${UNKNOWN_REASON[v.reason]}`;
  }
}

/**
 * Den Auftrag beim Laden normalisieren.
 *
 * Ein Auftrag, dessen Motiv-Kennung leer ist oder dessen Stufe dieser Stand
 * nicht kennt, wird GANZ verworfen statt halb uebernommen. Halb uebernommen
 * saehe er wie eine Anforderung aus und waere keine — und die Kamerakarte
 * druckte eine Stufe, die niemand lesen kann.
 *
 * Das Motiv selbst wird hier NICHT geprueft: eine Kennung, zu der es keine
 * Person mehr gibt, ist ein Befund (`no-subject`) und kein Ladefehler. Sie
 * still wegzuwerfen hiesse, den einzigen Hinweis darauf zu loeschen, dass hier
 * einmal ein Auftrag stand.
 */
export function normaliseCoverage(raw: unknown): Pick<VenueCamera, 'coverage'> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const c = (o.coverage ?? null) as Record<string, unknown> | null;
  if (!c || typeof c !== 'object') return {};

  const subjectId = typeof c.subjectId === 'string' ? c.subjectId.trim() : '';
  if (!subjectId) return {};

  const framing = c.framing;
  const bekannt =
    typeof framing === 'string' && (framing === 'custom' || framing in FRAMINGS);
  if (!bekannt) return {};
  const stufe = framing as FramingName;

  if (stufe !== 'custom') return { coverage: { subjectId, framing: stufe } };

  const extentM =
    typeof c.extentM === 'number' && Number.isFinite(c.extentM) && c.extentM > 0
      ? c.extentM
      : undefined;
  const axis: ReachAxis | undefined =
    c.axis === 'width' || c.axis === 'height' ? c.axis : undefined;
  return {
    coverage: {
      subjectId,
      framing: 'custom',
      ...(extentM !== undefined ? { extentM } : {}),
      ...(axis !== undefined ? { axis } : {}),
    },
  };
}
