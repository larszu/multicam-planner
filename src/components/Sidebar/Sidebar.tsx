import { useStore, OBJECT_PRESETS } from '../../store/useStore';
import { CAMERAS, getCameraById, getAdapterInfo, getEffectiveSensor, getCoverageStatus, getSpeedBooster, speedBoosterExists } from '../../data/cameras';
import { LENSES, getLensById, getCompatibleLenses, pickInitialMountAndLens } from '../../data/lenses';
import { computeFov, computeDof } from '../../utils/fov';
import { FiPlus, FiTrash2, FiCopy, FiChevronDown, FiChevronUp, FiEye, FiEyeOff, FiUpload, FiUser, FiMap, FiMaximize2, FiLock, FiUnlock, FiStar, FiEdit2, FiRotateCcw } from 'react-icons/fi';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { BackgroundPlan, StageObjectType, Camera, CameraMountType, WallPattern } from '../../types';
import { MOUNT_TYPE_LABELS, MOUNT_HEIGHT_RANGE } from '../../types';
import { CustomCameraForm } from './CustomCameraForm';
import { CalculationBreakdown } from './CalculationBreakdown';
import AiPlanAnalysis from './AiPlanAnalysis';
import * as pdfjsLib from 'pdfjs-dist';

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
  } = useStore();
  const cam = cameras.find((c) => c.id === camId)!;
  const isSelected = cam.id === selectedCameraId;
  const [expanded, setExpanded] = useState(false);
  const [showNewLens, setShowNewLens] = useState(false);
  const [newLens, setNewLens] = useState({ manufacturer: '', model: '', focalMin: '10', focalMax: '100', aperture: '2.8', mount: 'B4', type: 'zoom' as 'zoom' | 'prime' });
  const [showNewCustomCam, setShowNewCustomCam] = useState(false);
  const [editingCustomCam, setEditingCustomCam] = useState<string | null>(null);
  const [showCalc, setShowCalc] = useState(false);

  const { customCameras, addCustomCamera } = useStore();
  const camDef = getCameraById(cam.cameraId, customCameras);
  const lensDef = getLensById(cam.lensId) ?? customLenses.find((l) => l.id === cam.lensId);
  const allLenses = [...LENSES, ...customLenses];
  // The active mount controls lens compatibility — when the user has swapped
  // the body's mount plate (e.g. URSA Broadcast B4 → EF), only lenses for
  // that plate are physically attachable.
  const activeMount = cam.activeMount ?? camDef?.mount;
  // Strict: only lenses that physically attach to the active mount.
  const compatLenses = camDef ? getCompatibleLenses(camDef.mount, camDef.adaptedMounts, cam.activeMount) : allLenses;
  const allCompat = [
    ...compatLenses,
    ...customLenses.filter((l) => !activeMount || l.mount === activeMount || l.mount === 'universal' || l.mount === 'integrated'),
  ];
  // Deduplicate by id
  const compatDeduped = [...new Map(allCompat.map((l) => [l.id, l])).values()];
  // If the currently-selected lens is incompatible with the active mount (e.g.
  // a B4 lens left over from an older project where FZ mode silently auto-
  // applied the LA-FZB1), keep it visible in the dropdown so the user can see
  // and fix it, but mark it as a mismatch.
  const lensMismatch = !!(
    lensDef && activeMount &&
    lensDef.mount !== 'integrated' &&
    lensDef.mount !== 'universal' &&
    lensDef.mount !== activeMount
  );
  const dropdownLenses = lensMismatch && lensDef
    ? [...compatDeduped, lensDef]
    : compatDeduped;
  const grouped = groupByMount(sortFavoritesFirst(dropdownLenses, favoriteLensIds));
  // Dedupe: when a built-in is shadowed (custom entry with the same id), only the
  // custom version appears in the dropdown — the built-in is hidden behind it.
  const customCameraIds = new Set(customCameras.map((c) => c.id));
  const builtInCameraIds = new Set(CAMERAS.map((c) => c.id));
  const visibleCameras = [...CAMERAS.filter((c) => !customCameraIds.has(c.id)), ...customCameras];
  const sortedCameras = sortFavoritesFirst(visibleCameras, favoriteCameraIds);
  const isCustomEntry = (id: string) => customCameraIds.has(id);
  const isBuiltIn = (id: string) => builtInCameraIds.has(id);
  const isBuiltInShadow = (id: string) => isCustomEntry(id) && isBuiltIn(id);
  const isPureCustom = (id: string) => isCustomEntry(id) && !isBuiltIn(id);

  // Adapter & effective sensor
  const speedBooster = camDef ? getSpeedBooster(camDef, cam.activeMount ?? lensDef?.mount) : null;
  const adapterInfo = camDef && lensDef ? getAdapterInfo(camDef, lensDef, cam.useSpeedbooster, cam.activeMount) : null;
  const effectiveSensor = camDef && lensDef ? getEffectiveSensor(camDef, lensDef, cam.useSpeedbooster, cam.sensorModeIndex, cam.activeMount) : camDef?.sensor;
  const coverage = camDef && lensDef ? getCoverageStatus(camDef, lensDef, cam.useSpeedbooster, cam.activeMount, cam.sensorModeIndex) : null;
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
        <div
          className="text-xs mt-0.5 text-bc-yellow cursor-help"
          title={adapterInfo.notes ?? 'Adapter automatically applied — see Mount section below for details.'}
        >
          ⚡ {adapterInfo.name}{adapterInfo.lightLossStops > 0 ? ` (−${adapterInfo.lightLossStops}T)` : ''}{adapterInfo.lightLossStops < 0 ? ` (+${Math.abs(adapterInfo.lightLossStops)}T gain)` : ''}{adapterInfo.cropSensor ? ` → ${adapterInfo.cropSensor.name}` : ''}
        </div>
      )}
      {/* Lens-mount mismatch warning — the picked lens doesn't physically fit
          the active mount. Calculations are computed against the body's bare
          sensor (no auto-adapter), so the displayed values won't match reality
          until the user either switches the Mount selector to the lens's mount
          or picks a different lens. */}
      {lensMismatch && lensDef && (
        <div
          className="text-xs mt-0.5 text-bc-red cursor-help"
          title={`Switch the Mount selector below to "${lensDef.mount}" (if available) to fit the matching adapter / plate, or pick a lens that matches the current "${activeMount}" mount.`}
        >
          ⚠ Lens mount {lensDef.mount} ≠ active mount {activeMount} — incompatible
        </div>
      )}
      {/* Speed Booster toggle — shown when a focal reducer exists for the
          fitted lens-mount → body-mount combo (EF/NF → MFT/FZ/E/X). */}
      {speedBooster && (
        <label className="flex items-center gap-1.5 text-xs mt-1 text-gray-300 cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={cam.useSpeedbooster}
            onChange={(e) => updateCamera(cam.id, { useSpeedbooster: e.target.checked })}
            className="accent-bc-accent"
          />
          {speedBooster.name} (focal reducer)
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
                <span className="flex items-center gap-0.5">
                  {/* Edit applies to every camera. For built-ins it creates a
                      "modified built-in" shadow on save; for shadows or pure
                      customs it updates the existing entry. */}
                  <button
                    type="button"
                    onClick={() => setEditingCustomCam(camDef.id)}
                    className="p-1 rounded text-gray-500 hover:text-bc-accent"
                    title={isPureCustom(camDef.id)
                      ? 'Edit this custom camera'
                      : isBuiltInShadow(camDef.id)
                        ? 'Continue editing this modified built-in'
                        : 'Edit (creates a modified copy you can tweak — original stays untouched)'}
                  >
                    <FiEdit2 size={12} />
                  </button>
                  {isBuiltInShadow(camDef.id) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm(`Reset "${camDef.manufacturer} ${camDef.model}" to its built-in defaults? Your changes will be lost.`)) return;
                        useStore.getState().removeCustomCamera(camDef.id);
                      }}
                      className="p-1 rounded text-gray-500 hover:text-bc-yellow"
                      title="Reset to the original built-in spec (discards your edits)"
                    >
                      <FiRotateCcw size={12} />
                    </button>
                  )}
                  {isPureCustom(camDef.id) && (
                    <button
                      type="button"
                      onClick={() => {
                        const used = useStore.getState().cameras.filter((c) => c.cameraId === camDef.id).length;
                        if (used > 1) {
                          alert(`Cannot delete "${camDef.manufacturer} ${camDef.model}" — it is still used by ${used} placed camera(s).`);
                          return;
                        }
                        if (!confirm(`Delete custom camera "${camDef.manufacturer} ${camDef.model}"?`)) return;
                        // Swap this placement to the first built-in so the card stays valid
                        const fallback = CAMERAS[0];
                        updateCamera(cam.id, {
                          cameraId: fallback.id,
                          activeMount: fallback.mount,
                          sensorModeIndex: fallback.sensorModes && fallback.sensorModes.length > 0 ? 0 : undefined,
                        });
                        useStore.getState().removeCustomCamera(camDef.id);
                      }}
                      className="p-1 rounded text-gray-500 hover:text-bc-red"
                      title="Delete this custom camera"
                    >
                      <FiTrash2 size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleFavoriteCameraId(camDef.id)}
                    className={`p-1 rounded ${favoriteCameraIds.includes(camDef.id) ? 'text-bc-yellow' : 'text-gray-500 hover:text-bc-yellow'}`}
                    title={favoriteCameraIds.includes(camDef.id) ? 'Remove camera favorite' : 'Favorite camera'}
                  >
                    <FiStar size={12} fill={favoriteCameraIds.includes(camDef.id) ? 'currentColor' : 'none'} />
                  </button>
                </span>
              )}
            </span>
            <select
              className="block w-full mt-0.5 bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
              value={cam.cameraId}
              onChange={(e) => {
                if (e.target.value === '__new_custom__') { setShowNewCustomCam(true); return; }
                const newCam = getCameraById(e.target.value, customCameras);
                if (!newCam) return;
                // Pick a mount + first compatible lens. Falls back through the
                // adaptedMounts list if the native mount has no compatible
                // lenses (e.g. PMW-F5's FZ).
                const pick = pickInitialMountAndLens(newCam.mount, newCam.adaptedMounts, customLenses);
                const lens = pick.lens;
                const supportsExtender = cam.extenderActive === 1 || !!lens?.extenderFactors?.includes(cam.extenderActive);
                updateCamera(cam.id, {
                  cameraId: e.target.value,
                  lensId: lens?.id ?? cam.lensId,
                  focalLength: lens?.focalLengthMin ?? cam.focalLength,
                  aperture: lens?.maxApertureWide ?? cam.aperture,
                  extenderActive: supportsExtender ? cam.extenderActive : 1,
                  // Keep Speed Booster only if one exists for the new lens→body combo
                  useSpeedbooster: speedBoosterExists(pick.mount, newCam.mount) ? cam.useSpeedbooster : false,
                  // Reset hardware sensor mode — each body has a different mode list
                  sensorModeIndex: newCam.sensorModes && newCam.sensorModes.length > 0 ? 0 : undefined,
                  activeMount: pick.mount,
                });
              }}
            >
              {sortedCameras.map((c) => {
                const tag = isBuiltInShadow(c.id) ? ' (modified)' : isPureCustom(c.id) ? ' +custom' : '';
                return (
                  <option key={c.id} value={c.id}>{favoriteCameraIds.includes(c.id) ? '* ' : ''}{c.manufacturer} {c.model} [{c.mount}]{tag}</option>
                );
              })}
              <option value="__new_custom__">＋ Custom+ Add custom camera…</option>
            </select>
          </label>

          {/* Inline custom camera creation form (Custom+ entry in the dropdown) */}
          {showNewCustomCam && (
            <CustomCameraForm
              title="New Custom Camera"
              submitLabel="Create & Select"
              onCancel={() => setShowNewCustomCam(false)}
              onSubmit={(spec) => {
                const newId = addCustomCamera(spec);
                const firstLens = getCompatibleLenses(spec.mount, spec.adaptedMounts)[0];
                updateCamera(cam.id, {
                  cameraId: newId,
                  activeMount: spec.mount,
                  lensId: firstLens?.id ?? cam.lensId,
                  focalLength: firstLens?.focalLengthMin ?? cam.focalLength,
                  aperture: firstLens?.maxApertureWide ?? cam.aperture,
                  extenderActive: 1,
                  useSpeedbooster: false,
                  sensorModeIndex: spec.sensorModes && spec.sensorModes.length > 0 ? 0 : undefined,
                });
                setShowNewCustomCam(false);
              }}
            />
          )}

          {/* Inline edit form for the currently-selected custom camera */}
          {editingCustomCam && editingCustomCam === camDef?.id && camDef && (
            <CustomCameraForm
              title={`Edit ${camDef.manufacturer} ${camDef.model}`}
              submitLabel="Save changes"
              initial={camDef}
              onCancel={() => setEditingCustomCam(null)}
              onSubmit={(spec) => {
                useStore.getState().updateCustomCamera(camDef.id, spec);
                // If the mount changed and the current lens no longer fits, swap to a compatible one
                const stillCompatible = lensDef && (lensDef.mount === spec.mount || lensDef.mount === 'integrated');
                if (!stillCompatible) {
                  const next = getCompatibleLenses(spec.mount, spec.adaptedMounts)[0];
                  if (next) {
                    updateCamera(cam.id, {
                      lensId: next.id,
                      focalLength: next.focalLengthMin,
                      aperture: next.maxApertureWide,
                    });
                  }
                }
                updateCamera(cam.id, {
                  activeMount: spec.mount,
                  sensorModeIndex: spec.sensorModes && spec.sensorModes.length > 0 ? 0 : undefined,
                });
                setEditingCustomCam(null);
              }}
            />
          )}

          {/* Mount selector — only visible when the body offers swappable mount plates */}
          {camDef && camDef.adaptedMounts && camDef.adaptedMounts.length > 0 && (
            <label className="block">
              <span className="text-gray-400">Mount</span>
              <select
                className="block w-full mt-0.5 bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
                value={activeMount}
                onChange={(e) => {
                  const newMount = e.target.value;
                  // If the current lens doesn't fit the new mount, pick the first
                  // compatible one so the camera card stays in a coherent state.
                  const stillCompatible = lensDef && (lensDef.mount === newMount || lensDef.mount === 'integrated');
                  let nextLensId = cam.lensId;
                  let nextFocal = cam.focalLength;
                  let nextAperture = cam.aperture;
                  if (!stillCompatible) {
                    const next = getCompatibleLenses(camDef.mount, camDef.adaptedMounts, newMount)[0];
                    if (next) {
                      nextLensId = next.id;
                      nextFocal = next.focalLengthMin;
                      nextAperture = next.maxApertureWide;
                    }
                  }
                  updateCamera(cam.id, {
                    activeMount: newMount,
                    lensId: nextLensId,
                    focalLength: nextFocal,
                    aperture: nextAperture,
                    extenderActive: 1,
                    useSpeedbooster: speedBoosterExists(newMount, camDef?.mount) ? cam.useSpeedbooster : false,
                  });
                }}
              >
                <option value={camDef.mount}>{camDef.mount} (native)</option>
                {camDef.adaptedMounts.map((m) => (
                  <option key={m} value={m}>{m} (mount plate / adapter)</option>
                ))}
              </select>
              {/* Detail card for the active mount adapter, if the body defines one.
                  Shows the adapter's name, optical effects, and a notes blurb so
                  the user knows exactly which piece of glass / plate is modelled. */}
              {(() => {
                const ma = activeMount ? camDef.mountAdapters?.[activeMount] : undefined;
                if (!ma) return null;
                return (
                  <div className="mt-1 p-2 rounded bg-bc-dark border border-bc-yellow/40 text-[10px] leading-snug">
                    <div className="flex items-center gap-1 text-bc-yellow font-semibold">
                      ⚡ {ma.name}
                    </div>
                    <div className="text-gray-400 mt-0.5">
                      {ma.lightLossStops > 0 && <span>Light loss: −{ma.lightLossStops}T · </span>}
                      {ma.lightLossStops < 0 && <span>Light gain: +{Math.abs(ma.lightLossStops)}T · </span>}
                      {ma.lightLossStops === 0 && <span>No light loss · </span>}
                      {ma.cropSensor ? <span>Forces {ma.cropSensor.name}</span> : <span>No sensor crop</span>}
                    </div>
                    {ma.notes && (
                      <div className="text-gray-500 mt-1 italic">{ma.notes}</div>
                    )}
                  </div>
                );
              })()}
            </label>
          )}

          {/* Image-circle coverage warning */}
          {coverage && coverage.status !== 'ok' && (
            <div
              className={`mt-1 p-2 rounded text-[10px] leading-snug border ${
                coverage.status === 'vignette'
                  ? 'border-bc-red/60 bg-bc-red/10 text-red-300'
                  : 'border-bc-yellow/60 bg-bc-yellow/10 text-bc-yellow'
              }`}
              title={`Lens image circle vs sensor diagonal: ${(coverage.ratio * 100).toFixed(0)} %`}
            >
              {coverage.status === 'vignette' ? '⛔' : '⚠️'} {coverage.message}
            </div>
          )}

          {/* Hardware sensor mode (URSA B4 crop, VENICE windows, FX9 S35 etc.) */}
          {camDef?.sensorModes && camDef.sensorModes.length > 1 && (
            <label className="block">
              <span className="text-gray-400">Sensor Mode</span>
              <select
                className="block w-full mt-0.5 bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
                value={cam.sensorModeIndex ?? 0}
                onChange={(e) => updateCamera(cam.id, { sensorModeIndex: parseInt(e.target.value) })}
                disabled={!!adapterInfo?.cropSensor}
                title={adapterInfo?.cropSensor ? 'Adapter crop overrides the sensor mode' : 'Pick the camera body crop mode'}
              >
                {camDef.sensorModes.map((mode, idx) => (
                  <option key={idx} value={idx}>{mode.name}</option>
                ))}
              </select>
              {adapterInfo?.cropSensor && (
                <span className="text-[10px] text-bc-yellow">
                  Adapter forces {adapterInfo.cropSensor.name}
                </span>
              )}
            </label>
          )}

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
                const supportsExtender = cam.extenderActive === 1 || !!lens?.extenderFactors?.includes(cam.extenderActive);
                updateCamera(cam.id, {
                  lensId: e.target.value,
                  focalLength: lens?.focalLengthMin ?? cam.focalLength,
                  aperture: lens?.maxApertureWide ?? cam.aperture,
                  // Reset extender when switching to a lens that doesn't support the current value
                  extenderActive: supportsExtender ? cam.extenderActive : 1,
                  // Keep Speed Booster only if one exists for the new lens→body combo
                  useSpeedbooster: speedBoosterExists(lens?.mount, camDef?.mount) ? cam.useSpeedbooster : false,
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
              onClick={() => {
                // Pick a replacement BEFORE removing — prefer a built-in compatible lens,
                // then fall back to any non-removed custom lens, and finally any LENSES entry.
                const replacement =
                  compatDeduped.find((l) => !l.isCustom && l.id !== cam.lensId) ??
                  compatDeduped.find((l) => l.id !== cam.lensId) ??
                  LENSES[0];
                removeCustomLens(cam.lensId);
                if (replacement) {
                  const supportsExtender = cam.extenderActive === 1 || !!replacement.extenderFactors?.includes(cam.extenderActive);
                  updateCamera(cam.id, {
                    lensId: replacement.id,
                    focalLength: replacement.focalLengthMin,
                    aperture: replacement.maxApertureWide,
                    extenderActive: supportsExtender ? cam.extenderActive : 1,
                  });
                }
              }}
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
            <span className="text-gray-400">Focal Length: {cam.focalLength.toFixed(1)}mm{cam.extenderActive > 1 ? ` (eff. ${(cam.focalLength * cam.extenderActive).toFixed(0)}mm)` : ''}</span>
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
            <span className="text-gray-400">Distance: {cam.focusDistance.toFixed(1)}m</span>
            <input
              type="range"
              className="w-full accent-bc-accent"
              min={0.5}
              max={200}
              step={0.5}
              value={cam.focusDistance}
              onChange={(e) => updateCamera(cam.id, { focusDistance: parseFloat(e.target.value) })}
            />
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
              min={-90}
              max={45}
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

          {/* Position X / Y */}
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-gray-400">X (m)</span>
              <input
                type="number"
                className="w-full bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
                value={cam.x}
                step={0.5}
                onChange={(e) => updateCamera(cam.id, { x: parseFloat(e.target.value) || 0 })}
              />
            </label>
            <label>
              <span className="text-gray-400">Y (m)</span>
              <input
                type="number"
                className="w-full bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
                value={cam.y}
                step={0.5}
                onChange={(e) => updateCamera(cam.id, { y: parseFloat(e.target.value) || 0 })}
              />
            </label>
          </div>

          {/* Mount type — physical rig the camera sits on. Determines the
              ergonomic height range below and whether a live-motion track slider
              (jib swing / dolly travel) appears. */}
          <label className="block">
            <span className="text-gray-400">Mount</span>
            <select
              className="block w-full mt-0.5 bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
              value={cam.mountType ?? 'tripod'}
              onChange={(e) => {
                const newMount = e.target.value as CameraMountType;
                const range = MOUNT_HEIGHT_RANGE[newMount];
                // Clamp Z into the new ergonomic range so changing to a tripod
                // doesn't leave the camera at 6 m from a jib config.
                const clampedZ = Math.max(range.min, Math.min(range.max, cam.z));
                updateCamera(cam.id, { mountType: newMount, z: clampedZ, trackOffset: range.track ? 0 : undefined });
              }}
            >
              {(Object.keys(MOUNT_TYPE_LABELS) as CameraMountType[]).map((m) => (
                <option key={m} value={m}>{MOUNT_TYPE_LABELS[m]}</option>
              ))}
            </select>
          </label>

          {/* Camera height (Z) — bounded by the mount's ergonomic range */}
          {(() => {
            const range = MOUNT_HEIGHT_RANGE[cam.mountType ?? 'tripod'];
            return (
              <label className="block">
                <span className="text-gray-400">Height: {cam.z.toFixed(2)}m <span className="text-[10px] text-gray-600">({range.min}–{range.max}m)</span></span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    className="flex-1 accent-bc-accent"
                    min={range.min}
                    max={range.max}
                    step={range.pump > 0 ? range.pump : 0.05}
                    value={Math.min(range.max, Math.max(range.min, cam.z))}
                    onChange={(e) => updateCamera(cam.id, { z: parseFloat(e.target.value) })}
                  />
                  <input
                    type="number"
                    className="w-16 bg-bc-dark border border-bc-border rounded px-1 py-0.5 text-white text-xs"
                    value={cam.z}
                    step={0.1}
                    min={range.min}
                    max={range.max}
                    onChange={(e) => updateCamera(cam.id, { z: Math.max(range.min, Math.min(range.max, parseFloat(e.target.value) || 0)) })}
                  />
                </div>
              </label>
            );
          })()}

          {/* Live track slider — only for rigs with travel (jib swing, dolly track) */}
          {(() => {
            const range = MOUNT_HEIGHT_RANGE[cam.mountType ?? 'tripod'];
            if (!range.track) return null;
            const offset = cam.trackOffset ?? 0;
            return (
              <label className="block">
                <span className="text-gray-400">Track: {offset.toFixed(2)}m <span className="text-[10px] text-gray-600">(0–{range.track}m)</span></span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    className="flex-1 accent-bc-yellow"
                    min={-range.track}
                    max={range.track}
                    step={0.05}
                    value={offset}
                    onChange={(e) => updateCamera(cam.id, { trackOffset: parseFloat(e.target.value) })}
                  />
                  <button
                    onClick={() => updateCamera(cam.id, { trackOffset: 0 })}
                    className="text-[10px] text-gray-500 hover:text-white px-1.5 py-0.5 rounded border border-bc-border"
                    title="Park rig at zero"
                  >park</button>
                </div>
              </label>
            );
          })()}

          {/* Notes — free-form, shown in export when filled */}
          <label className="block">
            <span className="text-gray-400">Notes</span>
            <textarea
              className="block w-full mt-0.5 bg-bc-dark border border-bc-border rounded px-2 py-1 text-white text-xs resize-y min-h-[2.5rem]"
              rows={2}
              placeholder="Mount, operator, shot notes…"
              value={cam.notes ?? ''}
              onChange={(e) => updateCamera(cam.id, { notes: e.target.value })}
            />
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

          {/* Calculation trace — step-by-step formula breakdown */}
          {camDef && lensDef && effectiveSensor && fov && dof && (
            <div>
              <button
                onClick={() => setShowCalc(!showCalc)}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-bc-accent w-full"
              >
                {showCalc ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />}
                {showCalc ? 'Hide' : 'Show'} calculation breakdown
              </button>
              {showCalc && (
                <div className="mt-1">
                  <CalculationBreakdown
                    camDef={camDef}
                    lensDef={lensDef}
                    sensor={effectiveSensor}
                    fov={fov}
                    dof={dof}
                    focalLength={cam.focalLength}
                    extender={cam.extenderActive}
                    aperture={cam.aperture}
                    focusDistance={cam.focusDistance}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const {
    cameras, addCamera, venue, setVenue, showAllFov, toggleShowAllFov, clearAll,
    pixelsPerMeter, setPixelsPerMeter,
    addStage, removeStage, updateStage,
    persons, addPerson, addStageObject, removePerson, updatePerson,
    backgroundPlan, setBackgroundPlan,
    walls, addWall, removeWall, updateWall, wallSnap, setWallSnap,
  } = useStore();
  const [venueOpen, setVenueOpen] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(false);
  const [personsOpen, setPersonsOpen] = useState(false);
  const [wallsOpen, setWallsOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [wallDrawMode, setWallDrawMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [calibAxis, setCalibAxis] = useState<'x' | 'y' | null>(null);
  const [calibDistX, setCalibDistX] = useState('10');
  const [calibDistY, setCalibDistY] = useState('10');
  const [autoResize, setAutoResize] = useState(true);
  const [scaleLocked, setScaleLocked] = useState(true);

  const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
  const MAX_PDF_PAGES = 100;

  /** Convert a PDF first page to a data URL at 2× DPI */
  const pdfToDataUrl = useCallback(async (file: File): Promise<{ dataUrl: string; width: number; height: number }> => {
    if (file.size > MAX_PDF_SIZE_BYTES) {
      throw new Error(`PDF too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 50 MB.`);
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const arrayBuf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuf, isEvalSupported: false } as Parameters<typeof pdfjsLib.getDocument>[0]).promise;
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(`PDF has ${pdf.numPages} pages (max ${MAX_PDF_PAGES}). Use a single-page floor plan.`);
    }
    const page = await pdf.getPage(1);
    const scale = 2;
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
        const msg = err instanceof Error ? err.message : 'Unknown error';
        alert(`Failed to render PDF: ${msg}`);
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
            {/* AI floor-plan analysis (issues #39 / #40) */}
            <AiPlanAnalysis />
          </div>
        )}
      </div>


      {/* Walls */}
      <div className="p-3 border-b border-bc-border">
        <button
          className="flex items-center justify-between w-full text-sm text-white font-semibold"
          onClick={() => setWallsOpen(!wallsOpen)}
        >
          <span>▇ Walls ({walls.length})</span>
          {wallsOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
        </button>
        {wallsOpen && (
          <div className="mt-2 space-y-2 text-xs">
            <button
              onClick={() => setWallDrawMode((active) => !active)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs w-full justify-center ${wallDrawMode ? 'bg-bc-yellow/20 text-bc-yellow hover:bg-bc-yellow/30' : 'bg-bc-dark text-gray-300 hover:text-white border border-bc-border'}`}
            >
              {wallDrawMode ? 'Stop Drawing' : 'Draw Walls'}
            </button>
            {wallDrawMode && (
              <div className="rounded border border-bc-border bg-bc-dark px-2 py-1.5 text-[10px] text-gray-400 leading-relaxed">
                Click once to place the start point, click again to finish. Hold Shift to snap the angle. Right-click a wall to delete it.
              </div>
            )}
            {/* Endpoint snapping toggle (issue #40) */}
            <label className="flex items-center gap-2 text-[11px] text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                className="accent-bc-accent"
                checked={wallSnap}
                onChange={(e) => setWallSnap(e.target.checked)}
              />
              Snap wall endpoints together
            </label>
            {walls.map((w) => (
              <div key={w.id} className="bg-bc-dark rounded p-1.5 border border-bc-border space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    className="bg-transparent text-white text-xs w-16 outline-none"
                    value={w.label}
                    onChange={(e) => updateWall(w.id, { label: e.target.value })}
                  />
                  <span className="text-gray-500 text-[10px]">{w.height}m h</span>
                  <button onClick={() => removeWall(w.id)} className="ml-auto p-0.5 hover:text-bc-red"><FiTrash2 size={11} /></button>
                </div>
                {/* Surface pattern for blur-checking in the preview (issue #45) */}
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    className="w-5 h-5 rounded border border-bc-border cursor-pointer bg-transparent shrink-0"
                    value={w.color ?? '#6b7280'}
                    onChange={(e) => updateWall(w.id, { color: e.target.value })}
                    title="Wall colour"
                  />
                  <select
                    className="flex-1 bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white text-[10px]"
                    value={w.pattern ?? 'solid'}
                    onChange={(e) => updateWall(w.id, { pattern: e.target.value as WallPattern })}
                  >
                    <option value="solid">Solid</option>
                    <option value="grid">Grid</option>
                    <option value="flowers">Flowers</option>
                    <option value="image">Image…</option>
                  </select>
                  {w.pattern === 'image' && (
                    <label className="px-1.5 py-0.5 rounded bg-bc-accent/20 text-bc-accent text-[10px] cursor-pointer hover:bg-bc-accent/30" title="Upload a tiled image">
                      <FiUpload size={10} className="inline" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => updateWall(w.id, { patternImage: String(reader.result), pattern: 'image' });
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  <button
                    onClick={() => walls.forEach((other) => other.id !== w.id && updateWall(other.id, { color: w.color, pattern: w.pattern, patternImage: w.patternImage }))}
                    className="px-1.5 py-0.5 rounded border border-bc-border text-gray-400 hover:text-bc-accent hover:border-bc-accent text-[10px] shrink-0"
                    title="Apply this wall's colour & pattern to all walls"
                  >
                    All
                  </button>
                </div>
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
              const icon =
                p.objectType === 'drums' ? '🥁' :
                p.objectType === 'keys' ? '🎹' :
                p.objectType === 'person-guitar' ? '🎸' :
                p.objectType === 'mic-stand' ? '🎤' :
                p.objectType === 'sitting-person' ? '🪑' :
                p.objectType === 'chair' ? '💺' :
                p.objectType === 'table' ? '🪑' :
                p.objectType === 'lectern' ? '🎙️' :
                p.objectType === 'schneetiger' ? '🐅' :
                p.objectType === 'custom' ? '◇' : '👤';
              return (
                <div key={p.id} className="flex items-center gap-2 bg-bc-dark rounded p-1.5 border border-bc-border">
                  <span className="text-gray-500 text-[10px] w-6 text-center">{icon}</span>
                  <input className="bg-transparent text-white text-xs w-16 outline-none" value={p.label}
                    onChange={(e) => updatePerson(p.id, { label: e.target.value })} />
                  <span className="text-gray-500">{p.height}m</span>
                  <input
                    type="color"
                    className="w-5 h-5 rounded border border-bc-border cursor-pointer bg-transparent"
                    value={p.color ?? (OBJECT_PRESETS[p.objectType]?.color ?? '#f59e0b')}
                    onChange={(e) => updatePerson(p.id, { color: e.target.value })}
                    title="Custom accent colour"
                  />
                  <span className="text-gray-500">({p.x.toFixed(1)}, {p.y.toFixed(1)})</span>
                  <button onClick={() => removePerson(p.id)} className="ml-auto p-0.5 hover:text-bc-red"><FiTrash2 size={11} /></button>
                </div>
              );
            })}
            <div className="grid grid-cols-3 gap-1">
              <button onClick={() => addPerson()} className="flex items-center justify-center gap-1 px-1 py-1 rounded bg-bc-accent/20 text-bc-accent text-[10px] hover:bg-bc-accent/30">
                <FiUser size={10} /> Person
              </button>
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
                🎤 Mic Stand
              </button>
              <button onClick={() => addStageObject('chair')} className="flex items-center justify-center gap-1 px-1 py-1 rounded bg-bc-accent/20 text-bc-accent text-[10px] hover:bg-bc-accent/30">
                💺 Chair
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
