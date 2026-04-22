import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { FIXTURES, FIXTURE_CATEGORY_LABELS, FIXTURE_CATEGORY_COLOR, getFixtureById } from '../../data/fixtures';
import { GELS, gelStackTransmission } from '../../data/gels';
import { luxFromFixture, aimToPanTilt, panTiltToAim } from '../../utils/lightCalc';
import type { Fixture, FixtureCategory } from '../../types/lighting';
import { FiTrash2, FiCopy, FiX } from 'react-icons/fi';

const ALL_CATEGORIES: FixtureCategory[] = [
  'profile', 'fresnel', 'par', 'wash', 'spot',
  'moving-wash', 'moving-spot', 'moving-beam',
  'led-panel', 'cyc', 'flood', 'blinder', 'followspot', 'custom',
];

const INPUT_CLS = 'w-full px-2 py-1 text-xs rounded border border-bc-border bg-bc-dark text-white focus:border-bc-accent focus:outline-none';
const SELECT_CLS = INPUT_CLS;
const LABEL_CLS = 'text-[10px] uppercase tracking-wide text-gray-400';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-0.5 mb-2">
      <span className={LABEL_CLS}>{label}</span>
      {children}
    </label>
  );
}

export default function LightingSidebar() {
  const {
    placedFixtures, customFixtures, selectedFixtureId, selectFixture,
    setFixtureToPlace, fixtureToPlace,
    removePlacedFixture, updatePlacedFixture, duplicatePlacedFixture,
    venue,
    heatMapEnabled, toggleHeatMap,
    heatMapTargetLux, setHeatMapTargetLux,
    heatMapScale, setHeatMapScale,
  } = useStore();

  const [filter, setFilter] = useState<FixtureCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const allFixtures: Fixture[] = useMemo(() => [...FIXTURES, ...customFixtures], [customFixtures]);

  const visibleFixtures = useMemo(() => allFixtures.filter((f) => {
    if (filter !== 'all' && f.category !== filter) return false;
    if (search && !`${f.manufacturer} ${f.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [allFixtures, filter, search]);

  const selected = placedFixtures.find((f) => f.id === selectedFixtureId);
  const selectedDef = selected ? allFixtures.find((f) => f.id === selected.fixtureId) : null;
  const selectedLux = selected && selectedDef
    ? luxFromFixture(selectedDef, selected, selected.aimX, selected.aimY)
    : 0;
  const panTilt = selected ? aimToPanTilt(selected) : null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-bc-panel text-white">
      <div className="flex flex-col gap-3 text-xs">
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">💡</span>
            <h2 className="font-semibold text-sm">Licht-Planer</h2>
          </div>
          <p className="text-[11px] text-gray-400">Scheinwerfer platzieren, ausrichten &amp; Lux prüfen.</p>
        </div>

        <div className="mx-3 rounded border border-bc-border bg-bc-dark p-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" title="Heatmap anzeigen" checked={heatMapEnabled} onChange={toggleHeatMap} className="accent-bc-accent" />
            <span className="text-xs font-semibold">🔥 Heatmap</span>
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Field label="Ziel-Lux (0=Aus)">
              <input type="number" min={0} step={50} title="Target illuminance" placeholder="300"
                value={heatMapTargetLux}
                onChange={(e) => setHeatMapTargetLux(parseFloat(e.target.value) || 0)}
                className={INPUT_CLS} />
            </Field>
            <Field label="Skala-Lux">
              <input type="number" min={100} step={100} title="Scale max lux" placeholder="1000"
                value={heatMapScale}
                onChange={(e) => setHeatMapScale(parseFloat(e.target.value) || 1000)}
                className={INPUT_CLS} />
            </Field>
          </div>
          <p className="mt-1 text-[10px] text-gray-500 leading-tight">
            Ziel-Lux&nbsp;&gt;&nbsp;0 → 3-Zonen-Palette (blau · grün · rot). 0 = klassische Heatmap.
          </p>
        </div>

        {fixtureToPlace && (
          <div className="mx-3 px-3 py-2 rounded bg-bc-accent/20 border border-bc-accent text-bc-accent text-xs flex items-center justify-between">
            <span>Klick im 2D-Plan → <strong>{fixtureToPlace.name}</strong></span>
            <button type="button" title="Abbrechen" className="ml-2 hover:text-white" onClick={() => setFixtureToPlace(null)}><FiX size={12} /></button>
          </div>
        )}

        <div className="px-3">
          <h3 className={LABEL_CLS + ' mb-1'}>Katalog</h3>
          <div className="flex gap-1 mb-2">
            <input type="text" title="Suchen" placeholder="Suchen…" value={search}
              onChange={(e) => setSearch(e.target.value)} className={`${INPUT_CLS} flex-1`} />
            <select value={filter} title="Kategorie"
              onChange={(e) => setFilter(e.target.value as FixtureCategory | 'all')}
              className={`${SELECT_CLS} w-24`}>
              <option value="all">Alle</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{FIXTURE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div className="max-h-48 overflow-y-auto rounded border border-bc-border">
            {visibleFixtures.map((f) => (
              <button key={f.id} type="button"
                title={`${f.manufacturer} ${f.name} · ${f.wattage}W · ${f.fieldAngle}°`}
                onClick={() => setFixtureToPlace(f)}
                className={`w-full text-left px-2 py-1.5 text-[11px] flex items-center gap-2 border-b border-bc-border/60 hover:bg-bc-accent/10 ${fixtureToPlace?.id === f.id ? 'bg-bc-accent/20' : ''}`}
              >
                <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ background: FIXTURE_CATEGORY_COLOR[f.category] }} />
                <span className="flex-1 truncate">
                  <strong className="text-white">{f.manufacturer}</strong>{' '}
                  <span className="text-gray-300">{f.name}</span>
                </span>
                <span className="text-gray-400 shrink-0">{f.wattage}W</span>
              </button>
            ))}
            {visibleFixtures.length === 0 && (
              <div className="p-2 text-[11px] text-gray-500 italic">Keine Treffer</div>
            )}
          </div>
        </div>

        <div className="px-3">
          <h3 className={LABEL_CLS + ' mb-1'}>Platzierte Scheinwerfer ({placedFixtures.length})</h3>
          <div className="max-h-32 overflow-y-auto rounded border border-bc-border">
            {placedFixtures.length === 0 && (
              <div className="p-2 text-[11px] text-gray-500 italic">Noch nichts platziert</div>
            )}
            {placedFixtures.map((pf) => {
              const def = getFixtureById(pf.fixtureId, customFixtures);
              return (
                <button key={pf.id} type="button" title="Auswählen"
                  onClick={() => selectFixture(pf.id)}
                  className={`w-full text-left px-2 py-1 text-[11px] flex items-center gap-2 border-b border-bc-border/60 hover:bg-bc-border/50 ${selectedFixtureId === pf.id ? 'bg-bc-accent/20' : ''}`}
                >
                  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: def ? FIXTURE_CATEGORY_COLOR[def.category] : '#888' }} />
                  <span className="flex-1 truncate">{pf.label ?? def?.name ?? pf.fixtureId}</span>
                  <span className="text-gray-500">{pf.x.toFixed(1)},{pf.y.toFixed(1)}m</span>
                </button>
              );
            })}
          </div>
        </div>

        {selected && selectedDef && panTilt && (
          <div className="px-3 pb-4 border-t border-bc-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-white truncate">{selectedDef.manufacturer} {selectedDef.name}</h3>
              <div className="flex gap-1 shrink-0">
                <button type="button" title="Duplizieren" className="p-1 rounded bg-bc-border hover:bg-bc-accent/30" onClick={() => duplicatePlacedFixture(selected.id)}><FiCopy size={11} /></button>
                <button type="button" title="Löschen" className="p-1 rounded bg-red-900/40 text-red-300 hover:bg-red-900/70" onClick={() => removePlacedFixture(selected.id)}><FiTrash2 size={11} /></button>
              </div>
            </div>

            <Field label="Label">
              <input type="text" title="Label" placeholder={selectedDef.name}
                value={selected.label ?? ''}
                onChange={(e) => updatePlacedFixture(selected.id, { label: e.target.value || undefined })}
                className={INPUT_CLS} />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="X (m)">
                <input type="number" step={0.1} title="X" placeholder="0" value={selected.x}
                  onChange={(e) => updatePlacedFixture(selected.id, { x: parseFloat(e.target.value) || 0 })} className={INPUT_CLS} />
              </Field>
              <Field label="Y (m)">
                <input type="number" step={0.1} title="Y" placeholder="0" value={selected.y}
                  onChange={(e) => updatePlacedFixture(selected.id, { y: parseFloat(e.target.value) || 0 })} className={INPUT_CLS} />
              </Field>
              <Field label="Höhe Z (m)">
                <input type="number" step={0.1} min={0} title="Montagehöhe" placeholder="3" value={selected.z}
                  onChange={(e) => updatePlacedFixture(selected.id, { z: Math.max(0, parseFloat(e.target.value) || 0) })} className={INPUT_CLS} />
              </Field>
              <Field label={`Dimmer: ${selected.dimming}%`}>
                <input type="range" min={0} max={100} title="Dimmer" value={selected.dimming}
                  onChange={(e) => updatePlacedFixture(selected.id, { dimming: parseInt(e.target.value, 10) })} className="w-full accent-bc-accent" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <Field label={`Pan: ${panTilt.pan.toFixed(0)}°`}>
                <input type="range" min={-180} max={180} step={1} title="Pan"
                  value={panTilt.pan}
                  onChange={(e) => {
                    const a = panTiltToAim(selected.x, selected.y, selected.z, parseFloat(e.target.value), panTilt.tilt);
                    updatePlacedFixture(selected.id, { aimX: a.aimX, aimY: a.aimY });
                  }}
                  className="w-full accent-bc-accent" />
              </Field>
              <Field label={`Tilt: ${panTilt.tilt.toFixed(0)}°`}>
                <input type="range" min={0} max={89} step={1} title="Tilt"
                  value={panTilt.tilt}
                  onChange={(e) => {
                    const a = panTiltToAim(selected.x, selected.y, selected.z, panTilt.pan, parseFloat(e.target.value));
                    updatePlacedFixture(selected.id, { aimX: a.aimX, aimY: a.aimY });
                  }}
                  className="w-full accent-bc-accent" />
              </Field>
            </div>

            <Field label={`Body-Rotation: ${selected.bodyRotation.toFixed(0)}°`}>
              <input type="range" min={-90} max={90} step={1} title="Gehäuse-Drehung"
                value={selected.bodyRotation}
                onChange={(e) => updatePlacedFixture(selected.id, { bodyRotation: parseFloat(e.target.value) })}
                className="w-full accent-bc-accent" />
            </Field>

            {selectedDef.zoomRange && (
              <Field label={`Zoom: ${(selected.currentBeamAngle ?? selectedDef.fieldAngle).toFixed(0)}° (${selectedDef.zoomRange[0]}–${selectedDef.zoomRange[1]}°)`}>
                <input type="range" title="Zoom"
                  min={selectedDef.zoomRange[0]} max={selectedDef.zoomRange[1]} step={1}
                  value={selected.currentBeamAngle ?? selectedDef.fieldAngle}
                  onChange={(e) => updatePlacedFixture(selected.id, { currentBeamAngle: parseFloat(e.target.value) })}
                  className="w-full accent-bc-accent" />
              </Field>
            )}

            {selectedDef.colorTempRange && (
              <Field label={`CCT: ${(selected.currentColorTemp ?? selectedDef.colorTemp).toFixed(0)}K`}>
                <input type="range" title="Farbtemperatur"
                  min={selectedDef.colorTempRange[0]} max={selectedDef.colorTempRange[1]} step={50}
                  value={selected.currentColorTemp ?? selectedDef.colorTemp}
                  onChange={(e) => updatePlacedFixture(selected.id, { currentColorTemp: parseFloat(e.target.value) })}
                  className="w-full accent-bc-accent" />
              </Field>
            )}

            <Field label="Gels">
              <select value="" title="Gel hinzufügen" className={SELECT_CLS}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const current = selected.gelFilterIds ?? [];
                  if (current.includes(id)) return;
                  updatePlacedFixture(selected.id, { gelFilterIds: [...current, id] });
                }}>
                <option value="">+ Gel hinzufügen…</option>
                {GELS.map((g) => (
                  <option key={g.id} value={g.id}>{g.brand} {g.code} — {g.name}</option>
                ))}
              </select>
              {(selected.gelFilterIds ?? []).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {selected.gelFilterIds!.map((id) => {
                    const g = GELS.find((x) => x.id === id);
                    if (!g) return null;
                    return (
                      <span key={id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-bc-border text-gray-900"
                        style={{ background: g.displayColor ?? '#cbd5e1' }}>
                        {g.brand} {g.code}
                        <button type="button" title="Entfernen" className="hover:text-red-700"
                          onClick={() => updatePlacedFixture(selected.id, {
                            gelFilterIds: (selected.gelFilterIds ?? []).filter((x) => x !== id),
                          })}><FiX size={10} /></button>
                      </span>
                    );
                  })}
                </div>
              )}
            </Field>

            <div className="mt-3 p-2 rounded bg-bc-dark border border-bc-border">
              <div className="text-[10px] uppercase tracking-wide text-gray-400">Beleuchtungsstärke am Ziel</div>
              <div className="text-lg font-semibold text-bc-green">{selectedLux.toFixed(0)} lx</div>
              <div className="text-[10px] text-gray-400">
                Wurf: {Math.hypot(selected.aimX - selected.x, selected.aimY - selected.y, selected.z).toFixed(2)} m &middot; Gel: {(gelStackTransmission(selected.gelFilterIds) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        )}

        <div className="px-3 pb-4 text-[10px] text-gray-500">
          Venue: {venue.widthM} × {venue.heightM} m
        </div>
      </div>
    </div>
  );}
