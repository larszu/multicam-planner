import { useStore } from '../../store/useStore';
import { getCameraById, getEffectiveSensor, getAdapterInfo } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov, computeDof } from '../../utils/fov';
import { useRef, useEffect, useCallback, useState } from 'react';
import type { StageObjectType } from '../../types';
import { FiExternalLink, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface PreviewProps {
  undocked: boolean;
  onUndock: () => void;
}

export default function CameraPreview({ undocked, onUndock }: PreviewProps) {
  const { cameras, selectedCameraId, venue, persons, selectNextCamera, selectPrevCamera } = useStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cam = cameras.find((c) => c.id === selectedCameraId);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Overlay toggles
  const [showGrid, setShowGrid] = useState(true);
  const [showSafeAreas, setShowSafeAreas] = useState(true);
  const [showThirds, setShowThirds] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [showData, setShowData] = useState(true);
  const [focusPickMode, setFocusPickMode] = useState(false);
  // Cache projected person positions during draw() so the click handler can hit-test
  // without re-projecting everything itself.
  const projectedPersons = useRef<{ id: string; sx: number; sy: number; topSy: number; dist: number }[]>([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !cam) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const camDef = getCameraById(cam.cameraId, useStore.getState().customCameras);
    const lensDef = getLensById(cam.lensId, useStore.getState().customLenses);
    if (!camDef || !lensDef) return;

    const sensor = getEffectiveSensor(camDef, lensDef, cam.useSpeedbooster, cam.sensorModeIndex);

    // HiDPI: size canvas to container at device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = Math.round(cssW * 9 / 16);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.scale(dpr, dpr);

    // Logical size
    const W = cssW;
    const H = cssH;

    const fov = computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive);
    const dof = computeDof(sensor, cam.focalLength, cam.aperture, cam.focusDistance, cam.extenderActive);

    const imgW = fov.imageWidthAtDistance;
    const imgH = fov.imageHeightAtDistance;

    // ── Pan/Tilt offsets ──
    // For a level camera the horizon sits at H/2 regardless of camera height — cam.z only
    // affects where individual objects project (handled in worldToScreen below).
    // Positive tilt = looking up → horizon must move DOWN in the frame (larger y).
    const tiltOffsetPx = (Math.tan((cam.tilt * Math.PI) / 180) / Math.tan((fov.verticalDeg / 2) * Math.PI / 180)) * (H / 2);
    const groundY = H * 0.5 + tiltOffsetPx;
    const groundYClamped = Math.max(-H, Math.min(H * 2, groundY));



    // ═══ BACKGROUND ═══
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, W, H);

    // Sky — richer gradient with subtle blue
    const skyEnd = Math.max(0, groundYClamped);
    if (skyEnd > 0) {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, skyEnd);
      skyGrad.addColorStop(0, '#070b12');
      skyGrad.addColorStop(0.4, '#0c1322');
      skyGrad.addColorStop(0.8, '#131d30');
      skyGrad.addColorStop(1, '#1a2840');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, skyEnd);
    }

    // Ground — realistic with subtle noise effect
    if (groundYClamped < H) {
      const gH = H - groundYClamped;
      const gndGrad = ctx.createLinearGradient(0, groundYClamped, 0, H);
      gndGrad.addColorStop(0, '#2a3040');
      gndGrad.addColorStop(0.15, '#1e2530');
      gndGrad.addColorStop(0.5, '#151a22');
      gndGrad.addColorStop(1, '#0c0f14');
      ctx.fillStyle = gndGrad;
      ctx.fillRect(0, groundYClamped, W, gH);

      // Horizon glow
      const horizGlow = ctx.createLinearGradient(0, groundYClamped - 8, 0, groundYClamped + 20);
      horizGlow.addColorStop(0, 'rgba(100,140,200,0)');
      horizGlow.addColorStop(0.4, 'rgba(100,140,200,0.06)');
      horizGlow.addColorStop(1, 'rgba(100,140,200,0)');
      ctx.fillStyle = horizGlow;
      ctx.fillRect(0, groundYClamped - 8, W, 28);

      // Horizon line
      ctx.strokeStyle = '#3a4a60';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, groundYClamped);
      ctx.lineTo(W, groundYClamped);
      ctx.stroke();
    }

    // ── Helpers: world ↔ camera-space ↔ screen ──
    const panRad = (cam.pan * Math.PI) / 180;
    const cosP = Math.cos(panRad);
    const sinP = Math.sin(panRad);
    const fovHRad = (fov.horizontalDeg * Math.PI) / 360;
    const fovVRad = (fov.verticalDeg * Math.PI) / 360;
    const tiltRad = (cam.tilt * Math.PI) / 180;
    const tiltShift = Math.tan(tiltRad);
    const NEAR = 0.1;

    type CamPoint = { x: number; y: number; z: number };

    const worldToCamera = (wx: number, wy: number, wz: number): CamPoint => {
      const c = cam!;
      const dx = wx - c.x;
      const dy = wy - c.y;
      return {
        x: -dx * sinP + dy * cosP,
        y: wz - c.z,
        z: dx * cosP + dy * sinP,
      };
    };

    const cameraToScreen = (p: CamPoint) => {
      const screenX = W / 2 + (p.x / (p.z * Math.tan(fovHRad))) * (W / 2);
      const apparentY = p.y / p.z;
      // Positive tilt (look up) rotates the world DOWN in camera frame → subtract tiltShift
      // so that ground objects move toward the bottom of the screen as tilt increases.
      const screenY = H / 2 - ((apparentY - tiltShift) / Math.tan(fovVRad)) * (H / 2);
      return { sx: screenX, sy: screenY, dist: p.z };
    };

    /** Sutherland–Hodgman polygon clipping against the near plane (z ≥ NEAR). */
    const clipPolygonNear = (poly: CamPoint[]): CamPoint[] => {
      const out: CamPoint[] = [];
      for (let i = 0; i < poly.length; i++) {
        const cur = poly[i];
        const prev = poly[(i - 1 + poly.length) % poly.length];
        const curIn = cur.z >= NEAR;
        const prevIn = prev.z >= NEAR;
        if (curIn) {
          if (!prevIn) {
            const t = (NEAR - prev.z) / (cur.z - prev.z);
            out.push({
              x: prev.x + t * (cur.x - prev.x),
              y: prev.y + t * (cur.y - prev.y),
              z: NEAR,
            });
          }
          out.push(cur);
        } else if (prevIn) {
          const t = (NEAR - prev.z) / (cur.z - prev.z);
          out.push({
            x: prev.x + t * (cur.x - prev.x),
            y: prev.y + t * (cur.y - prev.y),
            z: NEAR,
          });
        }
      }
      return out;
    };

    const worldToScreen = (wx: number, wy: number, wz: number): { sx: number; sy: number; dist: number; behindCamera: boolean } => {
      const camP = worldToCamera(wx, wy, wz);
      if (camP.z <= NEAR) return { sx: -999, sy: -999, dist: 0, behindCamera: true };
      const s = cameraToScreen(camP);
      return { sx: s.sx, sy: s.sy, dist: s.dist, behindCamera: false };
    };
    const worldToScreenLocal = worldToScreen;

    // ── Perspective ground grid ──
    // (worldToScreen defined above)
    if (showGrid && groundYClamped < H) {
      ctx.save();
      // Depth lines (horizontal, converging)
      for (let d = 1; d <= 20; d++) {
        const dist = d * 2; // every 2m
        const screenPt = worldToScreenLocal(cam.x, cam.y + dist, 0);
        if (screenPt.behindCamera || screenPt.sy < groundYClamped - 2) continue;
        const alpha = Math.max(0.02, 0.12 - d * 0.005);
        ctx.strokeStyle = `rgba(120,160,220,${alpha})`;
        ctx.lineWidth = d % 5 === 0 ? 1.2 : 0.6;
        ctx.beginPath();
        ctx.moveTo(0, screenPt.sy);
        ctx.lineTo(W, screenPt.sy);
        ctx.stroke();
      }
      // Vertical lines (converging to vanishing point)
      const vanishX = W / 2;
      for (let i = -10; i <= 10; i++) {
        if (i === 0) continue;
        const worldX = cam.x + i * 2;
        const nearPt = worldToScreenLocal(worldX, cam.y + 2, 0);
        const farPt = worldToScreenLocal(worldX, cam.y + 40, 0);
        if (nearPt.behindCamera && farPt.behindCamera) continue;
        const alpha = Math.max(0.02, 0.08 - Math.abs(i) * 0.006);
        ctx.strokeStyle = `rgba(120,160,220,${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(nearPt.behindCamera ? vanishX : nearPt.sx, nearPt.behindCamera ? groundYClamped : nearPt.sy);
        ctx.lineTo(farPt.behindCamera ? vanishX : farPt.sx, farPt.behindCamera ? groundYClamped : farPt.sy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── Draw stages from venue ──
    // Build the polygon in camera-space, then clip against the near plane so corners
    // behind the camera become near-plane intersection points instead of being skipped
    // (which previously turned the rectangle into a degenerate triangle).
    venue.stages.forEach((stage) => {
      const camCorners = [
        worldToCamera(stage.x, stage.y, 0),
        worldToCamera(stage.x + stage.width, stage.y, 0),
        worldToCamera(stage.x + stage.width, stage.y + stage.height, 0),
        worldToCamera(stage.x, stage.y + stage.height, 0),
      ];
      const clipped = clipPolygonNear(camCorners);
      if (clipped.length < 3) return;

      const projected = clipped.map((p) => cameraToScreen(p));

      ctx.strokeStyle = '#3b82f6aa';
      ctx.fillStyle = '#3b82f622';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(projected[0].sx, projected[0].sy);
      for (let i = 1; i < projected.length; i++) {
        ctx.lineTo(projected[i].sx, projected[i].sy);
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

    projectedPersons.current = [];
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

      // Remember on-screen position for click-to-focus hit-testing
      projectedPersons.current.push({
        id: person.id,
        sx: feetSx,
        sy: feetSy,
        topSy: headSy,
        dist: feet.dist,
      });

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
    const rulerH = 22;
    const rulerY = H - rulerH;
    ctx.fillStyle = '#000000cc';
    ctx.fillRect(0, rulerY, W, rulerH);

    const niceSteps = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
    const rawStep = imgW / 8;
    const step = niceSteps.find((s) => s >= rawStep) ?? rawStep;
    const halfImgW = imgW / 2;

    ctx.strokeStyle = '#666';
    ctx.fillStyle = '#999';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 1;

    for (let m = 0; m <= halfImgW; m += step) {
      const pxR = W / 2 + (m / imgW) * W;
      const pxL = W / 2 - (m / imgW) * W;
      if (pxR <= W) {
        ctx.beginPath(); ctx.moveTo(pxR, rulerY); ctx.lineTo(pxR, rulerY + 6); ctx.stroke();
        ctx.fillText(`${m.toFixed(m < 1 ? 2 : 1)}m`, pxR, rulerY + 16);
      }
      if (m > 0 && pxL >= 0) {
        ctx.beginPath(); ctx.moveTo(pxL, rulerY); ctx.lineTo(pxL, rulerY + 6); ctx.stroke();
        ctx.fillText(`${m.toFixed(m < 1 ? 2 : 1)}m`, pxL, rulerY + 16);
      }
    }
    ctx.strokeStyle = '#ccc';
    ctx.beginPath(); ctx.moveTo(W / 2, rulerY); ctx.lineTo(W / 2, rulerY + 8); ctx.stroke();

    // Vertical ruler
    const vRulerW = 26;
    const vRulerX = W - vRulerW;
    ctx.fillStyle = '#000000cc';
    ctx.fillRect(vRulerX, 0, vRulerW, H - rulerH);

    const rawStepV = imgH / 6;
    const stepV = niceSteps.find((s) => s >= rawStepV) ?? rawStepV;
    ctx.strokeStyle = '#666';
    ctx.fillStyle = '#999';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';

    for (let m = 0; m <= imgH; m += stepV) {
      const py = groundYClamped - (m / imgH) * (H * 0.6);
      if (py < 0 || py > H - rulerH) continue;
      ctx.beginPath(); ctx.moveTo(vRulerX, py); ctx.lineTo(vRulerX + 5, py); ctx.stroke();
      ctx.fillText(`${m.toFixed(m < 1 ? 2 : 1)}m`, W - 3, py + 3);
    }

    // ═══ OVERLAY GUIDES ═══
    // Safe areas
    if (showSafeAreas) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 4]);
      const asM = W * 0.035;
      ctx.strokeRect(asM, asM * (H / W), W - asM * 2, H - asM * 2 * (H / W));
      const tsM = W * 0.05;
      ctx.strokeRect(tsM, tsM * (H / W), W - tsM * 2, H - tsM * 2 * (H / W));
      ctx.setLineDash([]);
    }

    // Rule of thirds
    if (showThirds) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo((W / 3) * i, 0); ctx.lineTo((W / 3) * i, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, (H / 3) * i); ctx.lineTo(W, (H / 3) * i); ctx.stroke();
      }
    }

    // Crosshair
    if (showCrosshair) {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W / 2 - 18, H / 2); ctx.lineTo(W / 2 + 18, H / 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W / 2, H / 2 - 18); ctx.lineTo(W / 2, H / 2 + 18); ctx.stroke();
    }

    // ═══ VIGNETTE ═══
    const vigR = Math.max(W, H) * 0.8;
    const vig = ctx.createRadialGradient(W / 2, H / 2, vigR * 0.4, W / 2, H / 2, vigR);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.7, 'rgba(0,0,0,0.05)');
    vig.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Compact Pan/Tilt badge top-right
    ctx.fillStyle = '#00000088';
    const badgeW = 110;
    ctx.fillRect(W - vRulerW - badgeW - 4, 4, badgeW, 18);
    ctx.fillStyle = '#ffffffaa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`P ${cam.pan.toFixed(1)}°  T ${cam.tilt.toFixed(1)}°`, W - vRulerW - 8, 16);

  }, [cam, venue, persons, cameras, showGrid, showSafeAreas, showThirds, showCrosshair]);

  useEffect(() => {
    draw();
    // Redraw on resize
    const ro = new ResizeObserver(() => draw());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    (window as any).__capturePreviewCanvas = () => {
      const source = canvasRef.current;
      if (!source || source.width === 0 || source.height === 0) return null;

      const copy = document.createElement('canvas');
      copy.width = source.width;
      copy.height = source.height;
      const copyCtx = copy.getContext('2d');
      if (!copyCtx) return null;
      copyCtx.drawImage(source, 0, 0);
      return copy;
    };

    return () => {
      delete (window as any).__capturePreviewCanvas;
    };
  }, []);

  // ── PTZ Mouse Controls ──
  const dragStart = useRef({ x: 0, y: 0 });
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    dragStart.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).style.cursor = focusPickMode ? 'crosshair' : 'grabbing';
  }, [focusPickMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !cam) return;
    // In focus-pick mode the press is a click target — don't pan/tilt
    if (focusPickMode) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };

    // FOV-scaled sensitivity so the scene moves 1:1 with the mouse: 1 px of cursor
    // motion rotates the camera by exactly the angle that one pixel on the canvas
    // spans. This keeps fine framing tractable at tight focal lengths and avoids
    // sluggish dragging at wide angles.
    const canvas = canvasRef.current;
    const camDef = getCameraById(cam.cameraId, useStore.getState().customCameras);
    const lensDef = getLensById(cam.lensId, useStore.getState().customLenses);
    let panSens = 0.3;
    let tiltSens = 0.2;
    if (canvas && camDef && lensDef) {
      const sensor = getEffectiveSensor(camDef, lensDef, cam.useSpeedbooster, cam.sensorModeIndex);
      const fov = computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive);
      const cssW = canvas.clientWidth || canvas.width;
      const cssH = canvas.clientHeight || canvas.height;
      if (cssW > 0) panSens = fov.horizontalDeg / cssW;
      if (cssH > 0) tiltSens = fov.verticalDeg / cssH;
    }
    const newPan = Math.max(-180, Math.min(180, cam.pan - dx * panSens));
    const newTilt = Math.max(-90, Math.min(45, cam.tilt + dy * tiltSens));
    useStore.getState().updateCamera(cam.id, { pan: newPan, tilt: newTilt });
  }, [cam, focusPickMode]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const wasDragging = isDragging.current;
    isDragging.current = false;
    (e.target as HTMLElement).style.cursor = focusPickMode ? 'crosshair' : 'grab';

    if (!wasDragging || !cam) return;
    const movedPx = Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
    if (!focusPickMode || movedPx > 4) return;

    // ── Click-to-focus: hit-test against projected persons ──
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    let best: { id: string; dist: number; pickDist: number } | null = null;
    for (const p of projectedPersons.current) {
      // Treat each person as a vertical bar of ~half its height in width
      const personPxH = Math.abs(p.topSy - p.sy);
      const halfW = Math.max(8, personPxH * 0.25);
      const top = Math.min(p.topSy, p.sy);
      const bottom = Math.max(p.topSy, p.sy);
      // Allow generous vertical slop so labels/heads are easy to grab
      const inX = cx >= p.sx - halfW && cx <= p.sx + halfW;
      const inY = cy >= top - 8 && cy <= bottom + 12;
      if (!inX || !inY) continue;
      const cxDist = Math.abs(cx - p.sx);
      if (!best || cxDist < best.pickDist) {
        best = { id: p.id, dist: p.dist, pickDist: cxDist };
      }
    }
    if (best) {
      useStore.getState().updateCamera(cam.id, { focusDistance: Math.max(0.1, best.dist) });
    }
  }, [cam, focusPickMode]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!cam) return;
    e.preventDefault();
    const ld = getLensById(cam.lensId, useStore.getState().customLenses);
    if (!ld) return;
    const range = ld.focalLengthMax - ld.focalLengthMin;
    const step = Math.max(0.1, range * 0.02);
    const newFL = Math.max(ld.focalLengthMin, Math.min(ld.focalLengthMax, cam.focalLength + (e.deltaY > 0 ? step : -step)));
    useStore.getState().updateCamera(cam.id, { focalLength: newFL });
  }, [cam]);

  if (!cam) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>Select a camera to see its preview</p>
      </div>
    );
  }

  // Computed data for readout (outside canvas)
  const camDef = getCameraById(cam.cameraId, useStore.getState().customCameras);
  const lensDef = getLensById(cam.lensId, useStore.getState().customLenses);
  const sensor = camDef && lensDef ? getEffectiveSensor(camDef, lensDef, cam.useSpeedbooster, cam.sensorModeIndex) : undefined;
  const adapterInfo = camDef && lensDef ? getAdapterInfo(camDef, lensDef, cam.useSpeedbooster) : null;
  const fov = sensor ? computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive) : null;
  const dof = sensor ? computeDof(sensor, cam.focalLength, cam.aperture, cam.focusDistance, cam.extenderActive) : null;
  const lightLoss = adapterInfo ? (adapterInfo.lightLossStops > 0 ? ` (−${adapterInfo.lightLossStops}T)` : adapterInfo.lightLossStops < 0 ? ` (+${Math.abs(adapterInfo.lightLossStops)}T)` : '') : '';

  const camIdx = cameras.findIndex((c) => c.id === cam.id);

  return (
    <div className="relative w-full h-full flex gap-2 overflow-hidden">
      {/* Left: Canvas + controls */}
      <div className="flex-1 flex flex-col gap-2 min-w-0 overflow-y-auto">
        {/* Camera switcher bar */}
        <div className="flex items-center gap-2 px-2">
          <button onClick={selectPrevCamera} className="p-1 rounded hover:bg-bc-border text-gray-400 hover:text-white" title="Previous camera"><FiChevronLeft size={16} /></button>
          <span className="text-white font-bold text-sm flex-1 text-center">{cam.label}</span>
          <button onClick={selectNextCamera} className="p-1 rounded hover:bg-bc-border text-gray-400 hover:text-white" title="Next camera"><FiChevronRight size={16} /></button>
          <span className="text-gray-500 text-[10px]">{camIdx + 1}/{cameras.length}</span>
        </div>

        {/* Canvas container */}
        <div ref={wrapRef} className="relative w-full">
          <canvas
            ref={canvasRef}
            className="w-full rounded-lg"
            style={{ cursor: focusPickMode ? 'crosshair' : 'grab', display: 'block' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
        </div>

        {/* Overlay toggle bar */}
        <div className="flex items-center gap-2 px-2 flex-wrap">
          {([
            ['Grid', showGrid, setShowGrid],
            ['Safe Areas', showSafeAreas, setShowSafeAreas],
            ['Thirds', showThirds, setShowThirds],
            ['Crosshair', showCrosshair, setShowCrosshair],
            ['Data', showData, setShowData],
          ] as [string, boolean, (v: boolean) => void][]).map(([label, on, set]) => (
            <button
              key={label}
              onClick={() => set(!on)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${on ? 'border-bc-accent text-bc-accent bg-bc-accent/10' : 'border-bc-border text-gray-500 hover:text-gray-300'}`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setFocusPickMode((v) => !v)}
            title={focusPickMode ? 'Click anywhere to leave focus-pick mode' : 'Pick a person in the preview to set focus distance'}
            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${focusPickMode ? 'border-bc-yellow text-bc-yellow bg-bc-yellow/10' : 'border-bc-border text-gray-500 hover:text-gray-300'}`}
          >
            ◎ Focus pick {focusPickMode ? '· ON' : ''}
          </button>
          {!undocked && (
            <button
              onClick={onUndock}
              className="px-2 py-0.5 rounded text-[10px] font-medium border border-bc-border text-gray-500 hover:text-gray-300 hover:border-gray-400 flex items-center gap-1"
              title="Undock preview into floating window"
            >
              <FiExternalLink size={10} /> Float
            </button>
          )}
          <span className="text-[10px] text-gray-600 ml-auto">
            {focusPickMode ? 'Click a person to set focus distance' : 'Drag: Pan/Tilt · Scroll: Zoom'}
          </span>
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 px-2">
          <span className="text-xs text-gray-400 w-16 font-mono">{cam.focalLength.toFixed(0)}mm</span>
          <input
            type="range"
            min={lensDef?.focalLengthMin ?? 4}
            max={lensDef?.focalLengthMax ?? 300}
            step={0.1}
            value={cam.focalLength}
            onChange={(e) => useStore.getState().updateCamera(cam.id, { focalLength: parseFloat(e.target.value) })}
            className="flex-1 accent-bc-accent"
          />
          <span className="text-xs text-gray-400 w-16 text-right font-mono">{lensDef?.focalLengthMax ?? '?'}mm</span>
        </div>
      </div>

      {/* Right: Data readout panel */}
      {camDef && lensDef && fov && dof && showData && (
        <div className="w-56 shrink-0 overflow-y-auto space-y-1.5 pr-1">
          {/* Camera + Lens header */}
          <div className="bg-bc-dark rounded-lg border border-bc-border p-2">
            <span className="text-white font-semibold text-xs">{cam.label}</span>
            <div className="text-gray-500 text-[10px]">{camDef.sensor.name} · {camDef.mount}</div>
            <div className="text-gray-400 text-[10px] mt-0.5">{camDef.manufacturer} {camDef.model}</div>
            <div className="text-gray-400 text-[10px]">{lensDef.manufacturer} {lensDef.model}</div>
            {adapterInfo && (
              <div className="text-yellow-400 text-[10px] mt-0.5">⚡ {adapterInfo.name}{lightLoss}</div>
            )}
          </div>

          {/* Notes — only when filled */}
          {cam.notes && cam.notes.trim() && (
            <div className="bg-bc-dark rounded-lg border border-bc-border p-2">
              <div className="text-[10px] text-gray-500 leading-tight mb-0.5">Notes</div>
              <div className="text-[11px] text-gray-200 whitespace-pre-wrap leading-snug">{cam.notes}</div>
            </div>
          )}

          {/* Data cells */}
          <DataCell label="Focal Length" value={`${cam.focalLength.toFixed(1)}mm`} sub={cam.extenderActive > 1 ? `eff. ${(cam.focalLength * cam.extenderActive).toFixed(0)}mm` : `eq. ${fov.equivalentFocalLength.toFixed(0)}mm`} />
          <DataCell label="Aperture" value={`f/${cam.aperture.toFixed(1)}`} sub={adapterInfo && adapterInfo.lightLossStops !== 0 ? `eff. T${(cam.aperture * Math.pow(2, adapterInfo.lightLossStops / 2)).toFixed(1)}` : undefined} />
          <DataCell label="Distance" value={`${cam.focusDistance.toFixed(1)}m`} />
          <DataCell label="FOV H" value={`${fov.horizontalDeg.toFixed(1)}°`} />
          <DataCell label="FOV V" value={`${fov.verticalDeg.toFixed(1)}°`} />
          <DataCell label="Image Width" value={`${fov.imageWidthAtDistance.toFixed(1)}m`} sub={`@ ${cam.focusDistance.toFixed(0)}m`} />
          <DataCell label="Image Height" value={`${fov.imageHeightAtDistance.toFixed(1)}m`} sub={`@ ${cam.focusDistance.toFixed(0)}m`} />
          <DataCell label="DoF Near" value={dof.nearLimit < 0.01 ? '0m' : `${dof.nearLimit.toFixed(2)}m`} />
          <DataCell label="DoF Far" value={dof.farLimit === Infinity ? '∞' : `${dof.farLimit.toFixed(2)}m`} />
          <DataCell label="DoF Total" value={dof.totalDof === Infinity ? '∞' : `${dof.totalDof.toFixed(2)}m`} />
        </div>
      )}
    </div>
  );
}

function DataCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-bc-dark rounded border border-bc-border px-2 py-1.5">
      <div className="text-[10px] text-gray-500 leading-tight">{label}</div>
      <div className="text-white text-sm font-mono font-semibold leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-gray-500 leading-tight">{sub}</div>}
    </div>
  );
}
