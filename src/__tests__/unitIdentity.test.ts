// ───────────────────────────────────────────────────────────────────────────
// Zwei Identitaeten je Einheit — die Haelfte, die dieser Planer braucht
// (Bedarf 107, P3).
//
//   > Systems with a single code field force the warehouse to choose which
//   > identity to store; the other one is then needed for insurance, sub-hire
//   > to third parties and maintenance history, and gets kept in a spreadsheet
//   > or ON THE CASE WITH A MARKER.
//
// Dieser Planer druckt keine Versicherungsblaetter; er zeigt Einheiten nur
// intern. Deshalb steht hier nur die HAUS-Sicht — und deshalb muss trotzdem
// beides ANKOMMEN: eine Datei aus dem cable-planner traegt beide Nummern, und
// keine davon darf auf dem Weg durch diesen Planer verloren gehen.
// ───────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { parseInventory, resolveInventoryCode, serializeInventory, unitLabel } from '../inventory/portable';
import type { InventoryItem, InventoryUnit } from '../inventory/types';

const unit = (over: Partial<InventoryUnit> = {}): InventoryUnit => ({
  id: 'u1',
  itemId: 'i1',
  condition: 'ok',
  history: [],
  createdAt: 't',
  updatedAt: 't',
  ...over,
});

const item: InventoryItem = {
  id: 'i1', model: 'PXW-Z750', quantity: 1, createdAt: 't', updatedAt: 't',
};

describe('unitLabel — dieser Planer liest als Haus', () => {
  it('zeigt die Hausreferenz vorne', () => {
    expect(unitLabel(unit({ houseRef: 'AV-0421', serial: 'S0134-77', code: 'QR-9' }))).toBe('AV-0421');
  });

  it('benennt die Herstellernummer, wenn sie einspringt', () => {
    // Nackt waere sie eine Verwechslung: sie sieht aus wie eine Hausnummer.
    expect(unitLabel(unit({ serial: 'S0134-77' }))).toBe('S0134-77 (Herstellernummer)');
  });

  it('nimmt den Etiketten-Code erst an dritter Stelle', () => {
    expect(unitLabel(unit({ code: 'QR-9' }))).toBe('QR-9');
  });

  it('sagt „ohne Nummer" statt eine id-Hälfte zu zeigen', () => {
    const nackt = unit({ id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' });
    expect(unitLabel(nackt)).toBe('ohne Nummer');
    expect(unitLabel(nackt)).not.toContain('f47ac1');
  });

  it('behandelt reine Leerzeichen wie ein leeres Feld', () => {
    expect(unitLabel(unit({ houseRef: '  ', serial: 'S1' }))).toBe('S1 (Herstellernummer)');
  });
});

describe('die Hausreferenz kommt an und geht nicht verloren', () => {
  it('wird beim Scannen gefunden', () => {
    const u = unit({ houseRef: 'AV-0421', serial: 'S0134-77' });
    expect(resolveInventoryCode('av-0421', { items: [item], nodes: [], units: [u] })).toEqual({
      kind: 'unit',
      unit: u,
    });
    expect(resolveInventoryCode('S0134-77', { items: [item], nodes: [], units: [u] })).toEqual({
      kind: 'unit',
      unit: u,
    });
  });

  it('überlebt den Round-Trip durch dieses Format', () => {
    const u = unit({ houseRef: 'AV-0421', serial: 'S0134-77' });
    const back = parseInventory(serializeInventory({ items: [item], nodes: [], sets: [], units: [u] }));
    expect(back?.units[0].houseRef).toBe('AV-0421');
    expect(back?.units[0].serial).toBe('S0134-77');
  });

  it('weist eine Datei ab, die neuer ist als dieser Stand', () => {
    // Der eigentliche Grund fuer die Versions-Erhoehung: bliebe sie hier auf
    // 2, wiese dieser Planer JEDE Datei ab, die der cable-planner ab jetzt
    // schreibt.
    expect(parseInventory(JSON.stringify({ format: 'avplan-inventory', version: 3 }))).not.toBeNull();
    expect(parseInventory(JSON.stringify({ format: 'avplan-inventory', version: 4 }))).toBeNull();
  });
});
