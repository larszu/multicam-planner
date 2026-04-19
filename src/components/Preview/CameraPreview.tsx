import { useStore } from '../../store/useStore';
import { getCameraById, getEffectiveSensor, getAdapterInfo } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov, computeDof, personHeightInFrame } from '../../utils/fov';
import { useRef, useEffect, useCallback } from 'react';

export default function CameraPreview() {
  const { cameras, selectedCameraId, venue, persons } = useStore();
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

    const sensor = getEffectiveSensor(camDef, lensDef, cam.useSpeedbooster);
    const adapterInfo = getAdapterInfo(camDef, lensDef, cam.useSpeedbooster);

    const W = canvas.width;
    const H = canvas.height;
    const fov = computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive);
    const dof = computeDof(sensor, cam.focalLength, cam.aperture, cam.focusDistance, cam.extenderActive);

    // Image dimensions at focus distance
    const imgW = fov.imageWidthAtDistance;
    const imgH = fov.imageHeightAtDistance;

    // ── Pan/Tilt offsets ──
    // Pan: camera default is -90° (pointing "up" in 2D = towards stage).
    // Tilt: 0 = level, negative = looking down. We shift the scene vertically.
    // Tilt shifts the view: looking down (-tilt) moves horizon up, showing more ground.
    const tiltOffsetPx = (cam.tilt / fov.verticalDeg) * H;

    // Ground plane Y position (adjusted for camera height + tilt)
    // At level (tilt=0), horizon is at camera height. Ground is below.
    const cameraHeightFraction = cam.z / imgH; // how much of the image height the camera is above ground
    const groundY = H * (0.5 - cameraHeightFraction) - tiltOffsetPx;
    const groundYClamped = Math.max(-H, Math.min(H * 2, groundY));

    // Metres per pixel
    const mPerPxH = imgW / W;
    const mPerPxV = imgH / H;

    // Clear
    ctx.fillStyle = '#111318';
    ctx.fillRect(0, 0, W, H);

    // Draw sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(0, groundYClamped));
    skyGrad.addColorStop(0, '#0d1520');
    skyGrad.addColorStop(1, '#1a2535');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, Math.max(0, groundYClamped));

    // Draw ground
    if (groundYClamped < H) {
      const gndGrad = ctx.createLinearGradient(0, groundYClamped, 0, H);
      gndGrad.addColorStop(0, '#1e2530');
      gndGrad.addColorStop(1, '#0d1117');
      ctx.fillStyle = gndGrad;
      ctx.fillRect(0, groundYClamped, W, H - groundYClamped);

      // Ground line
      ctx.strokeStyle = '#3a4050';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundYClamped);
      ctx.lineTo(W, groundYClamped);
      ctx.stroke();
    }

    // ── Draw ground grid (perspective lines) ──
    if (groundYClamped < H) {
      ctx.strokeStyle = '#ffffff0a';
      ctx.lineWidth = 1;
      // Horizontal depth lines
      for (let d = 1; d <= 10; d++) {
        const depthFrac = d / 10;
        const lineY = groundYClamped + (H - groundYClamped) * (1 - Math.pow(1 - depthFrac, 2));
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(W, lineY);
        ctx.stroke();
      }
    }

    // ── Helper: world position to screen pixel ──
    // Converts a world-space position relative to camera into screen coordinates
    const panRad = (cam.pan * Math.PI) / 180;
    const cosP = Math.cos(panRad);
    const sinP = Math.sin(panRad);

    function worldToScreen(wx: number, wy: number, wz: number): { sx: number; sy: number; dist: number; behindCamera: boolean } {
      // Translate relative to camera (cam is guaranteed non-null here by the guard at top of draw())
      const c = cam!;
      const dx = wx - c.x;
      const dy = wy - c.y;

      // Rotate by -pan to get camera-local coords (forward = +Z_cam)
      const localX = dx * cosP + dy * sinP;   // right
      const localZ = -dx * sinP + dy * cosP;  // forward (into scene)

      if (localZ <= 0.1) return { sx: -999, sy: -999, dist: 0, behindCamera: true };

      // Project to screen using FOV
      const fovHRad = (fov.horizontalDeg * Math.PI) / 360; // half FOV
      const fovVRad = (fov.verticalDeg * Math.PI) / 360;

      const screenX = W / 2 + (localX / (localZ * Math.tan(fovHRad))) * (W / 2);
      const heightAboveGround = wz;
      const tiltRad = (c.tilt * Math.PI) / 180;
      const apparentY = (heightAboveGround - c.z) / localZ;
      const tiltShift = Math.tan(tiltRad);
      const screenY = H / 2 - ((apparentY + tiltShift) / Math.tan(fovVRad)) * (H / 2);

      return { sx: screenX, sy: screenY, dist: localZ, behindCamera: false };
    }

    // ── Draw stages from venue ──
    venue.stages.forEach((stage) => {
      const corners = [
        { x: stage.x, y: stage.y, z: 0 },
        { x: stage.x + stage.width, y: stage.y, z: 0 },
        { x: stage.x + stage.width, y: stage.y + stage.height, z: 0 },
        { x: stage.x, y: stage.y + stage.height, z: 0 },
      ];
      const projected = corners.map((c) => worldToScreen(c.x, c.y, c.z));
      if (projected.every((p) => p.behindCamera)) return;

      ctx.strokeStyle = '#3b82f6aa';
      ctx.fillStyle = '#3b82f622';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const validPts = projected.filter((p) => !p.behindCamera);
      if (validPts.length < 2) return;
      ctx.moveTo(projected[0].sx, projected[0].sy);
      for (let i = 1; i < projected.length; i++) {
        if (!projected[i].behindCamera) ctx.lineTo(projected[i].sx, projected[i].sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Stage label
      const center = worldToScreen(stage.x + stage.width / 2, stage.y + stage.height / 2, 0);
      if (!center.behindCamera) {
        const fontSize = Math.max(8, Math.min(16, 200 / center.dist));
        ctx.fillStyle = '#3b82f6';
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(stage.label, center.sx, center.sy + fontSize / 3);
      }
    });

    // ── Draw persons ──
    // Use a clip region so partially off-screen persons are cropped, not hidden
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();

    persons.forEach((person) => {
      const feet = worldToScreen(person.x, person.y, 0);
      const head = worldToScreen(person.x, person.y, person.height);
      if (feet.behindCamera) return;

      const pxH = Math.abs(head.sy - feet.sy);
      if (pxH < 1) return; // too small to draw
      const pxW = pxH * 0.3;

      // Skip if entirely off-screen
      const left = feet.sx - pxW;
      const right = feet.sx + pxW;
      const top = head.sy - pxW * 0.5;
      const bottom = feet.sy;
      if (right < 0 || left > W || bottom < 0 || top > H) return;

      // Body
      ctx.fillStyle = '#22c55e44';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(feet.sx - pxW / 2, head.sy, pxW, pxH * 0.75, 3);
      ctx.fill();
      ctx.stroke();

      // Head
      const headR = pxW * 0.4;
      ctx.beginPath();
      ctx.arc(feet.sx, head.sy - headR * 0.3, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Label (only if it fits on screen)
      if (feet.sy > 0 && feet.sy < H - 5) {
        const fontSize = Math.max(7, Math.min(11, 120 / feet.dist));
        ctx.fillStyle = '#22c55e';
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${person.label} (${person.height.toFixed(1)}m)`, feet.sx, feet.sy + fontSize + 2);
      }
    });

    ctx.restore();

    // ── Draw other cameras ──
    cameras.forEach((otherCam) => {
      if (otherCam.id === cam.id) return;
      const pos = worldToScreen(otherCam.x, otherCam.y, otherCam.z);
      if (pos.behindCamera) return;

      const sz = Math.max(4, Math.min(12, 80 / pos.dist));
      ctx.fillStyle = otherCam.color + 'aa';
      ctx.strokeStyle = otherCam.color;
      ctx.lineWidth = 1.5;
      ctx.fillRect(pos.sx - sz, pos.sy - sz / 2, sz * 2, sz);
      ctx.strokeRect(pos.sx - sz, pos.sy - sz / 2, sz * 2, sz);

      const fontSize = Math.max(7, Math.min(10, 100 / pos.dist));
      ctx.fillStyle = otherCam.color;
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(otherCam.label, pos.sx, pos.sy - sz / 2 - 3);
    });

    // ── Reference person at centre of view ──
    const refPersonH = 1.8;
    const scale = H * 0.6 / imgH;
    const pxHeight = refPersonH * scale;
    const pxWidth = pxHeight * 0.35;
    const personX = W / 2;
    const personBottom = groundYClamped;

    if (groundYClamped > 0 && groundYClamped < H) {
      // Body
      ctx.fillStyle = cam.color + '55';
      ctx.strokeStyle = cam.color + 'aa';
      ctx.lineWidth = 1.5;
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
      ctx.fillStyle = '#ffffff88';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('1.80m ref', personX + pxWidth / 2 + 4, personBottom - pxHeight / 2);
    }

    // ═══ RULERS ═══

    // === HORIZONTAL RULER (bottom) ===
    const rulerH = 24;
    const rulerY = H - rulerH;
    ctx.fillStyle = '#000000bb';
    ctx.fillRect(0, rulerY, W, rulerH);

    const niceSteps = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
    const rawStep = imgW / 8;
    const step = niceSteps.find((s) => s >= rawStep) ?? rawStep;
    const halfImgW = imgW / 2;

    ctx.strokeStyle = '#888';
    ctx.fillStyle = '#aaa';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 1;

    for (let m = 0; m <= halfImgW; m += step) {
      const pxR = W / 2 + (m / imgW) * W;
      const pxL = W / 2 - (m / imgW) * W;
      if (pxR <= W) {
        ctx.beginPath(); ctx.moveTo(pxR, rulerY); ctx.lineTo(pxR, rulerY + 8); ctx.stroke();
        ctx.fillText(`${m.toFixed(m < 1 ? 2 : 1)}m`, pxR, rulerY + 18);
      }
      if (m > 0 && pxL >= 0) {
        ctx.beginPath(); ctx.moveTo(pxL, rulerY); ctx.lineTo(pxL, rulerY + 8); ctx.stroke();
        ctx.fillText(`${m.toFixed(m < 1 ? 2 : 1)}m`, pxL, rulerY + 18);
      }
    }
    ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(W / 2, rulerY); ctx.lineTo(W / 2, rulerY + 10); ctx.stroke();

    // === VERTICAL RULER (right side) ===
    const vRulerW = 28;
    const vRulerX = W - vRulerW;
    ctx.fillStyle = '#000000bb';
    ctx.fillRect(vRulerX, 0, vRulerW, H - rulerH);

    const rawStepV = imgH / 6;
    const stepV = niceSteps.find((s) => s >= rawStepV) ?? rawStepV;

    ctx.strokeStyle = '#888';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'right';

    for (let m = 0; m <= imgH; m += stepV) {
      const py = groundYClamped - (m / imgH) * (H * 0.6);
      if (py < 0 || py > H - rulerH) continue;
      ctx.beginPath(); ctx.moveTo(vRulerX, py); ctx.lineTo(vRulerX + 6, py); ctx.stroke();
      ctx.fillText(`${m.toFixed(m < 1 ? 2 : 1)}m`, W - 4, py + 3);
    }

    // ═══ OVERLAYS ═══

    // Distance annotations
    ctx.fillStyle = '#ffffff88';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`← ${imgW.toFixed(1)}m →`, W / 2, rulerY - 4);

    ctx.save();
    ctx.translate(vRulerX - 6, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${imgH.toFixed(1)}m ↕`, 0, 0);
    ctx.restore();

    // Safe areas (action safe 93%, title safe 90%)
    ctx.strokeStyle = '#ffffff22';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    const asMargin = W * 0.035;
    ctx.strokeRect(asMargin, asMargin * (H / W), W - asMargin * 2, H - asMargin * 2 * (H / W));
    const tsMargin = W * 0.05;
    ctx.strokeRect(tsMargin, tsMargin * (H / W), W - tsMargin * 2, H - tsMargin * 2 * (H / W));
    ctx.setLineDash([]);

    // Rule of thirds
    ctx.strokeStyle = '#ffffff11';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo((W / 3) * i, 0); ctx.lineTo((W / 3) * i, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (H / 3) * i); ctx.lineTo(W, (H / 3) * i); ctx.stroke();
    }

    // Crosshair at centre
    ctx.strokeStyle = '#ffffff33';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2 - 15, H / 2); ctx.lineTo(W / 2 + 15, H / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2, H / 2 - 15); ctx.lineTo(W / 2, H / 2 + 15); ctx.stroke();

    // Pan/Tilt indicator
    ctx.fillStyle = '#ffffff66';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Pan: ${cam.pan.toFixed(1)}°  Tilt: ${cam.tilt.toFixed(1)}°`, W - vRulerW - 8, 16);

    // Info overlay
    const lightLossStr = adapterInfo ? (adapterInfo.lightLossStops > 0 ? ` (−${adapterInfo.lightLossStops}T)` : adapterInfo.lightLossStops < 0 ? ` (+${Math.abs(adapterInfo.lightLossStops)}T)` : '') : '';
    const infoLines = [
      `${cam.label} — ${camDef.manufacturer} ${camDef.model}`,
      `Lens: ${lensDef.manufacturer} ${lensDef.model}`,
      `FL: ${cam.focalLength}mm${cam.extenderActive > 1 ? ` (×${cam.extenderActive} = ${cam.focalLength * cam.extenderActive}mm)` : ''}`,
      `FOV: ${fov.horizontalDeg.toFixed(1)}° × ${fov.verticalDeg.toFixed(1)}°`,
      `Image: ${imgW.toFixed(1)}m × ${imgH.toFixed(1)}m @ ${cam.focusDistance.toFixed(1)}m`,
      `DoF: ${dof.nearLimit < 0.01 ? '0m' : dof.nearLimit.toFixed(1) + 'm'} – ${dof.farLimit === Infinity ? '∞' : dof.farLimit.toFixed(1) + 'm'}`,
      `f/${cam.aperture} | eq.FL: ${fov.equivalentFocalLength.toFixed(0)}mm`,
    ];
    if (adapterInfo) infoLines.push(`Adapter: ${adapterInfo.name}${lightLossStr}`);

    const lineH = 16;
    const infoH = infoLines.length * lineH + 16;
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(8, 8, 290, infoH);
    ctx.textAlign = 'left';

    infoLines.forEach((line, i) => {
      ctx.fillStyle = i === 0 ? '#fff' : (line.startsWith('Adapter') ? '#f59e0b' : '#ddd');
      ctx.font = i === 0 ? 'bold 13px monospace' : '11px monospace';
      ctx.fillText(line, 16, 24 + i * lineH);
    });
  }, [cam, venue, persons, cameras]);

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
