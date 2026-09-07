// ───────────────────────────────────────────────────────────────────────────
// Bedarf 63 (P2) — der Bildzustand gehoert zur Position und zur Show,
// nicht auf eine Karte.
//
// ─── DER BEFUND ────────────────────────────────────────────────────────────
//
//   > Shading is done live by the vision engineer with the operator; THE
//   > RESULTING SCENE FILE LIVES ON A CARD OR IN DEVICE MEMORY WITH NO RECORD
//   > OF WHICH POSITION OR SHOW IT BELONGS TO.
//
// Die Bedarfs-Datenbank nennt die Massnahme woertlich:
//
//   > Add a scene-file/paint-notes field per camera position (filename, date,
//   > who set it, reference conditions) so THE SECOND SHOW DAY STARTS FROM
//   > THE FIRST ONE'S RESULT rather than from memory.
//
// „Zur Show gehoerig" ist hier keine eigene Zuordnung: die Projektdatei IST
// die Show. Was fehlt, ist die Bindung an die POSITION — und die Angabe,
// unter welchen Voraussetzungen der Zustand entstanden ist.
//
// ─── WAS EINE SZENENDATEI UNBRAUCHBAR MACHT ────────────────────────────────
//
// Dieselbe Trennung wie bei den PTZ-Presets (Bedarf 14): geprueft wird nicht,
// ob der Zustand vom AKTUELLEN abweicht — das ist der Normalfall und waere
// nach dem zweiten Mal Rauschen. Geprueft wird, was ihn UNBRAUCHBAR macht:
//
//   • Ein anderer BODY. Eine Szenendatei ist Herstellerformat und laedt auf
//     einem fremden Modell gar nicht. Das ist der harte Fall.
//   • Ein anderer SENSOR-MODUS. Dieselbe Datei auf einem anderen Ausschnitt
//     ergibt ein anderes Bild — sie laedt, aber sie stimmt nicht mehr.
//   • Ein anderes OBJEKTIV. Sie laedt und wirkt, aber Farbe und Vignette
//     eines anderen Glases sind nicht mit abgeglichen. Der weichste der drei
//     Faelle, und deshalb als eigener benannt statt mit dem Body vermengt.
//
// Und der Fall, den der Beleg zuerst nennt: eine Datei, die zwar EINEN Namen
// hat, aber weder Datum noch Urheber noch Referenzbedingungen. Am zweiten
// Showtag steht dann ein Dateiname da und niemand weiss, wofuer er gilt —
// genau der Zustand, den der Bedarf abschaffen will. Deshalb sind das
// Befunde und keine leeren Felder.
//
// ─── KEIN GERAETE-ABGLEICH ─────────────────────────────────────────────────
//
// Dieses Repo liest keine Kamera aus. Ein „Abgleich", der in Wahrheit den
// Plan mit sich selbst vergleicht, waere schlimmer als keiner — dieselbe
// Regel, die schon `ptzPresets.ts` fuer sich aufgeschrieben hat.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────
import type { PaintState, VenueCamera } from '../types';

/**
 * Was in einer Zelle steht, fuer die niemand etwas eingetragen hat.
 *
 * Hier und nicht in `cameraCardExtras`, obwohl der Begriff dort aelter ist:
 * jene Datei liest diese (fuer die Stempel-Zeilen), also muss die Konstante
 * hier stehen, damit es keinen Import-Kreis gibt. `cameraCardExtras`
 * re-exportiert sie unter ihrem eingefuehrten Namen — EIN Wert, zwei Namen,
 * statt zweier Werte, die auseinanderlaufen koennen.
 */
export const PAINT_UNSTATED = 'nicht angegeben';

export type PaintFindingKind =
  /** Die Datei wurde fuer einen anderen Body gespeichert — sie laedt nicht. */
  | 'body-changed'
  /** Anderer Sensor-Modus: sie laedt, ergibt aber ein anderes Bild. */
  | 'sensor-mode-changed'
  /** Anderes Objektiv: Farbe und Vignette sind nicht mit abgeglichen. */
  | 'lens-changed'
  /** Dateiname ohne Datum — „gilt das noch?" ist nicht beantwortbar. */
  | 'date-unstated'
  /** Dateiname ohne Urheber — niemand ist fragbar. */
  | 'author-unstated'
  /** Dateiname ohne Referenzbedingungen — der Zustand ist nicht nachstellbar. */
  | 'reference-unstated'
  /** Angaben zum Bildzustand, aber gar kein Dateiname. */
  | 'file-unstated'
  /** Dieselbe Datei an zwei Positionen mit VERSCHIEDENEN Bodies. */
  | 'file-across-bodies'

export const PAINT_FINDING_LABEL: Readonly<Record<PaintFindingKind, string>> = {
  'body-changed': 'Szenendatei für einen anderen Body gespeichert',
  'sensor-mode-changed': 'Szenendatei für einen anderen Sensor-Modus gespeichert',
  'lens-changed': 'Szenendatei für ein anderes Objektiv gespeichert',
  'date-unstated': 'Szenendatei ohne Datum',
  'author-unstated': 'Szenendatei ohne Urheber',
  'reference-unstated': 'Szenendatei ohne Referenzbedingungen',
  'file-unstated': 'Bildzustand ohne Dateiname',
  'file-across-bodies': 'Dieselbe Szenendatei auf verschiedenen Bodies',
};

export interface PaintFinding {
  kind: PaintFindingKind;
  cameraId: string;
  /** Klartext-Satz. Kanonisches Deutsch — er landet auch auf Blaettern. */
  text: string;
}

const leer = (v: string | undefined): boolean => !(v ?? '').trim();

/**
 * Der Bildzustand einer Position, geprueft.
 *
 * `alle` wird gebraucht, weil eine der Fragen nur im Vergleich beantwortbar
 * ist: dieselbe Datei an zwei Positionen ist einzeln jedes Mal vollstaendig
 * ausgefuellt — und trotzdem falsch, sobald dort verschiedene Bodies stehen.
 */
export function checkPaint(cam: VenueCamera, alle: readonly VenueCamera[]): PaintFinding[] {
  const p = cam.paint;
  if (!p) return [];
  const out: PaintFinding[] = [];
  const wo = `„${cam.label}"`;

  const datei = (p.sceneFile ?? '').trim();
  const hatAngaben = !leer(p.setAt) || !leer(p.setBy) || !leer(p.reference) || !leer(p.notes);

  if (!datei) {
    // Angaben ohne Datei sind eine Notiz ueber nichts — der Bedarf will die
    // DATEI wiederfinden, nicht die Erinnerung an sie.
    if (hatAngaben) {
      out.push({
        kind: 'file-unstated',
        cameraId: cam.id,
        text: `Für ${wo} stehen Angaben zum Bildzustand, aber kein Dateiname. Am zweiten Showtag ist damit nichts zu laden.`,
      });
    }
    return out;
  }

  if (leer(p.setAt)) {
    out.push({
      kind: 'date-unstated',
      cameraId: cam.id,
      text: `„${datei}" an ${wo} trägt kein Datum. Ob sie noch gilt, lässt sich damit nicht beantworten.`,
    });
  }
  if (leer(p.setBy)) {
    out.push({
      kind: 'author-unstated',
      cameraId: cam.id,
      text: `„${datei}" an ${wo} nennt niemanden, der sie gesetzt hat. Bei einer Abweichung ist niemand fragbar.`,
    });
  }
  if (leer(p.reference)) {
    out.push({
      kind: 'reference-unstated',
      cameraId: cam.id,
      text: `„${datei}" an ${wo} nennt keine Referenzbedingungen. Ohne sie ist der Bildzustand nicht nachstellbar, nur wiederherstellbar.`,
    });
  }

  const s = p.savedWith;
  if (s) {
    if (s.cameraId && s.cameraId !== cam.cameraId) {
      out.push({
        kind: 'body-changed',
        cameraId: cam.id,
        text: `„${datei}" wurde für einen anderen Body gespeichert. Eine Szenendatei ist Herstellerformat — auf dem jetzigen Body lädt sie nicht.`,
      });
    } else if (
      s.sensorModeIndex !== undefined &&
      (cam.sensorModeIndex ?? 0) !== s.sensorModeIndex
    ) {
      // Nur wenn der Body derselbe ist: bei einem anderen Body ist der
      // Modus-Index eine Zahl in einer anderen Liste und sagt nichts.
      out.push({
        kind: 'sensor-mode-changed',
        cameraId: cam.id,
        text: `„${datei}" wurde in einem anderen Sensor-Modus gespeichert. Sie lädt, ergibt aber ein anderes Bild.`,
      });
    }
    if (s.lensId && s.lensId !== cam.lensId && s.cameraId === cam.cameraId) {
      out.push({
        kind: 'lens-changed',
        cameraId: cam.id,
        text: `„${datei}" wurde mit einem anderen Objektiv abgeglichen. Sie lädt und wirkt, aber Farbe und Vignette des jetzigen Glases sind nicht mit abgeglichen.`,
      });
    }
  }

  // Dieselbe Datei an zwei Positionen ist erlaubt und ueblich — so werden
  // Kameras aneinander angeglichen. Falsch wird sie erst, wenn dort
  // VERSCHIEDENE Bodies stehen: dann laedt sie auf einem von beiden nicht.
  const andere = alle.filter(
    (x) =>
      x.id !== cam.id &&
      (x.paint?.sceneFile ?? '').trim() === datei &&
      x.cameraId !== cam.cameraId,
  );
  if (andere.length > 0) {
    out.push({
      kind: 'file-across-bodies',
      cameraId: cam.id,
      text: `„${datei}" ist auch an ${andere.map((x) => `„${x.label}"`).join(', ')} eingetragen, wo ein anderer Body steht. Auf einem der beiden lädt sie nicht.`,
    });
  }

  return out;
}

/** Der Bildzustand aus dem, was jetzt an der Position steht. Der Zeitstempel
 *  kommt HEREIN — sonst liesse sich dieselbe Ableitung nicht zweimal gleich
 *  bauen (dieselbe Regel wie bei `presetFromCamera`). */
export const paintFromCamera = (
  cam: VenueCamera,
  sceneFile: string,
  at: string,
  setBy: string,
  reference: string,
): PaintState => ({
  sceneFile,
  setAt: at,
  ...(setBy.trim() ? { setBy: setBy.trim() } : {}),
  ...(reference.trim() ? { reference: reference.trim() } : {}),
  savedWith: {
    cameraId: cam.cameraId,
    lensId: cam.lensId,
    ...(cam.sensorModeIndex !== undefined ? { sensorModeIndex: cam.sensorModeIndex } : {}),
  },
});

const text = (v: string | undefined): string => (v ?? '').trim() || PAINT_UNSTATED;

/**
 * Die Zeilen der Kamerakarte.
 *
 * Jede Zeile steht IMMER da, auch leer — dieselbe Regel wie bei Rigging und
 * Comms: eine weggelassene Zeile liest sich als „dazu gibt es nichts zu
 * sagen", und genau daran scheitert der Zettel heute.
 *
 * Ohne jeden Eintrag gibt es den Block gar nicht: eine Position, fuer die
 * niemand einen Bildzustand vorgesehen hat, bekommt keine Frage gestellt.
 */
export const paintLines = (cam: VenueCamera): string[] => {
  const p = cam.paint;
  if (!p) return [];
  return [
    `Szenendatei: ${text(p.sceneFile)}`,
    `Gesetzt am:  ${text(p.setAt)}`,
    `Gesetzt von: ${text(p.setBy)}`,
    `Referenz:    ${text(p.reference)}`,
  ];
};

/** Normalisiert den Block beim Laden. */
export function normalisePaint(raw: unknown): Pick<VenueCamera, 'paint'> {
  const o = (raw ?? {}) as Record<string, unknown>;
  const p = (o.paint ?? null) as Record<string, unknown> | null;
  if (!p || typeof p !== 'object') return {};
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() ? v.trim() : undefined;

  const rawSaved = (p.savedWith ?? null) as Record<string, unknown> | null;
  const savedWith =
    rawSaved && typeof rawSaved === 'object'
      ? {
          ...(str(rawSaved.cameraId) ? { cameraId: str(rawSaved.cameraId) } : {}),
          ...(str(rawSaved.lensId) ? { lensId: str(rawSaved.lensId) } : {}),
          ...(typeof rawSaved.sensorModeIndex === 'number' &&
          Number.isInteger(rawSaved.sensorModeIndex) &&
          rawSaved.sensorModeIndex >= 0
            ? { sensorModeIndex: rawSaved.sensorModeIndex }
            : {}),
        }
      : {};

  const paint = {
    ...(str(p.sceneFile) ? { sceneFile: str(p.sceneFile) } : {}),
    ...(str(p.setAt) ? { setAt: str(p.setAt) } : {}),
    ...(str(p.setBy) ? { setBy: str(p.setBy) } : {}),
    ...(str(p.reference) ? { reference: str(p.reference) } : {}),
    ...(str(p.notes) ? { notes: str(p.notes) } : {}),
    ...(Object.keys(savedWith).length > 0 ? { savedWith } : {}),
  };

  // Ein leerer Block waere Ballast in jeder Projektdatei — und `checkPaint`
  // liest ein fehlendes Objekt ohnehin als „nichts vorgesehen".
  return Object.keys(paint).length > 0 ? { paint } : {};
}
