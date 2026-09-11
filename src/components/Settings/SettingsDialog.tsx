// ───────────────────────────────────────────────────────────────────────────
// Die Einstellungen — hinter dem Knopf rechts aussen in der Kopfzeile, an
// derselben Stelle wie im Cable Planner (ADR-007 Abschnitt 6).
//
// WAS DRIN STEHT, UND WAS NICHT. Der gemeinsame Grundstock der Suite ist
// Sprache, Thema und „Ueber". Zwei davon stehen hier.
//
// DAS THEMA FEHLT, UND ZWAR GEMESSEN. Ein Hell-Thema waere in dieser App
// keine Zeile im Stilblatt: die bc-*-Token wuerden zwar umspringen, aber
// `src/` traegt (Stand 2026-09-11) 464 rohe Tailwind-Graustufen —
// `text-white`, `text-gray-400/500/600` — in 17 Dateien, die von keinem Token
// abhaengen und deshalb dunkel blieben. Dazu kommt der 2D-Plan, der seine
// Farben im Canvas zeichnet, und das FlexLayout-Thema. Ein Umschalter, der
// eine halb umgefaerbte App liefert, waere schlimmer als keiner: er sieht aus
// wie eine Faehigkeit. Die Umstellung der 464 Stellen auf die Token ist eine
// eigene Arbeit mit eigener Sichtpruefung — sie steht als B-70 im Backlog der
// Suite und NICHT als ausgegrauter Punkt in diesem Dialog.
//
// DIE SPRACHE stand bis heute nur im Store und wurde ausschliesslich von der
// Suite-Shell gesetzt. Wer MultiCam allein benutzt — als Web-Seite oder als
// Electron-App —, hatte keinen Weg zu ihr. Genau das ist der Punkt eines
// Einstellungen-Dialogs an einer festen Stelle.
// ───────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { APP_VERSION } from '../../store/useStore';
import { useTranslation, type Language } from '../../i18n';

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
];

export default function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { t, language, setLanguage } = useTranslation();

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 p-4"
      /* B-44 — Klick auf den Hintergrund schliesst. Hier ohne Schutzabfrage:
         in diesem Dialog gibt es kein ungesichertes Eingabefeld, jede
         Auswahl wirkt sofort. */
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.title', 'Settings')}
        className="flex max-h-[80vh] w-full max-w-[520px] flex-col border border-bc-border bg-bc-panel"
      >
        <div className="bc-panel-head justify-between">
          <span className="text-sm font-bold text-bc-text-bright">{t('settings.title', 'Settings')}</span>
          <button
            type="button"
            onClick={onClose}
            className="text-bc-muted transition-colors hover:text-bc-text-bright"
            aria-label={t('settings.close', 'Close settings')}
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Der Rumpf scrollt, der Kopf bleibt — ADR-007 Abschnitt 6. */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '16px' }}>
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-bc-muted">
              {t('settings.language', 'Language')}
            </h3>
            <p className="mt-1 text-xs text-bc-muted">
              {t(
                'settings.language.desc',
                'English is the source language; German is a translation. A missing entry falls back to English.',
              )}
            </p>
            <div className="mt-2 flex gap-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLanguage(l.id)}
                  style={{ padding: '6px 12px' }}
                  className={`border text-xs transition-colors ${
                    language === l.id
                      ? 'border-bc-accent bg-bc-accent text-bc-accent-text'
                      : 'border-bc-border text-bc-text hover:bg-bc-panel-raised'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </section>

          <section style={{ marginTop: '24px' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-bc-muted">
              {t('settings.about', 'About')}
            </h3>
            <p className="mt-1 text-xs text-bc-text">MultiCam Planner</p>
            {/* Die Version lebt in `package.json` und kommt ueber das
                Vite-Define herein — nirgends hardgeschrieben. */}
            <p className="mt-0.5 text-xs text-bc-muted">v{APP_VERSION}</p>
            <p className="mt-2 text-xs text-bc-muted">
              {t(
                'settings.about.suite',
                'Part of the AV Planner suite — camera positions, lenses, coverage and shift handover.',
              )}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
