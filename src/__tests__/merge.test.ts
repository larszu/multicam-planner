import { describe, expect, it } from 'vitest';
import { mergeById, mergeDefined } from '../inventory/merge';

// ADR-005, Inkrement 4, Regel 2 — eine Projektion darf nicht ueberschreiben.
//
// Der Lager-Import nahm im Modus „merge" den eingehenden Datensatz als GANZES
// (`byId.set(x.id, x)`). Eine v1-Datei aus der Zeit vor ADR-002 traegt keine
// `deviceTypeId`; stand im lokalen Lager derselbe Artikel MIT bestaetigter
// Typ-Identitaet, war sie nach dem Import weg.
//
// Das Format ist app-uebergreifend, also muss sein Zusammenfuehren in allen
// drei Apps dasselbe tun — dieser Test steht wortgleich im cable-planner
// (tests/inventoryMerge.test.ts) und in der jeweils anderen App.

interface Item {
  id: string;
  model: string;
  deviceTypeId?: string;
  notes?: string;
}

describe('mergeDefined — was die Datei nicht sagt, loescht nichts', () => {
  it('haelt den vorhandenen Wert, wenn der eingehende undefined ist', () => {
    const base: Item = { id: 'a', model: 'X', deviceTypeId: 'dt-1' };
    const over: Item = { id: 'a', model: 'X', deviceTypeId: undefined };
    expect(mergeDefined(base, over).deviceTypeId).toBe('dt-1');
  });

  it('uebernimmt einen gesetzten Wert — auch leeren String, 0 und false', () => {
    // Leerer String ist eine Aussage, undefined ist keine. Der Unterschied
    // ist der ganze Punkt.
    expect(mergeDefined({ notes: 'alt' }, { notes: '' }).notes).toBe('');
    expect(mergeDefined({ q: 5, l: true }, { q: 0, l: false })).toEqual({ q: 0, l: false });
  });
});

describe('mergeById — der eigentliche Fall', () => {
  const local: Item[] = [
    { id: 'i1', model: 'ULXD2', deviceTypeId: 'dt-shure-ulxd2', notes: 'Regal A3' },
    { id: 'i2', model: 'SM58' },
  ];

  it('eine aeltere v1-Datei loescht die bestaetigte deviceTypeId NICHT mehr', () => {
    const v1: Item[] = [{ id: 'i1', model: 'ULXD2', deviceTypeId: undefined, notes: undefined }];
    const merged = mergeById(local, v1).find((x) => x.id === 'i1')!;
    expect(merged.deviceTypeId).toBe('dt-shure-ulxd2');
    expect(merged.notes).toBe('Regal A3');
  });

  it('schreibt gesetzte Felder fort — der Import bleibt ein Import', () => {
    const merged = mergeById(local, [{ id: 'i1', model: 'ULXD2', notes: 'Case 7' }]).find(
      (x) => x.id === 'i1',
    )!;
    expect(merged.notes).toBe('Case 7');
    expect(merged.deviceTypeId).toBe('dt-shure-ulxd2');
  });

  it('haengt unbekannte Artikel an und haelt die Reihenfolge', () => {
    const out = mergeById(local, [{ id: 'i9', model: 'Neu' }]);
    expect(out.map((x) => x.id)).toEqual(['i1', 'i2', 'i9']);
  });
});
