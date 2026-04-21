import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { FIXTURES, FIXTURE_CATEGORY_LABELS, FIXTURE_CATEGORY_COLOR, computeLuxAtAim } from '../../data/fixtures';
import { GELS, gelStackTransmission } from '../../data/gels';
import type { Fixture, FixtureCategory } from '../../types/lighting';

const ALL_CATEGORIES: FixtureCategory[] = [
  'profile', 'fresnel', 'par', 'wash', 'spot',
  'moving-wash', 'moving-spot', 'moving-beam',
  'led-panel', 'cyc', 'flood', 'blinder', 'followspot', 'custom',
];

export default function LightingSidebar() {
  const {
    placedFixtures, customFixtures, selectedFixtureId, selectFixture,
    setFixtureToPlace, fixtureToPlace,
    removePlacedFixture, updatePlacedFixture, duplicatePlacedFixture,
    venue,
  } = useStore();

  const [filter, setFilter] = useState<FixtureCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const allFixtures: Fixture[] = useMemo(() => [...FIXTURES, ...customFixtures], [customFixtures]);

  const visibleFixtures = useMemo(() => {
    return allFixtures.filter((f) => {
      if (filter !== 'all' && f.category !== filter) return false;
      if (search && !`${f.manufacturer} ${f.name}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allFixtures, filter, search]);

  const selected = placedFixtures.find((f) => f.id === selectedFixtureId);
  const selectedDef = selected ? allFixtures.find((f) => f.id === selected.fixtureId) : null;

  const selectedLux = selected && selectedDef
    ? computeLuxAtAim(selectedDef, selected, gelStackTransmission(selected.gelFilterIds))
    : 0;

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="px-3 pt-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">💡</span>
          <h2 className="font-semibold">Licht-Planer</h2>
        </div>
        <p className="text-xs text-gray-500">Scheinwerfer platzieren, ausrichten &amp; Beleuchtungsstärke prüfen.</p>
      </div>

      {/* Placement banner */}
      {fixtureToPlace && (
        <div className="mx-3 px-3 py-2 rounded bg-sky-100 border border-sky-300 text-sky-900 text-xs flex items-center justify-between">
          <span>Klick im 2D-Plan um <strong>{fixtureToPlace.name}</strong> zu platzieren</span>
          <button className="ml-2 text-sky-700 hover:text-sky-900" onClick={() => setFixtureToPlace(null)}>✕</button>
        </div>
      )}

      {/* Fixture browser */}
      <div className="px-3">
        <div className="flex gap-1 mb-2">
          <input
            type="text"
            placeholder="Suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 bg-white"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FixtureCategory | 'all')}
            className="px-1 py-1 text-xs rounded border border-gray-300 bg-white"
          >
            <option value="all">Alle</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{FIXTURE_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
          {visibleFixtures.map((f) => (
            <button
              key={f.id}
              className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 border-b border-gray-100 hover:bg-sky-50 ${fixtureToPlace?.id === f.id ? 'bg-sky-100' : ''}`}
              onClick={() => setFixtureToPlace(f)}
              title={`${f.wattage}W · ${f.fieldAngle}°${f.zoomRange ? ` (Zoom ${f.zoomRange[0]}–${f.zoomRange[1]}°)` : ''}`}
            >
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: FIXTURE_CATEGORY_COLOR[f.category] }} />
              <span className="flex-1 truncate">
                <strong>{f.manufacturer}</strong> {f.name}
              </span>
              <span className="text-gray-500">{f.wattage}W</span>
            </button>
          ))}
          {visibleFixtures.length === 0 && (
            <div className="p-2 text-xs text-gray-500 italic">Keine Treffer</div>
          )}
        </div>
      </div>

      {/* Placed list */}
      <div className="px-3">
        <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Platzierte Scheinwerfer ({placedFixtures.length})</h3>
        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded">
          {placedFixtures.length === 0 && (
            <div className="p-2 text-xs text-gray-500 italic">Noch nichts platziert</div>
          )}
          {placedFixtures.map((pf) => {
            const def = allFixtures.find((f) => f.id === pf.fixtureId);
            return (
              <button
                key={pf.id}
                className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 border-b border-gray-100 hover:bg-gray-50 ${selectedFixtureId === pf.id ? 'bg-sky-100' : ''}`}
                onClick={() => selectFixture(pf.id)}
              >
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: def ? FIXTURE_CATEGORY_COLOR[def.category] : '#888' }} />
                <span className="flex-1 truncate">{pf.label ?? def?.name ?? pf.fixtureId}</span>
                <span className="text-gray-400">{pf.x.toFixed(1)},{pf.y.toFixed(1)}m</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Property editor for selected */}
      {selected && selectedDef && (
        <div className="px-3 pb-3 border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">{selectedDef.manufacturer} {selectedDef.name}</h3>
            <div className="flex gap-1">
              <button className="text-xs px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300" onClick={() => duplicatePlacedFixture(selected.id)} title="Duplizieren">⎘</button>
              <button className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200" onClick={() => removePlacedFixture(selected.id)} title="Löschen">✕</button>
            </div>
          </div>

          <Field label="Label">
            <input type="text" value={selected.label ?? ''} placeholder={selectedDef.name}
              onChange={(e) => updatePlacedFixture(selected.id, { label: e.target.value || undefined })}
              className="w-full px-1.5 py-0.5 text-xs rounded border border-gray-300" />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="X (m)">
              <input type="number" step={0.1} value={selected.x}
                onChange={(e) => updatePlacedFixture(selected.id, { x: parseFloat(e.target.value) || 0 })}
                className="w-full px-1.5 py-0.5 text-xs rounded border border-gray-300" />
            </Field>
            <Field label="Y (m)">
              <input type="number" step={0.1} value={selected.y}
                onChange={(e) => updatePlacedFixture(selected.id, { y: parseFloat(e.target.value) || 0 })}
                className="w-full px-1.5 py-0.5 text-xs rounded border border-gray-300" />
            </Field>
            <Field label="Höhe Z (m)">
              <input type="number" step={0.1} min={0} value={selected.z}
                onChange={(e) => updatePlacedFixture(selected.id, { z: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-full px-1.5 py-0.5 text-xs rounded border border-gray-300" />
            </Field>
            <Field label="Dimmer %">
              <input type="range" min={0} max={100} value={selected.dimming}
                onChange={(e) => updatePlacedFixture(selected.id, { dimming: parseInt(e.target.value, 10) })}
                className="w-full" />
              <span className="text-xs text-gray-500">{selected.dimming}%</span>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <Field label="Aim X (m)">
              <input type="number" step={0.1} value={selected.aimX}
                onChange={(e) => updatePlacedFixture(selected.id, { aimX: parseFloat(e.target.value) || 0 })}
                className="w-full px-1.5 py-0.5 text-xs rounded border border-gray-300" />
            </Field>
            <Field label="Aim Y (m)">
              <input type="number" step={0.1} value={selected.aimY}
                onChange={(e) => updatePlacedFixture(selected.id, { aimY: parseFloat(e.target.value) || 0 })}
                className="w-full px-1.5 py-0.5 text-xs rounded border border-gray-300" />
            </Field>
          </div>

          {selectedDef.zoomRange && (
            <Field label={`Zoom (${selectedDef.zoomRange[0]}–${selectedDef.zoomRange[1]}°)`}>
              <input type="range"
                min={selectedDef.zoomRange[0]} max={selectedDef.zoomRange[1]} step={1}
                value={selected.currentBeamAngle ?? selectedDef.fieldAngle}
                onChange={(e) => updatePlacedFixture(selected.id, { currentBeamAngle: parseFloat(e.target.value) })}
                className="w-full" />
              <span className="text-xs text-gray-500">{(selected.currentBeamAngle ?? selectedDef.fieldAngle).toFixed(0)}°</span>
            </Field>
          )}

          {selectedDef.colorTempRange && (
            <Field label={`CCT (${selectedDef.colorTempRange[0]}–${selectedDef.colorTempRange[1]}K)`}>
              <input type="range"
                min={selectedDef.colorTempRange[0]} max={selectedDef.colorTempRange[1]} step={50}
                value={selected.currentColorTemp ?? selectedDef.colorTemp}
                onChange={(e) => updatePlacedFixture(selected.id, { currentColorTemp: parseFloat(e.target.value) })}
                className="w-full" />
              <span className="text-xs text-gray-500">{(selected.currentColorTemp ?? selectedDef.colorTemp).toFixed(0)}K</span>
            </Field>
          )}

          {/* Gel selection */}
          <Field label="Gels">
            <select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                const current = selected.gelFilterIds ?? [];
                if (current.includes(id)) return;
                updatePlacedFixture(selected.id, { gelFilterIds: [...current, id] });
              }}
              className="w-full px-1.5 py-0.5 text-xs rounded border border-gray-300"
            >
              <option value="">+ Gel hinzufügen…</option>
              {GELS.map((g) => (
                <option key={g.id} value={g.id}>{g.brand} {g.code} {g.name}</option>
              ))}
            </select>
            {(selected.gelFilterIds ?? []).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {selected.gelFilterIds!.map((id) => {
                  const g = GELS.find((x) => x.id === id);
                  if (!g) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-gray-300"
                      style={{ background: g.displayColor ?? '#eee' }}>
                      {g.brand} {g.code}
                      <button className="text-red-700"
                        onClick={() => updatePlacedFixture(selected.id, {
                          gelFilterIds: (selected.gelFilterIds ?? []).filter((x) => x !== id),
                        })}>✕</button>
                    </span>
                  );
                })}
              </div>
            )}
          </Field>

          {/* Calculated lux */}
          <div className="mt-3 p-2 rounded bg-gray-100">
            <div className="text-xs text-gray-500">Beleuchtungsstärke am Ziel</div>
            <div className="text-lg font-semibold">{selectedLux.toFixed(0)} lx</div>
            <div className="text-xs text-gray-500">
              Wurf: {Math.hypot(selected.aimX - selected.x, selected.aimY - selected.y, selected.z).toFixed(2)} m
              &middot; Gel-Transmission: {(gelStackTransmission(selected.gelFilterIds) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      <div className="px-3 pb-4 text-[10px] text-gray-400">
        Venue: {venue.widthM} × {venue.heightM} m
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-0.5 mb-1.5">
      <span className="text-[10px] uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}
