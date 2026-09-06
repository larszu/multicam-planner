// ───────────────────────────────────────────────────────────────────────────
// Was ausser Optik und Position noch auf die Kamerakarte gehoert
// (Bedarfe 59, 60, 61).
//
// Die drei haengen an EINEM Artefakt, und die Bedarfs-Datenbank sagt das
// selbst: „surfaced in the camera card" (59), „print it on the camera card"
// (60). Die Karte gibt es seit ADR-004 Inkrement 4 samt Stempel — was fehlte,
// sind die Angaben, die der Operator vor Ort braucht und heute muendlich
// bekommt.
//
// ─── BEDARF 59: RIGGING ────────────────────────────────────────────────────
//
//   > Riser/platform, height, load rating, ladder access and power are agreed
//   > verbally or in a separate staging order; THE CAMERA OP FINDS OUT ON SITE.
//
// ─── BEDARF 60: COMMS ──────────────────────────────────────────────────────
//
//   > Channel assignment is verbal; operators get lost on the wrong channel,
//   > hit dead zones at far positions, and CANNOT LEAVE A TRIPOD TO CHANGE A
//   > BELTPACK BATTERY.
//
// ─── BEDARF 61: KIT ────────────────────────────────────────────────────────
//
//   > The equipment list is assembled in a spreadsheet, retyped or pasted into
//   > the rental request, then amended by email.
//
// ─── DIE EINE REGEL, DIE HIER ALLES ENTSCHEIDET ────────────────────────────
//
// NICHTS WIRD GERATEN, UND NICHTS BEKOMMT EINEN VORGABEWERT. Eine Traglast,
// die die Anwendung sich ausgedacht hat, steht auf einem Blatt, nach dem sich
// jemand auf ein Podest stellt. Ein vorgegebener Comms-Kanal steht auf einem
// Blatt, nach dem jemand am Showtag auf den falschen schaltet. „Nicht
// angegeben" ist die einzige ehrliche Antwort, solange niemand nachgesehen
// hat — und die Karte sagt sie laut, statt die Zeile wegzulassen.
//
// Eine weggelassene Zeile liest sich naemlich als „gibt es nicht zu sagen".
// Genau daran scheitert der Zettel heute.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────

import type { RiggingAccess, VenueCamera } from '../types';
import type { StampCell } from './documentStamp';

export const ACCESS_LABEL: Readonly<Record<RiggingAccess, string>> = {
  ladder: 'Leiter',
  stairs: 'Treppe',
  ramp: 'Rampe',
  level: 'ebenerdig',
  unstated: 'nicht angegeben',
};

/** Was in einer Zelle steht, fuer die niemand etwas eingetragen hat. */
export const UNSTATED = 'nicht angegeben';

const text = (v: string | undefined): string => (v ?? '').trim() || UNSTATED;
const num = (v: number | undefined, einheit: string): string =>
  typeof v === 'number' && Number.isFinite(v) ? `${v} ${einheit}` : UNSTATED;

export type CardFindingKind =
  | 'rigging-unstated'
  | 'load-unstated'
  | 'access-unstated'
  | 'power-unstated'
  | 'channel-unstated'
  | 'beltpack-duplicate'
  | 'battery-unplanned'
  | 'camera-below-riser';

export const CARD_FINDING_LABEL: Readonly<Record<CardFindingKind, string>> = {
  'rigging-unstated': 'Keine Rigging-Angaben — der Operator erfährt es vor Ort',
  'load-unstated': 'Podest ohne Traglast',
  'access-unstated': 'Kein Zugang angegeben',
  'power-unstated': 'Keine Stromversorgung angegeben',
  'channel-unstated': 'Kein Comms-Kanal angegeben',
  'beltpack-duplicate': 'Zwei Positionen fordern dasselbe Beltpack',
  'battery-unplanned': 'Kein Akku-Plan an einer erhöhten Position',
  'camera-below-riser': 'Kamera steht tiefer als ihr eigenes Podest',
};

export interface CardFinding {
  kind: CardFindingKind;
  text: string;
  /** Die betroffene Position. */
  cameraId: string;
}

/** Die Rigging-Zeilen der Karte. Jede Zeile steht IMMER da — auch leer. */
export const riggingLines = (cam: VenueCamera): string[] => {
  const r = cam.rigging;
  return [
    `Podest:      ${text(r?.riser)}`,
    `Höhe:        ${num(r?.riserHeightM, 'm')}`,
    `Traglast:    ${num(r?.loadLimitKg, 'kg')}`,
    `Zugang:      ${ACCESS_LABEL[r?.access ?? 'unstated']}`,
    `Strom:       ${text(r?.powerDrop)}`,
  ];
};

/** Die Comms-Zeilen der Karte. */
export const commsLines = (cam: VenueCamera): string[] => {
  const c = cam.comms;
  return [
    `Kanal:       ${text(c?.channel)}`,
    `Beltpack:    ${text(c?.beltpackId)}`,
    `Antennenzone: ${text(c?.antennaZone)}`,
    `Akku-Plan:   ${text(c?.batteryPlan)}`,
  ];
};

/** Die Kit-Zeilen. Leer heisst leer — hier wird nichts erfunden. */
export const kitLines = (cam: VenueCamera): string[] =>
  (cam.kit ?? []).map((k) => k.trim()).filter(Boolean);

/**
 * Die Angaben als Stempel-Zeilen.
 *
 * `documentContent.ts` schreibt die Regel vor: „was auf dem Blatt zu SEHEN
 * ist, muss eingehen". Ein geaenderter Comms-Kanal ist ein anderes Blatt, auch
 * wenn Kamera und Optik gleich blieben — und genau dieser Fall ist der, bei
 * dem jemand mit dem alten Zettel auf den falschen Kanal schaltet.
 */
export const cardExtraRows = (cam: VenueCamera): StampCell[][] => [
  ['rig', ...riggingLines(cam)],
  ['comms', ...commsLines(cam)],
  ...kitLines(cam).map((k) => ['kit', k] as StampCell[]),
];

/**
 * Was an dieser Position fehlt — und was mit einer anderen kollidiert.
 *
 * `alle` wird gebraucht, weil eine der Fragen nur im Vergleich beantwortbar
 * ist: zwei Positionen, die dasselbe Beltpack fordern, sind einzeln beide
 * vollstaendig ausgefuellt.
 */
export function cardFindings(cam: VenueCamera, alle: readonly VenueCamera[]): CardFinding[] {
  const out: CardFinding[] = [];
  const r = cam.rigging;
  const c = cam.comms;
  const erhoeht = typeof r?.riserHeightM === 'number' && r.riserHeightM > 0;

  if (!r || (!r.riser && r.riserHeightM === undefined && r.loadLimitKg === undefined && !r.powerDrop)) {
    out.push({
      kind: 'rigging-unstated',
      cameraId: cam.id,
      text: `Für „${cam.label}" steht keine einzige Rigging-Angabe. Podest, Höhe, Traglast, Zugang und Strom werden dann mündlich vereinbart, und der Operator erfährt sie vor Ort.`,
    });
  } else {
    if (r.riser && r.loadLimitKg === undefined) {
      out.push({
        kind: 'load-unstated',
        cameraId: cam.id,
        text: `„${cam.label}" steht auf „${r.riser}", aber ohne Traglast. Podeste sind Standard-Mietware mit veröffentlichtem Wert — geraten wird hier keiner: die Zahl steht auf einem Blatt, nach dem sich jemand darauf stellt.`,
      });
    }
    if (!r.access || r.access === 'unstated') {
      out.push({
        kind: 'access-unstated',
        cameraId: cam.id,
        text: `Wie der Operator an „${cam.label}" kommt, steht nicht im Plan. „Ebenerdig" wird nicht angenommen — an einer Position mit Leiter ist das die teuerste Annahme des Tages.`,
      });
    }
    if (!r.powerDrop) {
      out.push({
        kind: 'power-unstated',
        cameraId: cam.id,
        text: `Für „${cam.label}" ist keine Stromversorgung benannt.`,
      });
    }
  }

  if (erhoeht && typeof cam.z === 'number' && cam.z < (r?.riserHeightM ?? 0)) {
    out.push({
      kind: 'camera-below-riser',
      cameraId: cam.id,
      text: `„${cam.label}" steht auf ${cam.z} m, das Podest ist aber ${r?.riserHeightM} m hoch. Eine der beiden Zahlen stimmt nicht.`,
    });
  }

  if (!c?.channel?.trim()) {
    out.push({
      kind: 'channel-unstated',
      cameraId: cam.id,
      text: `Für „${cam.label}" ist kein Comms-Kanal angegeben. Die Zuweisung geschieht dann mündlich, und Menü-Tauchen am Beltpack landet im Zweifel auf dem falschen Kanal.`,
    });
  }

  const meins = c?.beltpackId?.trim();
  if (meins) {
    const andere = alle.filter(
      (x) => x.id !== cam.id && (x.comms?.beltpackId ?? '').trim() === meins,
    );
    if (andere.length > 0) {
      out.push({
        kind: 'beltpack-duplicate',
        cameraId: cam.id,
        text: `Beltpack „${meins}" ist auch an ${andere.map((x) => `„${x.label}"`).join(', ')} vergeben. Eines der beiden steht am Showtag ohne.`,
      });
    }
  }

  // Nur an ERHOEHTEN Positionen: der Beleg nennt genau den Fall, dass der
  // Operator das Stativ nicht verlassen kann. Ebenerdig neben dem Gang ist der
  // Akkuwechsel kein Planungsthema, und ein Befund dort waere Rauschen.
  if (erhoeht && !c?.batteryPlan?.trim()) {
    out.push({
      kind: 'battery-unplanned',
      cameraId: cam.id,
      text: `„${cam.label}" steht erhöht, aber es gibt keinen Akku-Plan fürs Beltpack. Wer dort oben steht, kann während der Show nicht weg.`,
    });
  }

  return out;
}

/** Normalisiert die drei Bloecke beim Laden. */
export function normaliseCardExtras(raw: unknown): Pick<VenueCamera, 'rigging' | 'comms' | 'kit'> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() ? v.trim() : undefined;
  const pos = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined;

  const rawRig = (o.rigging ?? {}) as Record<string, unknown>;
  const access =
    typeof rawRig.access === 'string' && rawRig.access in ACCESS_LABEL
      ? (rawRig.access as RiggingAccess)
      : undefined;
  const rigging = {
    ...(str(rawRig.riser) ? { riser: str(rawRig.riser) } : {}),
    ...(pos(rawRig.riserHeightM) !== undefined ? { riserHeightM: pos(rawRig.riserHeightM) } : {}),
    ...(pos(rawRig.loadLimitKg) !== undefined ? { loadLimitKg: pos(rawRig.loadLimitKg) } : {}),
    ...(access && access !== 'unstated' ? { access } : {}),
    ...(str(rawRig.powerDrop) ? { powerDrop: str(rawRig.powerDrop) } : {}),
    ...(str(rawRig.notes) ? { notes: str(rawRig.notes) } : {}),
  };

  const rawComms = (o.comms ?? {}) as Record<string, unknown>;
  const comms = {
    ...(str(rawComms.channel) ? { channel: str(rawComms.channel) } : {}),
    ...(str(rawComms.beltpackId) ? { beltpackId: str(rawComms.beltpackId) } : {}),
    ...(str(rawComms.antennaZone) ? { antennaZone: str(rawComms.antennaZone) } : {}),
    ...(str(rawComms.batteryPlan) ? { batteryPlan: str(rawComms.batteryPlan) } : {}),
  };

  const kit = (Array.isArray(o.kit) ? o.kit : [])
    .map((k) => str(k))
    .filter((k): k is string => !!k);

  // Leere Bloecke werden ganz weggelassen: ein `rigging: {}` an jeder Kamera
  // waere Ballast in jeder Projektdatei, und `cardFindings` liest ein fehlendes
  // Objekt ohnehin als „nichts angegeben".
  return {
    ...(Object.keys(rigging).length > 0 ? { rigging } : {}),
    ...(Object.keys(comms).length > 0 ? { comms } : {}),
    ...(kit.length > 0 ? { kit } : {}),
  };
}
