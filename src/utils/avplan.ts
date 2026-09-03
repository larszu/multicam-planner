// ───────────────────────────────────────────────────────────────────────────
// .avplan — gemeinsames, VERLUSTFREIES Gesamtprojektformat fuer alle drei Apps
//
// Schema-identisch zu light-planner src/core/avplan.ts und cable-planner
// src/renderer/lib/avplan.ts. MultiCam bearbeitet den "cameras"-Slot nativ und
// reicht "lighting"/"cabling" 1:1 durch — so geht beim Austausch mit Light-/
// Cable-Planner kein Detail verloren.
// ───────────────────────────────────────────────────────────────────────────
import type { VenueExchange } from './venueExchange';

export const AVPLAN_KIND = 'avplan' as const;
export const AVPLAN_VERSION = 1 as const;

export type AvVenue = VenueExchange['venue'];

export interface AvPlan {
  kind: typeof AVPLAN_KIND;
  formatVersion: typeof AVPLAN_VERSION;
  app: string;
  appVersion: string;
  exportedAt: string;
  venue: AvVenue;
  /**
   * Die Domaenen-Slots. Die drei bekannten sind benannt; der Index-Zugang
   * daneben ist die eigentliche Aenderung.
   *
   * VORHER ging ein vierter Slot — eine kuenftige Audio- oder Rigging-Domaene,
   * eine App, die es noch nicht gibt — in JEDER der drei Richtungen verloren:
   * `parseAvPlan` nahm die Datei an, die App baute `domains` beim Export aus
   * genau den Slots neu, die sie kennt, und der Rest verschwand. Weder bewahrt
   * noch verweigert noch gemeldet — alle drei Auswege aus ADR-005 Regel 3
   * verfehlt.
   */
  domains: {
    cameras?: unknown;
    lighting?: unknown;
    cabling?: unknown;
    [slot: string]: unknown;
  };
}

/**
 * Die Slots, die dieses Format benennt. Als Daten, nicht als Prosa: nur so
 * kann `unknownDomainSlots` die Frage „was kenne ich hier nicht?" ueberhaupt
 * stellen, und nur so faellt ein Guard auf, wenn ein vierter Slot benannt
 * wird, ohne die Liste nachzuziehen.
 */
export const KNOWN_DOMAIN_SLOTS = ['cameras', 'lighting', 'cabling'] as const;

/** Slot-Namen in dieser Datei, die das Format nicht benennt. */
export const unknownDomainSlots = (plan: AvPlan): string[] =>
  Object.keys(plan.domains ?? {})
    .filter((slot) => !(KNOWN_DOMAIN_SLOTS as readonly string[]).includes(slot))
    .filter((slot) => plan.domains[slot] !== undefined)
    .sort();

/** Die unbekannten Slots als eigenes Objekt — so wandern sie ins Projektfile. */
export const pickUnknownDomains = (plan: AvPlan): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const slot of unknownDomainSlots(plan)) out[slot] = plan.domains[slot];
  return out;
};


export function makeAvPlan(args: {
  app: string;
  appVersion: string;
  exportedAt: string;
  venue: AvVenue;
  domains: AvPlan['domains'];
}): AvPlan {
  return {
    kind: AVPLAN_KIND,
    formatVersion: AVPLAN_VERSION,
    app: args.app,
    appVersion: args.appVersion,
    exportedAt: args.exportedAt,
    venue: args.venue,
    domains: { ...args.domains },
  };
}

export function parseAvPlan(text: string): AvPlan {
  const data = JSON.parse(text) as Partial<AvPlan>;
  if (!data || data.kind !== AVPLAN_KIND) {
    throw new Error('Keine gueltige .avplan-Datei (kind != avplan).');
  }
  if (data.formatVersion !== AVPLAN_VERSION) {
    throw new Error(`Nicht unterstuetzte .avplan-Version: ${data.formatVersion}`);
  }
  if (!data.venue || !data.domains) throw new Error('.avplan ohne venue/domains.');
  return data as AvPlan;
}
