import type { SensorSize } from '../types';
import { computeDof } from './fov';

/**
 * Wo die Schaerfe im Raum liegt — als zeichenbares Band (#141).
 *
 * WARUM ES DAS GIBT
 * -----------------
 * `computeDof` beantwortet die Frage seit jeher in Zahlen: Nahgrenze,
 * Ferngrenze, hyperfokale Distanz. Sie standen in der Seitenleiste, in der
 * Vorschau und im Export — also ueberall dort, wo man sie LIEST. Die Frage,
 * die beim Planen einer Mehrkamera-Position tatsaechlich ansteht, ist aber
 * eine raeumliche: *steht die Band im Schaerfebereich von Kamera 3?* Sie an
 * einem Zahlenpaar abzulesen und im Kopf auf den Grundriss zu uebertragen ist
 * genau der Schritt, den ein Plan einem abnehmen soll.
 *
 * Inspiriert von jherrs `depth-of-field` und seinem 3D-Gegenstueck: beide
 * zeigen die Schaerfezone, statt sie zu beziffern.
 *
 * DIE FALLE, DIE HIER ABGEFANGEN WIRD
 * -----------------------------------
 * Die Ferngrenze ist regelmaessig `Infinity` — sobald auf oder hinter der
 * hyperfokalen Distanz fokussiert wird, was bei kurzen Brennweiten und
 * geschlossener Blende der Normalfall ist. Ein Radius von `Infinity` ergibt
 * in Konva wie in three.js kein Band, sondern gar nichts: die Form
 * verschwindet stillschweigend. Genau dann, wenn der Schaerfebereich am
 * groessten ist, waere also nichts zu sehen gewesen.
 *
 * Deshalb wird hier abgeschnitten UND gesagt, dass abgeschnitten wurde. Die
 * Oberflaeche zeichnet die aeussere Kante dann gestrichelt: „geht weiter" ist
 * eine andere Aussage als „hoert hier auf", und beide muessen unterscheidbar
 * bleiben.
 */
export interface DofBand {
  /** Nahgrenze in Metern. */
  vonM: number;
  /** Ferngrenze in Metern — bei Unendlich auf `maxM` gekuerzt. */
  bisM: number;
  /** Wurde die Ferngrenze gekuerzt? Dann endet das Band nicht wirklich dort. */
  gekuerzt: boolean;
  /** Fokusabstand, auf den gestellt ist — die Mitte der Aussage. */
  fokusM: number;
}

/**
 * Berechnet das zeichenbare Schaerfeband.
 *
 * @param maxM Wie weit gezeichnet werden darf. Sinnvoll ist die Ausdehnung
 *             der dargestellten Flaeche: ein Band, das ueber den Raum
 *             hinausreicht, sagt nichts mehr aus und kostet nur Flaeche.
 */
export function dofBand(
  sensor: SensorSize,
  focalLengthMm: number,
  aperture: number,
  focusDistanceM: number,
  extender: number,
  maxM: number,
): DofBand | null {
  // Ohne Fokusabstand gibt es keine Aussage. Null statt eines Bandes bei 0 m:
  // ein Band, das im Kameragehaeuse beginnt, ist keine Naeherung, sondern
  // falsch.
  if (!(focusDistanceM > 0) || !(maxM > 0)) return null;

  const { nearLimit, farLimit } = computeDof(sensor, focalLengthMm, aperture, focusDistanceM, extender);
  if (!Number.isFinite(nearLimit) || nearLimit <= 0) return null;

  const unbegrenzt = !Number.isFinite(farLimit);
  const bisRoh = unbegrenzt ? maxM : farLimit;
  const bisM = Math.min(bisRoh, maxM);

  // Ein Band mit null Breite ist keines. Das passiert bei sehr offener Blende
  // und langer Brennweite auf kurze Distanz — dort ist die Aussage „die
  // Schaerfe ist duenner als ein Strich" richtig, aber nicht zeichenbar.
  if (bisM <= nearLimit) return null;

  return {
    vonM: nearLimit,
    bisM,
    gekuerzt: unbegrenzt || farLimit > maxM,
    fokusM: focusDistanceM,
  };
}
