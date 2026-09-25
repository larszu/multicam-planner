// ───────────────────────────────────────────────────────────────────────────
// Abgleich mit der Geraetebibliothek — rein, ohne fetch und ohne Speicher.
//
// Inkrementell: der Server liefert alles mit `seq > after`, dazu `latestSeq`.
// Der Cache merkt sich den hoechsten gesehenen Stand und fragt beim naechsten
// Mal nur danach. Ein Geraet kommt immer als GANZES in seiner neuesten
// Fassung, also ersetzt es den Eintrag; `removed` loescht ihn.
//
// Ein Facet, das die Pruefung des Planners nicht besteht, wird uebersprungen
// und gezaehlt. Stand dasselbe Geraet schon im Cache, faellt es heraus: die
// Bibliothek sagt ueber die alte Fassung nichts mehr, und eine Kamera, deren
// aktuelle Fassung wir nicht lesen koennen, als gueltig weiterzufuehren,
// hiesse Daten zu zeigen, die es so nicht mehr gibt.
//
// Der Cache gehoert zu EINEM Server. Wechselt die Adresse, beginnt er leer —
// Slugs und Sequenznummern sind nur innerhalb eines Servers eindeutig.
// ───────────────────────────────────────────────────────────────────────────
import type { SyncDevice, SyncResponse } from '../utils/deviceLibraryClient';
import { facetToItem, type LibraryItem } from './facet';

export type LibraryEntry = LibraryItem & {
  slug: string;
  version: number;
  seq: number;
  status: SyncDevice['status'];
  confirmations: number;
};

export interface LibraryCache {
  server: string;
  latestSeq: number;
  entries: LibraryEntry[];
}

export interface SyncStats {
  added: number;
  updated: number;
  removed: number;
  invalid: number;
}

export const emptyCache = (server: string): LibraryCache => ({ server, latestSeq: 0, entries: [] });

export function mergeSync(cache: LibraryCache, response: SyncResponse): { cache: LibraryCache; stats: SyncStats } {
  const stats: SyncStats = { added: 0, updated: 0, removed: 0, invalid: 0 };
  const map = new Map(cache.entries.map((e) => [e.slug, e]));
  for (const d of response.devices) {
    const vorher = map.has(d.slug);
    if (d.removed) {
      if (map.delete(d.slug)) stats.removed += 1;
      continue;
    }
    const item = facetToItem(d);
    if (!item) {
      stats.invalid += 1;
      map.delete(d.slug);
      continue;
    }
    map.set(d.slug, {
      ...item,
      slug: d.slug,
      version: d.version,
      seq: d.seq,
      status: d.status,
      confirmations: d.confirmations,
    });
    if (vorher) stats.updated += 1;
    else stats.added += 1;
  }
  const seqs = response.devices.map((d) => d.seq);
  return {
    cache: {
      server: cache.server,
      latestSeq: Math.max(cache.latestSeq, response.latestSeq, ...seqs),
      entries: [...map.values()],
    },
    stats,
  };
}

/** Liest einen gespeicherten Cache; alles Unlesbare oder fuer einen anderen
 *  Server Gespeicherte ergibt einen leeren. */
export function readCache(raw: unknown, server: string): LibraryCache {
  if (!raw || typeof raw !== 'object') return emptyCache(server);
  const c = raw as Partial<LibraryCache>;
  if (c.server !== server || typeof c.latestSeq !== 'number' || !Array.isArray(c.entries)) return emptyCache(server);
  return { server, latestSeq: c.latestSeq, entries: c.entries };
}
