import { SENSORS } from '../../data/cameras';
import { computeFov, computeDof, personHeightInFrame } from '../../utils/fov';
import { useState } from 'react';
import type { SensorSize } from '../../types';

export default function Calculator() {
  const [sensorKey, setSensorKey] = useState<string>('TWO_THIRD');
  const [focalLength, setFocalLength] = useState(20);
  const [aperture, setAperture] = useState(2.8);
  const [distance, setDistance] = useState(10);
  const [extender, setExtender] = useState(1);

  const sensor: SensorSize = SENSORS[sensorKey as keyof typeof SENSORS];
  const fov = computeFov(sensor, focalLength, distance, extender);
  const dof = computeDof(sensor, focalLength, aperture, distance, extender);
  const personPx = personHeightInFrame(sensor.heightMm, focalLength * extender, distance);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold text-white mb-4">FOV & DoF Calculator</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Sensor */}
        <label className="block text-xs">
          <span className="text-gray-400">Sensor Size</span>
          <select
            className="block w-full mt-1 bg-bc-dark border border-bc-border rounded px-2 py-1.5 text-white text-sm"
            value={sensorKey}
            onChange={(e) => setSensorKey(e.target.value)}
          >
            {Object.entries(SENSORS).map(([key, s]) => (
              <option key={key} value={key}>{s.name} ({s.widthMm}×{s.heightMm}mm)</option>
            ))}
          </select>
        </label>

        {/* Focal length */}
        <label className="block text-xs">
          <span className="text-gray-400">Focal Length: {focalLength}mm</span>
          <input
            type="range"
            className="w-full mt-1 accent-bc-accent"
            min={2}
            max={1000}
            step={0.5}
            value={focalLength}
            onChange={(e) => setFocalLength(parseFloat(e.target.value))}
          />
        </label>

        {/* Aperture */}
        <label className="block text-xs">
          <span className="text-gray-400">Aperture: f/{aperture}</span>
          <input
            type="range"
            className="w-full mt-1 accent-bc-accent"
            min={1}
            max={22}
            step={0.1}
            value={aperture}
            onChange={(e) => setAperture(parseFloat(e.target.value))}
          />
        </label>

        {/* Distance */}
        <label className="block text-xs">
          <span className="text-gray-400">Distance: {distance}m</span>
          <input
            type="range"
            className="w-full mt-1 accent-bc-accent"
            min={0.5}
            max={200}
            step={0.5}
            value={distance}
            onChange={(e) => setDistance(parseFloat(e.target.value))}
          />
        </label>

        {/* Extender */}
        <label className="block text-xs">
          <span className="text-gray-400">Extender</span>
          <select
            className="block w-full mt-1 bg-bc-dark border border-bc-border rounded px-2 py-1.5 text-white text-sm"
            value={extender}
            onChange={(e) => setExtender(parseFloat(e.target.value))}
          >
            <option value={1}>Off (1×)</option>
            <option value={1.4}>1.4×</option>
            <option value={2}>2×</option>
          </select>
        </label>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bc-dark rounded-lg border border-bc-border p-4">
          <h3 className="text-sm font-bold text-bc-accent mb-2">Field of View</h3>
          <div className="space-y-1 text-sm text-gray-200">
            <div>Horizontal: <strong>{fov.horizontalDeg.toFixed(2)}°</strong></div>
            <div>Vertical: <strong>{fov.verticalDeg.toFixed(2)}°</strong></div>
            <div>Diagonal: <strong>{fov.diagonalDeg.toFixed(2)}°</strong></div>
            <div className="pt-2">Image Width: <strong>{fov.imageWidthAtDistance.toFixed(2)}m</strong></div>
            <div>Image Height: <strong>{fov.imageHeightAtDistance.toFixed(2)}m</strong></div>
            <div className="pt-2">35mm eq. FL: <strong>{fov.equivalentFocalLength.toFixed(0)}mm</strong></div>
          </div>
        </div>

        <div className="bg-bc-dark rounded-lg border border-bc-border p-4">
          <h3 className="text-sm font-bold text-bc-green mb-2">Depth of Field</h3>
          <div className="space-y-1 text-sm text-gray-200">
            <div>Near: <strong>{dof.nearLimit < 0.01 ? '0' : dof.nearLimit.toFixed(2)}m</strong></div>
            <div>Far: <strong>{dof.farLimit === Infinity ? '∞' : dof.farLimit.toFixed(2) + 'm'}</strong></div>
            <div>Total DoF: <strong>{dof.totalDof === Infinity ? '∞' : dof.totalDof.toFixed(2) + 'm'}</strong></div>
            <div className="pt-2">Hyperfocal: <strong>{dof.hyperfocal.toFixed(2)}m</strong></div>
            <div>CoC: <strong>{(dof.circleOfConfusion * 1000).toFixed(1)}µm</strong></div>
          </div>
        </div>

        <div className="bg-bc-dark rounded-lg border border-bc-border p-4 col-span-2">
          <h3 className="text-sm font-bold text-bc-yellow mb-2">Person in Frame (1.80m)</h3>
          <div className="text-sm text-gray-200">
            Height in 1080p: <strong>{personPx.toFixed(0)}px</strong> ({((personPx / 1080) * 100).toFixed(1)}% of frame)
          </div>
          <div className="mt-2 h-4 bg-bc-panel rounded-full overflow-hidden">
            <div
              className="h-full bg-bc-yellow rounded-full transition-all"
              style={{ width: `${Math.min(100, (personPx / 1080) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
