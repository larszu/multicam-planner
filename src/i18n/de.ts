/**
 * Deutsches Override-Dictionary für MultiCam, aus Domänen-Teildicts komponiert.
 * Englisch bleibt Quell-Sprache (Fallback im JSX via t(key, 'English')).
 */
import { sidebar } from './de/sidebar';
import { header } from './de/header';
import { preview } from './de/preview';
import { venue } from './de/venue';
import { inventory } from './de/inventory';
import { common } from './de/common';

export const de: Record<string, string> = {
  ...sidebar,
  ...header,
  ...preview,
  ...venue,
  ...inventory,
  ...common,
};
