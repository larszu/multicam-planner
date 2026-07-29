// "Shot aufnehmen" (#62 Punkt 5) — gemeinsame Aufnahme-Logik.
//
// Wird sowohl vom Button im Preview-Tab als auch vom Shotlist-Panel aufgerufen,
// damit es nur EINE Definition davon gibt, was ein Shot beim Aufnehmen ist.
import { useStore } from '../store/useStore';
import { getExportRegistry } from '../store/exportRegistry';
import { makeThumbnail } from './shotThumbnail';
import { defaultShotName, shotStateFromCamera } from './shot';

export interface CaptureShotResult {
  ok: boolean;
  shotId?: string;
  shotlistId?: string;
  /** false, wenn kein Framegrab moeglich war (Preview-Tab nicht gemountet). */
  hadThumbnail: boolean;
  /** Grund bei `ok: false` — fuer die Meldung an den Nutzer. */
  reason?: string;
}

/**
 * Friert die aktuell gewaehlte Kamera als Shot ein und haengt ihn an die
 * aktive Shotlist. Existiert noch keine Liste, wird eine angelegt, damit der
 * erste Klick sofort etwas bewirkt.
 *
 * Der Framegrab kommt aus dem Preview-Canvas ueber die Export-Registry. Ist
 * der Preview-Tab gerade nicht gemountet, gibt es kein Bild — der Shot wird
 * trotzdem gespeichert (die Kamera-Werte sind der eigentliche Inhalt) und der
 * Aufrufer kann das per `hadThumbnail` melden.
 */
export function captureCurrentShot(): CaptureShotResult {
  const state = useStore.getState();
  const cam = state.cameras.find((c) => c.id === state.selectedCameraId);
  if (!cam) return { ok: false, hadThumbnail: false, reason: 'Keine Kamera ausgewaehlt.' };

  const shotlistId = state.activeShotlistId ?? state.addShotlist('Shotlist 1');

  const canvas = getExportRegistry().capturePreviewCanvas?.() ?? null;
  const thumbnail = makeThumbnail(canvas) ?? undefined;

  const shotId = useStore.getState().addShot(shotlistId, {
    name: defaultShotName(cam),
    cameraId: cam.id,
    state: shotStateFromCamera(cam),
    transition: 'fast',
    thumbnail,
  });

  return { ok: true, shotId, shotlistId, hadThumbnail: !!thumbnail };
}
