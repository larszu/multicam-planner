// ───────────────────────────────────────────────────────────────────────────
// „Ist das Fenster schmal?" — eine Abfrage, eine Wahrheit (#137).
//
// NUTZER-MELDUNG: „In preview mode ueberlagert der Text das Bild. Das Bild
// ist das wichtigste. Bedienelemente muessen dann darunter und intuitiver zu
// bedienen sein."
//
// Der Datenblock stand als `w-56 shrink-0` NEBEN dem Bild. Auf einem Telefon
// mit 390 px sind das 224 px fuer den Text und der Rest fuer das Bild — die
// Kamera-Vorschau war schmaler als die Zahlen daneben.
//
// Die Grenze steht hier und nicht als Tailwind-Praefix im JSX, weil die
// Umstellung nicht nur Klassen betrifft: der Datenblock wechselt von einer
// Spalte in ein Raster, und der Scrollbereich wandert eine Ebene nach aussen.
// Das laesst sich nicht mit `md:` ausdruecken, und zwei Wahrheiten darueber,
// ab wann „schmal" gilt, waeren die uebliche Art, wie so etwas auseinander-
// laeuft.
// ───────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';

/**
 * 900 px, nicht 768.
 *
 * Gemessen an dem, was die Vorschau braucht: Bild plus 224 px Datenspalte
 * plus die Regler darunter. Unterhalb von rund 900 px bleibt fuer das Bild
 * weniger als zwei Drittel der Breite — und dann ist Untereinander die
 * bessere Ordnung, auch auf einem Tablet im Hochformat.
 */
export const SCHMAL_BIS_PX = 900;

export function useSchmal(grenzePx: number = SCHMAL_BIS_PX): boolean {
  const [schmal, setSchmal] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= grenzePx,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const abfrage = window.matchMedia(`(max-width: ${grenzePx}px)`);
    const merke = () => setSchmal(abfrage.matches);
    merke();
    abfrage.addEventListener('change', merke);
    return () => abfrage.removeEventListener('change', merke);
  }, [grenzePx]);
  return schmal;
}
