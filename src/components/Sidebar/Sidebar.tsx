import { useStore, OBJECT_PRESETS } from '../../store/useStore';
import { CAMERAS, getCameraById, getAdapterInfo, getEffectiveSensor, getCoverageStatus, getSpeedBooster, speedBoosterExists } from '../../data/cameras';
import { LENSES, getLensById, getCompatibleLenses, pickInitialMountAndLens } from '../../data/lenses';
import { computeFov, computeDof } from '../../utils/fov';
import { FiPlus, FiTrash2, FiCopy, FiChevronDown, FiChevronUp, FiEye, FiEyeOff, FiUpload, FiUser, FiMap, FiMaximize2, FiLock, FiUnlock, FiStar, FiEdit2, FiRotateCcw, FiHome, FiImage, FiColumns, FiUsers, FiVideo } from 'react-icons/fi';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { BackgroundPlan, StageObjectType, Camera, CameraMountType, WallPattern } from '../../types';
import { MOUNT_TYPE_LABELS } from '../../types';
import { rigsForType, trackSectionPlan } from '../../data/rigs';
import { clampHeight, clampTrack, rigLimits } from '../../utils/rigLimits';
import { rigYaw } from '../../utils/camera';
import { FieldRow, Group, Note, Readout, ValueSlider } from './fields';
// Derselbe Objektiv-Regler wie im Preview-Tab: logarithmische Bahn, Rastung,
// direkte Zahleneingabe. Zwei Implementierungen waeren zwei Bedienungen.
import LensSlider from '../Preview/LensSlider';
import {
  formatAperture,
  formatDistance,
  formatFocal,
  niceTicks,
  stepAlong,
  stepStop,
  stopsInRange,
  valueToPos,
} from '../../utils/lensScale';
import { CustomCameraForm } from './CustomCameraForm';
import { CalculationBreakdown } from './CalculationBreakdown';
import AiPlanAnalysis from './AiPlanAnalysis';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * Einheitlicher Akkordeon-Kopf fuer die linke Sidebar. Icon im getoenten
 * Quadrat (Akzent, wenn offen), Titel mit Hover-/Offen-Zustaenden, optionaler
 * Zaehler als Pill, ein rotierendes Chevron. Ersetzt die frueher uneinheitlichen
 * Header (fehlende/gemischte Icons, das rohe "▇"-Zeichen, nackte "(n)"-Zaehler).
 */
function AccordionHeader({
  icon, title, count, open, onToggle, right,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  /** Optionale Aktions-Buttons rechts (z. B. bei Cameras). */
  right?: React.ReactNode;
}) {
  // Hinweis: die App hat ein globales `* { padding: 0 }` (unlayered), das saemtliche
  // Tailwind `p-*`-Utilities aussticht. Deshalb werden Padding/Mindesthoehe hier per
  // Inline-Style gesetzt (Inline gewinnt gegen alles) — sonst waere die Klickflaeche
  // nur ~24px hoch und ohne linken Einzug. gap wird von der Regel nicht beruehrt.
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{ minHeight: '44px', padding: '10px 14px' }}
        className="group flex flex-1 items-center gap-2.5 text-left transition-colors hover:bg-white/[0.06]"
      >
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors ${
            open ? 'bg-bc-accent/20 text-bc-accent' : 'bg-bc-dark text-gray-400 group-hover:text-gray-200'
          }`}
        >
          {icon}
        </span>
        <span
          className={`text-[13.5px] font-semibold transition-colors ${
            open ? 'text-white' : 'text-gray-100 group-hover:text-white'
          }`}
        >
          {title}
        </span>
        {count !== undefined && (
          <span
            style={{ padding: '2px 7px' }}
            className="rounded-full bg-bc-dark text-[10.5px] font-semibold tabular-nums text-gray-300"
          >
            {count}
          </span>
        )}
        <FiChevronDown
          size={17}
          className={`ml-auto shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-gray-200' : 'text-gray-400'}`}
        />
      </button>
      {right && <div className="flex items-center gap-1 pr-2">{right}</div>}
    </div>
  );
}

/** Kuerzeste bzw. weiteste Fokusdistanz des Reglers (m). */
const FOCUS_MIN_M = 0.5;
const FOCUS_MAX_M = 200;

/**
 * Marken ausduennen. `niceTicks` haelt nur einen kleinen Mindestabstand ein —
 * das reicht im breiten Preview-Panel, aber in einer 260-px-Spalte klebten
 * dadurch Beschriftungen aneinander ("500mm900mm"). Der Abstand zaehlt in
 * Bahn-Anteilen (0..1), damit er auf der logarithmischen Skala stimmt.
 */
function sparseTicks(ticks: number[], min: number, max: number, minGap = 0.16): number[] {
  if (ticks.length === 0) return ticks;
  const out: number[] = [];
  for (const t of ticks) {
    const p = valueToPos(t, min, max);
    if (out.length === 0 || p - valueToPos(out[out.length - 1], min, max) >= minGap) out.push(t);
  }
  // Das Bahnende muss beschriftet bleiben — notfalls faellt die Marke davor weg.
  const last = ticks[ticks.length - 1];
  if (out[out.length - 1] !== last) {
    if (out.length > 1 && valueToPos(last, min, max) - valueToPos(out[out.length - 1], min, max) < minGap) out.pop();
    out.push(last);
  }
  return out;
}

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

function CameraCard({
  camId,
  expanded,
  toggleOpen,
}: {
  camId: string;
  /** Genau eine Karte ist offen — die der ausgewaehlten Kamera (Akkordeon). */
  expanded: boolean;
  toggleOpen: (camId: string) => void;
}) {
  const {
    cameras,
    selectedCameraId,
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
  const [confirmDelete, setConfirmDelete] = useState(false);
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
  // Grenzen und Marken der drei Objektiv-Regler.
  const focalMin = lensDef?.focalLengthMin ?? 4;
  const focalMax = Math.max(focalMin + 1, lensDef?.focalLengthMax ?? 300);
  // Angezeigte Marken sind duenner als im Preview-Tab (sonst kleben die
  // Beschriftungen in der schmalen Spalte aneinander); die Schrittweite von
  // − / + bleibt aber die feine Reihe — Anzeige-Dichte ist nicht Bedien-Dichte.
  const focalStepTicks = niceTicks(focalMin, focalMax);
  const focalTicks = sparseTicks(focalStepTicks, focalMin, focalMax);
  const apertureMin = lensDef?.maxApertureWide ?? 1.4;
  const apertureMax = 22;
  // Blendenzahlen sind kurz, brauchen also weniger Abstand als "500mm".
  const apertureTicks = sparseTicks(stopsInRange(apertureMin, apertureMax), apertureMin, apertureMax, 0.1);
  const focusStepTicks = niceTicks(FOCUS_MIN_M, FOCUS_MAX_M);
  const focusTicks = sparseTicks(focusStepTicks, FOCUS_MIN_M, FOCUS_MAX_M);

  const fov = effectiveSensor && lensDef ? computeFov(effectiveSensor, cam.focalLength, cam.focusDistance, cam.extenderActive) : null;
  const dof = effectiveSensor && lensDef ? computeDof(effectiveSensor, cam.focalLength, cam.aperture, cam.focusDistance, cam.extenderActive) : null;

  return (
    <div
      style={{ padding: '8px' }}
      className={`@container rounded-lg border mb-2 transition-colors ${
        isSelected ? 'border-bc-accent bg-bc-accent/10' : 'border-bc-border bg-bc-panel hover:border-bc-accent/50'
      }`}
    >
      {/* Kopfzeile. Bleibt beim Scrollen stehen, damit man bei einer langen
          Karte nicht raten muss, welche Kamera man gerade verstellt. */}
      {/* Der Hintergrund muss deckend sein (sonst scrollt der Inhalt sichtbar
          darunter durch); bei ausgewaehlter Karte ist es die Panel-Farbe mit
          dem Akzent-Schleier, den `bg-bc-accent/10` sonst transparent legt. */}
      <div className={`sticky top-0 z-10 -mx-2 -mt-2 rounded-t-lg ${isSelected ? 'bg-[#182234]' : 'bg-bc-panel'}`} style={{ padding: '6px 8px' }}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleOpen(cam.id)}
            aria-expanded={expanded}
            style={{ padding: '4px', minWidth: '28px', minHeight: '28px' }}
            className="flex min-w-0 flex-1 items-center gap-2 rounded text-left hover:bg-white/[0.05]"
            title={expanded ? 'Details zuklappen' : 'Details aufklappen'}
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: cam.color }} />
            <span className="truncate text-sm font-bold text-white">{cam.label}</span>
            <FiChevronDown size={14} className={`ml-auto shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={() => duplicateCamera(cam.id)}
              style={{ padding: '6px' }}
              className="rounded text-gray-400 hover:bg-white/[0.06] hover:text-bc-accent"
              title="Kamera duplizieren"
              aria-label={`${cam.label} duplizieren`}
            >
              <FiCopy size={14} />
            </button>
            {/* Zweistufig: Loeschen liegt direkt neben Duplizieren und war
                bisher ohne Rueckfrage sofort weg. */}
            <button
              onClick={() => (confirmDelete ? removeCamera(cam.id) : setConfirmDelete(true))}
              onBlur={() => setConfirmDelete(false)}
              style={{ padding: '6px' }}
              className={`rounded hover:bg-white/[0.06] ${confirmDelete ? 'text-bc-red' : 'text-gray-400 hover:text-bc-red'}`}
              title={confirmDelete ? 'Wirklich löschen? Nochmal klicken.' : 'Kamera löschen'}
              aria-label={confirmDelete ? `${cam.label} wirklich löschen` : `${cam.label} löschen`}
            >
              {confirmDelete ? <span className="text-[10px] font-semibold">Löschen?</span> : <FiTrash2 size={14} />}
            </button>
          </div>
        </div>

        {/* Kernwerte — im zugeklappten Zustand die Vergleichszeile ueber alle
            Kameras, im aufgeklappten waeren sie doppelt und entfallen. */}
        {!expanded && (
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[10.5px] text-gray-500" style={{ paddingLeft: '4px' }}>
            <span className="text-gray-400">{camDef?.model ?? '—'}</span>
            <span>{MOUNT_TYPE_LABELS[cam.mountType ?? 'tripod']}</span>
            <span className="tabular-nums">{cam.z.toFixed(2)} m</span>
            <span className="tabular-nums">{cam.focalLength.toFixed(0)} mm</span>
            {fov && <span className="tabular-nums">{fov.horizontalDeg.toFixed(0)}°</span>}
          </div>
        )}
      </div>

      {/* Ausgeklappte Eigenschaften */}
      {expanded && (
        <div className="mt-2 space-y-2 text-xs">
          <FieldRow label="Name" htmlFor={`name-${cam.id}`}>
            <input
              id={`name-${cam.id}`}
              className="w-full rounded border border-bc-border bg-bc-dark text-white"
              style={{ padding: '3px 6px' }}
              value={cam.label}
              onChange={(e) => updateCamera(cam.id, { label: e.target.value })}
            />
          </FieldRow>

          {/* Mount-Mismatch ist ein echtes Problem (die Werte stimmen dann
              nicht), der Adapter dagegen nur ein Zustand — deshalb getrennte
              Dringlichkeit statt zweimal Gelb. */}
          {lensMismatch && lensDef && (
            <Note tone="warn">
              Objektiv-Anschluss {lensDef.mount} passt nicht zum aktiven Anschluss {activeMount}. Bis das
              stimmt, rechnet die App mit dem nackten Sensor — Werte weichen von der Realität ab.
            </Note>
          )}
          {adapterInfo && (
            <Note tone="info">
              Adapter: {adapterInfo.name}
              {adapterInfo.lightLossStops > 0 ? ` (−${adapterInfo.lightLossStops} T)` : ''}
              {adapterInfo.lightLossStops < 0 ? ` (+${Math.abs(adapterInfo.lightLossStops)} T Gewinn)` : ''}
              {adapterInfo.cropSensor ? ` → ${adapterInfo.cropSensor.name}` : ''}
            </Note>
          )}
          {speedBooster && (
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-300">
              <input
                type="checkbox"
                checked={cam.useSpeedbooster}
                onChange={(e) => updateCamera(cam.id, { useSpeedbooster: e.target.checked })}
                className="accent-bc-accent"
              />
              {speedBooster.name} (Speed Booster)
            </label>
          )}

          <Group id="optics" title="Kamera & Objektiv" summary={`${camDef?.model ?? ''} · ${cam.focalLength.toFixed(0)} mm`}>
          {/* Camera selector grouped by type */}
          <label className="block">
            <span className="flex items-center justify-between gap-2 text-gray-400">
              <span>Kamera · {camDef?.mount}-Anschluss · {camDef?.sensor.name}</span>
              {camDef && (
                <span className="flex items-center gap-0.5">
                  {/* Edit applies to every camera. For built-ins it creates a
                      "modified built-in" shadow on save; for shadows or pure
                      customs it updates the existing entry. */}
                  <button
                    type="button"
                    onClick={() => setEditingCustomCam(camDef.id)}
                    style={{ padding: '5px' }}
                    className="rounded text-gray-500 hover:text-bc-accent"
                    aria-label="Kameradaten bearbeiten"
                    title={isPureCustom(camDef.id)
                      ? 'Eigene Kamera bearbeiten'
                      : isBuiltInShadow(camDef.id)
                        ? 'Bearbeitung dieser geänderten Vorlage fortsetzen'
                        : 'Bearbeiten (legt eine änderbare Kopie an — das Original bleibt unangetastet)'}
                  >
                    <FiEdit2 size={12} />
                  </button>
                  {isBuiltInShadow(camDef.id) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm(`„${camDef.manufacturer} ${camDef.model}" auf die mitgelieferten Daten zurücksetzen? Deine Änderungen gehen verloren.`)) return;
                        useStore.getState().removeCustomCamera(camDef.id);
                      }}
                      style={{ padding: '5px' }}
                      className="rounded text-gray-500 hover:text-bc-yellow"
                      aria-label="Auf mitgelieferte Daten zurücksetzen"
                      title="Auf die Originaldaten zurücksetzen (verwirft deine Änderungen)"
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
                          alert(`„${camDef.manufacturer} ${camDef.model}" lässt sich nicht löschen — ${used} platzierte Kameras nutzen sie noch.`);
                          return;
                        }
                        if (!confirm(`Eigene Kamera „${camDef.manufacturer} ${camDef.model}" löschen?`)) return;
                        // Swap this placement to the first built-in so the card stays valid
                        const fallback = CAMERAS[0];
                        updateCamera(cam.id, {
                          cameraId: fallback.id,
                          activeMount: fallback.mount,
                          sensorModeIndex: fallback.sensorModes && fallback.sensorModes.length > 0 ? 0 : undefined,
                        });
                        useStore.getState().removeCustomCamera(camDef.id);
                      }}
                      style={{ padding: '5px' }}
                      className="rounded text-gray-500 hover:text-bc-red"
                      aria-label="Eigene Kamera löschen"
                      title="Diese eigene Kamera löschen"
                    >
                      <FiTrash2 size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleFavoriteCameraId(camDef.id)}
                    style={{ padding: '5px' }}
                    className={`rounded ${favoriteCameraIds.includes(camDef.id) ? 'text-bc-yellow' : 'text-gray-500 hover:text-bc-yellow'}`}
                    aria-label={favoriteCameraIds.includes(camDef.id) ? 'Favorit entfernen' : 'Als Favorit merken'}
                    title={favoriteCameraIds.includes(camDef.id) ? 'Favorit entfernen' : 'Als Favorit merken'}
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
              <option value="__new_custom__">＋ Eigene Kamera anlegen…</option>
            </select>
          </label>

          {/* Inline custom camera creation form (Custom+ entry in the dropdown) */}
          {showNewCustomCam && (
            <CustomCameraForm
              title="Neue eigene Kamera"
              submitLabel="Anlegen & auswählen"
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
              submitLabel="Änderungen sichern"
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
            <FieldRow label="Anschluss" htmlFor={`mountplate-${cam.id}`}>
              <select
                id={`mountplate-${cam.id}`}
                className="block w-full bg-bc-dark border border-bc-border rounded text-white"
                style={{ padding: '3px 6px' }}
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
                <option value={camDef.mount}>{camDef.mount} (nativ)</option>
                {camDef.adaptedMounts.map((m) => (
                  <option key={m} value={m}>{m} (Wechselplatte / Adapter)</option>
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
                      {ma.lightLossStops > 0 && <span>Lichtverlust: −{ma.lightLossStops} T · </span>}
                      {ma.lightLossStops < 0 && <span>Lichtgewinn: +{Math.abs(ma.lightLossStops)} T · </span>}
                      {ma.lightLossStops === 0 && <span>Kein Lichtverlust · </span>}
                      {ma.cropSensor ? <span>erzwingt {ma.cropSensor.name}</span> : <span>kein Sensor-Crop</span>}
                    </div>
                    {ma.notes && (
                      <div className="text-gray-500 mt-1 italic">{ma.notes}</div>
                    )}
                  </div>
                );
              })()}
            </FieldRow>
          )}

          {/* Bildkreis-Deckung. `marginal` ist ein Dauerzustand dieser
              Kombination und kein Fehler — nur echtes Vignettieren ist eine
              Warnung. Vorher hatte beides dieselbe Alarmfarbe. */}
          {coverage && coverage.status !== 'ok' && (
            <Note tone={coverage.status === 'vignette' ? 'warn' : 'info'}>
              {coverage.message}
            </Note>
          )}

          {/* Hardware sensor mode (URSA B4 crop, VENICE windows, FX9 S35 etc.) */}
          {camDef?.sensorModes && camDef.sensorModes.length > 1 && (
            <FieldRow
              label="Sensor-Modus"
              htmlFor={`sensormode-${cam.id}`}
              hint={adapterInfo?.cropSensor ? `Adapter erzwingt ${adapterInfo.cropSensor.name}` : undefined}
            >
              <select
                id={`sensormode-${cam.id}`}
                className="block w-full bg-bc-dark border border-bc-border rounded text-white disabled:text-gray-500"
                style={{ padding: '3px 6px' }}
                value={cam.sensorModeIndex ?? 0}
                onChange={(e) => updateCamera(cam.id, { sensorModeIndex: parseInt(e.target.value) })}
                disabled={!!adapterInfo?.cropSensor}
                title={adapterInfo?.cropSensor ? 'Der Adapter-Crop übersteuert den Sensor-Modus' : 'Crop-Modus des Kamerabodys'}
              >
                {camDef.sensorModes.map((mode, idx) => (
                  <option key={idx} value={idx}>{mode.name}</option>
                ))}
              </select>
            </FieldRow>
          )}

          {/* Lens selector grouped by mount */}
          <label className="block">
            <span className="flex items-center justify-between gap-2 text-gray-400">
              <span>Objektiv</span>
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
              <option value="__new__">＋ Eigenes Objektiv anlegen…</option>
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
            >Eigenes Objektiv „{lensDef.manufacturer} {lensDef.model}" löschen</button>
          )}
          {/* Inline custom lens creation form */}
          {showNewLens && (
            <div className="bg-bc-dark rounded p-2 border border-bc-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-medium text-[11px]">Neues eigenes Objektiv</span>
                <button onClick={() => setShowNewLens(false)} className="text-gray-500 hover:text-white text-xs">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <input placeholder="Hersteller" className="bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white text-xs"
                  value={newLens.manufacturer} onChange={(e) => setNewLens({ ...newLens, manufacturer: e.target.value })} />
                <input placeholder="Modell" className="bg-bc-panel border border-bc-border rounded px-1 py-0.5 text-white text-xs"
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
                  <option value="prime">Festbrennweite</option>
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
                <FiPlus size={12} /> Anlegen & auswählen
              </button>
            </div>
          )}

          {/* Optische Werte — dieselben Regler wie im Preview-Tab: logarithmische
              Bahn mit Rastung, Zahl direkt eingebbar. Vorher hatte die Sidebar
              lineare Regler ohne Anker, also zwei Bedienungen fuer dieselbe Groesse. */}
          <LensSlider
            label="Brennweite"
            value={cam.focalLength}
            min={focalMin}
            max={focalMax}
            ticks={focalTicks}
            format={formatFocal}
            unit="mm"
            note={cam.extenderActive > 1 ? `eff. ${(cam.focalLength * cam.extenderActive).toFixed(0)} mm` : undefined}
            onChange={(v) => updateCamera(cam.id, { focalLength: v })}
            onStep={(dir) => updateCamera(cam.id, { focalLength: stepAlong(cam.focalLength, dir, focalMin, focalMax, focalStepTicks) })}
            title="Brennweite — logarithmisch, rastet auf die Marken. Shift = frei."
          />

          <LensSlider
            label="Blende"
            value={cam.aperture}
            min={apertureMin}
            max={apertureMax}
            ticks={apertureTicks}
            format={formatAperture}
            prefix="f/"
            formatTick={(v) => (v < 10 ? v.toFixed(1) : v.toFixed(0))}
            note={adapterInfo && adapterInfo.lightLossStops !== 0
              ? `eff. T${(cam.aperture * Math.pow(2, adapterInfo.lightLossStops / 2)).toFixed(1)}`
              : undefined}
            onChange={(v) => updateCamera(cam.id, { aperture: v })}
            onStep={(dir) => updateCamera(cam.id, { aperture: stepStop(cam.aperture, dir, apertureMin, apertureMax) })}
            title="Blende — Normreihe in vollen Stufen. Shift = stufenlos."
          />

          <LensSlider
            label="Fokusdistanz"
            value={Math.min(Math.max(cam.focusDistance, FOCUS_MIN_M), FOCUS_MAX_M)}
            min={FOCUS_MIN_M}
            max={FOCUS_MAX_M}
            ticks={focusTicks}
            format={formatDistance}
            unit="m"
            onChange={(v) => updateCamera(cam.id, { focusDistance: v })}
            onStep={(dir) => updateCamera(cam.id, { focusDistance: stepAlong(cam.focusDistance, dir, FOCUS_MIN_M, FOCUS_MAX_M, focusStepTicks) })}
            title="Entfernung, auf die scharfgestellt ist — nicht der Abstand zur Bühne."
          />

          {lensDef?.extenderFactors && lensDef.extenderFactors.length > 0 && (
            <FieldRow label="Extender" htmlFor={`ext-${cam.id}`}>
              <select
                id={`ext-${cam.id}`}
                className="block w-full bg-bc-dark border border-bc-border rounded text-white"
                style={{ padding: '3px 6px' }}
                value={cam.extenderActive}
                onChange={(e) => updateCamera(cam.id, { extenderActive: parseFloat(e.target.value) })}
              >
                <option value={1}>Aus (1×)</option>
                {lensDef.extenderFactors.map((f) => (
                  <option key={f} value={f}>{f}× Extender</option>
                ))}
              </select>
            </FieldRow>
          )}
          </Group>

          <Group id="aim" title="Blickrichtung" summary={`${cam.pan.toFixed(0)}° / ${cam.tilt.toFixed(0)}°`}>
            <ValueSlider
              label="Schwenk (Pan)"
              value={cam.pan}
              min={-180}
              max={180}
              step={1}
              decimals={0}
              unit="°"
              onChange={(v) => updateCamera(cam.id, { pan: v })}
              title="0° zeigt nach rechts, positive Werte drehen im Uhrzeigersinn."
            />
            <ValueSlider
              label="Neigung (Tilt)"
              value={cam.tilt}
              min={-90}
              max={45}
              step={1}
              decimals={0}
              unit="°"
              onChange={(v) => updateCamera(cam.id, { tilt: v })}
              title="Negative Werte neigen nach unten."
            />
          </Group>

          <Group id="place" title="Standort & Rig" summary={`${MOUNT_TYPE_LABELS[cam.mountType ?? 'tripod']} · ${cam.z.toFixed(2)} m`}>
          <FieldRow label="Position (m)">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                className="w-full bg-bc-dark border border-bc-border rounded text-white tabular-nums"
                style={{ padding: '3px 6px' }}
                value={cam.x}
                step={0.5}
                aria-label="Position X in Metern"
                title="Abstand vom linken Rand (m)"
                onChange={(e) => updateCamera(cam.id, { x: parseFloat(e.target.value) || 0 })}
              />
              <input
                type="number"
                className="w-full bg-bc-dark border border-bc-border rounded text-white tabular-nums"
                style={{ padding: '3px 6px' }}
                value={cam.y}
                step={0.5}
                aria-label="Position Y in Metern"
                title="Abstand vom oberen Rand (m)"
                onChange={(e) => updateCamera(cam.id, { y: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </FieldRow>

          {/* Montage + konkretes Rig. Die Kategorie bestimmt den Bewegungsstil,
              das Rig die echten Maße (Hoehe, Ausleger, Fahrweg). */}
          {(() => {
            const limits = rigLimits(cam);
            const catRigs = rigsForType(limits.type);
            return (
              <>
                <FieldRow label="Montage" htmlFor={`mount-${cam.id}`}>
                  <select
                    id={`mount-${cam.id}`}
                    className="block w-full bg-bc-dark border border-bc-border rounded text-white"
                    style={{ padding: '3px 6px' }}
                    value={cam.mountType ?? 'tripod'}
                    onChange={(e) => {
                      const newMount = e.target.value as CameraMountType;
                      // Rig und Sonderlaenge fallen weg — sie gehoerten zur alten
                      // Kategorie und wuerden sonst falsche Grenzen liefern.
                      const next = rigLimits({ mountType: newMount });
                      updateCamera(cam.id, {
                        mountType: newMount,
                        rigId: undefined,
                        trackLengthM: undefined,
                        z: clampHeight(next, cam.z),
                        trackOffset: next.trackM > 0 ? 0 : undefined,
                      });
                    }}
                  >
                    {(Object.keys(MOUNT_TYPE_LABELS) as CameraMountType[]).map((m) => (
                      <option key={m} value={m}>{MOUNT_TYPE_LABELS[m]}</option>
                    ))}
                  </select>
                </FieldRow>

                {catRigs.length > 0 && (
                  <FieldRow label="Rig-Modell" htmlFor={`rig-${cam.id}`}>
                    <select
                      id={`rig-${cam.id}`}
                      className="block w-full bg-bc-dark border border-bc-border rounded text-white"
                      style={{ padding: '3px 6px' }}
                      value={cam.rigId ?? ''}
                      onChange={(e) => {
                        const rigId = e.target.value || undefined;
                        const next = rigLimits({ mountType: limits.type, rigId });
                        updateCamera(cam.id, {
                          rigId,
                          trackLengthM: undefined,
                          z: clampHeight(next, cam.z),
                          trackOffset: next.trackM > 0 ? clampTrack(next, cam.trackOffset ?? 0) : undefined,
                        });
                      }}
                    >
                      <option value="">— allgemein ({MOUNT_TYPE_LABELS[limits.type]}) —</option>
                      {catRigs.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    {limits.rig && (
                      <span className="block mt-0.5 text-[10px] text-gray-500 leading-snug">
                        {limits.minHeightM.toFixed(2)}–{limits.maxHeightM.toFixed(2)} m
                        {limits.armLengthM ? ` · Ausleger ${limits.armLengthM.toFixed(1)} m` : ''}
                        {limits.telescopeM ? ` · Teleskop ${limits.telescopeM.toFixed(1)} m` : ''}
                        {limits.payloadKg ? ` · max ${limits.payloadKg} kg` : ''}
                        {limits.footprintM ? ` · Stellflaeche ${limits.footprintM.w.toFixed(1)}×${limits.footprintM.d.toFixed(1)} m` : ''}
                        {limits.rig.notes ? ` — ${limits.rig.notes}` : ''}
                      </span>
                    )}
                  </FieldRow>
                )}

                {/* Ausrichtung des Rigs im Raum. Eine gelegte Schiene oder ein
                    Kran-Chassis steht fest, waehrend die Kamera darauf
                    schwenkt — darum ein eigener Winkel neben `pan`. Ohne
                    eigenen Wert folgt das Rig der Kamera. */}
                <ValueSlider
                  label="Ausrichtung"
                  value={rigYaw(cam)}
                  min={-180}
                  max={180}
                  step={1}
                  decimals={0}
                  unit="°"
                  hint={cam.rigRotation === undefined ? 'folgt der Kamera' : 'fest ausgerichtet'}
                  title="Richtung von Schiene, Chassis oder Beinstellung — unabhängig vom Schwenk."
                  onChange={(v) => updateCamera(cam.id, { rigRotation: v })}
                  right={
                    cam.rigRotation !== undefined ? (
                      <button
                        onClick={() => updateCamera(cam.id, { rigRotation: undefined })}
                        style={{ padding: '2px 5px' }}
                        className="shrink-0 rounded border border-bc-border text-[10px] text-gray-500 hover:text-white"
                        title="Rig wieder an die Blickrichtung koppeln"
                      >koppeln</button>
                    ) : undefined
                  }
                />

                {/* Hoehe — durch die echten Grenzen des Rigs begrenzt */}
                <ValueSlider
                  label="Objektivhöhe"
                  value={clampHeight(limits, cam.z)}
                  min={limits.minHeightM}
                  max={limits.maxHeightM}
                  step={limits.pumpM}
                  unit="m"
                  title="Höhe der Linse über dem Boden — begrenzt durch das gewählte Rig."
                  onChange={(v) => updateCamera(cam.id, { z: clampHeight(limits, v) })}
                />

                {/* Gelegte Schienenlaenge — nur wo es eine Schiene gibt */}
                {(limits.type === 'dolly' || limits.type === 'slider') && (
                  <ValueSlider
                    label="Schienenlänge"
                    value={limits.trackM}
                    min={0.5}
                    max={60}
                    step={0.5}
                    unit="m"
                    hint={(() => {
                      const plan = trackSectionPlan(limits.trackM);
                      const parts = plan.sections.map((sec) => `${sec.count}x${(sec.lengthM / 0.3048).toFixed(0)}'`).join(' + ');
                      return `${limits.trackIsCustom ? 'eigene Länge' : 'Vorschlag'} · aus ${parts} = ${plan.total.toFixed(2)} m`;
                    })()}
                    title="Tatsächlich gelegte Schiene. Der Wagen fährt von der Mitte aus je die Hälfte."
                    onChange={(v) => {
                      const len = Math.max(0.5, Math.min(60, v));
                      const half = len / 2;
                      updateCamera(cam.id, {
                        trackLengthM: len,
                        trackOffset: Math.max(-half, Math.min(half, cam.trackOffset ?? 0)),
                      });
                    }}
                    right={
                      limits.trackIsCustom ? (
                        <button
                          onClick={() => updateCamera(cam.id, { trackLengthM: undefined })}
                          style={{ padding: '2px 5px' }}
                          className="shrink-0 rounded border border-bc-border text-[10px] text-gray-500 hover:text-white"
                          title="Zurück auf den Vorschlag des Rigs"
                        >reset</button>
                      ) : undefined
                    }
                  />
                )}

                {/* Live-Fahrweg — Jib-Schwenk, Dolly-Fahrt, Teleskop, Flug */}
                {limits.travelM > 0 && (
                  <ValueSlider
                    label="Fahrweg"
                    value={clampTrack(limits, cam.trackOffset ?? 0)}
                    min={-limits.travelM}
                    max={limits.travelM}
                    step={0.05}
                    unit="m"
                    title="Aktuelle Position auf Schiene bzw. Ausleger. Live fahren geht im Rig-Tab."
                    onChange={(v) => updateCamera(cam.id, { trackOffset: v })}
                    right={
                      <button
                        onClick={() => updateCamera(cam.id, { trackOffset: 0 })}
                        style={{ padding: '2px 5px' }}
                        className="shrink-0 rounded border border-bc-border text-[10px] text-gray-500 hover:text-white"
                        title="Rig auf Null parken"
                      >park</button>
                    }
                  />
                )}
              </>
            );
          })()}


          </Group>

          {/* Ergebnis der Optik — Anzeige, keine Bedienung. Standardmaessig zu,
              weil es beim Einrichten selten gebraucht wird. */}
          <Group
            id="result"
            title="Ergebnis"
            defaultOpen={false}
            summary={fov ? `${fov.horizontalDeg.toFixed(0)}° · ${fov.imageWidthAtDistance.toFixed(1)} m breit` : undefined}
          >
            {fov && (
              <>
                <Readout label="Bildwinkel horizontal" value={`${fov.horizontalDeg.toFixed(1)}°`} />
                <Readout label={`Bildbreite bei ${cam.focusDistance.toFixed(1)} m`} value={`${fov.imageWidthAtDistance.toFixed(2)} m`} />
              </>
            )}
            {dof && (
              <>
                <Readout label="Schärfe von" value={dof.nearLimit < 0.01 ? '0 m' : `${dof.nearLimit.toFixed(2)} m`} />
                <Readout label="Schärfe bis" value={dof.farLimit === Infinity ? '∞' : `${dof.farLimit.toFixed(2)} m`} />
                <Readout label="Schärfentiefe gesamt" value={dof.totalDof === Infinity ? '∞' : `${dof.totalDof.toFixed(2)} m`} tone="muted" />
              </>
            )}
            {effectiveSensor && effectiveSensor !== camDef?.sensor && (
              <Note tone="info">
                Wirksamer Sensor: {effectiveSensor.name} (Crop ×{effectiveSensor.cropFactor.toFixed(1)})
              </Note>
            )}
            {camDef && lensDef && effectiveSensor && fov && dof && (
              <div>
                <button
                  onClick={() => setShowCalc(!showCalc)}
                  style={{ padding: '3px 0' }}
                  className="flex w-full items-center gap-1 text-[10px] text-gray-400 hover:text-bc-accent"
                  aria-expanded={showCalc}
                >
                  {showCalc ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />}
                  Rechenweg {showCalc ? 'ausblenden' : 'anzeigen'}
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
          </Group>

          <Group id="note" title="Notiz" defaultOpen={false} summary={cam.notes ? cam.notes.slice(0, 24) : undefined}>
            <textarea
              className="block min-h-[2.5rem] w-full resize-y rounded border border-bc-border bg-bc-dark text-xs text-white"
              style={{ padding: '4px 6px' }}
              rows={2}
              placeholder="Montage, Operator, Hinweise zum Shot…"
              aria-label="Notiz zur Kamera"
              value={cam.notes ?? ''}
              onChange={(e) => updateCamera(cam.id, { notes: e.target.value })}
            />
          </Group>
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
  const selectedCameraId = useStore((s) => s.selectedCameraId);
  const selectCamera = useStore((s) => s.selectCamera);
  // Akkordeon: offen ist die Karte der ausgewaehlten Kamera. Klappt der Nutzer
  // sie trotzdem zu, merkt sich das genau diese eine Id — dadurch braucht es
  // keinen Effekt, der bei jeder Auswahl State nachzieht.
  const [collapsedCameraId, setCollapsedCameraId] = useState<string | null>(null);
  const toggleCameraCard = useCallback(
    (camId: string) => {
      if (camId !== selectedCameraId) {
        selectCamera(camId);
        setCollapsedCameraId(null);
        return;
      }
      setCollapsedCameraId((prev) => (prev === camId ? null : camId));
    },
    [selectCamera, selectedCameraId],
  );
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
    // Breite kommt vom Container in App.tsx (fluid); hier nur noch fuellen —
    // ein zweites `w-80` haette die Spalte bei 320 px festgenagelt.
    <div className="w-full bg-bc-panel border-r border-bc-border h-full flex flex-col overflow-y-auto">
      {/* Venue settings */}
      <div className={`border-b border-bc-border/60 ${venueOpen ? 'bg-white/[0.015]' : ''}`}>
        <AccordionHeader
          icon={<FiHome size={14} />}
          title="Veranstaltungsort"
          open={venueOpen}
          onToggle={() => setVenueOpen(!venueOpen)}
        />
        {venueOpen && (
          <div className="space-y-2 text-xs" style={{ padding: '0 14px 12px' }}>
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

      {/* Background plan */}
      <div className={`border-b border-bc-border/60 ${bgOpen ? 'bg-white/[0.015]' : ''}`}>
        <AccordionHeader
          icon={<FiImage size={14} />}
          title="Grundriss"
          open={bgOpen}
          onToggle={() => setBgOpen(!bgOpen)}
        />
        {bgOpen && (
          <div className="space-y-2 text-xs" style={{ padding: '0 14px 12px' }}>
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

      {/* Stages management */}
      <div className={`border-b border-bc-border/60 ${stagesOpen ? 'bg-white/[0.015]' : ''}`}>
        <AccordionHeader
          icon={<FiMap size={14} />}
          title="Bühnen"
          count={venue.stages.length}
          open={stagesOpen}
          onToggle={() => setStagesOpen(!stagesOpen)}
        />
        {stagesOpen && (
          <div className="space-y-2 text-xs" style={{ padding: '0 14px 12px' }}>
            {venue.stages.map((s) => (
              <div key={s.id} className="bg-bc-dark rounded p-2 border border-bc-border">
                <div className="flex items-center justify-between mb-1">
                  <input
                    className="bg-transparent text-white text-xs font-semibold w-24 outline-none"
                    value={s.label}
                    onChange={(e) => updateStage(s.id, { label: e.target.value })}
                  />
                  <button onClick={() => removeStage(s.id)} style={{ padding: '4px' }} className="rounded hover:text-bc-red" title="Bühne löschen" aria-label="Bühne löschen">
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
              <FiPlus size={12} /> Neu Stage
            </button>
          </div>
        )}
      </div>


      {/* Walls */}
      <div className={`border-b border-bc-border/60 ${wallsOpen ? 'bg-white/[0.015]' : ''}`}>
        <AccordionHeader
          icon={<FiColumns size={14} />}
          title="Wände"
          count={walls.length}
          open={wallsOpen}
          onToggle={() => setWallsOpen(!wallsOpen)}
        />
        {wallsOpen && (
          <div className="space-y-2 text-xs" style={{ padding: '0 14px 12px' }}>
            <button
              onClick={() => setWallDrawMode((active) => !active)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs w-full justify-center ${wallDrawMode ? 'bg-bc-yellow/20 text-bc-yellow hover:bg-bc-yellow/30' : 'bg-bc-dark text-gray-300 hover:text-white border border-bc-border'}`}
            >
              {wallDrawMode ? 'Zeichnen beenden' : 'Wände zeichnen'}
            </button>
            {wallDrawMode && (
              <div className="rounded border border-bc-border bg-bc-dark px-2 py-1.5 text-[10px] text-gray-400 leading-relaxed">
                Einmal klicken setzt den Startpunkt, nochmal klicken beendet die Wand. Shift rastet den Winkel.
                Rechtsklick auf eine Wand loescht sie.
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
              Wandenden aneinander einrasten
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
                    title="Wandfarbe"
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
                    <label className="px-1.5 py-0.5 rounded bg-bc-accent/20 text-bc-accent text-[10px] cursor-pointer hover:bg-bc-accent/30" title="Kachelbild hochladen">
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
              <FiPlus size={12} /> Neu Wall
            </button>
          </div>
        )}
      </div>

      {/* Persons & Stage Objects */}
      <div className={`border-b border-bc-border/60 ${personsOpen ? 'bg-white/[0.015]' : ''}`}>
        <AccordionHeader
          icon={<FiUsers size={14} />}
          title="Objekte & Personen"
          count={persons.length}
          open={personsOpen}
          onToggle={() => setPersonsOpen(!personsOpen)}
        />
        {personsOpen && (
          <div className="space-y-2 text-xs" style={{ padding: '0 14px 12px' }}>
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
                    title="Eigene Akzentfarbe"
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

      {/* Camera list — nicht klappbar, aber gleicher Header-Stil wie das Akkordeon */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="flex items-center gap-2.5" style={{ minHeight: '44px', padding: '10px 14px' }}>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-bc-accent/20 text-bc-accent">
            <FiVideo size={14} />
          </span>
          <span className="text-[13.5px] font-semibold text-white">Kameras</span>
          <span
            style={{ padding: '2px 7px' }}
            className="rounded-full bg-bc-dark text-[10.5px] font-semibold tabular-nums text-gray-300"
          >
            {cameras.length}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={toggleShowAllFov}
              style={{ padding: '6px' }}
              className="rounded hover:bg-bc-border text-gray-400 hover:text-white"
              title={showAllFov ? 'Bildwinkel aller Kameras ausblenden' : 'Bildwinkel aller Kameras einblenden'}
              aria-label={showAllFov ? 'Bildwinkel aller Kameras ausblenden' : 'Bildwinkel aller Kameras einblenden'}
            >
              {showAllFov ? <FiEye size={15} /> : <FiEyeOff size={15} />}
            </button>
            <button
              onClick={() => addCamera()}
              style={{ padding: '5px 10px' }}
              className="flex items-center gap-1 rounded bg-bc-accent text-white text-xs font-semibold hover:bg-bc-accent/80"
            >
              <FiPlus size={12} /> Neu
            </button>
          </div>
        </div>

        <div style={{ padding: '0 14px 12px' }}>
          {cameras.map((cam) => (
            <CameraCard
              key={cam.id}
              camId={cam.id}
              expanded={cam.id === selectedCameraId && collapsedCameraId !== cam.id}
              toggleOpen={toggleCameraCard}
            />
          ))}

          {cameras.length === 0 && (
            <p className="text-gray-500 text-xs text-center mt-8">Noch keine Kamera. Über „Neu" anlegen oder eine Vorlage laden.</p>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="p-3 border-t border-bc-border">
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to clear everything? This cannot be undone.')) clearAll();
          }}
          className="w-full py-1.5 rounded bg-bc-red/20 text-bc-red text-xs font-semibold hover:bg-bc-red/30"
        >
          Alles löschen
        </button>
      </div>
    </div>
  );
}
