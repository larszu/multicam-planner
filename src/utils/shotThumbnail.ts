// Framegrab-Verkleinerung fuer Shotlist-Thumbnails (#62 Punkt 5).
//
// Warum ueberhaupt verkleinern: der Preview-Canvas ist mehrere Megapixel gross.
// Als PNG-data-URL waeren das leicht 2–5 MB PRO Shot — localStorage (5–10 MB
// gesamt) waere nach zwei Shots voll und `saveJSON` wuerde die Liste ab da
// still verwerfen. Ein 320-px-JPEG liegt bei ~10–20 KB, also ~200x kleiner,
// und reicht fuer Storyboard-Kacheln locker.

/** Zielbreite eines Thumbnails in Pixeln. */
export const THUMBNAIL_WIDTH = 320;

/** JPEG-Qualitaet: sichtbar sauber, aber deutlich kleiner als PNG. */
export const THUMBNAIL_QUALITY = 0.72;

/**
 * Verkleinert `source` auf `maxWidth` (Seitenverhaeltnis bleibt) und liefert
 * eine JPEG-data-URL. Gibt `null` zurueck, wenn die Quelle leer ist oder der
 * 2D-Context fehlt — der Aufrufer speichert den Shot dann eben ohne Bild,
 * statt einen kaputten String zu persistieren.
 */
export function makeThumbnail(
  source: HTMLCanvasElement | null,
  maxWidth: number = THUMBNAIL_WIDTH,
): string | null {
  if (!source || source.width === 0 || source.height === 0) return null;

  const scale = Math.min(1, maxWidth / source.width);
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));

  try {
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    // Schwarzer Grund: JPEG kann kein Alpha, transparente Bereiche wuerden
    // sonst schwarz/weiss-zufaellig kippen.
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);
    return out.toDataURL('image/jpeg', THUMBNAIL_QUALITY);
  } catch {
    // z. B. tainted canvas — lieber kein Bild als ein Crash beim Aufnehmen.
    return null;
  }
}
