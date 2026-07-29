import { useCallback, useEffect, useRef, useState } from 'react';
import { FiMinus, FiPlus } from 'react-icons/fi';
import { posToValue, snapToCandidates, valueToPos } from '../../utils/lensScale';

/**
 * Objektiv-Regler fuer Zoom / Blende / Fokus.
 *
 * Bedienmuster, angelehnt an echte Objektiv- und PTZ-Steuerungen:
 *  • **Logarithmische Bahn** — gleiche Verhaeltnisse (eine Blendenstufe, eine
 *    Brennweiten-Verdopplung) belegen gleiche Wegstrecken. Linear laege sonst
 *    der meistgenutzte Bereich auf den ersten ~10 % des Reglers.
 *  • **Rastpunkte** wie der Blendenring einer Fotooptik: der Wert schnappt auf
 *    die Normstufen. **Shift** haelt ihn frei (wie eine „declicked" Cine-Optik).
 *  • **− / +** springt genau eine Stufe — das Pendant zu den Near/Far- bzw.
 *    Tele/Wide-Tasten einer PTZ-Fernbedienung.
 *  • **Mausrad** ueber der Bahn feint nach, ohne den Regler greifen zu muessen.
 *  • **Zahl anklicken** = direkte Eingabe (Fokus ziehen auf einen bekannten
 *    Abstand, ohne zu zielen).
 */
export interface LensSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Rastpunkte in Wert-Einheiten (Blendenstufen bzw. „schoene" Marken). */
  ticks: number[];
  /** Nur diese Punkte rasten; sonst rasten alle `ticks`. */
  snapPoints?: number[];
  format: (v: number) => string;
  /** Kurzform fuer die Skalenbeschriftung (Default: `format`). */
  formatTick?: (v: number) => string;
  onChange: (v: number) => void;
  /** Eine Stufe weiter (dir +1) bzw. zurueck (−1). */
  onStep: (dir: 1 | -1) => void;
  /** Zusatz rechts in der Kopfzeile (z. B. der Manual-Umschalter). */
  headerRight?: React.ReactNode;
  /** Hinweis rechts neben dem Wert (z. B. „locked"). */
  note?: string;
  disabled?: boolean;
  title?: string;
}

const POS_STEPS = 1000;

export default function LensSlider({
  label,
  value,
  min,
  max,
  ticks,
  snapPoints,
  format,
  formatTick,
  onChange,
  onStep,
  headerRight,
  note,
  disabled,
  title,
}: LensSliderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const shiftRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Shift = Rastung aus (frei durchfahren, wie eine declicked Cine-Optik).
  useEffect(() => {
    const set = (e: KeyboardEvent) => { shiftRef.current = e.shiftKey; };
    window.addEventListener('keydown', set);
    window.addEventListener('keyup', set);
    return () => {
      window.removeEventListener('keydown', set);
      window.removeEventListener('keyup', set);
    };
  }, []);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const snapCandidates = snapPoints ?? ticks;

  const commit = useCallback(
    (raw: number) => {
      const clamped = Math.min(max, Math.max(min, raw));
      const next = shiftRef.current
        ? clamped
        : snapToCandidates(clamped, snapCandidates, min, max);
      onChange(next);
    },
    [max, min, onChange, snapCandidates],
  );

  const handleSlider = useCallback(
    (rawPos: number) => commit(posToValue(rawPos / POS_STEPS, min, max)),
    [commit, max, min],
  );

  // Mausrad: eine Rasterstufe pro Tick, ohne den Griff zu treffen.
  // Muss als NICHT-passiver Listener haengen — React registriert `onWheel`
  // passiv, dort schlaegt preventDefault fehl (Konsolenfehler) und das Panel
  // scrollt zusaetzlich weg, waehrend man den Wert verstellt.
  const wheelZoneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wheelZoneRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (disabled) return;
      e.preventDefault();
      onStep(e.deltaY < 0 ? -1 : 1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [disabled, onStep]);

  const submitDraft = useCallback(() => {
    const parsed = parseFloat(draft.replace(',', '.'));
    if (Number.isFinite(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
    setEditing(false);
  }, [draft, max, min, onChange]);

  const pos = Math.round(valueToPos(value, min, max) * POS_STEPS);
  const fmtTick = formatTick ?? format;
  const stepBtn =
    'px-1 py-0.5 rounded border border-bc-border text-gray-500 hover:text-white hover:border-bc-accent/60 disabled:opacity-30 transition-colors';

  return (
    <div className="px-2" title={title}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-gray-500">
          {label} ·{' '}
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submitDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitDraft();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="w-16 bg-bc-dark border border-bc-accent rounded px-1 text-[10px] text-white font-mono"
            />
          ) : (
            <button
              onClick={() => { setDraft(String(Number(value.toFixed(2)))); setEditing(true); }}
              className="font-mono text-gray-300 hover:text-bc-accent underline decoration-dotted underline-offset-2"
              title="Wert direkt eingeben"
              disabled={disabled}
            >
              {format(value)}
            </button>
          )}
          {note ? <span className="text-gray-600"> · {note}</span> : null}
        </span>
        <div className="flex items-center gap-1">
          <button className={stepBtn} onClick={() => onStep(-1)} disabled={disabled} title="Eine Stufe zurueck">
            <FiMinus size={10} />
          </button>
          <button className={stepBtn} onClick={() => onStep(1)} disabled={disabled} title="Eine Stufe weiter">
            <FiPlus size={10} />
          </button>
          {headerRight}
        </div>
      </div>

      <div ref={wheelZoneRef}>
        <input
          type="range"
          min={0}
          max={POS_STEPS}
          step={1}
          value={pos}
          disabled={disabled}
          onChange={(e) => handleSlider(parseFloat(e.target.value))}
          className="w-full accent-bc-accent"
          aria-label={label}
          aria-valuetext={format(value)}
        />
        {/* Skala: Rastpunkte an ihrer echten (logarithmischen) Position. */}
        <div className="relative h-3 select-none pointer-events-none">
          {ticks.map((t, i) => {
            const p = valueToPos(t, min, max) * 100;
            const active = Math.abs(t - value) < 1e-6;
            // Randmarken buendig statt mittig ausrichten, sonst haengt die
            // Beschriftung halb ausserhalb der Bahn und wird abgeschnitten.
            const isFirst = i === 0;
            const isLast = i === ticks.length - 1;
            const shift = isFirst ? 'translate-x-0' : isLast ? '-translate-x-full' : '-translate-x-1/2';
            const tickAlign = isFirst ? 'ml-0' : isLast ? 'mr-0 ml-auto' : 'mx-auto';
            return (
              <span
                key={`${t}-${i}`}
                className={`absolute top-0 ${shift} text-[8px] font-mono leading-none ${
                  active ? 'text-bc-accent' : 'text-gray-600'
                }`}
                style={{ left: `${p}%` }}
              >
                <span className={`block w-px h-1 ${tickAlign} bg-current opacity-60`} />
                {fmtTick(t)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
