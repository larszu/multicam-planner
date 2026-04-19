import { useStore } from '../../store/useStore';
import { getCameraById, getEffectiveSensor, getAdapterInfo } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov, computeDof, personHeightInFrame } from '../../utils/fov';
import { useRef, useEffect, useCallback } from 'react';

export default function CameraPreview() {
  const { cameras, selectedCameraId } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cam = cameras.find((c) => c.id === selectedCameraId);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cam) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const camDef = getCameraById(cam.cameraId);
    const lensDef = getLensById(cam.lensId);
    if (!camDef || !lensDef) return;

    const sensor = getEffectiveSensor(camDef, lensDef);
    const adapterInfo = getAdapterInfo(camDef, lensDef);

    const W = canvas.width;
    const H = canvas.height;
    const fov = computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive);
    const dof = computeDof(sensor, cam.focalLength, cam.aperture, cam.focusDistance, cam.extenderActive);

    // Clear
    ctx.fillStyle = '#111318';
    ctx.fillRect(0, 0, W, H);

    // Image dimensions at focus distance
    const imgW = fov.imageWidthAtDistance;
    const imgH = fov.imageHeightAtDistance;

    // Draw scene background (gradient)
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a2030');
    grad.addColorStop(1, '#0d1117');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Ground line
    const groundY = H * 0.75;
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    // === HORIZONTAL RULER (bottom) ===
    const rulerH = 24;
    const rulerY = H - rulerH;
    ctx.fillStyle = '#000000bb';
    ctx.fillRect(0, rulerY, W, rulerH);

    // Calculate metre-per-pixel in preview
    const mPerPx = imgW / W;
    // Find nice step: 0.5m, 1m, 2m, 5m, 10m...
    const rawStep = imgW / 8;
    const niceSteps = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
    const step = niceSteps.find((s) => s >= rawStep) ?? rawStep;
    const halfImgW = imgW / 2;

    ctx.strokeStyle = '#888';
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 1;

    // Ticks from centre outward
    for (let m = 0; m <= halfImgW; m += step) {
      const pxR = W / 2 + (m / imgW) * W;
      const pxL = W / 2 - (m / imgW) * W;
      // Right tick
      if (pxR <= W) {
        ctx.beginPath();
        ctx.moveTo(pxR, rulerY);
        ctx.lineTo(pxR, rulerY + 8);
        ctx.stroke();
        ctx.fillText(`${m.toFixed(m < 1 ? 2 : 1)}m`, pxR, rulerY + 18);
      }
      // Left tick (skip centre duplicate)
      if (m > 0 && pxL >= 0) {
        ctx.beginPath();
        ctx.moveTo(pxL, rulerY);
        ctx.lineTo(pxL, rulerY + 8);
        ctx.stroke();
        ctx.fillText(`${m.toFixed(m < 1 ? 2 : 1)}m`, pxL, rulerY + 18);
      }
    }
    // Centre marker
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(W / 2, rulerY);
    ctx.lineTo(W / 2, rulerY + 10);
    ctx.stroke();

    // === VERTICAL RULER (right side) ===
    const vRulerW = 28;
    const vRulerX = W - vRulerW;
    ctx.fillStyle = '#000000bb';
    ctx.fillRect(vRulerX, 0, vRulerW, H - rulerH);

    const mPerPxV = imgH / H;
    const rawStepV = imgH / 6;
    const stepV = niceSteps.find((s) => s >= rawStepV) ?? rawStepV;

    ctx.strokeStyle = '#888';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'right';

    // Ticks from ground up
    for (let m = 0; m <= imgH; m += stepV) {
      const py = groundY - (m / imgH) * (H * 0.6);
      if (py < 0 || py > H - rulerH) continue;
      ctx.beginPath();
      ctx.moveTo(vRulerX, py);
      ctx.lineTo(vRulerX + 6, py);
      ctx.stroke();
      ctx.fillText(`${m.toFixed(m < 1 ? 2 : 1)}m`, W - 4, py + 3);
    }

    // Reference person (1.8m)
    const personH = 1.8;
    const scale = H * 0.6 / imgH; // pixels per metre in the preview
    const pxHeight = personH * scale;
    const pxWidth = pxHeight * 0.35;
    const personX = W / 2;
    const personBottom = groundY;

    // Body
    ctx.fillStyle = cam.color + '88';
    ctx.strokeStyle = cam.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(personX - pxWidth / 2, personBottom - pxHeight, pxWidth, pxHeight * 0.7, 4);
    ctx.fill();
    ctx.stroke();

    // Head
    const headR = pxWidth * 0.45;
    ctx.beginPath();
    ctx.arc(personX, personBottom - pxHeight - headR * 0.2, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Person height label
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('1.80m', personX + pxWidth / 2 + 6, personBottom - pxHeight / 2);

    // Height indicator line
    ctx.strokeStyle = '#ffffff44';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(personX + pxWidth / 2 + 3, personBottom);
    ctx.lineTo(personX + pxWidth / 2 + 3, personBottom - pxHeight - headR * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // === DISTANCE ANNOTATIONS ===
    // Horizontal width at focus distance
    ctx.fillStyle = '#ffffff88';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`← ${imgW.toFixed(1)}m →`, W / 2, rulerY - 4);

    // Vertical height
    ctx.save();
    ctx.translate(vRulerX - 6, groundY / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${imgH.toFixed(1)}m ↕`, 0, 0);
    ctx.restore();

    // Safe areas (16:9 action safe / title safe)
    ctx.strokeStyle = '#ffffff22';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    // Action safe (93%)
    const asMargin = W * 0.035;
    ctx.strokeRect(asMargin, asMargin * (H / W), W - asMargin * 2, H - asMargin * 2 * (H / W));
    // Title safe (90%)
    const tsMargin = W * 0.05;
    ctx.strokeRect(tsMargin, tsMargin * (H / W), W - tsMargin * 2, H - tsMargin * 2 * (H / W));
    ctx.setLineDash([]);

    // Rule of thirds
    ctx.strokeStyle = '#ffffff11';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo((W / 3) * i, 0);
      ctx.lineTo((W / 3) * i, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (H / 3) * i);
      ctx.lineTo(W, (H / 3) * i);
      ctx.stroke();
    }

    // Info overlay
    const infoH = adapterInfo ? 148 : 130;
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(8, 8, 270, infoH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${cam.label} — ${camDef.manufacturer} ${camDef.model}`, 16, 28);
    ctx.font = '11px monospace';
    ctx.fillText(`Lens: ${lensDef.manufacturer} ${lensDef.model}`, 16, 46);
    ctx.fillText(`FL: ${cam.focalLength}mm ${cam.extenderActive > 1 ? `(×${cam.extenderActive} = ${cam.focalLength * cam.extenderActive}mm)` : ''}`, 16, 62);
    ctx.fillText(`FOV: ${fov.horizontalDeg.toFixed(1)}° × ${fov.verticalDeg.toFixed(1)}°`, 16, 78);
    ctx.fillText(`Image: ${imgW.toFixed(1)}m × ${imgH.toFixed(1)}m @ ${cam.focusDistance.toFixed(1)}m`, 16, 94);
    const nearStr = dof.nearLimit < 0.01 ? '0m' : dof.nearLimit.toFixed(1) + 'm';
    const farStr = dof.farLimit === Infinity ? '∞' : dof.farLimit.toFixed(1) + 'm';
    ctx.fillText(`DoF: ${nearStr} – ${farStr}`, 16, 110);
    ctx.fillText(`f/${cam.aperture} | eq.FL: ${fov.equivalentFocalLength.toFixed(0)}mm`, 16, 126);
    if (adapterInfo) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`Adapter: ${adapterInfo.name} (−${adapterInfo.lightLossStops}T)`, 16, 142);
    }
  }, [cam]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (!cam) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Select a camera to see its preview</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        className="w-full rounded-lg"
        style={{ aspectRatio: '16/9' }}
      />
      {/* Zoom slider */}
      <div className="flex items-center gap-3 mt-3 px-2">
        <span className="text-xs text-gray-400 w-20">
          {cam.focalLength.toFixed(0)}mm
        </span>
        <input
          type="range"
          min={getLensById(cam.lensId)?.focalLengthMin ?? 4}
          max={getLensById(cam.lensId)?.focalLengthMax ?? 300}
          step={0.1}
          value={cam.focalLength}
          onChange={(e) =>
            useStore.getState().updateCamera(cam.id, { focalLength: parseFloat(e.target.value) })
          }
          className="flex-1 accent-bc-accent"
        />
        <span className="text-xs text-gray-400 w-20 text-right">
          {getLensById(cam.lensId)?.focalLengthMax ?? '?'}mm
        </span>
      </div>
    </div>
  );
}
