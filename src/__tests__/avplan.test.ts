import { describe, it, expect } from 'vitest';
import { makeAvPlan, parseAvPlan, AVPLAN_KIND, type AvPlan } from '../utils/avplan';

const venue = { name: 'Halle', widthM: 20, heightM: 12, persons: [], walls: [], stageObjects: [] };

describe('avplan (MultiCam — Slot "cameras")', () => {
  it('Round-Trip erhaelt alle Domaenen 1:1', () => {
    const ex = makeAvPlan({
      app: 'multicam-planner', appVersion: '0.4.0', exportedAt: 't', venue,
      domains: {
        cameras: { formatVersion: 1, cameras: [{ id: 'c1', label: 'CAM 1' }] },
        lighting: { fixtures: [{ id: 'f1', dimming: 0.7 }] },
        cabling: { equipment: [{ id: 'e1' }] },
      },
    });
    expect(ex.kind).toBe(AVPLAN_KIND);
    const back = parseAvPlan(JSON.stringify(ex));
    expect(back.domains.cameras).toEqual(ex.domains.cameras);
    expect(back.domains.lighting).toEqual({ fixtures: [{ id: 'f1', dimming: 0.7 }] });
  });

  it('Passthrough: MultiCam bearbeitet cameras, reicht lighting/cabling 1:1 durch', () => {
    const original: AvPlan = makeAvPlan({
      app: 'light-planner', appVersion: '1.0.0', exportedAt: 't', venue,
      domains: { lighting: { fixtures: [{ id: 'f1', gelFilterIds: ['L201'], dimming: 0.5 }] } },
    });
    const loaded = parseAvPlan(JSON.stringify(original));
    // MultiCam aendert NUR seinen cameras-Slot, gibt lighting unveraendert zurueck.
    const re = makeAvPlan({
      app: 'multicam-planner', appVersion: '0.4.0', exportedAt: 't2', venue: loaded.venue,
      domains: {
        cameras: { formatVersion: 1, cameras: [{ id: 'c1', label: 'CAM 1' }] },
        lighting: loaded.domains.lighting,
        cabling: loaded.domains.cabling,
      },
    });
    const after = parseAvPlan(JSON.stringify(re));
    expect(after.domains.lighting).toEqual(original.domains.lighting);
  });

  it('lehnt fremde Dateien ab', () => {
    expect(() => parseAvPlan('{"kind":"mcplan"}')).toThrow();
  });
});
