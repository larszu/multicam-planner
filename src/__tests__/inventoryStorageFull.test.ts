import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Ein Lager, das nicht geschrieben wurde, ist kein Lager.
//
// BEFUND (Defektformen-Sweep, Backlog B-36 der av-planner-suite, Form
// `zustand-nach-fehler`). `src/inventory/store.ts` schrieb ueber `saveJSON`,
// und dessen `catch` ist leer — mit dem Kommentar `/* quota exceeded */`.
//
// Damit meldete der Import „N Objekte importiert", der Bestand stand in der
// Oberflaeche, und beim naechsten Start war er weg. Ein Undo fuer diesen
// Store gibt es nicht, und es sind PROJEKTUEBERGREIFENDE Stammdaten: Geraete,
// Lagerorte, Einheiten, Codes.
//
// Das Mittel dagegen liegt im selben Repo und wird seit #62 fuer Shotlisten
// und Rig-Takes benutzt: `saveJSONSafe` plus ein `…StorageFull`-Merker, den
// die Oberflaeche zeigt. Ausgerechnet die Stammdaten hatten es nicht — und
// gerade dort faellt der Verlust erst am naechsten Tag auf.
//
// Der Test faehrt denselben Aufbau wie `shotlistStore.test.ts`: ein
// localStorage-Stub, der auf Wunsch wirft.
// ---------------------------------------------------------------------------

const store: Record<string, string> = {};
let quotaFull = false;

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  quotaFull = false;
  vi.resetModules();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      if (quotaFull) throw new Error('QuotaExceededError');
      store[key] = value;
    },
    removeItem: (key: string) => { delete store[key]; },
  });
});

async function frischerStore() {
  const mod = await import('../inventory/store');
  return mod.useInventoryStore;
}

const artikel = { model: 'Testgeraet', quantity: 1 } as never;

describe('Lager: ein gescheiterter Schreibvorgang wird gemeldet', () => {
  it('im Normalfall ist nichts voll', async () => {
    const s = await frischerStore();
    s.getState().addItem(artikel);
    expect(s.getState().storageFull).toBe(false);
    expect(s.getState().items).toHaveLength(1);
  });

  it('und der Bestand steht wirklich im Speicher', async () => {
    // Gegenprobe zum Test darueber: `storageFull === false` waere auch dann
    // wahr, wenn gar nicht geschrieben wuerde.
    const s = await frischerStore();
    s.getState().addItem(artikel);
    expect(Object.keys(store).length).toBeGreaterThan(0);
  });

  it('ein voller Speicher meldet sich beim Anlegen', async () => {
    const s = await frischerStore();
    quotaFull = true;
    s.getState().addItem(artikel);
    expect(s.getState().storageFull).toBe(true);
    // Der Artikel steht trotzdem in der Sitzung — das ist richtig so: ihn
    // stillschweigend zu verwerfen waere ein zweiter Verlust. Er ist nur
    // nicht dauerhaft, und genau das sagt der Merker.
    expect(s.getState().items).toHaveLength(1);
  });

  it('und beim Import, wo es am meisten kostet', async () => {
    const s = await frischerStore();
    quotaFull = true;
    const n = s.getState().importSnapshot(
      { items: [{ id: 'a', model: 'X', quantity: 2 } as never] },
      'replace',
    );
    expect(n).toBe(1);
    expect(s.getState().storageFull).toBe(true);
  });

  it('nach einem geglueckten Schreibvorgang faellt der Merker zurueck', async () => {
    // Sonst bliebe die Warnung stehen, nachdem der Nutzer Platz geschaffen
    // hat — und eine Warnung, die nicht mehr weggeht, wird ignoriert.
    const s = await frischerStore();
    quotaFull = true;
    s.getState().addItem(artikel);
    expect(s.getState().storageFull).toBe(true);
    quotaFull = false;
    s.getState().addItem(artikel);
    expect(s.getState().storageFull).toBe(false);
  });
});
