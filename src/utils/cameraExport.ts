// ───────────────────────────────────────────────────────────────────────────
// Kamera-Liste (`camera-list` v1)
//
// Neutrales Format, um in MultiCam platzierte Kameras an den Cable-Planner zu
// uebergeben: dort werden sie zu Equipment-Nodes (Kategorie "Kameras"), die man
// verkabeln kann. Das schliesst die Bruecke "Wo stehen die Kameras?" (MultiCam)
// ↔ "Wie sind sie verkabelt?" (Cable-Planner).
//
// Schema-identisch zum Cable-Planner (src/renderer/lib/multicamCameraImport.ts).
// Reine Daten, headless testbar.
// ───────────────────────────────────────────────────────────────────────────
import type { VenueCamera, Camera } from '../types';

export const CAMERA_LIST_KIND = 'camera-list' as const;
export const CAMERA_LIST_VERSION = 1 as const;

export interface CameraListEntry {
  id: string;
  label: string;
  manufacturer?: string;
  model?: string;
  /** Stabile Geraetetyp-Identitaet (GUID, GDTF-analog). Wenn gesetzt, loest der
   *  Cable-Planner die Kamera AUTORITATIV auf ihr Datenblatt/ihre Ports auf,
   *  statt ueber Hersteller/Modell-Namen zu raten. */
  deviceTypeId?: string;
  x?: number; // Meter im Venue (von links)
  y?: number; // Meter im Venue (von oben)
}
export interface CameraListExchange {
  kind: typeof CAMERA_LIST_KIND;
  formatVersion: typeof CAMERA_LIST_VERSION;
  app: string;
  appVersion: string;
  exportedAt: string;
  cameras: CameraListEntry[];
}

/** Platzierte MultiCam-Kameras → neutrale Kamera-Liste. */
export function toCameraList(
  cameras: VenueCamera[],
  resolveCamera: (cameraId: string) => Camera | undefined,
  meta: { appVersion: string; exportedAt: string },
): CameraListExchange {
  return {
    kind: CAMERA_LIST_KIND,
    formatVersion: CAMERA_LIST_VERSION,
    app: 'multicam-planner',
    appVersion: meta.appVersion,
    exportedAt: meta.exportedAt,
    cameras: cameras.map((c) => {
      const def = resolveCamera(c.cameraId);
      return {
        id: c.id, label: c.label,
        manufacturer: def?.manufacturer, model: def?.model,
        deviceTypeId: def?.deviceTypeId,
        x: c.x, y: c.y,
      };
    }),
  };
}

/**
 * Ein Eintrag, so wie das Format ihn meint — nicht nur, wie er heisst.
 *
 * BEFUND (Defektformen-Sweep, Form `vertrag-nur-feldnamen`, gemessen
 * 2026-09-07). `parseCameraList` prüfte den Marker, die Version und dass
 * `cameras` ein Array ist — und gab dann `data as CameraListExchange` zurück.
 * Der Cast war die ganze Zusicherung: was in dem Array stand, hat nie jemand
 * angesehen. `cameras: [null, 42, {}, { id: 5, x: "links" }]` kam als
 * wohlgeformte `CameraListExchange` beim Aufrufer an.
 *
 * Der Guard daneben (`__tests__/cameraListContract.test.ts`) fror genau das
 * ein, was auch schon stimmte: die FELDNAMEN, auf beiden Seiten, sogar aus
 * dem Interface-Rumpf gelesen. Über die BEDEUTUNG eines Feldes stand dort
 * nichts — und die Ablehnungs-Fälle deckten nur fremdes `kind`, fremde
 * Version, fehlendes Array und kaputtes JSON ab. Ein Vertrag, der nur Namen
 * kennt, ist beim Empfänger nichts wert: der Cable-Planner baut aus jedem
 * Eintrag einen Equipment-Knoten, und ein Eintrag ohne `id` ergibt einen
 * Knoten ohne Identität, ein `x: "links"` eine Position bei NaN.
 *
 * Deshalb wird hier geprüft, was die Felder BEDEUTEN: `id` und `label` sind
 * Pflicht und nicht leer, `x`/`y` sind — wenn gesetzt — endliche Zahlen, und
 * die optionalen Textfelder sind Text. Abgelehnt wird die DATEI, nicht der
 * Eintrag: eine Liste, aus der stillschweigend eine Kamera fehlt, ist
 * schlimmer als eine, die gar nicht erst lädt.
 */
function pruefeEintrag(roh: unknown, index: number): CameraListEntry {
  const wo = `Kamera #${index + 1}`;
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) {
    throw new Error(`${wo}: kein Objekt.`);
  }
  const e = roh as Record<string, unknown>;
  for (const feld of ['id', 'label'] as const) {
    if (typeof e[feld] !== 'string' || (e[feld] as string).trim() === '') {
      throw new Error(`${wo}: Feld „${feld}" fehlt oder ist leer.`);
    }
  }
  for (const feld of ['manufacturer', 'model', 'deviceTypeId'] as const) {
    if (e[feld] !== undefined && typeof e[feld] !== 'string') {
      throw new Error(`${wo}: Feld „${feld}" ist kein Text.`);
    }
  }
  for (const feld of ['x', 'y'] as const) {
    if (e[feld] !== undefined && !Number.isFinite(e[feld])) {
      throw new Error(`${wo}: Feld „${feld}" ist keine endliche Zahl.`);
    }
  }
  return roh as CameraListEntry;
}

export function parseCameraList(text: string): CameraListExchange {
  const data = JSON.parse(text) as Partial<CameraListExchange>;
  if (!data || data.kind !== CAMERA_LIST_KIND) {
    throw new Error('Keine gültige Kamera-Liste (kind != camera-list).');
  }
  if (data.formatVersion !== CAMERA_LIST_VERSION) {
    throw new Error(`Nicht unterstützte Kamera-Listen-Version: ${data.formatVersion}`);
  }
  if (!Array.isArray(data.cameras)) throw new Error('Kamera-Liste ohne cameras-Array.');
  for (const feld of ['app', 'appVersion', 'exportedAt'] as const) {
    if (typeof data[feld] !== 'string' || data[feld].trim() === '') {
      throw new Error(`Kamera-Liste ohne „${feld}".`);
    }
  }
  const cameras = data.cameras.map(pruefeEintrag);
  return { ...(data as CameraListExchange), cameras };
}
