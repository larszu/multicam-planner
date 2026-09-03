import { describe, it, expect } from 'vitest';
import {
  makeAvPlan, parseAvPlan, AVPLAN_KIND,
  KNOWN_DOMAIN_SLOTS, unknownDomainSlots, pickUnknownDomains,
  type AvPlan,
} from '../utils/avplan';

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

// ADR-005 Design-Frage 4 — ein Slot, den DIESES Format nicht benennt.
//
// Gemessener Ausgangszustand: keine der drei Apps reichte einen vierten
// Domaenen-Slot durch. `parseAvPlan` nahm die Datei trotzdem an — weder
// bewahrt noch verweigert noch gemeldet, das einzige der drei denkbaren
// Verhalten, das nicht vertretbar ist. Entschieden: bewahren.
describe('unbekannte Domaenen-Slots', () => {
  const withForeign = () =>
    makeAvPlan({
      app: 'irgendwer', appVersion: '9.9.9', exportedAt: 't', venue,
      domains: {
        cameras: { formatVersion: 1, cameras: [] },
        audio: { channels: 32 },
        rigging: { points: 4 },
      },
    });

  it('nennt genau die Slots, die das Format nicht kennt', () => {
    expect(unknownDomainSlots(withForeign())).toEqual(['audio', 'rigging']);
  });

  it('haelt keinen der drei bekannten Slots faelschlich fuer fremd', () => {
    for (const slot of KNOWN_DOMAIN_SLOTS) {
      const plan = makeAvPlan({
        app: 'x', appVersion: '1', exportedAt: 't', venue, domains: { [slot]: {} },
      });
      expect(unknownDomainSlots(plan)).toEqual([]);
    }
  });

  it('haelt einen leeren Slot nicht faelschlich fuer vorhanden', () => {
    const plan = makeAvPlan({
      app: 'x', appVersion: '1', exportedAt: 't', venue,
      domains: { cameras: {}, audio: undefined },
    });
    expect(unknownDomainSlots(plan)).toEqual([]);
  });

  it('ueberlebt die Runde Datei -> parse -> Export -> parse', () => {
    const loaded = parseAvPlan(JSON.stringify(withForeign()));
    const carried = pickUnknownDomains(loaded);
    expect(carried).toEqual({ audio: { channels: 32 }, rigging: { points: 4 } });

    const re = makeAvPlan({
      app: 'multicam-planner', appVersion: '0.4.0', exportedAt: 't', venue,
      domains: {
        ...carried,
        cameras: { formatVersion: 1, cameras: [{ id: 'c1' }] },
        lighting: loaded.domains.lighting,
        cabling: loaded.domains.cabling,
      },
    });
    const after = parseAvPlan(JSON.stringify(re));
    expect(after.domains.audio).toEqual({ channels: 32 });
    expect(after.domains.rigging).toEqual({ points: 4 });
    // Kein Versionssprung — das Durchreichen ist keine neue Format-Version.
    expect(after.formatVersion).toBe(1);
  });

  it('laesst einen fremden Slot nie den eigenen ueberschreiben', () => {
    const re = makeAvPlan({
      app: 'multicam-planner', appVersion: '0.4.0', exportedAt: 't', venue,
      domains: {
        ...{ cameras: { fremd: true } },
        cameras: { formatVersion: 1, cameras: [{ id: 'c1' }] },
      },
    });
    expect((re.domains.cameras as { cameras: unknown[] }).cameras).toEqual([{ id: 'c1' }]);
  });
});
