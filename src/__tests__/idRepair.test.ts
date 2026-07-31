import { describe, expect, it } from 'vitest';
import { dedupeIds, maxIdSuffix } from '../utils/idRepair';

// Hintergrund: #72 — nach dem Laden eines Plans sprang ein altes Objekt an die
// Position eines neu hinzugefuegten und verschwand aus der 3D-Ansicht. Ursache
// waren doppelte Ids.

describe('maxIdSuffix', () => {
  it('findet die hoechste Nummer', () => {
    expect(maxIdSuffix(['cam-1', 'cam-7', 'cam-3'])).toBe(7);
  });

  it('mischt Praefixe, weil ein Zaehler mehrere bedient', () => {
    // `nextId` vergibt sowohl cam- als auch wall-Ids.
    expect(maxIdSuffix(['cam-2', 'wall-9'])).toBe(9);
  });

  it('ignoriert Ids ohne Nummer', () => {
    expect(maxIdSuffix(['stage-0', 'custom-abc', 'take-x9y'])).toBe(0);
  });

  it('liefert 0 fuer eine leere Liste', () => {
    expect(maxIdSuffix([])).toBe(0);
  });

  it('laesst sich nicht von Nummern in der Mitte taeuschen', () => {
    expect(maxIdSuffix(['cam-12-alt'])).toBe(0);
  });
});

describe('dedupeIds', () => {
  const gen = () => {
    let n = 100;
    return () => `neu-${n++}`;
  };

  it('laesst eindeutige Ids unangetastet', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const res = dedupeIds(items, gen());
    expect(res.items).toEqual(items);
    expect(res.repaired).toBe(0);
  });

  it('repariert Dubletten und behaelt den ersten Eintrag', () => {
    // Der erste behaelt die Id, damit ein Fokus-Lock oder Shot, der schon auf
    // sie zeigt, weiter auf ein existierendes Objekt trifft.
    const res = dedupeIds([{ id: 'a', v: 1 }, { id: 'a', v: 2 }], gen());
    expect(res.items[0]).toEqual({ id: 'a', v: 1 });
    expect(res.items[1].id).toBe('neu-100');
    expect(res.items[1].v).toBe(2);
    expect(res.repaired).toBe(1);
  });

  it('vergibt auch fuer leere Ids eine neue', () => {
    const res = dedupeIds([{ id: '' }], gen());
    expect(res.items[0].id).toBe('neu-100');
    expect(res.repaired).toBe(1);
  });

  it('weicht aus, wenn der Generator eine belegte Id liefert', () => {
    let n = 0;
    const collide = () => (n++ === 0 ? 'a' : 'frei');
    const res = dedupeIds([{ id: 'a' }, { id: 'a' }], collide);
    expect(res.items[1].id).toBe('frei');
  });

  it('mutiert die Eingabe nicht', () => {
    const items = [{ id: 'a' }, { id: 'a' }];
    dedupeIds(items, gen());
    expect(items[1].id).toBe('a');
  });

  it('macht auch mehrfach doppelte Ids eindeutig', () => {
    const res = dedupeIds([{ id: 'a' }, { id: 'a' }, { id: 'a' }], gen());
    expect(new Set(res.items.map((i) => i.id)).size).toBe(3);
    expect(res.repaired).toBe(2);
  });
});
