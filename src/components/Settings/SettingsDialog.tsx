// ───────────────────────────────────────────────────────────────────────────
// Die Einstellungen — hinter dem Knopf rechts aussen in der Kopfzeile, an
// derselben Stelle wie im Cable Planner (ADR-007 Abschnitt 6).
//
// WAS DRIN STEHT, UND WAS NICHT. Der gemeinsame Grundstock der Suite ist
// Sprache, Thema und „Ueber". Zwei davon stehen hier.
//
// DAS THEMA IST SEIT DEM 2026-09-11 DA (B-70). Hier stand bis dahin, warum
// es FEHLT — und die Begruendung war richtig, nicht bequem: die bc-*-Token
// waeren zwar umgesprungen, aber `src/` trug 406 rohe Farb-Utilities in 17
// Dateien, die von keinem Token abhaengen. Ein Umschalter haette eine halb
// umgefaerbte App geliefert: hellgrauer Text auf weissem Grund. Das ist
// schlimmer als kein Schalter, weil es aussieht wie eine Faehigkeit.
//
// Die 406 Stellen sind jetzt Token, `scripts/rohe-farben-check.mjs` haelt es auf
// null, und die Textrampe hat dafuer zwei Stufen mehr bekommen (`bc-dim`,
// `bc-faint`) — fuenf Graustufen auf drei Token zu quetschen haette die
// Hierarchie zerstoert: der Hinweis unter einem Feld saehe aus wie sein Wert.
//
// (Dieser Absatz nennt die alten Klassennamen bewusst NICHT mehr woertlich.
// Er tat es, und der Umstellungs-Lauf hat sie prompt mit-ersetzt — die
// Begruendung las sich danach als „`src/` traegt rohe Graustufen, naemlich
// `text-bc-text-bright`". Ein Beleg, der beim naechsten Sweep mitwandert,
// ist keiner. Der Waechter schneidet Kommentare deshalb vor dem Zaehlen
// weg: wer nicht mehr erklaeren darf, schaltet ihn ab.)
//
// WAS AUSDRUECKLICH NICHT MITSPRINGT: die Kamera-Vorschau und die
// 3D-Ansicht. Sie zeigen einen SIMULIERTEN Raum, wie ihn ein Objektiv sehen
// wuerde — ein „helles" Kamerabild waere kein anderes Aussehen, sondern eine
// andere Beleuchtung, also eine Aussage ueber den Saal, die niemand gemacht
// hat. Das steht in `index.css` neben den Werten und ist eine Entscheidung,
// kein Rest.
//
// DIE SPRACHE stand bis heute nur im Store und wurde ausschliesslich von der
// Suite-Shell gesetzt. Wer MultiCam allein benutzt — als Web-Seite oder als
// Electron-App —, hatte keinen Weg zu ihr. Genau das ist der Punkt eines
// Einstellungen-Dialogs an einer festen Stelle.
// ───────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { APP_VERSION } from '../../store/useStore';
import { useTranslation, type Language } from '../../i18n';
import { liesThema, setzeThema, type Thema } from '../../lib/thema';

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
];

export default function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { t, language, setLanguage } = useTranslation();
  const [thema, setThema] = useState<Thema>(liesThema);

  /* Drei Zustaende, weil „System" keine Umschreibung fuer „dunkel" ist. */
  const THEMEN: { id: Thema; label: string; hint: string }[] = [
    { id: 'system', label: t('settings.theme.system', 'System'), hint: t('settings.theme.system.hint', 'Follows the operating system.') },
    { id: 'dunkel', label: t('settings.theme.dark', 'Dark'), hint: t('settings.theme.dark.hint', 'Always dark.') },
    { id: 'hell', label: t('settings.theme.light', 'Light'), hint: t('settings.theme.light.hint', 'Always light.') },
  ];

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-bc-scrim p-4"
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
              {t('settings.theme', 'Theme')}
            </h3>
            <p className="mt-1 text-xs text-bc-muted">
              {t(
                'settings.theme.desc',
                'The camera preview and the 3D view stay as they are: they show a simulated room, and a lighter one would be a different lighting, not a different skin.',
              )}
            </p>
            <div className="mt-2 flex gap-1">
              {THEMEN.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  title={w.hint}
                  onClick={() => {
                    setThema(w.id);
                    setzeThema(w.id);
                  }}
                  style={{ padding: '6px 12px' }}
                  className={`border text-xs transition-colors ${
                    thema === w.id
                      ? 'border-bc-accent bg-bc-accent text-bc-accent-text'
                      : 'border-bc-border text-bc-text hover:bg-bc-panel-raised'
                  }`}
                >
                  {w.label}
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
