import { useCallback, useEffect, useState } from 'react';
import { useStore, APP_VERSION } from '../../store/useStore';
import { getCameraById, getEffectiveSensor, getAdapterInfo } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov, computeDof, personHeightInFrame } from '../../utils/fov';
import type { VenueCamera } from '../../types';

export type ExportMode = 'current' | 'all' | 'widetele' | 'all-widetele';

interface ExportDetail {
  mode?: ExportMode;
}

/**
 * Listens for the 'multicam-export' custom event and generates a combined PNG
 * containing: camera label, 2D plan, 3D screenshot, Preview, and Calculator data.
 *
 * The detail.mode controls which renders are emitted:
 *   - 'current'       → one PNG of the currently-selected camera at its current focal length
 *   - 'all'           → one PNG per camera at each camera's current focal length
 *   - 'widetele'      → two PNGs for the selected camera: at min and max focal length
 *   - 'all-widetele'  → two PNGs per camera (wide + tele)
 */
export default function ExportPanel() {
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const { cameras, selectedCameraId, venue, projectVersion } = useStore();

  const capture2DCanvas = useCallback((): HTMLCanvasElement | null => {
    const capture = (window as any).__capture2DExport;
    if (typeof capture === 'function') {
      try {
        return capture() as HTMLCanvasElement | null;
      } catch { /* fall through */ }
    }
    return document.querySelector('.konvajs-content canvas') as HTMLCanvasElement | null;
  }, []);

  const capture3DCanvas = useCallback((): HTMLCanvasElement | null => {
    const canvases = document.querySelectorAll('canvas');
    for (const c of canvases) {
      if (c.closest('[data-venue3d]')) return c;
    }
    for (const c of canvases) {
      const ctx = c.getContext('webgl2') || c.getContext('webgl');
      if (ctx) return c;
    }
    return null;
  }, []);

  const capturePreviewCanvas = useCallback((): HTMLCanvasElement | null => {
    const fn = (window as any).__capturePreviewCanvas;
    if (typeof fn === 'function') {
      try { return fn() as HTMLCanvasElement | null; } catch { /* fall through */ }
    }
    return null;
  }, []);

  /** Wait two animation frames + a settle delay for Konva/R3F to paint at new dimensions. */
  const waitForPaint = useCallback(async (settleMs = 250) => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setTimeout(resolve, settleMs);
      }));
    });
  }, []);

  /** Render a single export PNG for a given camera + optional focal length override. */
  const renderOne = useCallback(async (targetCam: VenueCamera, opts?: { focalOverride?: number; variantLabel?: string }) => {
    const camDef = getCameraById(targetCam.cameraId, useStore.getState().customCameras);
    const lensDef = getLensById(targetCam.lensId, useStore.getState().customLenses);
    if (!camDef || !lensDef) return;

    const focalLength = opts?.focalOverride ?? targetCam.focalLength;
    const sensor = getEffectiveSensor(camDef, lensDef, targetCam.useSpeedbooster, targetCam.sensorModeIndex);
    const adapterInfo = getAdapterInfo(camDef, lensDef, targetCam.useSpeedbooster);
    const fov = computeFov(sensor, focalLength, targetCam.focusDistance, targetCam.extenderActive);
    const dof = computeDof(sensor, focalLength, targetCam.aperture, targetCam.focusDistance, targetCam.extenderActive);
    const personPx = personHeightInFrame(sensor.heightMm, focalLength * targetCam.extenderActive, targetCam.focusDistance);

    // Apply override to the store so the live preview/2D/3D paint with the right state,
    // then wait one frame so the canvases update before we capture them.
    const originalFocal = targetCam.focalLength;
    const originalSelected = useStore.getState().selectedCameraId;
    const needSelectionChange = useStore.getState().selectedCameraId !== targetCam.id;
    const needFocalChange = opts?.focalOverride !== undefined && opts.focalOverride !== originalFocal;

    if (needSelectionChange) useStore.getState().selectCamera(targetCam.id);
    if (needFocalChange) useStore.getState().updateCamera(targetCam.id, { focalLength });
    if (needSelectionChange || needFocalChange) await waitForPaint();

    // ── Layout constants ──
    const EW = 1920;
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

    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, EW, totalH);

    // ── Header ──
    ctx.fillStyle = '#1a1d27';
    ctx.fillRect(0, 0, EW, headerH);
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    const variant = opts?.variantLabel ? ` — ${opts.variantLabel}` : '';
    ctx.fillText(`${targetCam.label}${variant} — ${camDef.manufacturer} ${camDef.model}`, padding, 36);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Lens: ${lensDef.manufacturer} ${lensDef.model} @ ${focalLength.toFixed(1)}mm`, padding, 60);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    ctx.fillText(`${venue.name} — Project v${projectVersion} — MultiCam Planner v${APP_VERSION}`, EW - padding, 30);
    ctx.fillText(`Exported: ${new Date().toLocaleString()}`, EW - padding, 50);
    if (adapterInfo) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`Adapter: ${adapterInfo.name}`, EW - padding, 70);
    }

    // ── Tile helper: letterbox to preserve aspect ratio ──
    function drawTile(srcCanvas: HTMLCanvasElement | null, x: number, y: number, label: string) {
      ctx.fillStyle = '#0a0e14';
      ctx.fillRect(x, y, tileW, tileH);

      if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
        const srcRatio = srcCanvas.width / srcCanvas.height;
        const tileRatio = tileW / tileH;
        let dw: number, dh: number;
        if (srcRatio > tileRatio) {
          dw = tileW;
          dh = tileW / srcRatio;
        } else {
          dh = tileH;
          dw = tileH * srcRatio;
        }
        const dx = x + (tileW - dw) / 2;
        const dy = y + (tileH - dh) / 2;
        ctx.drawImage(srcCanvas, dx, dy, dw, dh);
      } else {
        ctx.fillStyle = '#1a1d27';
        ctx.fillRect(x, y, tileW, tileH);
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${label} — not available`, x + tileW / 2, y + tileH / 2);
      }
      ctx.strokeStyle = '#2a2d3a';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, tileW, tileH);
      ctx.fillStyle = '#000000aa';
      ctx.fillRect(x, y, 160, 28);
      ctx.fillStyle = '#e5e7eb';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 8, y + 19);
    }

    const plan2D = capture2DCanvas();
    const view3D = capture3DCanvas();
    const previewCanvas = capturePreviewCanvas();

    drawTile(plan2D, padding, headerH + padding, '2D Plan');
    drawTile(view3D, padding * 2 + tileW, headerH + padding, '3D View');
    drawTile(previewCanvas, padding, headerH + padding + tileH + padding, 'Camera Preview');

    // Calculator data tile
    const calcX = padding * 2 + tileW;
    const calcY = headerH + padding + tileH + padding;
    ctx.fillStyle = '#1a1d27';
    ctx.fillRect(calcX, calcY, tileW, tileH);
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(calcX, calcY, tileW, tileH);

    ctx.fillStyle = '#000000aa';
    ctx.fillRect(calcX, calcY, 200, 28);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Calculator / Data', calcX + 8, calcY + 19);

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
      `Focal Length: ${focalLength.toFixed(1)}mm${targetCam.extenderActive > 1 ? ` (×${targetCam.extenderActive} = ${(focalLength * targetCam.extenderActive).toFixed(0)}mm)` : ''}`,
      `Aperture:    f/${targetCam.aperture}`,
      `Focus Dist:  ${targetCam.focusDistance.toFixed(1)}m`,
      `Position:    X=${targetCam.x.toFixed(1)}m Y=${targetCam.y.toFixed(1)}m Z=${targetCam.z.toFixed(1)}m`,
      `Pan: ${targetCam.pan.toFixed(1)}°  Tilt: ${targetCam.tilt.toFixed(1)}°`,
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

    // ── Camera list summary ──
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
    cameras.forEach((c) => {
      const cd = getCameraById(c.cameraId, useStore.getState().customCameras);
      const ld = getLensById(c.lensId, useStore.getState().customLenses);
      if (!cd || !ld) return;
      const sx = padding + 16 + col * colW;
      const sy = summaryY + 46 + row * 18;
      const isSelected = c.id === targetCam.id;
      ctx.fillStyle = isSelected ? '#3b82f6' : '#9ca3af';
      ctx.font = isSelected ? 'bold 12px monospace' : '12px monospace';
      ctx.fillText(`${c.label}: ${cd.manufacturer} ${cd.model} + ${ld.model.substring(0, 30)}`, sx, sy);
      col++;
      if (col >= 3) { col = 0; row++; }
    });

    // ── Download ──
    const filename = `${targetCam.label.replace(/\s+/g, '_')}${opts?.variantLabel ? `_${opts.variantLabel.replace(/\s+/g, '_')}` : ''}_${venue.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_v${projectVersion}.png`;
    await new Promise<void>((resolve) => {
      out.toBlob((blob) => {
        if (!blob) { resolve(); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    });

    // ── Restore overrides ──
    if (needFocalChange) useStore.getState().updateCamera(targetCam.id, { focalLength: originalFocal });
    if (needSelectionChange) useStore.getState().selectCamera(originalSelected);
  }, [cameras, venue, projectVersion, capture2DCanvas, capture3DCanvas, capturePreviewCanvas, waitForPaint]);

  const generateExport = useCallback(async (mode: ExportMode = 'current') => {
    const state = useStore.getState();
    const currentCam = state.cameras.find((c) => c.id === state.selectedCameraId);
    const targetCams = (mode === 'all' || mode === 'all-widetele')
      ? state.cameras
      : currentCam ? [currentCam] : [];

    if (targetCams.length === 0) {
      alert('No cameras to export. Add a camera first.');
      return;
    }

    setExporting(true);

    // Prepare layout (force Grid so all panels render at proper size)
    let restoreLayout: (() => void) | null = null;
    const prepFn = (window as any).__multicamPrepareForExport as
      | (() => Promise<{ restore: () => void } | null>)
      | undefined;
    if (typeof prepFn === 'function') {
      try {
        const prep = await prepFn();
        if (prep) restoreLayout = prep.restore;
      } catch { /* fall through */ }
    }

    const originalSelected = state.selectedCameraId;
    const wantsWideTele = mode === 'widetele' || mode === 'all-widetele';

    // Build the work queue
    type Job = { cam: VenueCamera; focalOverride?: number; variantLabel?: string };
    const jobs: Job[] = [];
    for (const tc of targetCams) {
      if (wantsWideTele) {
        const lens = getLensById(tc.lensId, useStore.getState().customLenses);
        if (!lens) { jobs.push({ cam: tc }); continue; }
        if (lens.focalLengthMin === lens.focalLengthMax) {
          // Prime — just one export
          jobs.push({ cam: tc, variantLabel: `${lens.focalLengthMin}mm` });
        } else {
          jobs.push({ cam: tc, focalOverride: lens.focalLengthMin, variantLabel: `wide_${lens.focalLengthMin}mm` });
          jobs.push({ cam: tc, focalOverride: lens.focalLengthMax, variantLabel: `tele_${lens.focalLengthMax}mm` });
        }
      } else {
        jobs.push({ cam: tc });
      }
    }

    setExportProgress({ current: 0, total: jobs.length });

    try {
      for (let i = 0; i < jobs.length; i++) {
        setExportProgress({ current: i + 1, total: jobs.length });
        await renderOne(jobs[i].cam, {
          focalOverride: jobs[i].focalOverride,
          variantLabel: jobs[i].variantLabel,
        });
      }
    } finally {
      // Restore original selection (renderOne handles per-camera restore but final
      // cleanup ensures we land on whatever was selected before the batch).
      useStore.getState().selectCamera(originalSelected);
      if (restoreLayout) restoreLayout();
      setExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  }, [renderOne]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ExportDetail>).detail;
      generateExport(detail?.mode ?? 'current');
    };
    window.addEventListener('multicam-export', handler);
    return () => window.removeEventListener('multicam-export', handler);
  }, [generateExport]);

  if (exporting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-bc-panel rounded-lg p-6 text-white text-center min-w-[260px]">
          <div className="animate-pulse mb-2">Generating export…</div>
          {exportProgress.total > 1 && (
            <div className="text-xs text-gray-400">
              {exportProgress.current} / {exportProgress.total}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
