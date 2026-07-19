import { useCallback, useEffect, useState } from 'react';
import { FiMinus, FiPlus } from 'react-icons/fi';
import { loadZoom, setZoom, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_DEFAULT } from '../../utils/uiZoom';

/**
 * Kompakter UI-Zoom-Regler fuer den Header (Issue #61 "alles extrem klein").
 * Skaliert die gesamte Oberflaeche pro Geraet, gespeichert in localStorage.
 * Tastatur: Ctrl/Cmd + Plus / Minus / 0 (zuruecksetzen).
 */
export default function ZoomControl() {
  const [zoom, setZoomState] = useState<number>(() => loadZoom());

  const apply = useCallback((next: number) => {
    setZoomState(setZoom(next));
  }, []);

  const inc = useCallback(() => apply(zoom + ZOOM_STEP), [apply, zoom]);
  const dec = useCallback(() => apply(zoom - ZOOM_STEP), [apply, zoom]);
  const reset = useCallback(() => apply(ZOOM_DEFAULT), [apply]);

  // Globale Tastenkuerzel: Strg/Cmd +, -, 0
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === '+' || e.key === '=') { e.preventDefault(); inc(); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); dec(); }
      else if (e.key === '0') { e.preventDefault(); reset(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inc, dec, reset]);

  const pct = Math.round(zoom * 100);

  return (
    <div
      className="hidden lg:flex items-center rounded-lg border border-bc-border bg-bc-dark p-0.5"
      title="UI-Zoom (Strg + / - / 0)"
    >
      <button
        type="button"
        onClick={dec}
        disabled={zoom <= ZOOM_MIN + 1e-6}
        className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-bc-border disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        title="Kleiner (Strg -)"
        aria-label="UI verkleinern"
      >
        <FiMinus size={12} />
      </button>
      <button
        type="button"
        onClick={reset}
        className="px-1.5 min-w-[3rem] text-center text-xs tabular-nums text-gray-300 hover:text-white transition-colors"
        title="Auf 100 % zuruecksetzen (Strg 0)"
      >
        {pct}%
      </button>
      <button
        type="button"
        onClick={inc}
        disabled={zoom >= ZOOM_MAX - 1e-6}
        className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-bc-border disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        title="Groesser (Strg +)"
        aria-label="UI vergroessern"
      >
        <FiPlus size={12} />
      </button>
    </div>
  );
}
