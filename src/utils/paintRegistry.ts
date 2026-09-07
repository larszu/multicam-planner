// ───────────────────────────────────────────────────────────────────────────
// Bedarf 47 (P2) — der Bildzustand bekommt eine Identitaet, und die Absicht
// „die muessen gleich aussehen" wird nachpruefbar.
//
// ─── DER BEFUND ────────────────────────────────────────────────────────────
//
//   > Device-side storage is FIVE UNNAMED SLOTS on an SD card in an Arduino
//   > box; on vendor CCUs the scene file has NO SHOW/VENUE/LIGHTING-STATE
//   > IDENTITY. Which scene file belongs to which position on which show is
//   > institutional memory.
//
// Und die Bitte dazu, woertlich in
// `bitfocus/companion-module-requests#1792` (25. Feb 2025):
//
//   > Store and recall camera shading presets for consistency across
//   > different productions […] SYNCHRONIZE SETTINGS ACROSS MULTIPLE CAMERAS
//   > for uniform color grading.
//
// ─── WAS BEDARF 63 SCHON GELOEST HAT UND WAS NICHT ─────────────────────────
//
// „Welche Datei gehoert zu welcher Position auf welcher Show" ist seit
// Bedarf 63 beantwortet: der Bildzustand haengt an der Position, und die
// Projektdatei IST die Show. Offen blieben drei Dinge, und jedes davon steht
// woertlich im Beleg:
//
//  1. FUENF UNBENANNTE PLAETZE. Ein Zustand ohne Dateinamen ist nicht
//     zwangslaeufig verloren — er liegt auf Platz 3. Ohne Platz UND ohne
//     Datei ist er es sehr wohl. `slot` haelt das fest.
//  2. WELCHER BODY. `savedWith.cameraId` ist das MODELL. Zwei FX9 in einer
//     Show: die Datei laedt auf beiden und stimmt auf einem. `bodySerial`
//     haelt fest, auf welchem.
//  3. „SYNCHRONIZE ACROSS MULTIPLE CAMERAS". Dieser Planer synchronisiert
//     nichts — er kann aber die ABSICHT festhalten (`matchGroup`) und sie
//     gegen das halten, was ueberhaupt geht.
//
// ─── DER TEIL, DER WIRKLICH RECHNET ────────────────────────────────────────
//
// Eine Abgleich-Gruppe ist nur ueber das abgleichbar, was JEDES ihrer
// Mitglieder fernsteuern kann. Das weiss `shadingCapability.fleetMatch`
// bereits (Bedarf 48) — hier wird es je Gruppe angewandt statt ueber die
// ganze Show. Eine Gruppe aus einer Blackmagic und einer Panasonic-PTZ ist
// als Absicht vollstaendig eingetragen und trotzdem nicht ausfuehrbar: ueber
// beide Wege gemeinsam geht die Blende, sonst nichts.
//
// Das ist der Unterschied zwischen einer Notiz und einem Plan.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────
import type { VenueCamera } from '../types';
import { PAINT_UNSTATED } from './paintState';
import {
  PAINT_FUNCTION_LABEL,
  fleetMatch,
  shadingVerdict,
  type PaintFunction,
} from './shadingCapability';

/** Was in einer Zelle steht, fuer die niemand etwas eingetragen hat. */
export const REGISTRY_UNSTATED = PAINT_UNSTATED;

export type RegistryFindingKind =
  /** Weder Dateiname noch Platz: der Zustand ist nicht wiederfindbar. */
  | 'unfindable'
  /** Zwei gleiche Bodies in der Show, und die Datei nennt keine Nummer. */
  | 'serial-unstated'
  /** Eine Gruppe mit genau einem Mitglied — die Absicht laeuft ins Leere. */
  | 'group-alone'
  /** Diese Position kann nicht, was ihre eigene Abgleich-Gruppe braucht. */
  | 'group-not-matchable';

export const REGISTRY_FINDING_LABEL: Readonly<Record<RegistryFindingKind, string>> = {
  unfindable: 'Bildzustand ohne Dateiname und ohne Platz',
  'serial-unstated': 'Szenendatei ohne Body-Nummer bei gleichen Modellen',
  'group-alone': 'Abgleich-Gruppe mit nur einer Position',
  'group-not-matchable': 'Fällt aus dem Abgleich der eigenen Gruppe',
};

export interface RegistryFinding {
  kind: RegistryFindingKind;
  cameraId: string;
  /** Klartext-Satz. Kanonisches Deutsch — er landet auch auf Blaettern. */
  text: string;
}

/** Eine Abgleich-Gruppe samt dem, was sich in ihr ueberhaupt abgleichen laesst. */
export interface MatchGroup {
  name: string;
  /** Die Positionen, nach Beschriftung sortiert. */
  members: VenueCamera[];
  /** Was JEDES Mitglied fernsteuern kann — der Satz, auf dem abgeglichen wird. */
  shared: PaintFunction[];
  /** Was mindestens eines kann und mindestens eines nicht. */
  split: PaintFunction[];
  /** Mitglieder ohne geplanten Fernsteuerweg. Nicht „kann nichts", sondern offen. */
  unstated: string[];
}

const name = (cam: VenueCamera): string => (cam.matchGroup ?? '').trim();

/**
 * Die Abgleich-Gruppen dieser Show.
 *
 * Der Schnitt kommt aus `fleetMatch` und wird hier NICHT nachgerechnet: eine
 * zweite Vorstellung davon, was „gemeinsam steuerbar" heisst, liefe
 * unweigerlich auseinander — und dann sagte die Gruppe etwas anderes als die
 * Flotte darueber.
 */
export const matchGroups = (cameras: readonly VenueCamera[]): MatchGroup[] => {
  const nach = new Map<string, VenueCamera[]>();
  for (const c of cameras) {
    const g = name(c);
    if (!g) continue;
    const liste = nach.get(g);
    if (liste) liste.push(c);
    else nach.set(g, [c]);
  }
  return [...nach.entries()]
    .map(([n, members]) => {
      const sortiert = [...members].sort(
        (a, b) => a.label.localeCompare(b.label, 'de') || a.id.localeCompare(b.id),
      );
      const m = fleetMatch(sortiert);
      return { name: n, members: sortiert, shared: m.shared, split: m.split, unstated: m.unstated };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
};

/** Die Gruppe einer Position — oder `null`. */
export const groupOf = (cam: VenueCamera, alle: readonly VenueCamera[]): MatchGroup | null =>
  matchGroups(alle).find((g) => g.name === name(cam)) ?? null;

/**
 * Die Zeilen der Kamerakarte fuer die Identitaet des Zustands.
 *
 * Nur MIT Bildzustand: eine Position, fuer die niemand einen vorgesehen hat,
 * bekommt keine Frage nach seinem Platz gestellt. Dieselbe Regel wie
 * `paintLines`, aus dem diese Zeilen herausgehalten sind, weil sie eine
 * andere Frage beantworten: nicht „wie war er", sondern „wo ist er".
 */
export const registryLines = (cam: VenueCamera): string[] => {
  const p = cam.paint;
  if (!p) return [];
  const text = (v: string | undefined): string => (v ?? '').trim() || REGISTRY_UNSTATED;
  return [`Platz:       ${text(p.slot)}`, `Body-Nr.:    ${text(p.bodySerial)}`];
};

/**
 * Was an dieser Position der Wiederauffindbarkeit im Weg steht — und wo die
 * Abgleich-Absicht nicht aufgeht.
 *
 * `alle` wird gebraucht, weil zwei der vier Fragen nur im Vergleich
 * beantwortbar sind: ob dasselbe Modell mehrfach steht, und was die eigene
 * Gruppe gemeinsam kann.
 */
export function registryFindings(
  cam: VenueCamera,
  alle: readonly VenueCamera[],
): RegistryFinding[] {
  const out: RegistryFinding[] = [];
  const wo = `„${cam.label}"`;
  const p = cam.paint;

  if (p) {
    const datei = (p.sceneFile ?? '').trim();
    const platz = (p.slot ?? '').trim();
    if (!datei && !platz) {
      // Bedarf 63 meldet bereits „Angaben ohne Dateiname". Diese Meldung ist
      // die haertere: ohne Datei UND ohne Platz gibt es keinen Weg zurueck zu
      // dem Zustand, auch nicht am Geraet.
      out.push({
        kind: 'unfindable',
        cameraId: cam.id,
        text: `Der Bildzustand von ${wo} hat weder einen Dateinamen noch einen Platz am Gerät. Am zweiten Showtag gibt es keinen Weg zurück zu ihm — auch nicht am Body.`,
      });
    }

    // Nur wenn das Modell mehrfach steht: bei einem einzigen Body ist die
    // Nummer die Antwort auf eine Frage, die niemand hat.
    const gleiche = alle.filter((x) => x.id !== cam.id && x.cameraId === cam.cameraId);
    if ((datei || platz) && !(p.bodySerial ?? '').trim() && gleiche.length > 0) {
      out.push({
        kind: 'serial-unstated',
        cameraId: cam.id,
        text: `Dasselbe Modell steht auch an ${gleiche
          .map((x) => `„${x.label}"`)
          .join(', ')}, und der Bildzustand von ${wo} nennt keine Body-Nummer. Die Datei lädt auf beiden und stimmt auf einem.`,
      });
    }
  }

  const g = groupOf(cam, alle);
  if (g) {
    if (g.members.length < 2) {
      out.push({
        kind: 'group-alone',
        cameraId: cam.id,
        text: `${wo} ist die einzige Position in der Abgleich-Gruppe „${g.name}". Entweder fehlt die Partnerposition, oder der Name ist verschrieben.`,
      });
    } else {
      // Gemeldet wird an der Position, die HERAUSFAELLT — nicht an jeder.
      // Derselbe Satz an allen Mitgliedern waere nach dem zweiten Mal Tapete,
      // und die Gruppe hat ja gerade den Sinn, den einen Ausreisser zu finden.
      const eigene = g.split.filter((fn) => shadingVerdict(cam, fn) !== 'im-bus');
      if (eigene.length > 0) {
        const namen = eigene.map((f) => PAINT_FUNCTION_LABEL[f]).join(', ');
        out.push({
          kind: 'group-not-matchable',
          cameraId: cam.id,
          text: `${wo} soll mit „${g.name}" gleich aussehen, kann aber nicht, was die anderen der Gruppe können: ${namen}. Abgeglichen wird die Gruppe nur über das, was alle können.`,
        });
      }
    }
  }

  return out;
}

/** Normalisiert die Gruppe beim Laden. */
export function normaliseMatchGroup(raw: unknown): Pick<VenueCamera, 'matchGroup'> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const v = o.matchGroup;
  return typeof v === 'string' && v.trim() ? { matchGroup: v.trim() } : {};
}
