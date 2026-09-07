// ───────────────────────────────────────────────────────────────────────────
// Wem gehoert dieses Bild? (Bedarf 130, P4)
//
//   > After a NIC outage and an OBS restart, NDI PORTS WERE RESHUFFLED and
//   > receivers displayed INCORRECT SCENE LABELS — the label says one camera,
//   > the picture is another, so A SHADING CORRECTION LANDS ON THE WRONG
//   > CAMERA.
//
// Beleg: `zbynekdrlik/camera-box#1180` (August 2026, im eigenen Tracker eines
// Live-Produktions-Teams als P0 eingetragen).
//
// ─── DER FEHLER IST NICHT „VERTAUSCHT", SONDERN „UNBEMERKT VERTAUSCHT" ─────
//
// Dass eine Liste sich nach einem Neustart anders sortiert, ist normal. Der
// Schaden entsteht, weil danach NIEMAND ES SIEHT: die Beschriftung sagt CAM 3,
// das Bild kommt von CAM 5, und der Bildtechniker zieht die Blende der
// falschen Kamera zu. Vor der Sendung ist das eine Minute Arbeit; waehrend
// der Sendung ist es nicht zu reparieren.
//
// Die Empfehlung der Quelle ist deshalb keine Automatik, sondern eine SICHT:
// „hold camera identity in the project file as the authority and provide a
// verification view (plan mapping vs live discovered sources) SO DRIFT IS
// VISIBLE BEFORE AIR rather than during it."
//
// ─── NICHT JEDES MERKMAL IST EINE IDENTITAET ───────────────────────────────
//
// Das ist der ganze Kern. Eine Quelle traegt mehrere Merkmale, und sie sind
// UNTERSCHIEDLICH viel wert:
//
//   deviceId    Seriennummer/UUID des Geraets. Ueberlebt alles.
//   host+name   Ein NDI-Name ist `RECHNER (Quelle)`. Beides zusammen ueberlebt
//               einen Neustart — solange niemand umbenennt.
//   name        Allein schwaecher: zwei Rechner koennen dieselbe Quelle fuehren.
//   address     Die IP. Ueberlebt einen Neustart nur mit fester Reservierung.
//   index       DIE POSITION IN DER LISTE. Das ist KEINE Identitaet, sondern
//               genau das, was im Beleg vertauscht wurde.
//
// Ein Abgleich, der auf `index` „passt", hat nichts wiedererkannt — er hat
// eine Reihenfolge gelesen. Deshalb gibt dieses Modul nie ein blosses Ja
// zurueck, sondern IMMER das Merkmal, an dem es erkannt hat, und ein Urteil,
// das ein Positions-Treffer nicht gruen macht.
//
// REIN: keine Datei, kein Netz, keine Uhr.
// ───────────────────────────────────────────────────────────────────────────

/** Woran eine Quelle wiedererkannt wurde. Absteigend nach Verlaesslichkeit. */
export type IdentityFacet = 'deviceId' | 'hostAndName' | 'sourceName' | 'address' | 'index';

/**
 * Die Reihenfolge, in der Merkmale probiert werden.
 *
 * Sie ist die Rangfolge der Verlaesslichkeit und steht deshalb an EINER
 * Stelle: wer sie an zwei Orten fuehrt, bekommt irgendwann zwei verschiedene
 * Antworten auf die Frage, wem ein Bild gehoert.
 */
export const FACET_ORDER: readonly IdentityFacet[] = [
  'deviceId', 'hostAndName', 'sourceName', 'address', 'index',
];

export const FACET_LABEL: Readonly<Record<IdentityFacet, string>> = {
  deviceId: 'Geräte-Kennung',
  hostAndName: 'Rechner + Quellenname',
  sourceName: 'Quellenname',
  address: 'IP-Adresse',
  index: 'Position in der Liste',
};

/**
 * Merkmale, die eine Wiedererkennung TRAGEN.
 *
 * Alles darunter ist ein Indiz und kein Beweis: eine IP wandert bei DHCP, und
 * die Position in der Liste ist ueberhaupt kein Merkmal des Geraets.
 */
export const TRUSTED_FACETS: ReadonlySet<IdentityFacet> =
  new Set<IdentityFacet>(['deviceId', 'hostAndName', 'sourceName']);

/**
 * Wie eine Kamera im Plan heisst, wenn man sie im Netz sucht.
 *
 * ALLE Felder optional: keines davon darf erfunden werden. Eine Kamera ohne
 * jedes Merkmal ist kein Fehler — sie ist nur nicht pruefbar, und genau das
 * sagt der Bericht dann auch.
 */
export interface SourceIdentity {
  /** Seriennummer oder UUID, wie das Geraet sie meldet. */
  deviceId?: string;
  /** Der Rechner, auf dem die Quelle laeuft (NDI: der Teil vor der Klammer). */
  host?: string;
  /** Der Quellenname (NDI: der Teil in der Klammer). */
  sourceName?: string;
  /** IPv4/IPv6 des Senders. */
  address?: string;
}

/** Eine Quelle, wie das laufende System sie meldet. */
export interface DiscoveredSource extends SourceIdentity {
  /** Position in der Liste, wie sie JETZT ist. 0-basiert, wie sie ankommt. */
  index: number;
}

/** Eine Kamera des Plans, so weit dieser Abgleich sie braucht. */
export interface PlannedSource {
  cameraId: string;
  label: string;
  identity?: SourceIdentity;
  /**
   * Die Position, an der die Quelle beim letzten Mal stand.
   *
   * KEINE Identitaet — sie steht hier nur, damit ein Positions-Treffer
   * ueberhaupt benannt werden kann. Wer sie fuer eine Identitaet haelt, baut
   * genau den Fehler aus dem Beleg nach.
   */
  lastIndex?: number;
}

export type ReconcileVerdict =
  /** An einem tragenden Merkmal wiedererkannt. */
  | 'confirmed'
  /**
   * Nur an einem schwachen Merkmal getroffen (IP oder Position). Das ist KEIN
   * gruener Haken: die Position ist genau das, was im Beleg vertauscht wurde.
   */
  | 'weak'
  /** Im Plan, im Netz nicht gefunden. */
  | 'missing'
  /** Die Kamera traegt kein einziges Merkmal — es gibt nichts zu pruefen. */
  | 'no-identity';

export const VERDICT_LABEL: Readonly<Record<ReconcileVerdict, string>> = {
  confirmed: 'wiedererkannt',
  weak: 'nur schwach getroffen — nachsehen',
  missing: 'im Netz nicht gefunden',
  'no-identity': 'nicht prüfbar — keine Kennung hinterlegt',
};

export interface ReconcileRow {
  cameraId: string;
  label: string;
  verdict: ReconcileVerdict;
  /** Woran erkannt wurde, oder `null`. */
  facet: IdentityFacet | null;
  /** Die Quelle, die zugeordnet wurde, oder `null`. */
  matched: DiscoveredSource | null;
  /** Warum dieses Urteil — im Klartext, fuer das Blatt. */
  message: string;
}

export interface Reconciliation {
  rows: ReconcileRow[];
  /** Quellen im Netz, die keine Kamera fuer sich beansprucht. */
  unexpected: DiscoveredSource[];
  /** Wie viele Zeilen NICHT `confirmed` sind — die Zahl fuer die Kachel. */
  needsLook: number;
}

const norm = (s: string | undefined): string => (s ?? '').trim().toLowerCase();

/**
 * Passt diese Quelle an DIESEM Merkmal zur geplanten Kamera?
 *
 * Ein leeres Merkmal passt NIE: zwei Kameras ohne Geraete-Kennung haetten
 * sonst dieselbe, und der Abgleich erklaerte beide fuer wiedererkannt.
 */
function matchesOn(
  facet: IdentityFacet,
  planned: PlannedSource,
  found: DiscoveredSource,
): boolean {
  const id = planned.identity;
  switch (facet) {
    case 'deviceId':
      return !!norm(id?.deviceId) && norm(id?.deviceId) === norm(found.deviceId);
    case 'hostAndName':
      return !!norm(id?.host) && !!norm(id?.sourceName)
        && norm(id?.host) === norm(found.host)
        && norm(id?.sourceName) === norm(found.sourceName);
    case 'sourceName':
      return !!norm(id?.sourceName) && norm(id?.sourceName) === norm(found.sourceName);
    case 'address':
      return !!norm(id?.address) && norm(id?.address) === norm(found.address);
    case 'index':
      return planned.lastIndex !== undefined && planned.lastIndex === found.index;
  }
}

/** Traegt diese Kamera ueberhaupt ein Merkmal, an dem man sie suchen koennte? */
export const hasIdentity = (p: PlannedSource): boolean => {
  const id = p.identity;
  return !!(norm(id?.deviceId) || norm(id?.host) || norm(id?.sourceName) || norm(id?.address));
};

/**
 * Plan gegen das, was im Netz wirklich da ist.
 *
 * DIE ENGSTELLE. Beide Seiten des Berichts — die Zeilen und die
 * unerwarteten Quellen — entstehen hier, aus derselben Zuteilung. Zwei
 * Rechnungen koennten sich widersprechen, und dann stuende oben eine Kamera
 * als „wiedererkannt" und unten ihre Quelle als „unerwartet".
 *
 * Eine gefundene Quelle wird HOECHSTENS EINMAL vergeben. Ohne diese Regel
 * meldeten zwei Kameras denselben Zulauf als ihren, und beide saehen in
 * Ordnung aus — waehrend eine von beiden schwarz bleibt.
 *
 * Die Reihenfolge der Vergabe folgt der Verlaesslichkeit und nicht der
 * Reihenfolge der Kameras: erst werden alle Geraete-Kennungen vergeben, dann
 * alle Rechner+Namen, und so weiter. Sonst schnappte sich die erste Kamera
 * der Liste eine Quelle auf einer schwachen Uebereinstimmung weg, die zu
 * einer spaeteren Kamera eindeutig gepasst haette.
 */
export function reconcile(
  planned: readonly PlannedSource[],
  discovered: readonly DiscoveredSource[],
): Reconciliation {
  const zuteilung = new Map<string, { found: DiscoveredSource; facet: IdentityFacet }>();
  const vergeben = new Set<number>();

  for (const facet of FACET_ORDER) {
    for (const p of planned) {
      if (zuteilung.has(p.cameraId)) continue;
      const treffer = discovered.find((d) => !vergeben.has(d.index) && matchesOn(facet, p, d));
      if (treffer) {
        zuteilung.set(p.cameraId, { found: treffer, facet });
        vergeben.add(treffer.index);
      }
    }
  }

  const rows: ReconcileRow[] = planned.map((p) => {
    const z = zuteilung.get(p.cameraId);
    if (!z) {
      if (!hasIdentity(p)) {
        return {
          cameraId: p.cameraId, label: p.label, verdict: 'no-identity', facet: null, matched: null,
          message: `${p.label}: keine Kennung hinterlegt — es gibt nichts zu prüfen. `
            + 'Geräte-Kennung oder Rechner + Quellenname eintragen, sonst fällt eine '
            + 'Vertauschung erst im Bild auf.',
        };
      }
      return {
        cameraId: p.cameraId, label: p.label, verdict: 'missing', facet: null, matched: null,
        message: `${p.label}: im Netz nicht gefunden. Entweder ist die Quelle aus, `
          + 'oder sie meldet sich unter einem anderen Namen als im Plan.',
      };
    }
    const stark = TRUSTED_FACETS.has(z.facet);
    return {
      cameraId: p.cameraId,
      label: p.label,
      verdict: stark ? 'confirmed' : 'weak',
      facet: z.facet,
      matched: z.found,
      message: stark
        ? `${p.label}: über ${FACET_LABEL[z.facet]} wiedererkannt.`
        : `${p.label}: nur über ${FACET_LABEL[z.facet]} getroffen — das ist keine `
          + 'Identität. Genau diese Zuordnung wurde im Beleg nach einem Neustart '
          + 'vertauscht, ohne dass es jemand sah.',
    };
  });

  return {
    rows,
    unexpected: discovered.filter((d) => !vergeben.has(d.index)),
    needsLook: rows.filter((r) => r.verdict !== 'confirmed').length,
  };
}

/**
 * Was beim Einlesen einer Quellenliste auffiel.
 *
 * BENANNT, nie stillschweigend: eine Zeile, die niemand lesen konnte, ist der
 * Anfang genau des Fehlers, um den es hier geht.
 */
export interface SourceListWarning {
  line: number;
  text: string;
  reason: string;
}

export interface SourceListParse {
  sources: DiscoveredSource[];
  warnings: SourceListWarning[];
}

/** Sieht wie eine IPv4 aus. Kein Anspruch auf Gueltigkeit — nur auf Form. */
const IPV4 = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/;

/**
 * Die Quellenliste, wie sie im Empfaenger steht — eingelesen.
 *
 * WARUM EINGELESEN UND NICHT GESUCHT. Dieser Planer hat kein Netz: er laeuft
 * auf dem Rechner des Planers und nicht auf dem der Regie. Die Liste kommt
 * deshalb aus der Zwischenablage — dieselbe Bauform wie der Rueckweg vom
 * Lichtpult: die Wirklichkeit wird HEREINGEHOLT und danebengelegt, nicht
 * erraten.
 *
 * Erkannt wird die NDI-Schreibweise `RECHNER (Quelle)`, ein vorangestellter
 * Listen-Index und eine angehaengte IP. Was sich nicht lesen laesst, wird
 * GEMELDET und nicht ueberlesen: eine stillschweigend verworfene Zeile ist
 * eine Kamera, die nachher fehlt.
 */
export function parseSourceList(text: string): SourceListParse {
  const sources: DiscoveredSource[] = [];
  const warnings: SourceListWarning[] = [];
  const zeilen = text.split(/\r?\n/);

  zeilen.forEach((roh, i) => {
    const zeile = roh.trim();
    if (!zeile) return;
    // Ein vorangestellter Listen-Index wird ABGESCHNITTEN und NICHT als
    // Position uebernommen: die Nummer im Text ist die Nummer von damals, und
    // die Position ist ohnehin keine Identitaet.
    const ohneIndex = zeile.replace(/^\s*\d+\s*[.):|\t-]\s*/, '');
    const ip = IPV4.exec(ohneIndex)?.[1];
    const ohneIp = ip ? ohneIndex.replace(ip, '').trim() : ohneIndex;
    const klammer = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(ohneIp);

    const host = klammer ? klammer[1].trim() : '';
    const name = klammer ? klammer[2].trim() : ohneIp.trim();

    if (!host && !name && !ip) {
      warnings.push({
        line: i + 1,
        text: zeile,
        reason: 'Keine Quelle zu erkennen — weder „Rechner (Name)" noch ein Name noch eine IP.',
      });
      return;
    }
    sources.push({
      index: sources.length,
      ...(host ? { host } : {}),
      ...(name ? { sourceName: name } : {}),
      ...(ip ? { address: ip } : {}),
    });
  });

  return { sources, warnings };
}

export const RECONCILE_HEADERS = ['Kamera', 'Urteil', 'Erkannt an', 'Quelle im Netz'] as const;

/** Was in der Spalte steht, wo keine Quelle zugeordnet ist. */
export const NO_SOURCE = '—';

/**
 * Wie eine gefundene Quelle auf dem Blatt heisst.
 *
 * NDI-Schreibweise `RECHNER (Quelle)`, weil genau so die Liste im Empfaenger
 * aussieht — wer das Blatt neben den Bildschirm legt, soll dieselbe
 * Zeichenkette sehen und nicht eine huebschere.
 */
export function sourceLabel(d: DiscoveredSource): string {
  const host = (d.host ?? '').trim();
  const name = (d.sourceName ?? '').trim();
  if (host && name) return `${host} (${name})`;
  if (name) return name;
  if (host) return host;
  if ((d.address ?? '').trim()) return d.address!.trim();
  // Ohne jedes Merkmal bleibt die Position — und sie wird als das benannt,
  // was sie ist, statt als Name aufzutreten.
  return `Position ${d.index}`;
}

export function reconcileTable(
  r: Reconciliation,
): { header: string[]; rows: (string | number)[][] } {
  return {
    header: [...RECONCILE_HEADERS],
    rows: r.rows.map((row) => [
      row.label,
      VERDICT_LABEL[row.verdict],
      row.facet ? FACET_LABEL[row.facet] : NO_SOURCE,
      row.matched ? sourceLabel(row.matched) : NO_SOURCE,
    ]),
  };
}
