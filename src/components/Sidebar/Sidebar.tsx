import { useStore } from '../../store/useStore';
import { CAMERAS, getCameraById, getAdapterInfo, getEffectiveSensor, getAvailableAdapters, getAutoAdapterId, getCoverageStatus } from '../../data/cameras';
import { LENSES, getLensById, getCompatibleLenses } from '../../data/lenses';
import { computeFov, computeDof } from '../../utils/fov';
import { FiPlus, FiTrash2, FiCopy, FiChevronDown, FiChevronUp, FiEye, FiEyeOff, FiUpload, FiUser, FiMap, FiMaximize2, FiLock, FiUnlock, FiStar } from 'react-icons/fi';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { BackgroundPlan, StageObjectType, CameraMountType } from '../../types';
import { MOUNT_TYPE_LABELS, MOUNT_HEIGHT_RANGE } from '../../types';
import * as pdfjsLib from 'pdfjs-dist';
import LightingSidebar from './LightingSidebar';

/** Group lenses by mount for the dropdown */
function groupByMount(lenses: typeof LENSES) {
  const groups: Record<string, typeof LENSES> = {};
  for (const l of lenses) {
    const m = l.mount;
    if (!groups[m]) groups[m] = [];
    groups[m].push(l);
  }
  return groups;
}

function sortFavoritesFirst<T extends { id: string; manufacturer?: string; model?: string }>(items: T[], favoriteIds: string[]) {
  const favorites = new Set(favoriteIds);
  return [...items].sort((left, right) => {
    const leftFavorite = favorites.has(left.id) ? 1 : 0;
    const rightFavorite = favorites.has(right.id) ? 1 : 0;
    if (leftFavorite !== rightFavorite) return rightFavorite - leftFavorite;

    const leftLabel = `${left.manufacturer ?? ''} ${left.model ?? ''}`.trim();
    const rightLabel = `${right.manufacturer ?? ''} ${right.model ?? ''}`.trim();
    return leftLabel.localeCompare(rightLabel);
  });
}

function CameraCard({ camId }: { camId: string }) {
  const {
    cameras,
    selectedCameraId,
    selectCamera,
    updateCamera,
    removeCamera,
    duplicateCamera,
    customLenses,
    addCustomLens,
    removeCustomLens,
    favoriteCameraIds,
    favoriteLensIds,
    toggleFavoriteCameraId,
    toggleFavoriteLensId,
    persons,
  } = useStore();
  const cam = cameras.find((c) => c.id === camId)!;
  const isSelected = cam.id === selectedCameraId;
  const [expanded, setExpanded] = useState(false);
  const [showNewLens, setShowNewLens] = useState(false);
  const [newLens, setNewLens] = useState({ manufacturer: '', model: '', focalMin: '10', focalMax: '100', aperture: '2.8', mount: 'B4', type: 'zoom' as 'zoom' | 'prime' });

  const camDef = getCameraById(cam.cameraId);
  const lensDef = getLensById(cam.lensId) ?? customLenses.find((l) => l.id === cam.lensId);
  const allLenses = [...LENSES, ...customLenses];
  const compatLenses = camDef ? getCompatibleLenses(camDef.mount, camDef.adaptedMounts) : allLenses;
  const allCompat = [...compatLenses, ...customLenses.filter((l) => {
    if (!camDef) return true;
    const mounts = new Set([camDef.mount, ...(camDef.adaptedMounts ?? [])]);
    return mounts.has(l.mount) || l.mount === 'universal';
  })];
  // Deduplicate by id
  const compatDeduped = [...new Map(allCompat.map((l) => [l.id, l])).values()];
  const grouped = groupByMount(sortFavoritesFirst(compatDeduped, favoriteLensIds));
  const sortedCameras = sortFavoritesFirst(CAMERAS, favoriteCameraIds);

  // Adapter & effective sensor
  const adapterOverride = { adapterId: cam.adapterId, useSpeedbooster: cam.useSpeedbooster };
  const adapterInfo = camDef && lensDef ? getAdapterInfo(camDef, lensDef, adapterOverride) : null;
  const effectiveSensor = camDef && lensDef ? getEffectiveSensor(camDef, lensDef, adapterOverride) : camDef?.sensor;
  const availableAdapters = camDef && lensDef ? getAvailableAdapters(camDef, lensDef) : [];
  const autoAdapterId = camDef && lensDef ? getAutoAdapterId(camDef, lensDef) : null;
  const adapterSelectValue = cam.adapterId ?? 'auto';
  const coverage = camDef && lensDef ? getCoverageStatus(camDef, lensDef, adapterInfo) : null;
  const fov = effectiveSensor && lensDef ? computeFov(effectiveSensor, cam.focalLength, cam.focusDistance, cam.extenderActive) : null;
  const dof = effectiveSensor && lensDef ? computeDof(effectiveSensor, cam.focalLength, cam.aperture, cam.focusDistance, cam.extenderActive) : null;

  return (
    <div
      className={`rounded-lg border p-3 mb-2 cursor-pointer transition-colors ${
        isSelected ? 'border-bc-accent bg-bc-accent/10' : 'border-bc-border bg-bc-panel hover:border-bc-accent/50'
      }`}
      onClick={() => selectCamera(cam.id)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cam.color }} />
          <input
            className="bg-transparent text-white font-bold text-sm w-20 outline-none"
            value={cam.label}
            onChange={(e) => updateCamera(cam.id, { label: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); duplicateCamera(cam.id); }} className="p-1 hover:text-bc-accent" title="Duplicate">
            <FiCopy size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); removeCamera(cam.id); }} className="p-1 hover:text-bc-red" title="Remove">
            <FiTrash2 size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="p-1 hover:text-bc-accent">
            {expanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Summary line */}
      <div className="text-xs text-gray-400 mt-1">
        {camDef?.manufacturer} {camDef?.model} — {lensDef?.model}
      </div>
      {fov && (
        <div className="text-xs text-gray-500 mt-0.5">
          {cam.focalLength.toFixed(0)}mm | FOV {fov.horizontalDeg.toFixed(1)}° | {fov.imageWidthAtDistance.toFixed(1)}m wide @ {cam.focusDistance}m
        </div>
      )}
      {/* Adapter badge */}
      {adapterInfo && (
        <div className="text-xs mt-0.5 text-bc-yellow">
          ⚡ {adapterInfo.name}{adapterInfo.lightLossStops > 0 ? ` (−${adapterInfo.lightLossStops}T)` : ''}{adapterInfo.lightLossStops < 0 ? ` (+${Math.abs(adapterInfo.lightLossStops)}T gain)` : ''}{adapterInfo.cropSensor ? ` → ${adapterInfo.cropSensor.name}` : ''}
          {cam.adapterId && <span className="ml-1 text-[10px] text-gray-400">(manual)</span>}
        </div>
      )}

      {/* Image-circle coverage warning */}
      {coverage && coverage.status !== 'ok' && (
        <div className={`text-xs mt-0.5 ${coverage.status === 'vignette' ? 'text-red-400' : 'text-orange-300'}`}>
          {coverage.status === 'vignette' ? '⛔' : '⚠️'} {coverage.message}
        </div>
      )}

      {/* Adapter dropdown – mirrors the camera/lens selectors.
          Always visible so the user can inspect/override the match. */}
      {camDef && lensDef && (
        <label className="flex items-center gap-1.5 text-xs mt-1 text-gray-300" onClick={(e) => e.stopPropagation()}>
          <span className="text-gray-500 shrink-0 w-14">Adapter</span>
          <select
            className="flex-1 bg-bc-dark border border-bc-border rounded px-1.5 py-0.5 text-white text-[11px]"
            value={adapterSelectValue}
            title="Adapter für Kamera & Objektiv"
            onChange={(e) => {
              const next = e.target.value;
              if (next === 'auto') {
                updateCamera(cam.id, { adapterId: undefined, useSpeedbooster: false });
              } else if (next === 'none') {
                updateCamera(cam.id, { adapterId: 'none', useSpeedbooster: false });
              } else {
                const chosen = availableAdapters.find((a) => a.id === next);
                updateCamera(cam.id, { adapterId: next, useSpeedbooster: !!chosen?.isSpeedBooster });
              }
            }}
          >
            {autoAdapterId === null && availableAdapters.length === 0 ? (
              <option value="auto">✓ Kein Adapter nötig</option>
            ) : (
              <option value="auto">
                Auto{autoAdapterId
                  ? ` — ${availableAdapters.find((a) => a.id === autoAdapterId)?.name ?? autoAdapterId}`
                  : ' — Kein Adapter nötig'}
              </option>
            )}
            {availableAdapters.length > 0 && <option value="none">Kein Adapter</option>}
            {availableAdapters.map((a) => (
              <option key={a.id} value={a.id}>{a.name}{a.lightLossStops ? ` (${a.lightLossStops > 0 ? '−' : '+'}${Math.abs(a.lightLossStops)}T)` : ''}</option>
            ))}
          </select>
        </label>
      )}

      {/* Expanded controls */}
      {expanded && (
        <div className="mt-3 space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
          {/* Camera selector grouped by type */}
          <label className="block">
            <span className="flex items-center justify-between gap-2 text-gray-400">
              <span>Camera ({camDef?.mount} mount, {camDef?.sensor.name})</span>
              {camDef && (
                <button
                  type="button"
                  onClick={() => toggleFavoriteCameraId(camDef.id)}
                  className={`p-1 rounded ${favoriteCameraIds.includes(camDef.id) ? 'text-bc-yellow' : 'text-gray-500 hover:text-bc-yellow'}`}
                  title={favoriteCameraIds.includes(camDef.id) ? 'Remove camera favorite' : 'Favorite camera'}
                >
                  <FiStar size={12} fill={favoriteCameraIds.includes(camDef.id) ? 'currentColor' : 'none'} />
                </button>
              )}
            </span>
            <select
              className="block w-full mt-0.5 bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
              value={cam.cameraId}
              onChange={(e) => {
                const newCam = getCameraById(e.target.value);
                if (!newCam) return;
                const lens = getCompatibleLenses(newCam.mount, newCam.adaptedMounts)[0];
                updateCamera(cam.id, {
                  cameraId: e.target.value,
                  lensId: lens?.id ?? cam.lensId,
                  focalLength: lens?.focalLengthMin ?? cam.focalLength,
                });
              }}
            >
              {sortedCameras.map((c) => (
                <option key={c.id} value={c.id}>{favoriteCameraIds.includes(c.id) ? '* ' : ''}{c.manufacturer} {c.model} [{c.mount}]</option>
              ))}
            </select>
          </label>

          {/* Lens selector grouped by mount */}
          <label className="block">
            <span className="flex items-center justify-between gap-2 text-gray-400">
              <span>Lens</span>
              {lensDef && (
                <button
                  type="button"
                  onClick={() => toggleFavoriteLensId(lensDef.id)}
                  className={`p-1 rounded ${favoriteLensIds.includes(lensDef.id) ? 'text-bc-yellow' : 'text-gray-500 hover:text-bc-yellow'}`}
                  title={favoriteLensIds.includes(lensDef.id) ? 'Remove lens favorite' : 'Favorite lens'}
                >
                  <FiStar size={12} fill={favoriteLensIds.includes(lensDef.id) ? 'currentColor' : 'none'} />
                </button>
              )}
            </span>
            <select
              className="block w-full mt-0.5 bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
              value={cam.lensId}
              onChange={(e) => {
                if (e.target.value === '__new__') { setShowNewLens(true); return; }
                const lens = getLensById(e.target.value) ?? customLenses.find((l) => l.id === e.target.value);
                updateCamera(cam.id, {
                  lensId: e.target.value,
                  focalLength: lens?.focalLengthMin ?? cam.focalLength,
                  aperture: lens?.maxApertureWide ?? cam.aperture,
                });
              }}
            >
              {Object.entries(grouped).map(([mount, lenses]) => (
                <optgroup key={mount} label={`── ${mount} mount ──`}>
                  {lenses.map((l) => (
                    <option key={l.id} value={l.id}>{favoriteLensIds.includes(l.id) ? '* ' : ''}{l.manufacturer} {l.model}{l.isCustom ? ' +custom' : ''}</option>
                  ))}
                </optgroup>
              ))}
              <option value="__new__">＋ Add custom lens…</option>
            </select>
          </label>
          {/* Custom lens: delete button for active custom lens */}
          {lensDef?.isCustom && (
            <button
              onClick={() => { removeCustomLens(cam.lensId); const first = compatDeduped.find(l => !l.isCustom); if (first) updateCamera(cam.id, { lensId: first.id, focalLength: first.focalLengthMin }); }}
              className="text-[10px] text-bc-red hover:text-red-400 mt-0.5"
            >Remove custom lens "{lensDef.manufacturer} {lensDef.model}"</button>
          )}
          {/* Inline custom lens creation form */}
          {showNewLens && (
            <div className="bg-bc-dark rounded p-2 border border-bc-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-medium text-[11px]">New Custom Lens</span>
                <button onClick={() => setShowNewLens(false)} className="text-gray-500 hover:text-white text-xs">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <input placeholder="Manufacturer" className="bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white text-xs"
                  value={newLens.manufacturer} onChange={(e) => setNewLens({ ...newLens, manufacturer: e.target.value })} />
                <input placeholder="Model" className="bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white text-xs"
                  value={newLens.model} onChange={(e) => setNewLens({ ...newLens, model: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-1">
                <label><span className="text-gray-500 text-[10px]">Min mm</span>
                  <input type="number" className="w-full bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white text-xs"
                    value={newLens.focalMin} onChange={(e) => setNewLens({ ...newLens, focalMin: e.target.value })} /></label>
                <label><span className="text-gray-500 text-[10px]">Max mm</span>
                  <input type="number" className="w-full bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white text-xs"
                    value={newLens.focalMax} onChange={(e) => setNewLens({ ...newLens, focalMax: e.target.value })} /></label>
                <label><span className="text-gray-500 text-[10px]">f/</span>
                  <input type="number" className="w-full bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white text-xs"
                    value={newLens.aperture} onChange={(e) => setNewLens({ ...newLens, aperture: e.target.value })} /></label>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <select className="bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white text-xs"
                  value={newLens.mount} onChange={(e) => setNewLens({ ...newLens, mount: e.target.value })}>
                  {['B4', 'EF', 'PL', 'E', 'MFT', 'RF', 'L', 'FZ', 'universal'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select className="bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white text-xs"
                  value={newLens.type} onChange={(e) => setNewLens({ ...newLens, type: e.target.value as 'zoom' | 'prime' })}>
                  <option value="zoom">Zoom</option>
                  <option value="prime">Prime</option>
                </select>
              </div>
              <button
                onClick={() => {
                  if (!newLens.manufacturer || !newLens.model) return;
                  const newId = addCustomLens({
                    manufacturer: newLens.manufacturer,
                    model: newLens.model,
                    focalLengthMin: parseFloat(newLens.focalMin) || 10,
                    focalLengthMax: parseFloat(newLens.focalMax) || 100,
                    maxApertureWide: parseFloat(newLens.aperture) || 2.8,
                    mount: newLens.mount,
                    type: newLens.type,
                  });
                  updateCamera(cam.id, {
                    lensId: newId,
                    focalLength: parseFloat(newLens.focalMin) || 10,
                    aperture: parseFloat(newLens.aperture) || 2.8,
                  });
                  setNewLens({ manufacturer: '', model: '', focalMin: '10', focalMax: '100', aperture: '2.8', mount: 'B4', type: 'zoom' });
                  setShowNewLens(false);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded bg-bc-green/20 text-bc-green text-xs hover:bg-bc-green/30 w-full justify-center"
              >
                <FiPlus size={12} /> Create & Select
              </button>
            </div>
          )}

          {/* Focal length slider */}
          <label className="block">
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-400">Focal Length: {cam.focalLength.toFixed(1)}mm{cam.extenderActive > 1 ? ` (eff. ${(cam.focalLength * cam.extenderActive).toFixed(0)}mm)` : ''}</span>
              <input
                type="number"
                step={0.1}
                min={lensDef?.focalLengthMin ?? 1}
                max={lensDef?.focalLengthMax ?? 2000}
                className="w-16 bg-bc-dark border border-bc-border rounded px-1 py-0.5 text-white text-[11px]"
                value={cam.focalLength}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isFinite(v)) return;
                  const min = lensDef?.focalLengthMin ?? 1;
                  const max = lensDef?.focalLengthMax ?? 2000;
                  updateCamera(cam.id, { focalLength: Math.max(min, Math.min(max, v)) });
                }}
              />
            </div>
            <input
              type="range"
              className="w-full accent-bc-accent"
              min={lensDef?.focalLengthMin ?? 4}
              max={lensDef?.focalLengthMax ?? 300}
              step={0.1}
              value={cam.focalLength}
              onChange={(e) => updateCamera(cam.id, { focalLength: parseFloat(e.target.value) })}
            />
          </label>

          {/* Aperture */}
          <label className="block">
            <span className="text-gray-400">Aperture: f/{cam.aperture.toFixed(1)}{adapterInfo && adapterInfo.lightLossStops !== 0 ? ` (eff. T${(cam.aperture * Math.pow(2, adapterInfo.lightLossStops / 2)).toFixed(1)})` : ''}</span>
            <input
              type="range"
              className="w-full accent-bc-accent"
              min={lensDef?.maxApertureWide ?? 1.4}
              max={22}
              step={0.1}
              value={cam.aperture}
              onChange={(e) => updateCamera(cam.id, { aperture: parseFloat(e.target.value) })}
            />
          </label>

          {/* Focus distance */}
          <label className="block">
            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-400">
                Distance: {cam.focusDistance.toFixed(1)}m
                {cam.lockedPersonId && <span className="ml-1 text-bc-accent text-[10px]">🔒 locked</span>}
              </span>
              <input
                type="number"
                step={0.1}
                min={0.1}
                max={500}
                className="w-16 bg-bc-dark border border-bc-border rounded px-1 py-0.5 text-white text-[11px]"
                value={cam.focusDistance}
                onChange={(e) => updateCamera(cam.id, { focusDistance: Math.max(0.1, parseFloat(e.target.value) || 0) })}
              />
            </div>
            <input
              type="range"
              className="w-full accent-bc-accent"
              min={0.5}
              max={200}
              step={0.5}
              value={cam.focusDistance}
              onChange={(e) => updateCamera(cam.id, { focusDistance: parseFloat(e.target.value) })}
            />
            {/* Quick-focus buttons for each person */}
            {persons.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {persons.map((p) => {
                  const dx = cam.x - p.x;
                  const dy = cam.y - p.y;
                  const dist = Math.hypot(dx, dy);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => updateCamera(cam.id, { focusDistance: Math.round(dist * 10) / 10 })}
                      className="px-1.5 py-0.5 rounded bg-bc-accent/20 text-bc-accent hover:bg-bc-accent/40 text-[10px] transition-colors"
                      title={`Fokus auf ${p.label} (${dist.toFixed(1)}m)`}
                    >
                      🎯 {p.label} ({dist.toFixed(1)}m)
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
              <span className="shrink-0">Lock to</span>
              <select
                className="flex-1 bg-bc-dark border border-bc-border rounded px-1 py-0.5 text-white"
                value={cam.lockedPersonId ?? ''}
                onChange={(e) => updateCamera(cam.id, { lockedPersonId: e.target.value || undefined })}
              >
                <option value="">— none —</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            {cam.lockedPersonId && (() => {
              const target = persons.find((p) => p.id === cam.lockedPersonId);
              if (!target) return null;
              const dx = cam.x - target.x;
              const dy = cam.y - target.y;
              const currentDist = Math.hypot(dx, dy);
              return (
                <div className="mt-1 pl-3 border-l-2 border-bc-accent/60">
                  <label className="block">
                    <span className="text-[10px] text-gray-400">Entfernung zum Objekt: {currentDist.toFixed(2)} m</span>
                    <input
                      type="range"
                      className="w-full accent-bc-accent"
                      min={0.3}
                      max={Math.max(10, currentDist + 5)}
                      step={0.1}
                      title="Kamera entlang der Achse zum Objekt verschieben"
                      value={currentDist}
                      onChange={(e) => {
                        const d = parseFloat(e.target.value);
                        const len = Math.hypot(dx, dy) || 1e-4;
                        const ux = dx / len;
                        const uy = dy / len;
                        const nx = target.x + ux * d;
                        const ny = target.y + uy * d;
                        updateCamera(cam.id, { x: nx, y: ny, lockedDistance: d });
                      }}
                    />
                  </label>
                </div>
              );
            })()}
          </label>

          {/* Pan */}
          <label className="block">
            <span className="text-gray-400">Pan: {cam.pan.toFixed(0)}°</span>
            <input
              type="range"
              className="w-full accent-bc-accent"
              min={-180}
              max={180}
              step={1}
              value={cam.pan}
              onChange={(e) => updateCamera(cam.id, { pan: parseFloat(e.target.value) })}
            />
          </label>

          {/* Tilt */}
          <label className="block">
            <span className="text-gray-400">Tilt: {cam.tilt.toFixed(0)}°</span>
            <input
              type="range"
              className="w-full accent-bc-accent"
              min={-180}
              max={180}
              step={1}
              value={cam.tilt}
              onChange={(e) => updateCamera(cam.id, { tilt: parseFloat(e.target.value) })}
            />
          </label>

          {/* Extender */}
          {lensDef?.extenderFactors && lensDef.extenderFactors.length > 0 && (
            <label className="block">
              <span className="text-gray-400">Extender</span>
              <select
                className="block w-full mt-0.5 bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
                value={cam.extenderActive}
                onChange={(e) => updateCamera(cam.id, { extenderActive: parseFloat(e.target.value) })}
              >
                <option value={1}>Off (1×)</option>
                {lensDef.extenderFactors.map((f) => (
                  <option key={f} value={f}>{f}× Extender</option>
                ))}
              </select>
            </label>
          )}

          {/* Position */}
          <div className="grid grid-cols-3 gap-2">
            <label>
              <span className="text-gray-400">X (m)</span>
              <input
                type="number"
                className="w-full bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
                value={cam.x}
                step={0.5}
                onChange={(e) => updateCamera(cam.id, { x: parseFloat(e.target.value) })}
              />
            </label>
            <label>
              <span className="text-gray-400">Y (m)</span>
              <input
                type="number"
                className="w-full bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
                value={cam.y}
                step={0.5}
                onChange={(e) => updateCamera(cam.id, { y: parseFloat(e.target.value) })}
              />
            </label>
            <label>
              <span className="text-gray-400">Z (m)</span>
              <input
                type="number"
                className="w-full bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
                value={cam.z}
                step={0.1}
                onChange={(e) => updateCamera(cam.id, { z: parseFloat(e.target.value) })}
              />
            </label>
          </div>

          {/* Mount / Support type */}
          <label className="block">
            <span className="text-gray-400">Mount Type</span>
            <select
              className="block w-full mt-0.5 bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
              value={cam.mountType ?? 'tripod'}
              onChange={(e) => {
                const mt = e.target.value as CameraMountType;
                const range = MOUNT_HEIGHT_RANGE[mt];
                // Clamp existing Z into the new mount range
                const z = Math.max(range.min, Math.min(range.max, cam.z));
                updateCamera(cam.id, { mountType: mt, z });
              }}
            >
              {Object.entries(MOUNT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>

          {/* Mount-constrained height slider (pedestal pump / jib boom / dolly height etc.) */}
          {(() => {
            const mt = cam.mountType ?? 'tripod';
            const range = MOUNT_HEIGHT_RANGE[mt];
            return (
              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">
                    Height: {cam.z.toFixed(2)}m
                    <span className="ml-1 text-[10px] text-gray-600">({range.min.toFixed(1)}–{range.max.toFixed(1)}m {mt === 'pedestal' ? 'pump' : mt === 'jib' ? 'boom' : 'range'})</span>
                  </span>
                </div>
                <input
                  type="range"
                  className="w-full accent-bc-accent"
                  min={range.min}
                  max={range.max}
                  step={0.01}
                  value={Math.max(range.min, Math.min(range.max, cam.z))}
                  onChange={(e) => updateCamera(cam.id, { z: parseFloat(e.target.value) })}
                />
              </label>
            );
          })()}

          {/* Live-motion track slider (jib swing / dolly roll along current pan axis) */}
          {(() => {
            const mt = cam.mountType ?? 'tripod';
            const range = MOUNT_HEIGHT_RANGE[mt];
            if (!range.track) return null;
            const t = cam.trackOffset ?? 0;
            const half = range.track;
            return (
              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">
                    {mt === 'jib' ? 'Jib swing' : 'Dolly travel'}: {t.toFixed(2)}m
                  </span>
                  <button
                    onClick={() => {
                      // "Bake" the live track offset into camera x/y then reset slider to 0
                      const panRad = (cam.pan * Math.PI) / 180;
                      const perpX = Math.cos(panRad);
                      const perpY = Math.sin(panRad);
                      updateCamera(cam.id, {
                        x: cam.x + perpX * t,
                        y: cam.y + perpY * t,
                        trackOffset: 0,
                      });
                    }}
                    className="text-[10px] text-bc-accent hover:text-white px-1 py-0.5 rounded border border-bc-border"
                    title="Bake current offset into camera position"
                  >
                    bake
                  </button>
                </div>
                <input
                  type="range"
                  className="w-full accent-bc-accent"
                  min={-half}
                  max={half}
                  step={0.01}
                  value={Math.max(-half, Math.min(half, t))}
                  onChange={(e) => updateCamera(cam.id, { trackOffset: parseFloat(e.target.value) })}
                />
              </label>
            );
          })()}

          {/* Preview control options */}
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={!!cam.invertPreview}
              onChange={(e) => updateCamera(cam.id, { invertPreview: e.target.checked })}
              className="accent-bc-accent"
            />
            Invert preview mouse (natural ↔ reverse)
          </label>

          {/* DoF readout */}
          {dof && (
            <div className="bg-bc-dark rounded p-2 mt-2 border border-bc-border">
              <span className="text-gray-400">Depth of Field</span>
              <div className="text-white">
                Near: {dof.nearLimit < 0.01 ? '0m' : dof.nearLimit.toFixed(2) + 'm'} | Far: {dof.farLimit === Infinity ? '∞' : dof.farLimit.toFixed(2) + 'm'}
              </div>
              <div className="text-white">
                Total: {dof.totalDof === Infinity ? '∞' : dof.totalDof.toFixed(2) + 'm'}
              </div>
            </div>
          )}

          {/* Effective sensor info */}
          {effectiveSensor && effectiveSensor !== camDef?.sensor && (
            <div className="bg-bc-dark rounded p-2 border border-bc-border text-bc-yellow">
              Eff. Sensor: {effectiveSensor.name} (crop ×{effectiveSensor.cropFactor.toFixed(1)})
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const appMode = useStore((s) => s.appMode);
  if (appMode === 'lighting') {
    return <LightingSidebar />;
  }
  return <CameraSidebar />;
}

function CameraSidebar() {
  const {
    cameras, addCamera, venue, setVenue, showAllFov, toggleShowAllFov, clearAll,
    pixelsPerMeter, setPixelsPerMeter,
    addStage, removeStage, updateStage,
    persons, addPerson, addStageObject, removePerson,
    backgroundPlan, setBackgroundPlan,
    walls, addWall, removeWall, updateWall,
  } = useStore();
  const [venueOpen, setVenueOpen] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(false);
  const [personsOpen, setPersonsOpen] = useState(false);
  const [wallsOpen, setWallsOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [wallDrawMode, setWallDrawMode] = useState(false);
  const [showObjectAdder, setShowObjectAdder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [calibAxis, setCalibAxis] = useState<'x' | 'y' | null>(null);
  const [calibDistX, setCalibDistX] = useState('10');
  const [calibDistY, setCalibDistY] = useState('10');
  const [autoResize, setAutoResize] = useState(true);
  const [scaleLocked, setScaleLocked] = useState(true);

  /** Convert a PDF first page to a data URL at 2× DPI */
  const pdfToDataUrl = useCallback(async (file: File): Promise<{ dataUrl: string; width: number; height: number }> => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const arrayBuf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
    const page = await pdf.getPage(1);
    const scale = 2; // 2× for crisp rendering
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, viewport }).promise;
    return { dataUrl: canvas.toDataURL('image/png'), width: viewport.width, height: viewport.height };
  }, []);

  const handleBgUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) return;

    if (isPdf) {
      try {
        const { dataUrl, width, height } = await pdfToDataUrl(file);
        const s = venue.widthM / width;
        const plan: BackgroundPlan = {
          dataUrl,
          scaleX: s,
          scaleY: s,
          offsetX: 0,
          offsetY: 0,
          opacity: 0.3,
          widthPx: width,
          heightPx: height,
        };
        setBackgroundPlan(plan);
      } catch (err) {
        alert('Failed to render PDF. Make sure it is a valid PDF file.');
        console.error(err);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const s = venue.widthM / img.width;
          const plan: BackgroundPlan = {
            dataUrl,
            scaleX: s,
            scaleY: s,
            offsetX: 0,
            offsetY: 0,
            opacity: 0.3,
            widthPx: img.width,
            heightPx: img.height,
          };
          setBackgroundPlan(plan);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  }, [venue.widthM, setBackgroundPlan, pdfToDataUrl]);

  /** Start/stop calibration mode — dispatches custom event to Venue2D */
  const startCalibration = useCallback((axis: 'x' | 'y') => {
    if (calibAxis === axis) {
      // Cancel
      setCalibAxis(null);
      window.dispatchEvent(new CustomEvent('multicam-calibrate', { detail: { active: false, distanceM: 0, axis } }));
    } else {
      const dist = axis === 'x' ? parseFloat(calibDistX) || 10 : parseFloat(calibDistY) || 10;
      setCalibAxis(axis);
      window.dispatchEvent(new CustomEvent('multicam-calibrate', { detail: { active: true, distanceM: dist, axis, autoResize, scaleLocked } }));
    }
  }, [calibAxis, calibDistX, calibDistY, autoResize, scaleLocked]);

  // Listen for calibration-done event from Venue2D to reset button state
  useEffect(() => {
    const handler = () => setCalibAxis(null);
    window.addEventListener('multicam-calibrate-done', handler);
    return () => window.removeEventListener('multicam-calibrate-done', handler);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('multicam-wall-draw', { detail: { active: wallDrawMode } }));
  }, [wallDrawMode]);

  return (
    <div className="w-80 bg-bc-panel border-r border-bc-border h-full flex flex-col overflow-y-auto">
      {/* Venue settings */}
      <div className="p-3 border-b border-bc-border">
        <button
          className="flex items-center justify-between w-full text-sm text-white font-semibold"
          onClick={() => setVenueOpen(!venueOpen)}
        >
          <span>Venue Settings</span>
          {venueOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
        </button>
        {venueOpen && (
          <div className="mt-2 space-y-2 text-xs">
            <label className="block">
              <span className="text-gray-400">Name</span>
              <input
                className="w-full bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
                value={venue.name}
                onChange={(e) => setVenue({ ...venue, name: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="text-gray-400">Width (m)</span>
                <input
                  type="number"
                  className="w-full bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
                  value={venue.widthM}
                  onChange={(e) => setVenue({ ...venue, widthM: parseFloat(e.target.value) || 10 })}
                />
              </label>
              <label>
                <span className="text-gray-400">Depth (m)</span>
                <input
                  type="number"
                  className="w-full bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
                  value={venue.heightM}
                  onChange={(e) => setVenue({ ...venue, heightM: parseFloat(e.target.value) || 10 })}
                />
              </label>
            </div>
            <label className="block">
              <span className="text-gray-400">Zoom: {pixelsPerMeter}px/m</span>
              <input
                type="range"
                className="w-full accent-bc-accent"
                min={10}
                max={80}
                value={pixelsPerMeter}
                onChange={(e) => setPixelsPerMeter(parseInt(e.target.value))}
              />
            </label>

            {/* Walls (nested sub-section of Venue Settings) */}
            <div className="mt-1 pt-2 border-t border-bc-border/60">
              <button
                type="button"
                className="flex items-center justify-between w-full text-xs text-gray-200 font-semibold"
                onClick={() => setWallsOpen(!wallsOpen)}
              >
                <span>▇ Walls ({walls.length})</span>
                {wallsOpen ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
              </button>
              {wallsOpen && (
                <div className="mt-2 space-y-2">
                  <button
                    onClick={() => setWallDrawMode((active) => !active)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs w-full justify-center ${wallDrawMode ? 'bg-bc-yellow/20 text-bc-yellow hover:bg-bc-yellow/30' : 'bg-bc-dark text-gray-300 hover:text-white border border-bc-border'}`}
                  >
                    {wallDrawMode ? 'Stop Drawing' : 'Draw Walls'}
                  </button>
                  {wallDrawMode && (
                    <div className="rounded border border-bc-border bg-bc-dark px-2 py-1.5 text-[10px] text-gray-400 leading-relaxed">
                      Click once to place the start point, click again to finish. Hold Shift to snap the angle.
                    </div>
                  )}
                  {walls.map((w) => (
                    <div key={w.id} className="flex items-center gap-2 bg-bc-dark rounded p-1.5 border border-bc-border">
                      <input
                        className="bg-transparent text-white text-xs w-16 outline-none"
                        value={w.label}
                        onChange={(e) => updateWall(w.id, { label: e.target.value })}
                      />
                      <span className="text-gray-500 text-[10px]">{w.height}m h</span>
                      <button onClick={() => removeWall(w.id)} className="ml-auto p-0.5 hover:text-bc-red"><FiTrash2 size={11} /></button>
                    </div>
                  ))}
                  <button
                    onClick={() => addWall()}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-bc-accent/20 text-bc-accent text-xs hover:bg-bc-accent/30 w-full justify-center"
                  >
                    <FiPlus size={12} /> Add Wall
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stages management */}
      <div className="p-3 border-b border-bc-border">
        <button
          className="flex items-center justify-between w-full text-sm text-white font-semibold"
          onClick={() => setStagesOpen(!stagesOpen)}
        >
          <span><FiMap className="inline mr-1" size={13} />Stages ({venue.stages.length})</span>
          {stagesOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
        </button>
        {stagesOpen && (
          <div className="mt-2 space-y-2 text-xs">
            {venue.stages.map((s) => (
              <div key={s.id} className="bg-bc-dark rounded p-2 border border-bc-border">
                <div className="flex items-center justify-between mb-1">
                  <input
                    className="bg-transparent text-white text-xs font-semibold w-24 outline-none"
                    value={s.label}
                    onChange={(e) => updateStage(s.id, { label: e.target.value })}
                  />
                  <button onClick={() => removeStage(s.id)} className="p-0.5 hover:text-bc-red" title="Remove stage">
                    <FiTrash2 size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  <label>
                    <span className="text-gray-500">X</span>
                    <input type="number" className="w-full bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white text-xs" value={s.x} step={0.5}
                      onChange={(e) => updateStage(s.id, { x: parseFloat(e.target.value) || 0 })} />
                  </label>
                  <label>
                    <span className="text-gray-500">Y</span>
                    <input type="number" className="w-full bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white text-xs" value={s.y} step={0.5}
                      onChange={(e) => updateStage(s.id, { y: parseFloat(e.target.value) || 0 })} />
                  </label>
                  <label>
                    <span className="text-gray-500">W</span>
                    <input type="number" className="w-full bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white text-xs" value={s.width} step={0.5}
                      onChange={(e) => updateStage(s.id, { width: parseFloat(e.target.value) || 1 })} />
                  </label>
                  <label>
                    <span className="text-gray-500">H</span>
                    <input type="number" className="w-full bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white text-xs" value={s.height} step={0.5}
                      onChange={(e) => updateStage(s.id, { height: parseFloat(e.target.value) || 1 })} />
                  </label>
                </div>
              </div>
            ))}
            <button
              onClick={() => addStage()}
              className="flex items-center gap-1 px-2 py-1 rounded bg-bc-accent/20 text-bc-accent text-xs hover:bg-bc-accent/30 w-full justify-center"
            >
              <FiPlus size={12} /> Add Stage
            </button>
          </div>
        )}
      </div>

      {/* Persons & Stage Objects */}
      <div className="p-3 border-b border-bc-border">
        <button
          className="flex items-center justify-between w-full text-sm text-white font-semibold"
          onClick={() => setPersonsOpen(!personsOpen)}
        >
          <span><FiUser className="inline mr-1" size={13} />Objects & Persons ({persons.length})</span>
          {personsOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
        </button>
        {personsOpen && (
          <div className="mt-2 space-y-2 text-xs">
            {persons.map((p) => {
              const typeIcon =
                p.objectType === 'drums' ? '🥁' :
                p.objectType === 'keys' ? '🎹' :
                p.objectType === 'person-guitar' ? '🎸' :
                p.objectType === 'sitting-person' ? '🪑' :
                p.objectType === 'mic-stand' ? '🎤' :
                p.objectType === 'chair' ? '🪑' :
                p.objectType === 'table' ? '🟫' :
                p.objectType === 'lectern' ? '🎙️' :
                p.objectType === 'schneetiger' ? '🐅' : '👤';
              return (
                <div key={p.id} className="bg-bc-dark rounded p-1.5 border border-bc-border space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-[10px] w-5">{typeIcon}</span>
                    <input className="bg-transparent text-white text-xs flex-1 outline-none" value={p.label}
                      onChange={(e) => useStore.getState().updatePerson(p.id, { label: e.target.value })} />
                    <button onClick={() => removePerson(p.id)} className="p-0.5 hover:text-bc-red"><FiTrash2 size={11} /></button>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <span className="w-8 shrink-0">Size</span>
                    <input type="number" step="0.05" min={0.1} max={3}
                      className="w-14 bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white"
                      value={p.height}
                      onChange={(e) => useStore.getState().updatePerson(p.id, { height: Math.max(0.1, parseFloat(e.target.value) || 0) })} />
                    <span className="text-gray-600">m</span>
                    <input type="number" step="0.05" min={0.1} max={5}
                      className="w-14 bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white"
                      value={p.width}
                      onChange={(e) => useStore.getState().updatePerson(p.id, { width: Math.max(0.1, parseFloat(e.target.value) || 0) })} />
                    <span className="text-gray-600">w</span>
                    <input type="color" className="h-5 w-8 bg-transparent border border-bc-border rounded cursor-pointer"
                      value={p.color ?? '#f59e0b'}
                      onChange={(e) => useStore.getState().updatePerson(p.id, { color: e.target.value })} />
                    <span className="ml-auto text-gray-600">({p.x.toFixed(1)}, {p.y.toFixed(1)})</span>
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-3 gap-1">
              <button onClick={() => addPerson()} className="flex items-center justify-center gap-1 px-1 py-1 rounded bg-bc-accent/20 text-bc-accent text-[10px] hover:bg-bc-accent/30">
                <FiUser size={10} /> Person
              </button>
              <button
                onClick={() => setShowObjectAdder((v) => !v)}
                title={showObjectAdder ? 'Objekt-Liste ausblenden' : 'Weitere Objekte hinzufügen'}
                className={`col-span-2 flex items-center justify-center gap-1 px-1 py-1 rounded text-[10px] border border-bc-border ${showObjectAdder ? 'bg-bc-accent/30 text-white' : 'bg-bc-dark text-gray-400 hover:text-white'}`}
              >
                {showObjectAdder ? '− Objekte ausblenden' : '+ Objekt hinzufügen'}
              </button>
            </div>
            {showObjectAdder && (
              <div className="grid grid-cols-3 gap-1 mt-1">
              <button onClick={() => addStageObject('person-guitar')} className="flex items-center justify-center gap-1 px-1 py-1 rounded bg-bc-accent/20 text-bc-accent text-[10px] hover:bg-bc-accent/30">
                🎸 Guitarist
              </button>
              <button onClick={() => addStageObject('sitting-person')} className="flex items-center justify-center gap-1 px-1 py-1 rounded bg-bc-accent/20 text-bc-accent text-[10px] hover:bg-bc-accent/30">
                🪑 Seated
              </button>
              <button onClick={() => addStageObject('drums')} className="flex items-center justify-center gap-1 px-1 py-1 rounded bg-bc-accent/20 text-bc-accent text-[10px] hover:bg-bc-accent/30">
                🥁 Drums
              </button>
              <button onClick={() => addStageObject('keys')} className="flex items-center justify-center gap-1 px-1 py-1 rounded bg-bc-accent/20 text-bc-accent text-[10px] hover:bg-bc-accent/30">
                🎹 Keys
              </button>
              <button onClick={() => addStageObject('mic-stand')} className="flex items-center justify-center gap-1 px-1 py-1 rounded bg-bc-accent/20 text-bc-accent text-[10px] hover:bg-bc-accent/30">
                🎤 Mic
              </button>
              <button onClick={() => addStageObject('chair')} className="flex items-center justify-center gap-1 px-1 py-1 rounded bg-bc-accent/20 text-bc-accent text-[10px] hover:bg-bc-accent/30">
                🪑 Chair
              </button>
              <button onClick={() => addStageObject('table')} className="flex items-center justify-center gap-1 px-1 py-1 rounded bg-bc-accent/20 text-bc-accent text-[10px] hover:bg-bc-accent/30">
                🟫 Table
              </button>
              <button onClick={() => addStageObject('lectern')} className="flex items-center justify-center gap-1 px-1 py-1 rounded bg-bc-accent/20 text-bc-accent text-[10px] hover:bg-bc-accent/30">
                🎙️ Lectern
              </button>
              <button onClick={() => addStageObject('schneetiger')} className="col-span-3 flex items-center justify-center gap-1 px-1 py-1 rounded bg-sky-500/20 text-sky-300 text-[10px] hover:bg-sky-500/30">
                🐅 Schneetiger
              </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Background plan */}
      <div className="p-3 border-b border-bc-border">
        <button
          className="flex items-center justify-between w-full text-sm text-white font-semibold"
          onClick={() => setBgOpen(!bgOpen)}
        >
          <span><FiUpload className="inline mr-1" size={13} />Floor Plan</span>
          {bgOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
        </button>
        {bgOpen && (
          <div className="mt-2 space-y-2 text-xs">
            <input ref={fileInputRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={handleBgUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 rounded bg-bc-accent/20 text-bc-accent text-xs hover:bg-bc-accent/30 w-full justify-center"
            >
              <FiUpload size={12} /> {backgroundPlan ? 'Replace Image/PDF' : 'Upload Image or PDF'}
            </button>
            {backgroundPlan && (
              <>
                <label className="block">
                  <span className="text-gray-400">Opacity: {(backgroundPlan.opacity * 100).toFixed(0)}%</span>
                  <input type="range" className="w-full accent-bc-accent" min={0.05} max={1} step={0.05}
                    value={backgroundPlan.opacity}
                    onChange={(e) => setBackgroundPlan({ ...backgroundPlan, opacity: parseFloat(e.target.value) })} />
                </label>
                <label className="block">
                  <span className="text-gray-400">Scale X: {(backgroundPlan.scaleX * 1000).toFixed(1)} mm/px ({(backgroundPlan.widthPx * backgroundPlan.scaleX).toFixed(1)}m wide)</span>
                  <input type="range" className="w-full accent-bc-accent"
                    min={0.001} max={0.5} step={0.001}
                    value={backgroundPlan.scaleX}
                    onChange={(e) => { const v = parseFloat(e.target.value); setBackgroundPlan({ ...backgroundPlan, scaleX: v, ...(scaleLocked ? { scaleY: v } : {}) }); }} />
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setScaleLocked(!scaleLocked)}
                    className={`p-1 rounded border ${scaleLocked ? 'border-bc-accent text-bc-accent' : 'border-bc-border text-gray-500 hover:text-gray-300'}`}
                    title={scaleLocked ? 'Unlock Y scale for independent adjustment' : 'Lock Y scale to X'}
                  >
                    {scaleLocked ? <FiLock size={11} /> : <FiUnlock size={11} />}
                  </button>
                  <span className="text-[10px] text-gray-500">{scaleLocked ? 'X/Y linked' : 'X/Y independent'}</span>
                </div>
                <label className={`block ${scaleLocked ? 'opacity-40 pointer-events-none' : ''}`}>
                  <span className="text-gray-400">Scale Y: {(backgroundPlan.scaleY * 1000).toFixed(1)} mm/px ({(backgroundPlan.heightPx * backgroundPlan.scaleY).toFixed(1)}m tall)</span>
                  <input type="range" className="w-full accent-bc-accent"
                    min={0.001} max={0.5} step={0.001}
                    value={backgroundPlan.scaleY}
                    onChange={(e) => setBackgroundPlan({ ...backgroundPlan, scaleY: parseFloat(e.target.value) })} />
                </label>
                {/* Quick fit buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={() => { const s = venue.widthM / backgroundPlan.widthPx; setBackgroundPlan({ ...backgroundPlan, scaleX: s, ...(scaleLocked ? { scaleY: s } : {}) }); }}
                    className="flex-1 px-1 py-0.5 rounded bg-bc-dark border border-bc-border text-gray-400 hover:text-white text-[10px]"
                  >
                    Fit Width
                  </button>
                  <button
                    onClick={() => { const s = venue.heightM / backgroundPlan.heightPx; setBackgroundPlan({ ...backgroundPlan, scaleY: s, ...(scaleLocked ? { scaleX: s } : {}) }); }}
                    className={`flex-1 px-1 py-0.5 rounded bg-bc-dark border border-bc-border text-gray-400 hover:text-white text-[10px] ${scaleLocked ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    Fit Height
                  </button>
                  <button
                    onClick={() => { const s = venue.widthM / backgroundPlan.widthPx; setBackgroundPlan({ ...backgroundPlan, scaleX: s, scaleY: s }); }}
                    className="flex-1 px-1 py-0.5 rounded bg-bc-dark border border-bc-border text-gray-400 hover:text-white text-[10px]"
                  >
                    Fit Both
                  </button>
                </div>
                {/* Calibration */}
                <div className="p-2 rounded bg-bc-dark border border-bc-border space-y-1.5">
                  <div className="flex items-center gap-1 text-gray-300 font-medium">
                    <FiMaximize2 size={11} /> Calibrate Scale{scaleLocked ? '' : ' (X / Y)'}
                  </div>
                  <p className="text-gray-500 text-[10px] leading-tight">
                    {scaleLocked
                      ? 'Click two points on the 2D plan to measure a known distance. Both X and Y scale will be set equally.'
                      : 'Measure a known horizontal (X) and vertical (Y) distance separately. Click two points on the 2D plan for each axis.'}
                  </p>
                  <div className="flex gap-1 items-end">
                    <label className="flex-1">
                      <span className="text-gray-500">{scaleLocked ? 'Known distance (m)' : 'Known X distance (m)'}</span>
                      <input type="number" min={0.1} step={0.1}
                        className="w-full bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white"
                        value={calibDistX}
                        onChange={(e) => setCalibDistX(e.target.value)} />
                    </label>
                    <button
                      onClick={() => startCalibration('x')}
                      className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${calibAxis === 'x' ? 'bg-bc-red text-white' : 'bg-bc-green/20 text-bc-green hover:bg-bc-green/30'}`}
                    >
                      {calibAxis === 'x' ? 'Cancel' : (scaleLocked ? 'Calibrate' : 'Cal X')}
                    </button>
                  </div>
                  {!scaleLocked && (
                    <div className="flex gap-1 items-end">
                      <label className="flex-1">
                        <span className="text-gray-500">Known Y distance (m)</span>
                        <input type="number" min={0.1} step={0.1}
                          className="w-full bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white"
                          value={calibDistY}
                          onChange={(e) => setCalibDistY(e.target.value)} />
                      </label>
                      <button
                        onClick={() => startCalibration('y')}
                        className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${calibAxis === 'y' ? 'bg-bc-red text-white' : 'bg-bc-green/20 text-bc-green hover:bg-bc-green/30'}`}
                      >
                        {calibAxis === 'y' ? 'Cancel' : 'Cal Y'}
                      </button>
                    </div>
                  )}
                  <label className="flex items-center gap-1.5 text-[10px] text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={autoResize} onChange={(e) => setAutoResize(e.target.checked)} className="accent-bc-accent" />
                    Auto-resize venue to match floor plan
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="text-gray-400">Offset X (m)</span>
                    <input type="number" className="w-full bg-bc-dark border border-bc-border rounded px-1 py-0.5 text-white"
                      value={backgroundPlan.offsetX} step={0.5}
                      onChange={(e) => setBackgroundPlan({ ...backgroundPlan, offsetX: parseFloat(e.target.value) || 0 })} />
                  </label>
                  <label>
                    <span className="text-gray-400">Offset Y (m)</span>
                    <input type="number" className="w-full bg-bc-dark border border-bc-border rounded px-1 py-0.5 text-white"
                      value={backgroundPlan.offsetY} step={0.5}
                      onChange={(e) => setBackgroundPlan({ ...backgroundPlan, offsetY: parseFloat(e.target.value) || 0 })} />
                  </label>
                </div>
                <button
                  onClick={() => setBackgroundPlan(null)}
                  className="w-full py-1 rounded bg-bc-red/20 text-bc-red text-xs hover:bg-bc-red/30"
                >
                  Remove Background
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Camera list */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white font-semibold">Cameras ({cameras.length})</span>
          <div className="flex gap-1">
            <button
              onClick={toggleShowAllFov}
              className="p-1.5 rounded hover:bg-bc-border text-gray-400 hover:text-white"
              title={showAllFov ? 'Hide all FOV' : 'Show all FOV'}
            >
              {showAllFov ? <FiEye size={14} /> : <FiEyeOff size={14} />}
            </button>
            <button
              onClick={() => addCamera()}
              className="flex items-center gap-1 px-2 py-1 rounded bg-bc-accent text-white text-xs font-semibold hover:bg-bc-accent/80"
            >
              <FiPlus size={12} /> Add
            </button>
          </div>
        </div>

        {cameras.map((cam) => (
          <CameraCard key={cam.id} camId={cam.id} />
        ))}

        {cameras.length === 0 && (
          <p className="text-gray-500 text-xs text-center mt-8">No cameras. Click "Add" or load a template.</p>
        )}
      </div>

      {/* Bottom actions */}
      <div className="p-3 border-t border-bc-border">
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to clear everything? This cannot be undone.')) clearAll();
          }}
          className="w-full py-1.5 rounded bg-bc-red/20 text-bc-red text-xs font-semibold hover:bg-bc-red/30"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
