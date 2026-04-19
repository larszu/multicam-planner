import { useCallback, useEffect, useState } from 'react';
import { useStore, APP_VERSION } from '../../store/useStore';
import { getCameraById, getEffectiveSensor, getAdapterInfo } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov, computeDof, personHeightInFrame } from '../../utils/fov';
import type { VenueCamera } from '../../types';

/**
 * Listens for the 'multicam-export' custom event and generates a combined PNG
 * containing: camera label, 2D plan, 3D screenshot, Preview, and Calculator data.
 */
export default function ExportPanel() {
  const [exporting, setExporting] = useState(false);
  const { cameras, selectedCameraId, venue, persons, projectVersion } = useStore();

  const cam = cameras.find((c) => c.id === selectedCameraId);

  const captureCanvas = useCallback((selector: string): HTMLCanvasElement | null => {
    return document.querySelector(selector) as HTMLCanvasElement | null;
  }, []);

  const capture2DCanvas = useCallback((): HTMLCanvasElement | null => {
    const capture = (window as any).__capture2DExport;
    if (typeof capture === 'function') {
      try {
        return capture() as HTMLCanvasElement | null;
      } catch { /* fall through */ }
    }
    // Fallback: grab DOM canvas
    return document.querySelector('.konvajs-content canvas') as HTMLCanvasElement | null;
  }, []);

  const capture3DCanvas = useCallback((): HTMLCanvasElement | null => {
    // R3F renders to a canvas inside the 3D view container
    const canvases = document.querySelectorAll('canvas');
    for (const c of canvases) {
      if (c.closest('[data-venue3d]')) return c;
    }
    // Fallback: find the WebGL canvas
    for (const c of canvases) {
      const ctx = c.getContext('webgl2') || c.getContext('webgl');
      if (ctx) return c;
    }
    return null;
  }, []);

  const generateExport = useCallback(async () => {
    if (!cam) {
      alert('Please select a camera first.');
      return;
    }

    setExporting(true);

    try {
      const camDef = getCameraById(cam.cameraId);
      const lensDef = getLensById(cam.lensId, useStore.getState().customLenses);
      if (!camDef || !lensDef) return;

      const sensor = getEffectiveSensor(camDef, lensDef, cam.useSpeedbooster);
      const adapterInfo = getAdapterInfo(camDef, lensDef, cam.useSpeedbooster);
      const fov = computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive);
      const dof = computeDof(sensor, cam.focalLength, cam.aperture, cam.focusDistance, cam.extenderActive);
      const personPx = personHeightInFrame(sensor.heightMm, cam.focalLength * cam.extenderActive, cam.focusDistance);

      // ── Layout constants ──
      const EW = 1920; // export width
      const padding = 20;
      const headerH = 80;
      const tileW = (EW - padding * 3) / 2;
      const tileH = Math.round(tileW * 9 / 16);
      const calcH = 260;
      const totalH = headerH + padding + tileH + padding + tileH + padding + calcH + padding;

      const out = document.createElement('canvas');
      out.width = EW;
      out.height = totalH;
      const ctx = out.getContext('2d')!;

      // Background
      ctx.fillStyle = '#0f1117';
      ctx.fillRect(0, 0, EW, totalH);

      // ── Header ──
      ctx.fillStyle = '#1a1d27';
      ctx.fillRect(0, 0, EW, headerH);
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${cam.label} — ${camDef.manufacturer} ${camDef.model}`, padding, 36);
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Lens: ${lensDef.manufacturer} ${lensDef.model}`, padding, 60);
      // Right side: project info
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${venue.name} — Project v${projectVersion} — MultiCam Planner v${APP_VERSION}`, EW - padding, 30);
      ctx.fillText(`Exported: ${new Date().toLocaleString()}`, EW - padding, 50);
      if (adapterInfo) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`Adapter: ${adapterInfo.name}`, EW - padding, 70);
      }

      // ── Tile helper ──
      function drawTile(srcCanvas: HTMLCanvasElement | null, x: number, y: number, label: string) {
        // Border
        ctx.strokeStyle = '#2a2d3a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileW, tileH);

        if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
          ctx.drawImage(srcCanvas, x, y, tileW, tileH);
        } else {
          ctx.fillStyle = '#1a1d27';
          ctx.fillRect(x, y, tileW, tileH);
          ctx.fillStyle = '#6b7280';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${label} — not available`, x + tileW / 2, y + tileH / 2);
        }
        // Label
        ctx.fillStyle = '#000000aa';
        ctx.fillRect(x, y, 160, 28);
        ctx.fillStyle = '#e5e7eb';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 8, y + 19);
      }

      // ── Capture views ──
      const plan2D = capture2DCanvas();
      const view3D = capture3DCanvas();
      const previewCanvas = typeof (window as any).__capturePreviewCanvas === 'function'
        ? (window as any).__capturePreviewCanvas()
        : captureCanvas('canvas[width="640"]');

      // Row 1: 2D Plan + 3D View
      drawTile(plan2D, padding, headerH + padding, '2D Plan');
      drawTile(view3D, padding * 2 + tileW, headerH + padding, '3D View');

      // Row 2: Preview + Calculator data
      drawTile(previewCanvas, padding, headerH + padding + tileH + padding, 'Camera Preview');

      // Calculator data tile (rendered as text)
      const calcX = padding * 2 + tileW;
      const calcY = headerH + padding + tileH + padding;
      ctx.fillStyle = '#1a1d27';
      ctx.fillRect(calcX, calcY, tileW, tileH);
      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = 2;
      ctx.strokeRect(calcX, calcY, tileW, tileH);

      // Calculator label
      ctx.fillStyle = '#000000aa';
      ctx.fillRect(calcX, calcY, 200, 28);
      ctx.fillStyle = '#e5e7eb';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Calculator / Data', calcX + 8, calcY + 19);

      // Calculator content
      const cx = calcX + 20;
      let cy = calcY + 50;
      const lineH = 22;

      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = '#3b82f6';
      ctx.fillText('CAMERA & OPTICS', cx, cy); cy += lineH + 4;

      ctx.font = '13px monospace';
      ctx.fillStyle = '#e5e7eb';
      const lines = [
        `Camera:      ${camDef.manufacturer} ${camDef.model}`,
        `Sensor:      ${sensor.name} (${sensor.widthMm.toFixed(1)}×${sensor.heightMm.toFixed(1)}mm, ×${sensor.cropFactor.toFixed(2)})`,
        `Mount:       ${camDef.mount}`,
        `Lens:        ${lensDef.manufacturer} ${lensDef.model}`,
        `Focal Length: ${cam.focalLength}mm${cam.extenderActive > 1 ? ` (×${cam.extenderActive} = ${(cam.focalLength * cam.extenderActive).toFixed(0)}mm)` : ''}`,
        `Aperture:    f/${cam.aperture}`,
        `Focus Dist:  ${cam.focusDistance.toFixed(1)}m`,
        `Position:    X=${cam.x.toFixed(1)}m Y=${cam.y.toFixed(1)}m Z=${cam.z.toFixed(1)}m`,
        `Pan: ${cam.pan.toFixed(1)}°  Tilt: ${cam.tilt.toFixed(1)}°`,
        '',
        `FOV H:       ${fov.horizontalDeg.toFixed(2)}°`,
        `FOV V:       ${fov.verticalDeg.toFixed(2)}°`,
        `Image:       ${fov.imageWidthAtDistance.toFixed(2)}m × ${fov.imageHeightAtDistance.toFixed(2)}m`,
        `35mm eq FL:  ${fov.equivalentFocalLength.toFixed(0)}mm`,
        `DoF:         ${dof.nearLimit < 0.01 ? '0' : dof.nearLimit.toFixed(2)}m – ${dof.farLimit === Infinity ? '∞' : dof.farLimit.toFixed(2) + 'm'}`,
        `Hyperfocal:  ${dof.hyperfocal.toFixed(2)}m`,
        `Person 1.8m: ${personPx.toFixed(0)}px / 1080 (${((personPx / 1080) * 100).toFixed(1)}%)`,
      ];
      if (adapterInfo) {
        const lossStr = adapterInfo.lightLossStops > 0 ? `−${adapterInfo.lightLossStops}T` : adapterInfo.lightLossStops < 0 ? `+${Math.abs(adapterInfo.lightLossStops)}T` : '0T';
        lines.push(`Adapter:     ${adapterInfo.name} (${lossStr})`);
      }

      lines.forEach((line) => {
        if (line === '') { cy += 6; return; }
        if (line.startsWith('FOV') || line.startsWith('DoF') || line.startsWith('Person')) {
          ctx.fillStyle = '#22c55e';
        } else if (line.startsWith('Adapter')) {
          ctx.fillStyle = '#f59e0b';
        } else {
          ctx.fillStyle = '#e5e7eb';
        }
        ctx.fillText(line, cx, cy);
        cy += lineH;
      });

      // ── Camera list summary at bottom ──
      const summaryY = headerH + padding + tileH + padding + tileH + padding;
      ctx.fillStyle = '#1a1d27';
      ctx.fillRect(padding, summaryY, EW - padding * 2, calcH);
      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = 2;
      ctx.strokeRect(padding, summaryY, EW - padding * 2, calcH);

      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('ALL CAMERAS IN PROJECT', padding + 16, summaryY + 24);

      ctx.font = '12px monospace';
      const colW = (EW - padding * 2 - 32) / 3;
      let row = 0;
      let col = 0;
      cameras.forEach((c, i) => {
        const cd = getCameraById(c.cameraId);
        const ld = getLensById(c.lensId, useStore.getState().customLenses);
        if (!cd || !ld) return;
        const sx = padding + 16 + col * colW;
        const sy = summaryY + 46 + row * 18;
        const isSelected = c.id === cam.id;
        ctx.fillStyle = isSelected ? '#3b82f6' : '#9ca3af';
        ctx.font = isSelected ? 'bold 12px monospace' : '12px monospace';
        ctx.fillText(`${c.label}: ${cd.manufacturer} ${cd.model} + ${ld.model.substring(0, 30)}`, sx, sy);
        col++;
        if (col >= 3) { col = 0; row++; }
      });

      // ── Download ──
      out.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cam.label.replace(/\s+/g, '_')}_${venue.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_v${projectVersion}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } finally {
      setExporting(false);
    }
  }, [cam, cameras, venue, projectVersion, capture2DCanvas, capture3DCanvas, captureCanvas, persons]);

  useEffect(() => {
    const handler = () => generateExport();
    window.addEventListener('multicam-export', handler);
    return () => window.removeEventListener('multicam-export', handler);
  }, [generateExport]);

  if (exporting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-bc-panel rounded-lg p-6 text-white text-center">
          <div className="animate-pulse mb-2">Generating export...</div>
        </div>
      </div>
    );
  }

  return null;
}
