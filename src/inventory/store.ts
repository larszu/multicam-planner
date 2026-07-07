// Projektübergreifender Lager-Bestand für MultiCam — teilt das portable
// `avplan-inventory`-Format mit cable- und light-planner. Persistiert via die
// vorhandenen storage-Helfer; IDs über crypto.randomUUID (keine neue Dependency).
import { create } from 'zustand';
import { loadJSON, saveJSON } from '../utils/storage';
import type { InventoryItem, StorageNode, InventorySet, InventoryUnit } from './types';
import type { InventorySnapshot } from './portable';

const KEY = 'multicam:inventory';

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.round(Math.random() * 1e9)}`);

interface Persisted {
  items: InventoryItem[];
  nodes: StorageNode[];
  sets: InventorySet[];
  units: InventoryUnit[];
}

const load = (): Persisted => {
  const d = loadJSON<Partial<Persisted>>(KEY, {});
  return {
    items: Array.isArray(d.items) ? d.items : [],
    nodes: Array.isArray(d.nodes) ? d.nodes : [],
    sets: Array.isArray(d.sets) ? d.sets : [],
    units: Array.isArray(d.units) ? d.units : [],
  };
};

export type InventoryItemInput = Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>;

interface InventoryState extends Persisted {
  addItem: (input: InventoryItemInput) => string;
  updateItem: (id: string, patch: Partial<InventoryItemInput>) => void;
  removeItem: (id: string) => void;
  exportSnapshot: () => InventorySnapshot;
  importSnapshot: (snap: Partial<InventorySnapshot>, mode: 'replace' | 'merge') => number;
}

const initial = load();

const persist = (s: Persisted) => saveJSON(KEY, s);

export const useInventoryStore = create<InventoryState>((set, get) => ({
  ...initial,
  addItem: (input) => {
    const now = new Date().toISOString();
    const item: InventoryItem = { ...input, id: uid(), createdAt: now, updatedAt: now };
    set((st) => {
      const items = [...st.items, item];
      persist({ ...st, items });
      return { items };
    });
    return item.id;
  },
  updateItem: (id, patch) =>
    set((st) => {
      const items = st.items.map((it) => (it.id === id ? { ...it, ...patch, updatedAt: new Date().toISOString() } : it));
      persist({ ...st, items });
      return { items };
    }),
  removeItem: (id) =>
    set((st) => {
      const items = st.items.filter((it) => it.id !== id);
      persist({ ...st, items });
      return { items };
    }),
  exportSnapshot: () => {
    const s = get();
    return { items: s.items, nodes: s.nodes, sets: s.sets, units: s.units };
  },
  importSnapshot: (snap, mode) => {
    const inItems = Array.isArray(snap.items) ? snap.items : [];
    const inNodes = Array.isArray(snap.nodes) ? snap.nodes : [];
    const inSets = Array.isArray(snap.sets) ? snap.sets : [];
    const inUnits = Array.isArray(snap.units) ? snap.units : [];
    const total = inItems.length + inNodes.length + inSets.length + inUnits.length;
    set((st) => {
      const mergeById = <T extends { id: string }>(base: T[], add: T[]): T[] => {
        const byId = new Map(base.map((x) => [x.id, x]));
        for (const x of add) byId.set(x.id, x);
        return [...byId.values()];
      };
      const next: Persisted = {
        items: mode === 'replace' ? inItems : mergeById(st.items, inItems),
        nodes: mode === 'replace' ? inNodes : mergeById(st.nodes, inNodes),
        sets: mode === 'replace' ? inSets : mergeById(st.sets, inSets),
        units: mode === 'replace' ? inUnits : mergeById(st.units, inUnits),
      };
      persist(next);
      return next;
    });
    return total;
  },
}));
