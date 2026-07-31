// Preview-Presets (#47) — gespeicherte Kamera-Posen zum Anfahren.
//
// Presets lagen bisher in einem globalen Topf: jedes Preset erschien bei jeder
// Kamera und fuhr die gerade aktive dorthin. Gedacht sind sie aber pro
// Kamera — eine Weitwinkel-Position von CAM 1 hat auf CAM 4 nichts zu suchen.
//
// `cameraId` ordnet ein Preset zu. Alt gespeicherte Presets haben das Feld
// nicht; sie werden NICHT weggeworfen (das waeren Nutzerdaten), sondern als
// "allgemein" gefuehrt und lassen sich per Klick einer Kamera zuordnen.
// Genauso behandelt werden Presets, deren Kamera es nicht mehr gibt — nach dem
// Laden eines anderen Projekts haben alle Kameras neue Ids, und ein stilles
// Loeschen wuerde die Sammlung des Nutzers vernichten.
//
// Reines Modul: kein Store, kein DOM.

export interface PreviewPreset {
  id: string;
  name: string;
  /** Kamera, zu der das Preset gehoert. Fehlt bei Altbestand. */
  cameraId?: string;
  focalLength: number;
  aperture: number;
  focusDistance: number;
  pan?: number;
  tilt?: number;
  /** Hoehe in Metern. */
  z?: number;
  /** Fahrweg (Dolly/Jib) in Metern. */
  trackOffset?: number;
  x?: number;
  y?: number;
}

export interface PresetGroups {
  /** Presets dieser Kamera. */
  own: PreviewPreset[];
  /**
   * Presets ohne Zuordnung — Altbestand oder Kamera geloescht. Sie bleiben
   * sichtbar und anwendbar, damit nichts verloren geht.
   */
  unassigned: PreviewPreset[];
}

/**
 * Teilt die Sammlung fuer die Anzeige auf. Presets ANDERER, noch existierender
 * Kameras tauchen bewusst nicht auf — genau das war der Fehler.
 */
export function groupPresets(
  presets: PreviewPreset[],
  cameraId: string | null | undefined,
  existingCameraIds: Iterable<string>,
): PresetGroups {
  const known = new Set(existingCameraIds);
  const own: PreviewPreset[] = [];
  const unassigned: PreviewPreset[] = [];
  for (const p of presets) {
    if (cameraId && p.cameraId === cameraId) own.push(p);
    else if (!p.cameraId || !known.has(p.cameraId)) unassigned.push(p);
  }
  return { own, unassigned };
}

/** Ordnet ein Preset einer Kamera zu (oder um). */
export function assignPreset(
  presets: PreviewPreset[],
  presetId: string,
  cameraId: string,
): PreviewPreset[] {
  return presets.map((p) => (p.id === presetId ? { ...p, cameraId } : p));
}

/** Kopiert ein Preset auf eine andere Kamera — das Original bleibt bestehen. */
export function copyPresetToCamera(
  presets: PreviewPreset[],
  presetId: string,
  cameraId: string,
  newId: string,
  nameSuffix = '',
): PreviewPreset[] {
  const src = presets.find((p) => p.id === presetId);
  if (!src) return presets;
  return [...presets, { ...src, id: newId, cameraId, name: `${src.name}${nameSuffix}` }];
}

/** true, wenn das Preset auch die Position im Raum enthaelt (nicht nur Optik). */
export function hasPose(p: PreviewPreset): boolean {
  return p.pan !== undefined || p.x !== undefined || p.z !== undefined;
}
