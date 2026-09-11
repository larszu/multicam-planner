// ───────────────────────────────────────────────────────────────────────────
// Ein Menue in der Kopfzeile — dieselbe Form wie im Cable Planner.
//
// NUTZER-AUFTRAG 2026-09-11: „Stelle sicher das in allen repos uebergreifend
// das Einstellungen Menue an der gleichen Stelle ist wie im Cable planner und
// das die obere Menueleiste gleich aufgebaut ist."
//
// WARUM HIER EINE EIGENE FASSUNG UND KEIN GEMEINSAMES PAKET: dieses Repo
// laeuft auch ALLEIN (eigene Web-Seite, eigene Electron-Fassung) und haengt
// an keinem Paket der Suite. Genau dieselbe Lage wie beim Cable Planner,
// dessen `index.css` es in eigenen Worten sagt: „der MultiCam-Planner laeuft
// auch allein und kann das Paket nicht laden, deshalb stehen die Klassen hier
// mit denselben Zahlen."
//
// Zusammengehalten wird die Form deshalb nicht vom Compiler, sondern von
// `scripts/chrome-parity.mjs` in der Suite: er misst in allen Apps dieselbe
// Kopfzeile — Klasse, 40 px, Menue-Reihenfolge, Einstellungen rechts aussen.
// Eine Abschrift ohne Waechter waere die Defektform `zwei-rechnungen`; mit
// Waechter ist sie eine gemessene Zusage. `src/__tests__/kopfzeile.test.ts`
// ist die Haelfte davon, die in diesem Repo MITWANDERT.
//
// DER SCHLIESSER WIRD HEREINGEREICHT und nicht aus dem Klick-Bubbling
// abgeleitet. Der Cable Planner schliesst per `onClick` an der Klappe — das
// funktioniert, verschluckt aber jeden Punkt, der ein Untermenue aufklappen
// oder ein Eingabefeld zeigen will (die Preset-Zeile hier tut genau das).
// ───────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FiCheck, FiChevronDown } from 'react-icons/fi';

interface MenuProps {
  /** Beschriftung. Englisch — dieses Repo ist englisch-quellig (E-28). */
  label: string;
  children: (close: () => void) => ReactNode;
}

export function Menu({ label, children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const shell = useRef<HTMLDivElement>(null);

  // Klick daneben schliesst, Escape auch. Ohne beides bliebe ein Menue
  // stehen, sobald jemand woanders hinklickt — und zwei offene Klappen
  // uebereinander sind unbedienbar.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!shell.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={shell}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ padding: '4px 6px' }}
        className={`flex items-center gap-0.5 text-xs text-bc-text-bright transition-colors hover:bg-bc-panel-raised ${open ? 'bg-bc-panel-raised' : ''}`}
      >
        {label}
        <FiChevronDown size={11} className="text-bc-muted" />
      </button>
      {open && (
        <div
          role="menu"
          /* GEDECKELT wie im Cable Planner: die Klappe darf nicht laenger
             werden als das Fenster hoch ist, sonst stehen ihre letzten Punkte
             unter dem Fensterrand und existieren fuer den Nutzer nicht. */
          className="absolute left-0 top-full z-[100] mt-1 max-h-[calc(100vh-3.5rem)] min-w-[16rem] overflow-y-auto border border-bc-border bg-bc-panel py-1"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  onClick?: () => void;
  icon?: ReactNode;
  /** Zweite Zeile: WAS passiert. Nur wo der Name es nicht sagt. */
  note?: string;
  /** Angehakt — fuer Punkte, die einen Zustand setzen (Edit-Modus, Layout). */
  checked?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

export function MenuItem({ onClick, icon, note, checked, disabled, children }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      style={{ padding: '6px 12px' }}
      className={`flex w-full items-center gap-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:text-bc-muted disabled:opacity-50 ${
        checked ? 'text-bc-yellow' : 'text-bc-text hover:bg-bc-panel-raised hover:text-bc-text-bright'
      }`}
    >
      <span className="inline-flex w-[13px] shrink-0 items-center justify-center text-bc-muted">
        {checked ? <FiCheck size={13} /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{children}</span>
        {note && <span className="block truncate text-[10px] text-bc-muted">{note}</span>}
      </span>
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 border-t border-bc-border" />;
}

/** Ueberschrift innerhalb einer Klappe — gruppiert, ohne anklickbar zu sein. */
export function MenuHeading({ children }: { children: ReactNode }) {
  return (
    <div
      style={{ padding: '6px 12px 4px' }}
      className="text-[10px] uppercase tracking-wider text-bc-muted"
    >
      {children}
    </div>
  );
}
