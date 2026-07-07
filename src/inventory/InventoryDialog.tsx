// Lager / Bestand — schlanke MultiCam-Ansicht. Teilt das portable
// `avplan-inventory`-Format mit cable- und light-planner: ein in Cable Planner
// gepflegtes Lager (inkl. Lagerorte/Cases/Einheiten) wird hier verlustfrei
// importiert; hier gepflegte Artikel gehen genauso zurück.
import { useMemo, useRef, useState } from 'react';
import { FiX, FiPlus, FiTrash2, FiDownload, FiUpload, FiSearch } from 'react-icons/fi';
import { useInventoryStore, type InventoryItemInput } from './store';
import { serializeInventory, parseInventory, resolveInventoryCode } from './portable';
import type { InventoryItem } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
}

type FormState = InventoryItemInput & { id?: string };

const inputCls = 'w-full rounded border border-bc-border bg-bc-dark p-1.5 text-sm text-white';

export function InventoryDialog({ open, onClose }: Props) {
  const items = useInventoryStore((s) => s.items);
  const nodes = useInventoryStore((s) => s.nodes);
  const units = useInventoryStore((s) => s.units);
  const addItem = useInventoryStore((s) => s.addItem);
  const updateItem = useInventoryStore((s) => s.updateItem);
  const removeItem = useInventoryStore((s) => s.removeItem);
  const exportSnapshot = useInventoryStore((s) => s.exportSnapshot);
  const importSnapshot = useInventoryStore((s) => s.importSnapshot);

  const [form, setForm] = useState<FormState | null>(null);
  const [scan, setScan] = useState('');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.model.localeCompare(b.model, undefined, { sensitivity: 'base' })),
    [items],
  );

  if (!open) return null;

  const save = () => {
    if (!form || form.model.trim() === '') return;
    const payload: InventoryItemInput = {
      model: form.model.trim(),
      manufacturer: form.manufacturer?.trim() || undefined,
      category: form.category?.trim() || undefined,
      quantity: Number.isFinite(form.quantity) ? Math.max(0, Math.round(form.quantity)) : 0,
      code: form.code?.trim() || undefined,
      codeType: form.code?.trim() ? form.codeType ?? 'qr' : undefined,
      ownership: form.ownership,
    };
    if (form.id) updateItem(form.id, payload);
    else addItem(payload);
    setForm(null);
  };

  const doExport = () => {
    const json = serializeInventory(exportSnapshot(), { app: 'multicam-planner' });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lager.avinv.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (file: File) => {
    const snap = parseInventory(await file.text());
    if (!snap) {
      setScanResult('Keine gültige Lager-Datei (avplan-inventory).');
      return;
    }
    const replace = window.confirm('Bestehenden Bestand ERSETZEN? Abbrechen = zusammenführen (merge).');
    const n = importSnapshot(snap, replace ? 'replace' : 'merge');
    setScanResult(`${n} Objekte importiert.`);
  };

  const doScan = () => {
    const code = scan.trim();
    if (!code) return;
    const m = resolveInventoryCode(code, { items, nodes, units });
    if (!m) setScanResult(`Kein Treffer für „${code}".`);
    else if (m.kind === 'item') {
      setScanResult(`Artikel: ${m.item.model}`);
      setForm({ ...m.item });
    } else if (m.kind === 'node') setScanResult(`Lagerort: ${m.node.name}`);
    else setScanResult(`Einheit: ${m.unit.serial || m.unit.code || m.unit.id.slice(0, 6)}`);
    setScan('');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-bc-border bg-bc-panel text-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-bc-border px-4 py-2.5">
          <h2 className="text-base font-semibold">Lager / Bestand</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-bc-dark hover:text-white" aria-label="Schließen">
            <FiX size={18} />
          </button>
        </header>

        <div className="space-y-3 overflow-auto p-4 text-sm">
          {/* Scan + Aktionen */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[10rem]">
              <FiSearch className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
              <input
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doScan()}
                placeholder="Code scannen / eingeben (Artikel, Lagerort, Einheit)…"
                className={`${inputCls} pl-7`}
              />
            </div>
            <button type="button" onClick={doScan} className="rounded bg-bc-dark px-2.5 py-1.5 hover:bg-black">Auflösen</button>
            <button type="button" onClick={doExport} className="flex items-center gap-1 rounded bg-bc-dark px-2.5 py-1.5 hover:bg-black" title="Export (App-übergreifend)">
              <FiDownload size={13} /> Export
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1 rounded bg-bc-dark px-2.5 py-1.5 hover:bg-black" title="Import">
              <FiUpload size={13} /> Import
            </button>
            <button type="button" onClick={() => setForm({ model: '', quantity: 1 })} className="flex items-center gap-1 rounded bg-bc-accent px-2.5 py-1.5 text-black hover:opacity-90">
              <FiPlus size={13} /> Artikel
            </button>
          </div>
          {scanResult && <div className="rounded border border-bc-border bg-bc-dark px-2 py-1 text-gray-300">{scanResult}</div>}

          {/* Add/Edit */}
          {form && (
            <div className="rounded border border-bc-accent/40 bg-bc-dark p-3">
              <div className="mb-2 font-medium">{form.id ? 'Artikel bearbeiten' : 'Neuer Artikel'}</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                <label className="block">Modell *<input autoFocus value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className={inputCls} /></label>
                <label className="block">Hersteller<input value={form.manufacturer ?? ''} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className={inputCls} /></label>
                <label className="block">Kategorie<input value={form.category ?? ''} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls} /></label>
                <label className="block">Menge<input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className={inputCls} /></label>
                <label className="block">Code<input value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputCls} /></label>
                <label className="block">Eigentum
                  <select value={form.ownership ?? ''} onChange={(e) => setForm({ ...form, ownership: (e.target.value || undefined) as InventoryItem['ownership'] })} className={inputCls}>
                    <option value="">—</option>
                    <option value="owned">Eigentum</option>
                    <option value="rented">gemietet</option>
                    <option value="subhire">Sub-Miete</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setForm(null)} className="rounded bg-bc-dark px-3 py-1 hover:bg-black">Abbrechen</button>
                <button type="button" disabled={form.model.trim() === ''} onClick={save} className="rounded bg-bc-accent px-3 py-1 text-black enabled:hover:opacity-90 disabled:opacity-50">Speichern</button>
              </div>
            </div>
          )}

          {/* Tabelle */}
          {sorted.length === 0 ? (
            <div className="rounded border border-dashed border-bc-border py-10 text-center text-gray-500">
              Noch keine Lager-Artikel. Lege welche an oder importiere ein Lager aus Cable/Light Planner.
            </div>
          ) : (
            <div className="overflow-x-auto rounded border border-bc-border">
              <table className="w-full border-collapse text-left">
                <thead className="bg-bc-dark text-gray-400">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Modell</th>
                    <th className="px-2 py-1.5 text-right font-medium">Menge</th>
                    <th className="px-2 py-1.5 font-medium">Code</th>
                    <th className="px-2 py-1.5 font-medium">Eigentum</th>
                    <th className="px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((it) => (
                    <tr key={it.id} className="border-t border-bc-border/60 hover:bg-bc-dark">
                      <td className="px-2 py-1.5">{it.model}{it.manufacturer && <span className="ml-1 text-gray-500">· {it.manufacturer}</span>}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{it.quantity}</td>
                      <td className="px-2 py-1.5 text-gray-300">{it.code ?? '—'}</td>
                      <td className="px-2 py-1.5 text-gray-300">{it.ownership ?? '—'}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setForm({ ...it })} className="rounded px-2 py-0.5 text-xs text-gray-400 hover:bg-bc-border hover:text-white">Edit</button>
                          <button type="button" onClick={() => removeItem(it.id)} className="rounded p-1 text-gray-400 hover:bg-red-900/50 hover:text-red-300" aria-label="Löschen"><FiTrash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(nodes.length > 0 || units.length > 0) && (
            <div className="text-xs text-gray-500">
              + {nodes.length} Lagerorte/Cases · {units.length} serialisierte Einheiten (aus Import, verlustfrei erhalten)
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = ''; }} />
      </div>
    </div>
  );
}
