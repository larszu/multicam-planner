/**
 * MultiCam-i18n.
 *
 * Anders als die übrigen Planer ist bei MultiCam **Englisch die Quell-Sprache**
 * und steht als Fallback direkt im JSX: `t('ns.key', 'English source')`. Das
 * deutsche Override-Dictionary (`de`) liefert nur die Übersetzung; fehlt ein
 * Key, bleibt der englische Quell-String stehen.
 *
 * Die Sprache lebt im Zustand-Store (`useStore`), wird unter `multicam-lang`
 * persistiert und von der Suite-Shell über die Settings-Bridge gesetzt.
 */
import { useStore, type Language } from '../store/useStore';
import { de } from './de';

export type { Language };

/** Reine Lookup-Funktion (auch außerhalb von React nutzbar). */
export function translate(language: Language, key: string, en: string): string {
  return language === 'de' && de[key] !== undefined ? de[key] : en;
}

/** Platzhalter einsetzen: format(t('x', '{n} cams'), { n: 5 }) → '5 cams'. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (values[k] === undefined ? `{${k}}` : String(values[k])));
}

/** Hook: liefert `t`, aktuelle Sprache und Setter, re-rendert bei Wechsel. */
export function useTranslation() {
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);
  const t = (key: string, en: string) => translate(language, key, en);
  return { t, language, setLanguage };
}
