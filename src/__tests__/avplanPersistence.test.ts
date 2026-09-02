import { describe, it, expect } from 'vitest';
import { buildProjectFile } from '../store/useStore';
import type { ProjectFile, Venue } from '../types';

// ADR-005 (Verlustfrei oder laut), Inkrement 1.
//
// Der bestehende Test in avplan.test.ts beweist, dass das FORMAT verlustfrei
// serialisiert — und baut den Re-Export dabei von Hand aus `loaded.domains`.
// Er konnte deshalb nie bemerken, dass die APP die Fremd-Domaenen zwischen
// Speichern und Laden verliert, weil `avForeign` nur im Store lag und
// `saveProject` neun benannte Keys schrieb.
//
// Dieser Test prueft den Weg, den ein Nutzer wirklich geht: .avplan
// importieren, speichern, morgen weiterarbeiten, .avplan exportieren.

const venue = { name: 'Halle', widthM: 20, heightM: 12, stages: [] } as unknown as Venue;

const state = (avForeign: { lighting?: unknown; cabling?: unknown }) => ({
  projectVersion: 3,
  venue,
  cameras: [],
  persons: [],
  walls: [],
  backgroundPlan: null,
  avForeign,
  stageForeign: {},
  floorPlanForeign: {},
  wallForeign: {},
});

const LIGHTING = { fixtures: [{ id: 'f1', dimming: 0.7, gelFilterIds: ['L201'] }] };
const CABLING = { equipment: [{ id: 'e1', name: 'Switcher' }] };

describe('ADR-005 — Fremd-Domaenen ueberleben das native Speichern', () => {
  it('schreibt lighting und cabling in die Projektdatei', () => {
    const file = buildProjectFile(state({ lighting: LIGHTING, cabling: CABLING }));
    expect(file.avForeign?.lighting).toEqual(LIGHTING);
    expect(file.avForeign?.cabling).toEqual(CABLING);
  });

  it('haelt sie ueber einen vollen Datei-Round-Trip', () => {
    // Genau der Weg, auf dem sie bisher verschwanden.
    const saved = JSON.parse(
      JSON.stringify(buildProjectFile(state({ lighting: LIGHTING, cabling: CABLING }))),
    ) as ProjectFile;
    const reloaded = state(saved.avForeign ?? {});
    const exported = buildProjectFile(reloaded);
    expect(exported.avForeign?.lighting).toEqual(LIGHTING);
    expect(exported.avForeign?.cabling).toEqual(CABLING);
  });

  it('schreibt kein leeres Feld, wenn es keine Fremd-Domaenen gibt', () => {
    // Ein `avForeign: {}` in jeder Datei waere Ballast — und eine Behauptung,
    // es habe eine Fremd-Domaene gegeben.
    expect('avForeign' in buildProjectFile(state({}))).toBe(false);
  });

  it('traegt eine einzelne Domaene, ohne die fehlende zu erfinden', () => {
    const file = buildProjectFile(state({ lighting: LIGHTING }));
    expect(file.avForeign?.lighting).toEqual(LIGHTING);
    expect(file.avForeign?.cabling).toBeUndefined();
  });

  it('reicht durch, was es nicht kennt', () => {
    // Der Sinn des opaken Durchreichens: MultiCam interpretiert den Inhalt
    // nicht und darf ihn deshalb auch nicht beschneiden.
    const exotic = { fixtures: [], zukunftsFeld: { tief: [1, 2, 3] } };
    const file = buildProjectFile(state({ lighting: exotic }));
    expect(file.avForeign?.lighting).toEqual(exotic);
  });
});
