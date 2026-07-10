// Portables Lager-Format — App-übergreifender Austausch (cable/light/multicam).
// Schema-identisch zu cable-planner src/renderer/lib/inventoryPortable.ts.
import type { InventoryItem, StorageNode, InventorySet, InventoryUnit } from './types';

export const INVENTORY_FORMAT = 'avplan-inventory';
export const INVENTORY_FORMAT_VERSION = 1;

export interface InventorySnapshot {
  items: InventoryItem[];
  nodes: StorageNode[];
  sets: InventorySet[];
  units: InventoryUnit[];
}

interface PortableFile extends InventorySnapshot {
  format: typeof INVENTORY_FORMAT;
  version: number;
  exportedAt?: string;
  app?: string;
}

export function serializeInventory(snap: InventorySnapshot, meta?: { exportedAt?: string; app?: string }): string {
  const file: PortableFile = {
    format: INVENTORY_FORMAT,
    version: INVENTORY_FORMAT_VERSION,
    exportedAt: meta?.exportedAt,
    app: meta?.app,
    items: snap.items,
    nodes: snap.nodes,
    sets: snap.sets,
    units: snap.units,
  };
  return JSON.stringify(file, null, 2);
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function parseInventory(json: string): InventorySnapshot | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const f = data as Partial<PortableFile>;
  if (f.format !== INVENTORY_FORMAT) return null;
  if (typeof f.version !== 'number' || f.version > INVENTORY_FORMAT_VERSION) return null;
  return {
    items: arr<InventoryItem>(f.items),
    nodes: arr<StorageNode>(f.nodes),
    sets: arr<InventorySet>(f.sets),
    units: arr<InventoryUnit>(f.units),
  };
}

/** Code (QR/Barcode/Seriennr.) → Artikel/Lagerort/Einheit. */
export type ScanMatch =
  | { kind: 'item'; item: InventoryItem }
  | { kind: 'node'; node: StorageNode }
  | { kind: 'unit'; unit: InventoryUnit };

const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase();

export function resolveInventoryCode(
  raw: string,
  src: { items: InventoryItem[]; nodes: StorageNode[]; units: InventoryUnit[] },
): ScanMatch | null {
  const needle = norm(raw);
  if (!needle) return null;
  const unit = src.units.find((u) => norm(u.code) === needle || norm(u.serial) === needle);
  if (unit) return { kind: 'unit', unit };
  const node = src.nodes.find((n) => norm(n.code) === needle);
  if (node) return { kind: 'node', node };
  const item = src.items.find((it) => norm(it.code) === needle);
  if (item) return { kind: 'item', item };
  return null;
}
