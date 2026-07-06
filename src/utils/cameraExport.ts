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

export function parseCameraList(text: string): CameraListExchange {
  const data = JSON.parse(text) as Partial<CameraListExchange>;
  if (!data || data.kind !== CAMERA_LIST_KIND) {
    throw new Error('Keine gueltige Kamera-Liste (kind != camera-list).');
  }
  if (data.formatVersion !== CAMERA_LIST_VERSION) {
    throw new Error(`Nicht unterstuetzte Kamera-Listen-Version: ${data.formatVersion}`);
  }
  if (!Array.isArray(data.cameras)) throw new Error('Kamera-Liste ohne cameras-Array.');
  return data as CameraListExchange;
}
