// ───────────────────────────────────────────────────────────────────────────
// „Ist gerade HELL?" — als Hook, fuer die Stellen, die ihre Farben selbst
// zeichnen (B-70).
//
// WARUM EIN HOOK UND NICHT NUR `istHell()`. Der 2D-Plan zeichnet in ein
// Canvas; er kann keine CSS-Variable lesen und muss die Antwort als Wert
// bekommen. Ein einmaliger Aufruf reichte nicht: wer das Thema umschaltet,
// waehrend der Plan offen ist, saehe den alten Grund, bis er die Ansicht
// wechselt. Der Hook horcht deshalb auf BEIDE Quellen —
//
//   `data-theme` am Wurzelelement   die ausdrueckliche Wahl
//   `prefers-color-scheme`          das System, wenn keine Wahl da ist
//
// — und genau das ist der Grund, warum die zweite auch dann beobachtet wird,
// wenn gerade eine Wahl gesetzt ist: sie kann weggenommen werden („System"),
// und dann gilt wieder das Fenster.
// ───────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { istHell } from './thema';

export function useIstHell(): boolean {
  const [hell, setHell] = useState(istHell);

  useEffect(() => {
    const nachsehen = () => setHell(istHell());

    // Die Wahl: ein Attribut am Wurzelelement.
    const beobachter = new MutationObserver(nachsehen);
    beobachter.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Das System: die Medienabfrage.
    const abfrage = window.matchMedia?.('(prefers-color-scheme: light)');
    abfrage?.addEventListener?.('change', nachsehen);

    // Einmal zu Beginn, falls sich zwischen erstem Rendern und diesem Effekt
    // etwas geaendert hat.
    nachsehen();

    return () => {
      beobachter.disconnect();
      abfrage?.removeEventListener?.('change', nachsehen);
    };
  }, []);

  return hell;
}
