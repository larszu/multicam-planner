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
  domains: {
    cameras?: unknown;
    lighting?: unknown;
    cabling?: unknown;
  };
}

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
