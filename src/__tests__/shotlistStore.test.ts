import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveJSONSafe } from '../utils/storage';

// Store-Slice der Shotlist (#62 Punkt 5). Der Store liest localStorage beim
// Modul-Laden, deshalb wird der Stub VOR dem dynamischen Import gesetzt.
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

async function freshStore() {
  const mod = await import('../store/useStore');
  return mod.useStore;
}

const sampleShot = (name: string) => ({
  name,
  cameraId: 'cam-1',
  state: {
    x: 1, y: 2, z: 1.5, pan: 0, tilt: 0,
    focalLength: 35, aperture: 2.8, focusDistance: 4, trackOffset: 0,
  },
  transition: 'fast' as const,
});

describe('Shotlist-Store', () => {
  it('legt eine Shotlist an und aktiviert sie', async () => {
    const useStore = await freshStore();
    const id = useStore.getState().addShotlist('Show A');
    const s = useStore.getState();
    expect(s.shotlists).toHaveLength(1);
    expect(s.shotlists[0].name).toBe('Show A');
    expect(s.activeShotlistId).toBe(id);
  });

  it('haengt Shots in Aufnahme-Reihenfolge an', async () => {
    const useStore = await freshStore();
    const list = useStore.getState().addShotlist();
    useStore.getState().addShot(list, sampleShot('A'));
    useStore.getState().addShot(list, sampleShot('B'));
    expect(useStore.getState().shotlists[0].shots.map((s) => s.name)).toEqual(['A', 'B']);
  });

  it('vergibt eindeutige Ids auch bei Aufnahmen in derselben Millisekunde', async () => {
    const useStore = await freshStore();
    const list = useStore.getState().addShotlist();
    // Date.now einfrieren: genau der Fall, in dem eine reine Zeitstempel-Id
    // kollidieren wuerde und ein Shot den anderen ueberschreibt.
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const ids = [1, 2, 3].map(() => useStore.getState().addShot(list, sampleShot('X')));
    now.mockRestore();
    expect(new Set(ids).size).toBe(3);
  });

  it('sortiert Shots per moveShot um (Drag-Reihenfolge)', async () => {
    const useStore = await freshStore();
    const list = useStore.getState().addShotlist();
    ['A', 'B', 'C'].forEach((n) => useStore.getState().addShot(list, sampleShot(n)));

    useStore.getState().moveShot(list, 0, 2); // A ans Ende
    expect(useStore.getState().shotlists[0].shots.map((s) => s.name)).toEqual(['B', 'C', 'A']);

    useStore.getState().moveShot(list, 2, 0); // wieder nach vorn
    expect(useStore.getState().shotlists[0].shots.map((s) => s.name)).toEqual(['A', 'B', 'C']);
  });

  it('laesst die Sequenz bei ungueltigen Drop-Indizes unveraendert', async () => {
    const useStore = await freshStore();
    const list = useStore.getState().addShotlist();
    ['A', 'B'].forEach((n) => useStore.getState().addShot(list, sampleShot(n)));
    const before = useStore.getState().shotlists[0].shots.map((s) => s.name);

    useStore.getState().moveShot(list, -1, 1);
    useStore.getState().moveShot(list, 0, 99);
    useStore.getState().moveShot(list, 1, 1);

    expect(useStore.getState().shotlists[0].shots.map((s) => s.name)).toEqual(before);
  });

  it('aktualisiert und loescht einzelne Shots', async () => {
    const useStore = await freshStore();
    const list = useStore.getState().addShotlist();
    const a = useStore.getState().addShot(list, sampleShot('A'));
    useStore.getState().addShot(list, sampleShot('B'));

    useStore.getState().updateShot(list, a, { name: 'A2', note: 'Regie' });
    const updated = useStore.getState().shotlists[0].shots.find((s) => s.id === a);
    expect(updated?.name).toBe('A2');
    expect(updated?.note).toBe('Regie');

    useStore.getState().removeShot(list, a);
    expect(useStore.getState().shotlists[0].shots.map((s) => s.name)).toEqual(['B']);
  });

  it('setzt currentShotId zurueck, wenn genau dieser Shot geloescht wird', async () => {
    const useStore = await freshStore();
    const list = useStore.getState().addShotlist();
    const a = useStore.getState().addShot(list, sampleShot('A')); // addShot setzt current
    expect(useStore.getState().currentShotId).toBe(a);
    useStore.getState().removeShot(list, a);
    expect(useStore.getState().currentShotId).toBeNull();
  });

  it('waehlt nach dem Loeschen der aktiven Liste die naechste aus', async () => {
    const useStore = await freshStore();
    const first = useStore.getState().addShotlist('A');
    const second = useStore.getState().addShotlist('B');
    expect(useStore.getState().activeShotlistId).toBe(second);
    useStore.getState().removeShotlist(second);
    expect(useStore.getState().activeShotlistId).toBe(first);
  });

  it('persistiert Shotlisten und laedt sie neu ein', async () => {
    const useStore = await freshStore();
    const list = useStore.getState().addShotlist('Persistiert');
    useStore.getState().addShot(list, sampleShot('A'));

    // Neues Modul = neuer Store-Init aus demselben localStorage.
    vi.resetModules();
    const reloaded = (await import('../store/useStore')).useStore;
    expect(reloaded.getState().shotlists).toHaveLength(1);
    expect(reloaded.getState().shotlists[0].shots.map((s) => s.name)).toEqual(['A']);
  });

  it('meldet eine volle Quota, statt Shots still zu verlieren', async () => {
    const useStore = await freshStore();
    const list = useStore.getState().addShotlist();
    expect(useStore.getState().shotlistStorageFull).toBe(false);

    quotaFull = true;
    useStore.getState().addShot(list, sampleShot('Zu gross'));

    // Im Speicher ist der Shot da, aber der Nutzer wird gewarnt.
    expect(useStore.getState().shotlists[0].shots).toHaveLength(1);
    expect(useStore.getState().shotlistStorageFull).toBe(true);
  });

  it('ueberspringt kaputte Eintraege beim Laden', async () => {
    store['multicam-shotlists'] = JSON.stringify([
      { id: 'ok', name: 'Gut', shots: [] },
      { id: 'kaputt' }, // kein shots-Array
      null,
    ]);
    const useStore = await freshStore();
    expect(useStore.getState().shotlists.map((l) => l.id)).toEqual(['ok']);
  });
});

describe('saveJSONSafe', () => {
  it('meldet Erfolg und Misserfolg', () => {
    expect(saveJSONSafe('k', { a: 1 })).toBe(true);
    quotaFull = true;
    expect(saveJSONSafe('k', { a: 2 })).toBe(false);
  });
});
