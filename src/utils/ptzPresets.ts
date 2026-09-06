// ───────────────────────────────────────────────────────────────────────────
// Bedarf 14 (P1) — PTZ-Presets als Projekt-Dokumentation statt als
// undokumentierter Geraetespeicher.
//
// DER BEFUND, woertlich:
//
//   > Presets are undocumented device memory; someone nudges or refocuses a
//   > camera and forgets to overwrite, and the recalled shot is wrong live
//   > with no operator to save it.
//
//   > A common cause of preset trouble is adjusting the camera's position or
//   > focus after saving it and then forgetting to overwrite that preset.
//     (churchstreampro.com/ptzoptics-presets-not-recalling-correctly)
//
// Ein Preset haelt Pan/Tilt/Zoom/Fokus ZUM ZEITPUNKT DES SPEICHERNS fest
// (ptzoptics.com/ptz-preset). Daraus folgt, was diese Datei kann und was
// nicht.
//
// ─── WAS HIER BEWUSST NICHT GEPRUEFT WIRD ──────────────────────────────────
//
// Dass ein Preset ANDERE Werte hat als die Kamera gerade — das ist der
// Normalfall und keine Abweichung. Ein Preset IST ein anderer Shot als der
// aktuelle; eine Warnung darueber staende auf jedem korrekten Aufbau und
// waere nach dem zweiten Mal Rauschen.
//
// Geprueft wird nur, was das Preset UNBRAUCHBAR macht: eine Nummer, die es
// zweimal gibt (das Geraet haelt nur eine), ein Shot ohne Namen (dann ist es
// wieder blosse Nummer), eine Brennweite, die das Objektiv nicht hergibt
// (nicht abrufbar) — und der Fall aus dem Befund: die Kamera wurde seit dem
// Speichern VERSETZT, womit derselbe Winkel woanders hinzeigt.
//
// KEIN GERAETE-ABGLEICH. Der Bedarf nennt „read-back/diff against the device
// where the protocol allows" — dieses Repo spricht kein VISCA und keine
// Kamera-HTTP-API. Einen Abgleich zu behaupten, der in Wahrheit den Plan mit
// sich selbst vergleicht, waere schlimmer als keiner.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────
import type { Lens, PtzPreset, VenueCamera } from '../types';

/**
 * Ab wann gilt eine Kamera als versetzt (Meter).
 *
 * 5 cm. Darunter liegt die Genauigkeit, mit der ueberhaupt jemand eine Kamera
 * in einen Plan setzt — eine kleinere Schwelle meldete das Ruckeln der Maus
 * als Befund. Das ist eine Aussage ueber den PLAN und keine ueber das Geraet:
 * wie weit eine echte PTZ verrutschen darf, bevor der Shot kippt, haengt an
 * Brennweite und Entfernung und steht in dieser Recherche nicht.
 */
export const PRESET_MOVE_TOLERANCE_M = 0.05;

export type PresetFindingKind =
  /** Zwei Presets mit derselben Nummer — das Geraet haelt nur eines. */
  | 'duplicate-number'
  /** Preset ohne Namen: wieder blosse Nummer, also genau der Befund. */
  | 'unnamed'
  /** Brennweite ausserhalb des Objektivbereichs — nicht abrufbar. */
  | 'focal-out-of-lens-range'
  /** Die Kamera wurde seit dem Speichern versetzt. */
  | 'camera-moved-since-save'
  /** Presets auf einer Kamera, die keine PTZ ist. */
  | 'not-a-ptz';

export interface PresetFinding {
  kind: PresetFindingKind;
  /** Preset-Nummer, auf die sich der Befund bezieht. Fehlt bei `not-a-ptz`. */
  number?: number;
  /** Zahlen zum Befund, in Klartext. */
  values?: string[];
}

const abstand = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/**
 * Die Presets einer Kamera pruefen.
 *
 * `lens` darf fehlen (unbekanntes Objektiv) — dann entfaellt die
 * Brennweiten-Pruefung, statt einen Bereich zu erfinden.
 */
export const checkPresets = (
  cam: VenueCamera,
  opts: { lens?: Lens; isPtz: boolean } = { isPtz: true },
): PresetFinding[] => {
  const presets = cam.presets ?? [];
  if (presets.length === 0) return [];

  const out: PresetFinding[] = [];

  if (!opts.isPtz) {
    // Presets auf einer Handkamera sind eine Aussage ueber ein Geraet, das
    // sie nicht speichern kann. Ein Befund, keine Warnung nebenbei.
    out.push({ kind: 'not-a-ptz' });
  }

  const gesehen = new Map<number, number>();
  for (const p of presets) gesehen.set(p.number, (gesehen.get(p.number) ?? 0) + 1);
  for (const [nummer, anzahl] of [...gesehen.entries()].sort((a, b) => a[0] - b[0])) {
    if (anzahl > 1) out.push({ kind: 'duplicate-number', number: nummer, values: [String(anzahl)] });
  }

  for (const p of [...presets].sort((a, b) => a.number - b.number)) {
    if (!p.name.trim()) out.push({ kind: 'unnamed', number: p.number });

    if (opts.lens) {
      const { focalLengthMin: min, focalLengthMax: max } = opts.lens;
      if (p.focalLength < min || p.focalLength > max) {
        out.push({
          kind: 'focal-out-of-lens-range',
          number: p.number,
          values: [String(p.focalLength), String(min), String(max)],
        });
      }
    }

    const weg = abstand(p.savedAtPosition, { x: cam.x, y: cam.y, z: cam.z });
    if (weg > PRESET_MOVE_TOLERANCE_M) {
      out.push({ kind: 'camera-moved-since-save', number: p.number, values: [weg.toFixed(2)] });
    }
  }

  return out;
};

/** Ein Preset aus der aktuellen Stellung der Kamera. Der Zeitstempel kommt
 *  herein — sonst liesse sich dieselbe Ableitung nicht zweimal gleich bauen. */
export const presetFromCamera = (
  cam: VenueCamera,
  number: number,
  name: string,
  at: string,
  segment?: string,
): PtzPreset => ({
  number,
  name,
  ...(segment ? { segment } : {}),
  pan: cam.pan,
  tilt: cam.tilt,
  focalLength: cam.focalLength,
  focusDistance: cam.focusDistance,
  savedAt: at,
  savedAtPosition: { x: cam.x, y: cam.y, z: cam.z },
});

/** Die naechste freie Nummer — die kleinste ab 1, die noch niemand hat.
 *  Nicht `max + 1`: eine geloeschte 2 bliebe sonst fuer immer frei, und die
 *  Nummern am Pult sind eine knappe, getippte Ressource. */
export const nextPresetNumber = (presets: PtzPreset[]): number => {
  const belegt = new Set(presets.map((p) => p.number));
  let n = 1;
  while (belegt.has(n)) n++;
  return n;
};

/** Zeile der Preset-Tabelle, wie sie auf der Kamerakarte steht.
 *  Kanonisches Deutsch — die Karte ist ein Blatt, kein Bildschirm. */
export interface PresetRow {
  nummer: string;
  shot: string;
  segment: string;
  optik: string;
  stand: string;
}

/**
 * Die Tabelle fuer die Karte: Nummer -> benannter Shot -> Segment.
 *
 * Genau die drei Spalten, die der Bedarf nennt, plus die Optik (weil ein
 * Shot ohne Brennweite nicht nachstellbar ist) und den Stand (weil das
 * Speicherdatum die Frage „ist das noch aktuell?" ueberhaupt erst
 * beantwortbar macht). Sortiert nach Nummer — so wird sie am Pult gelesen.
 */
export const presetRows = (cam: VenueCamera): PresetRow[] =>
  [...(cam.presets ?? [])]
    .sort((a, b) => a.number - b.number)
    .map((p) => ({
      nummer: String(p.number),
      shot: p.name.trim() || '(ohne Namen)',
      segment: p.segment ?? '',
      optik: `${p.focalLength} mm · ${p.focusDistance} m · Pan ${p.pan}° · Tilt ${p.tilt}°`,
      stand: p.savedAt.slice(0, 10),
    }));
