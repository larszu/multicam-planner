import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Eine eigene Kamera, die nicht geschrieben wurde, ist keine eigene Kamera.
//
// BEFUND (Defektformen-Sweep, Backlog B-36 der av-planner-suite, Form
// `zustand-nach-fehler` — Nachlese 2026-09-08). Fuer Shotlisten (#62) und fuer
// das Lager (#107) gibt es den `…StorageFull`-Merker laengst. Die
// HANDGEPFLEGTE BIBLIOTHEK lief weiter ueber `saveJSON`, dessen `catch` leer
// ist:
//
//     export function saveJSON(key, value) {
//       try { localStorage.setItem(key, JSON.stringify(value)); }
//       catch { /* quota exceeded */ }
//     }
//
// Betroffen: eigene Kameras, eigene Optiken, eigene Vorlagen und die
// versteckten Vorlagen. Wer eine eigene Kamera anlegt, tippt Sensormasse aus
// einem Datenblatt ab — sie stand danach in der Liste und beim naechsten Start
// nicht mehr. Ein Undo dafuer gibt es nicht, und es sind genau die Daten, die
// niemand ein zweites Mal eintippt.
//
// Derselbe Aufbau wie `inventoryStorageFull.test.ts`: ein localStorage-Stub,
// der auf Wunsch wirft.
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

const laden = async () => (await import('../store/useStore')).useStore;

const kameraSpec = {
  manufacturer: 'Eigenbau', model: 'Testkamera', mount: 'E',
  sensor: { name: 'S35', widthMm: 24.89, heightMm: 14, cropFactor: 1.45 },
} as never;

const optikSpec = {
  manufacturer: 'Eigenbau', model: '50mm', mount: 'E',
  focalLengthMin: 50, focalLengthMax: 50, maxApertureWide: 1.8, type: 'prime',
} as never;

describe('die Bibliothek meldet, wenn nicht geschrieben wurde', () => {
  it('eine eigene Kamera bei vollem Speicher wird gemeldet', async () => {
    const useStore = await laden();
    quotaFull = true;
    useStore.getState().addCustomCamera(kameraSpec);
    expect(useStore.getState().libraryStorageFull).toBe(true);
    // Sie steht trotzdem in der laufenden Sitzung — der Nutzer soll
    // weiterarbeiten koennen, nur eben gewarnt.
    expect(useStore.getState().customCameras).toHaveLength(1);
  });

  it('eine eigene Optik bei vollem Speicher wird gemeldet', async () => {
    const useStore = await laden();
    quotaFull = true;
    useStore.getState().addCustomLens(optikSpec);
    expect(useStore.getState().libraryStorageFull).toBe(true);
  });

  it('bei freiem Speicher bleibt der Merker aus', async () => {
    // Die Gegenprobe: ohne sie waere „immer voll melden" ebenfalls gruen.
    const useStore = await laden();
    useStore.getState().addCustomCamera(kameraSpec);
    expect(useStore.getState().libraryStorageFull).toBe(false);
    expect(JSON.parse(store['multicam-custom-cameras'])).toHaveLength(1);
  });

  it('der Merker faellt zurueck, sobald wieder Platz ist', async () => {
    // Sonst bliebe die Warnung fuer immer stehen und niemand glaubte ihr noch.
    const useStore = await laden();
    quotaFull = true;
    useStore.getState().addCustomCamera(kameraSpec);
    expect(useStore.getState().libraryStorageFull).toBe(true);
    quotaFull = false;
    useStore.getState().addCustomLens(optikSpec);
    expect(useStore.getState().libraryStorageFull).toBe(false);
  });

  it('auch das Loeschen meldet — es schreibt genauso', async () => {
    const useStore = await laden();
    const id = useStore.getState().addCustomCamera(kameraSpec);
    expect(useStore.getState().libraryStorageFull).toBe(false);
    quotaFull = true;
    useStore.getState().removeCustomCamera(id);
    expect(useStore.getState().libraryStorageFull).toBe(true);
  });

  it('kein Schreibweg der Bibliothek benutzt noch das stille saveJSON', async () => {
    const quelle = (await import('../store/useStore.ts?raw')).default as string;
    const code = quelle
      .split('\n')
      .filter((z) => !z.trimStart().startsWith('//') && !z.trimStart().startsWith('*'));
    const schuldige = code.filter((z) => /save(CustomTemplates|CustomLensesStorage|CustomCamerasStorage|HiddenTemplateIds)\b/.test(z) && z.includes('saveJSON('));
    expect(schuldige, schuldige.join('\n')).toEqual([]);
    // Und die vier Speicherfunktionen melden ihr Ergebnis, statt es zu schlucken.
    for (const fn of ['saveCustomTemplates', 'saveCustomLensesStorage',
      'saveCustomCamerasStorage', 'saveHiddenTemplateIds']) {
      const zeile = code.find((z) => z.includes(`function ${fn}(`));
      expect(zeile, `${fn} fehlt`).toBeDefined();
      expect(zeile, `${fn} meldet nicht, ob geschrieben wurde`).toContain('boolean');
    }
  });
});
