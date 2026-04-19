import { useStore } from '../../store/useStore';
import { getCameraById, getEffectiveSensor, getAdapterInfo } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov, computeDof, personHeightInFrame } from '../../utils/fov';
import { useRef, useEffect, useCallback, useState } from 'react';
import type { StageObjectType } from '../../types';

export default function CameraPreview() {
  const { cameras, selectedCameraId, venue, persons } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cam = cameras.find((c) => c.id === selectedCameraId);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

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

    const worldToScreen = (wx: number, wy: number, wz: number): { sx: number; sy: number; dist: number; behindCamera: boolean } => {
      // Translate relative to camera (cam is guaranteed non-null here by the guard at top of draw())
      const c = cam!;
      const dx = wx - c.x;
      const dy = wy - c.y;

      // Rotate by -pan to get camera-local coords (forward = +Z_cam)
      const localZ = dx * cosP + dy * sinP;   // forward (into scene)
      const localX = -dx * sinP + dy * cosP;  // right

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

    // ── Draw persons / stage objects ──
    // Use a clip region so partially off-screen objects are cropped, not hidden
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();

    // Clamp a screen coordinate to a safe finite range for drawing
    const SAFE = 1e4;
    const clampScreen = (v: number, fallbackSign: number): number => {
      if (!isFinite(v)) return fallbackSign * SAFE;
      return Math.max(-SAFE, Math.min(SAFE, v));
    }

    const drawPerson = (cx: number, feetY: number, headY: number, dist: number, objectType?: StageObjectType, label?: string) => {
      const pxH = Math.abs(headY - feetY);
      if (pxH < 1) return;
      const type = objectType ?? 'person';

      if (type === 'drums') {
        // Drum kit: wider, shorter, with cymbals
        const kitW = pxH * 0.8;
        const kitH = pxH * 0.6;
        const kitY = feetY - kitH;
        // Base drum
        ctx.fillStyle = '#ef444466';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(cx, feetY - kitH * 0.3, kitW * 0.3, kitH * 0.3, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        // Snare
        ctx.fillStyle = '#fbbf2444';
        ctx.strokeStyle = '#fbbf24';
        ctx.beginPath();
        ctx.ellipse(cx - kitW * 0.25, kitY + kitH * 0.5, kitW * 0.15, kitH * 0.12, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        // Hi-hat
        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + kitW * 0.35, feetY); ctx.lineTo(cx + kitW * 0.35, kitY);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx + kitW * 0.35, kitY + kitH * 0.1, kitW * 0.12, kitH * 0.04, 0, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24'; ctx.stroke();
      } else if (type === 'keys') {
        // Keyboard on stand
        const kbW = pxH * 0.8;
        const kbH = pxH * 0.12;
        const kbY = headY + pxH * 0.35;
        // Stand
        ctx.strokeStyle = '#6b728099';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx - kbW * 0.3, kbY + kbH); ctx.lineTo(cx - kbW * 0.3, feetY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + kbW * 0.3, kbY + kbH); ctx.lineTo(cx + kbW * 0.3, feetY); ctx.stroke();
        // Keyboard body
        ctx.fillStyle = '#8b5cf644';
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (pxH > 10) ctx.roundRect(cx - kbW / 2, kbY, kbW, kbH, 2);
        else ctx.rect(cx - kbW / 2, kbY, kbW, kbH);
        ctx.fill(); ctx.stroke();
        // White keys
        if (pxH > 20) {
          ctx.strokeStyle = '#c4b5fd44';
          ctx.lineWidth = 0.5;
          const nKeys = Math.min(24, Math.floor(kbW / 4));
          for (let i = 0; i < nKeys; i++) {
            const kx = cx - kbW / 2 + (i / nKeys) * kbW;
            ctx.beginPath(); ctx.moveTo(kx, kbY); ctx.lineTo(kx, kbY + kbH); ctx.stroke();
          }
        }
      } else if (type === 'mic-stand') {
        // Mic stand: thin pole with mic head
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = Math.max(1, pxH * 0.02);
        ctx.beginPath(); ctx.moveTo(cx, feetY); ctx.lineTo(cx, headY + pxH * 0.1); ctx.stroke();
        // Base
        ctx.beginPath();
        ctx.ellipse(cx, feetY, pxH * 0.08, pxH * 0.03, 0, 0, Math.PI * 2);
        ctx.strokeStyle = '#9ca3af'; ctx.stroke();
        // Mic head
        ctx.fillStyle = '#4b556366';
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, headY + pxH * 0.05, pxH * 0.04, pxH * 0.06, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      } else {
        // Person (or person-guitar) - realistic silhouette
        const pxW = pxH * 0.28;
        const headR = pxH * 0.09;
        const neckY = headY + headR * 2.2;
        const shoulderY = neckY + pxH * 0.03;
        const shoulderW = pxW * 0.55;
        const waistY = feetY - pxH * 0.42;
        const hipW = pxW * 0.4;

        const bodyColor = type === 'person-guitar' ? '#f97316' : '#22c55e';
        const bodyFill = type === 'person-guitar' ? '#f9731644' : '#22c55e44';
        const skinColor = '#d4a574';

        // Head (skin-colored circle)
        ctx.fillStyle = skinColor + '88';
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, headY + headR, headR, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Hair
        ctx.fillStyle = '#44403c88';
        ctx.beginPath();
        ctx.arc(cx, headY + headR * 0.8, headR * 0.95, Math.PI, Math.PI * 2);
        ctx.fill();

        // Neck
        ctx.fillStyle = skinColor + '66';
        ctx.fillRect(cx - headR * 0.3, neckY - pxH * 0.01, headR * 0.6, pxH * 0.04);

        // Torso
        ctx.fillStyle = bodyFill;
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - shoulderW, shoulderY);
        ctx.lineTo(cx + shoulderW, shoulderY);
        ctx.lineTo(cx + hipW, waistY);
        ctx.lineTo(cx - hipW, waistY);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Arms
        ctx.strokeStyle = bodyColor + 'aa';
        ctx.lineWidth = Math.max(1, pxH * 0.025);
        // Left arm
        ctx.beginPath();
        ctx.moveTo(cx - shoulderW, shoulderY);
        ctx.quadraticCurveTo(cx - shoulderW - pxW * 0.15, shoulderY + pxH * 0.15, cx - shoulderW + pxW * 0.05, waistY + pxH * 0.05);
        ctx.stroke();
        // Right arm
        ctx.beginPath();
        ctx.moveTo(cx + shoulderW, shoulderY);
        if (type === 'person-guitar') {
          ctx.quadraticCurveTo(cx + shoulderW + pxW * 0.1, shoulderY + pxH * 0.1, cx + pxW * 0.2, waistY - pxH * 0.05);
        } else {
          ctx.quadraticCurveTo(cx + shoulderW + pxW * 0.15, shoulderY + pxH * 0.15, cx + shoulderW - pxW * 0.05, waistY + pxH * 0.05);
        }
        ctx.stroke();

        // Legs
        ctx.strokeStyle = bodyColor + '88';
        ctx.lineWidth = Math.max(1, pxH * 0.03);
        ctx.beginPath(); ctx.moveTo(cx - hipW * 0.5, waistY); ctx.lineTo(cx - hipW * 0.3, feetY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + hipW * 0.5, waistY); ctx.lineTo(cx + hipW * 0.3, feetY); ctx.stroke();

        // Guitar body (for guitarist)
        if (type === 'person-guitar') {
          const gx = cx + pxW * 0.15;
          const gy = waistY - pxH * 0.08;
          const gw = pxH * 0.12;
          ctx.fillStyle = '#92400e66';
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(gx, gy, gw, gw * 0.7, 0.2, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
          // Neck of guitar
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = Math.max(1, pxH * 0.015);
          ctx.beginPath();
          ctx.moveTo(gx - gw * 0.3, gy - gw * 0.5);
          ctx.lineTo(cx + shoulderW * 0.3, shoulderY + pxH * 0.03);
          ctx.stroke();
        }
      }

      // Label
      if (label && feetY > 0 && feetY < H - 5 && cx > -50 && cx < W + 50 && dist > 0) {
        const fontSize = Math.max(7, Math.min(11, 120 / dist));
        const labelColor = type === 'drums' ? '#ef4444' : type === 'keys' ? '#8b5cf6' : type === 'person-guitar' ? '#f97316' : type === 'mic-stand' ? '#9ca3af' : '#22c55e';
        ctx.fillStyle = labelColor;
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, feetY + fontSize + 2);
      }
    }

    persons.forEach((person) => {
      const feet = worldToScreen(person.x, person.y, 0);
      const head = worldToScreen(person.x, person.y, person.height);
      if (feet.behindCamera) return;

      // Clamp projected positions to finite safe range
      const feetSx = clampScreen(feet.sx, 1);
      const feetSy = clampScreen(feet.sy, 1);
      const headSy = clampScreen(head.sy, -1);

      const pxH = Math.abs(headSy - feetSy);
      if (pxH < 1) return;

      // Skip if entirely off-screen
      const objW = pxH * 0.5;
      if (feetSx + objW < 0) return;
      if (feetSx - objW > W) return;
      if (feetSy < 0 && headSy < 0) return;
      if (feetSy > H && headSy > H) return;

      drawPerson(feetSx, feetSy, headSy, feet.dist, person.objectType, `${person.label} (${person.height.toFixed(1)}m)`);
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

  // ── PTZ Mouse Controls ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).style.cursor = 'grabbing';
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !cam) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };

    // Pan: horizontal drag, scale by sensitivity
    const panSens = 0.3;
    const tiltSens = 0.2;
    const newPan = Math.max(-180, Math.min(180, cam.pan - dx * panSens));
    const newTilt = Math.max(-90, Math.min(45, cam.tilt + dy * tiltSens));
    useStore.getState().updateCamera(cam.id, { pan: newPan, tilt: newTilt });
  }, [cam]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).style.cursor = 'grab';
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!cam) return;
    e.preventDefault();
    const lensDef = getLensById(cam.lensId) ?? useStore.getState().customLenses.find((l: any) => l.id === cam.lensId);
    if (!lensDef) return;
    const range = lensDef.focalLengthMax - lensDef.focalLengthMin;
    const step = Math.max(0.1, range * 0.02);
    const newFL = Math.max(lensDef.focalLengthMin, Math.min(lensDef.focalLengthMax, cam.focalLength + (e.deltaY > 0 ? step : -step)));
    useStore.getState().updateCamera(cam.id, { focalLength: newFL });
  }, [cam]);

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
        style={{ aspectRatio: '16/9', cursor: 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      {/* PTZ hint */}
      <div className="flex items-center gap-4 mt-1 px-2">
        <span className="text-[10px] text-gray-500">Drag: Pan/Tilt | Scroll: Zoom</span>
      </div>
      {/* Zoom slider */}
      <div className="flex items-center gap-3 mt-1 px-2">
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
