import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { VenueExchange } from '../utils/venueExchange';

// ADR-005, Inkrement 4, Regel 2 — der Weg, auf dem es wirklich passiert.
//
// venueExchange.test.ts prueft den Helfer. DIESER Test geht durch den Store:
// `importVenueExchange` setzte `venue: r.venue` als GANZES. Trug die Datei
// keine Raum-Masse, stand in `r.venue` die Notloesung 20x12 — die
// 45x30-m-Halle des Nutzers war nach dem Import weg, und beim naechsten
// Export stand die erfundene Groesse als Tatsache in der Datei.
//
// `widthM`/`heightM` sind im Austauschformat ausdruecklich optional: der
// light-planner modelliert die Raumgroesse nicht und schreibt sie nur, wenn
// er sie vorher eingelesen hat (light#46). Solche Dateien sind der Normalfall,
// nicht die Ausnahme.

const store: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  vi.resetModules();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  });
});

const freshStore = async () => (await import('../store/useStore')).useStore;

const exchange = (venue: Partial<VenueExchange['venue']>): VenueExchange => ({
  kind: 'venue-exchange', formatVersion: 1, app: 'light-planner',
  appVersion: '1.0', exportedAt: 't',
  venue: { name: 'Halle', persons: [], walls: [], stageObjects: [], ...venue },
});

describe('importVenueExchange — der eigene Raum ueberlebt eine schweigende Datei', () => {
  it('behaelt 45x30, wenn die Datei keine Masse traegt', async () => {
    const useStore = await freshStore();
    useStore.setState({ venue: { ...useStore.getState().venue, widthM: 45, heightM: 30 } });

    useStore.getState().importVenueExchange(exchange({}));

    const venue = useStore.getState().venue;
    expect(venue.widthM).toBe(45);
    expect(venue.heightM).toBe(30);
  });

  it('uebernimmt die Masse, wenn die Datei sie traegt', async () => {
    // Der Import bleibt ein Import: sagt die Datei etwas, gewinnt sie.
    const useStore = await freshStore();
    useStore.setState({ venue: { ...useStore.getState().venue, widthM: 45, heightM: 30 } });

    useStore.getState().importVenueExchange(exchange({ widthM: 12, heightM: 8 }));

    expect(useStore.getState().venue.widthM).toBe(12);
    expect(useStore.getState().venue.heightM).toBe(8);
  });

  it('gilt auch fuer den .avplan-Import — er geht durch denselben Weg', async () => {
    const useStore = await freshStore();
    useStore.setState({ venue: { ...useStore.getState().venue, widthM: 45, heightM: 30 } });

    useStore.getState().importAvPlan({
      kind: 'avplan', formatVersion: 1, app: 'light-planner', appVersion: '1.0',
      exportedAt: 't',
      venue: { name: 'Halle', persons: [], walls: [], stageObjects: [] },
      domains: { lighting: { some: 'thing' } },
    });

    expect(useStore.getState().venue.widthM).toBe(45);
    expect(useStore.getState().venue.heightM).toBe(30);
  });

  it('der Name kommt weiterhin aus der Datei — nur das Schweigen ueberschreibt nicht', async () => {
    const useStore = await freshStore();
    useStore.setState({ venue: { ...useStore.getState().venue, widthM: 45, heightM: 30 } });

    useStore.getState().importVenueExchange(exchange({ name: 'Studio B' }));

    expect(useStore.getState().venue.name).toBe('Studio B');
    expect(useStore.getState().venue.widthM).toBe(45);
  });
});
