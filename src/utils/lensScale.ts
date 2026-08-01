// Skalen und Rastungen fuer die Objektiv-Regler (Zoom / Blende / Fokus).
//
// Warum nicht linear:
//   • Blende ist von Natur aus LOGARITHMISCH — die Normreihe schreitet in
//     √2-Schritten fort (f/1.4 · 2 · 2.8 · 4 · 5.6 · 8 · 11 · 16 · 22), jeder
//     Schritt halbiert das Licht. Linear gelegt liegt bei f/1.7–f/22 der ganze
//     schaerfentiefe-relevante Bereich f/1.7–f/4 auf ~11 % der Bahn.
//   • Brennweite wird ebenfalls logarithmisch wahrgenommen: 10→20 mm ist
//     derselbe Bildwinkel-Sprung wie 200→400 mm. Bei einem 8–900-mm-Objektiv
//     liegen linear die meistgenutzten 8–100 mm auf ~10 % der Bahn.
//   • Fokus braucht nah viel feinere Aufloesung als fern (die Schaerfentiefe
//     waechst quadratisch mit der Distanz).
//
// Deshalb bilden diese Helfer Wert ↔ Reglerposition logarithmisch ab und
// liefern die Rastpunkte, an denen echte Objektive einrasten.

/** Normreihe der vollen Blendenstufen (√2-Schritte). */
export const FULL_STOPS = [
  0.7, 1, 1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22, 32, 45, 64,
] as const;

/**
 * Wert → Reglerposition 0..1. `log` bildet logarithmisch ab, sodass gleiche
 * Verhaeltnisse (Verdopplung) gleiche Wegstrecken ergeben.
 * Nicht-positive Grenzen fallen automatisch auf linear zurueck — `Math.log`
 * waere dort nicht definiert.
 */
export function valueToPos(value: number, min: number, max: number, log = true): number {
  if (!(max > min)) return 0;
  const v = Math.min(max, Math.max(min, value));
  if (!log || min <= 0 || max <= 0) return (v - min) / (max - min);
  return Math.log(v / min) / Math.log(max / min);
}

/** Reglerposition 0..1 → Wert (Umkehrung von `valueToPos`). */
export function posToValue(pos: number, min: number, max: number, log = true): number {
  if (!(max > min)) return min;
  const p = Math.min(1, Math.max(0, pos));
  if (!log || min <= 0 || max <= 0) return min + p * (max - min);
  return min * Math.pow(max / min, p);
}

/** Volle Blendenstufen innerhalb [min, max]. */
export function stopsInRange(min: number, max: number): number[] {
  return FULL_STOPS.filter((s) => s >= min - 1e-9 && s <= max + 1e-9);
}

/**
 * Naechste/vorherige volle Blendenstufe. `dir` +1 = weiter schliessen
 * (groessere Zahl), -1 = oeffnen. Das Epsilon sorgt dafuer, dass wiederholtes
 * Klicken weiterlaeuft, statt auf der aktuellen Stufe zu kleben.
 */
export function stepStop(value: number, dir: 1 | -1, min: number, max: number): number {
  const stops = stopsInRange(min, max);
  if (stops.length === 0) return Math.min(max, Math.max(min, value));
  const eps = 1e-4;
  if (dir === 1) {
    const next = stops.find((s) => s > value + eps);
    return next ?? Math.min(max, stops[stops.length - 1]);
  }
  const prev = [...stops].reverse().find((s) => s < value - eps);
  return prev ?? Math.max(min, stops[0]);
}

/**
 * „Schoene" Teilstriche (1–2–5 je Dekade) innerhalb [min, max] — fuer Zoom in
 * mm und Fokus in m. Die Grenzen selbst kommen immer mit dazu, damit der
 * Regler an beiden Enden beschriftet ist.
 */
export function niceTicks(min: number, max: number, maxCount = 7): number[] {
  if (!(max > min) || min <= 0) return [min, max].filter((v) => Number.isFinite(v));
  const out: number[] = [];
  const startDecade = Math.floor(Math.log10(min));
  const endDecade = Math.ceil(Math.log10(max));
  // Abstand in REGLERPOSITION pruefen, nicht im Wert: bei einer 8–900-mm-Bahn
  // liegt 10 mm wertmaessig weit von 8.4 weg, auf dem Regler aber fast
  // uebereinander — die Beschriftungen wuerden sich ueberlappen.
  const MIN_GAP = 0.045;
  for (let d = startDecade; d <= endDecade; d++) {
    for (const m of [1, 2, 5]) {
      const v = m * Math.pow(10, d);
      if (v <= min || v >= max) continue;
      const p = valueToPos(v, min, max);
      if (p > MIN_GAP && p < 1 - MIN_GAP) out.push(v);
    }
  }
  // Ausduennen, wenn zu viele — jeden n-ten behalten, damit die Beschriftung
  // nicht ueberlappt.
  let ticks = out;
  if (ticks.length > maxCount) {
    const stride = Math.ceil(ticks.length / maxCount);
    ticks = ticks.filter((_, i) => i % stride === 0);
  }
  return [min, ...ticks, max];
}

/**
 * Rastet `value` auf den naechsten Kandidaten, wenn er nah genug dran liegt.
 * `tolerance` ist der erlaubte Abstand in Reglerposition (0..1), nicht im Wert
 * — so fuehlt sich die Rastung ueber die ganze Bahn gleich stark an.
 */
export function snapToCandidates(
  value: number,
  candidates: readonly number[],
  min: number,
  max: number,
  tolerance = 0.02,
  log = true,
): number {
  if (candidates.length === 0) return value;
  const pos = valueToPos(value, min, max, log);
  let best = value;
  let bestDist = Infinity;
  for (const c of candidates) {
    if (c < min - 1e-9 || c > max + 1e-9) continue;
    const d = Math.abs(valueToPos(c, min, max, log) - pos);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return bestDist <= tolerance ? best : value;
}

/** Anzeigeformat einer Brennweite: unter 10 mm mit einer Nachkommastelle. */
export function formatFocal(mm: number): string {
  return mm < 10 ? `${mm.toFixed(1)}mm` : `${Math.round(mm)}mm`;
}

/**
 * Anzeigeformat einer Fokusdistanz. Unter 1 m in cm, darunter/darueber mit
 * einer Nachkommastelle bis 100 m — sonst sieht eine Direkteingabe von 12.5
 * als "13m" aus, als waere sie verworfen worden. Ab 100 m ist die Nachkomma-
 * stelle ohnehin bedeutungslos.
 */
export function formatDistance(m: number): string {
  if (m < 1) return `${(m * 100).toFixed(0)}cm`;
  if (m < 100) return `${Number(m.toFixed(1))}m`;
  return `${Math.round(m)}m`;
}

/** Anzeigeformat einer Blende. */
export function formatAperture(f: number): string {
  return `f/${f < 10 ? f.toFixed(1) : f.toFixed(0)}`;
}

/**
 * Eine „Stufe" entlang beliebiger Marken (Zoom/Fokus): zum naechsten Teilstrich
 * springen. Liegt keiner mehr in der Richtung, um 1/12 der logarithmischen Bahn
 * weitergehen — so bleibt der Schritt am Bahnende gleichmaessig statt zu klemmen.
 *
 * Liegt hier statt im Preview-Tab, weil die Kamera-Eigenschaften im Sidebar
 * dieselben Regler benutzen — zwei Implementierungen waeren zwei Bedienungen.
 */
export function stepAlong(value: number, dir: 1 | -1, min: number, max: number, ticks: number[]): number {
  const eps = 1e-6;
  const sorted = [...ticks].sort((a, b) => a - b);
  const next = dir === 1
    ? sorted.find((t) => t > value + eps)
    : [...sorted].reverse().find((t) => t < value - eps);
  if (next !== undefined) return next;
  const pos = valueToPos(value, min, max) + dir * (1 / 12);
  return Math.min(max, Math.max(min, posToValue(pos, min, max)));
}
