import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ProjectFile } from '../types';

// #72: "alte Objekte springen an die Position von neuen Objekten bei einem
// geoeffneten Plan". Ursache waren doppelte Ids nach dem Laden — der Zaehler
// startete wieder bei 1, die geladenen Objekte behielten ihre Ids. Beide
// Objekte haengen dann am selben Datensatz.
//
// Der Store liest localStorage beim Modul-Laden, deshalb der Stub vor dem
// dynamischen Import.
const store: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  vi.resetModules();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  });
});

async function freshStore() {
  const mod = await import('../store/useStore');
  return mod.useStore;
}

const camera = (id: string) => ({
  id,
  label: id.toUpperCase(),
  cameraId: 'sony-hdc-3500',
  lensId: 'fujinon-ua107x8-4besm',
  x: 10,
  y: 11,
  z: 1.5,
  pan: -90,
  tilt: 0,
  focalLength: 8.4,
  aperture: 1.7,
  focusDistance: 7.5,
  color: '#ef4444',
  extenderActive: 1,
  useSpeedbooster: false,
});

const person = (id: string, x: number) => ({
  id,
  label: id,
  x,
  y: 5,
  height: 1.8,
  width: 0.5,
  objectType: 'person' as const,
});

const plan = (over: Partial<ProjectFile> = {}): ProjectFile => ({
  formatVersion: 1,
  appVersion: '4.3.1',
  projectVersion: 3,
  savedAt: new Date().toISOString(),
  venue: {
    name: 'Test',
    widthM: 20,
    heightM: 15,
    stages: [{ id: 'stage-1', x: 7, y: 0.5, width: 6, height: 3, label: 'Stage' }],
  },
  cameras: [camera('cam-1'), camera('cam-2')],
  persons: [person('person-1', 5), person('person-2', 12)],
  walls: [{ id: 'wall-1', label: 'W1', x1: 0, y1: 0, x2: 5, y2: 0, height: 3 }],
  backgroundPlan: null,
  ...over,
});

const ids = (arr: { id: string }[]) => arr.map((a) => a.id);
const unique = (arr: { id: string }[]) => new Set(ids(arr)).size === arr.length;

describe('Plan laden — Ids (#72)', () => {
  it('vergibt nach dem Laden keine Id doppelt', async () => {
    const useStore = await freshStore();
    useStore.getState().applyProjectFile(plan());

    useStore.getState().addPerson();
    useStore.getState().addStageObject('chair');
    useStore.getState().addCamera();
    useStore.getState().addWall();
    useStore.getState().addStage();

    const s = useStore.getState();
    expect(unique(s.persons), `Personen: ${ids(s.persons)}`).toBe(true);
    expect(unique(s.cameras), `Kameras: ${ids(s.cameras)}`).toBe(true);
    expect(unique(s.walls), `Waende: ${ids(s.walls)}`).toBe(true);
    expect(unique(s.venue.stages), `Buehnen: ${ids(s.venue.stages)}`).toBe(true);
  });

  it('bewegt beim Verschieben eines neuen Objekts kein altes mit', async () => {
    // Das ist der gemeldete Effekt: updatePerson traf zwei Datensaetze.
    const useStore = await freshStore();
    useStore.getState().applyProjectFile(plan());
    useStore.getState().addPerson();

    const neu = useStore.getState().persons[useStore.getState().persons.length - 1];
    useStore.getState().updatePerson(neu.id, { x: 17, y: 3 });

    const alt = useStore.getState().persons.find((p) => p.id === 'person-1')!;
    expect(alt.x).toBe(5);
    expect(alt.y).toBe(5);
    expect(useStore.getState().persons.filter((p) => p.x === 17)).toHaveLength(1);
  });

  it('behaelt die Kamera-Ids, damit Shots/Presets ihre Kamera behalten', async () => {
    const useStore = await freshStore();
    useStore.getState().applyProjectFile(plan());
    expect(ids(useStore.getState().cameras)).toEqual(['cam-1', 'cam-2']);
  });

  it('behaelt den Fokus-Lock auf eine geladene Person', async () => {
    const useStore = await freshStore();
    const p = plan();
    p.cameras[0] = { ...p.cameras[0], lockedPersonId: 'person-2' };
    useStore.getState().applyProjectFile(p);
    const locked = useStore.getState().cameras[0].lockedPersonId;
    expect(useStore.getState().persons.some((x) => x.id === locked)).toBe(true);
  });

  it('repariert einen Plan, der schon doppelte Ids enthaelt', async () => {
    // Wer vor dem Fix gespeichert hat, traegt den Schaden in der Datei.
    const useStore = await freshStore();
    useStore.getState().applyProjectFile(
      plan({ persons: [person('person-1', 5), person('person-1', 12)] }),
    );
    const persons = useStore.getState().persons;
    expect(persons).toHaveLength(2);
    expect(unique(persons)).toBe(true);
    // Der erste behaelt seine Id — bestehende Verweise laufen nicht ins Leere.
    expect(persons[0].id).toBe('person-1');
  });

  it('kollidiert auch nach zweimaligem Laden nicht', async () => {
    const useStore = await freshStore();
    useStore.getState().applyProjectFile(plan());
    useStore.getState().addPerson();
    useStore.getState().applyProjectFile(plan({ persons: [person('person-9', 2)] }));
    useStore.getState().addPerson();
    expect(unique(useStore.getState().persons)).toBe(true);
  });
});
