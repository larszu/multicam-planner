import { describe, it, expect } from 'vitest';
import { foreignFixturesFrom, cctToColor } from '../utils/foreignView';

describe('foreignView (read-only Lampen aus fremder .avplan-Domaene)', () => {
  it('extrahiert platzierte Lampen defensiv', () => {
    const lighting = {
      fixtures: [
        { id: 'f1', x: 3, y: 4, currentColorTemp: 3200, aimX: 3, aimY: 1, dimming: 0.8, fixture: { name: 'ETC S4' } },
        { id: 'f2', x: 5, y: 6 },
        { id: 'bad', x: 'nope', y: 2 }, // ungueltig -> ignoriert
        null,
      ],
    };
    const fx = foreignFixturesFrom(lighting);
    expect(fx).toHaveLength(2);
    expect(fx[0]).toMatchObject({ id: 'f1', x: 3, y: 4, colorTemp: 3200, name: 'ETC S4', aimX: 3, aimY: 1, dimming: 0.8 });
    expect(fx[1]).toMatchObject({ id: 'f2', x: 5, y: 6 });
  });

  it('wirft nie bei kaputten/leeren Domaenen', () => {
    expect(foreignFixturesFrom(undefined)).toEqual([]);
    expect(foreignFixturesFrom(null)).toEqual([]);
    expect(foreignFixturesFrom({})).toEqual([]);
    expect(foreignFixturesFrom({ fixtures: 'x' })).toEqual([]);
    expect(foreignFixturesFrom(42)).toEqual([]);
  });

  it('cctToColor liefert eine Farbe fuer jede Temperatur', () => {
    expect(cctToColor(3000)).toMatch(/^#/);
    expect(cctToColor(6500)).toMatch(/^#/);
    expect(cctToColor(undefined)).toMatch(/^#/);
  });
});
