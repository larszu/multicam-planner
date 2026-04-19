import { useStore } from '../../store/useStore';
import { CAMERAS, getCameraById } from '../../data/cameras';
import { LENSES, getLensById, getCompatibleLenses } from '../../data/lenses';
import { computeFov, computeDof } from '../../utils/fov';
import { FiPlus, FiTrash2, FiCopy, FiChevronDown, FiChevronUp, FiEye, FiEyeOff } from 'react-icons/fi';
import { useState } from 'react';

function CameraCard({ camId }: { camId: string }) {
  const { cameras, selectedCameraId, selectCamera, updateCamera, removeCamera, duplicateCamera } = useStore();
  const cam = cameras.find((c) => c.id === camId)!;
  const isSelected = cam.id === selectedCameraId;
  const [expanded, setExpanded] = useState(false);

  const camDef = getCameraById(cam.cameraId);
  const lensDef = getLensById(cam.lensId);
  const compatLenses = camDef ? getCompatibleLenses(camDef.mount, camDef.adaptedMounts) : LENSES;
  const fov = camDef && lensDef ? computeFov(camDef.sensor, cam.focalLength, cam.focusDistance, cam.extenderActive) : null;
  const dof = camDef && lensDef ? computeDof(camDef.sensor, cam.focalLength, cam.aperture, cam.focusDistance, cam.extenderActive) : null;

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

      {/* Expanded controls */}
      {expanded && (
        <div className="mt-3 space-y-2 text-xs" onClick={(e) => e.stopPropagation()}>
          {/* Camera selector */}
          <label className="block">
            <span className="text-gray-400">Camera</span>
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
              {CAMERAS.map((c) => (
                <option key={c.id} value={c.id}>{c.manufacturer} {c.model}</option>
              ))}
            </select>
          </label>

          {/* Lens selector */}
          <label className="block">
            <span className="text-gray-400">Lens</span>
            <select
              className="block w-full mt-0.5 bg-bc-dark border border-bc-border rounded px-2 py-1 text-white"
              value={cam.lensId}
              onChange={(e) => {
                const lens = getLensById(e.target.value);
                updateCamera(cam.id, {
                  lensId: e.target.value,
                  focalLength: lens?.focalLengthMin ?? cam.focalLength,
                  aperture: lens?.maxApertureWide ?? cam.aperture,
                });
              }}
            >
              {compatLenses.map((l) => (
                <option key={l.id} value={l.id}>{l.manufacturer} {l.model}</option>
              ))}
            </select>
          </label>

          {/* Focal length slider */}
          <label className="block">
            <span className="text-gray-400">Focal Length: {cam.focalLength.toFixed(1)}mm</span>
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
            <span className="text-gray-400">Aperture: f/{cam.aperture.toFixed(1)}</span>
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

          {/* Rotation */}
          <label className="block">
            <span className="text-gray-400">Rotation: {cam.rotation.toFixed(0)}°</span>
            <input
              type="range"
              className="w-full accent-bc-accent"
              min={-180}
              max={180}
              step={1}
              value={cam.rotation}
              onChange={(e) => updateCamera(cam.id, { rotation: parseFloat(e.target.value) })}
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
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { cameras, addCamera, venue, setVenue, showAllFov, toggleShowAllFov, clearAll, pixelsPerMeter, setPixelsPerMeter } = useStore();
  const [venueOpen, setVenueOpen] = useState(false);

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
          <div className="mt-2 space-y-2 text-xs" >
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
          onClick={clearAll}
          className="w-full py-1.5 rounded bg-bc-red/20 text-bc-red text-xs font-semibold hover:bg-bc-red/30"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
