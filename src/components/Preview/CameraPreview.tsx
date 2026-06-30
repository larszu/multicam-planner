import { useStore } from '../../store/useStore';
import { getCameraById, getEffectiveSensor, getAdapterInfo } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov, computeDof } from '../../utils/fov';
import { effectiveCameraPos } from '../../utils/camera';
import { getExportRegistry } from '../../store/exportRegistry';
import { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
import type { StageObjectType } from '../../types';
import { FiChevronLeft, FiChevronRight, FiUnlock, FiLock, FiPlus, FiX } from 'react-icons/fi';
import { loadJSON, saveJSON } from '../../utils/storage';

// Preview optical presets (issue #47) — snapshots of focal length / aperture /
// focus distance the operator can recall. Persisted globally in localStorage.
interface PreviewPreset { id: string; name: string; focalLength: number; aperture: number; focusDistance: number; }
const PREVIEW_PRESETS_KEY = 'multicam-preview-presets';

interface PreviewProps {
  undocked: boolean;
  onUndock: () => void;
}

export default function CameraPreview({ undocked, onUndock }: PreviewProps) {
  const { cameras, selectedCameraId, venue, persons, walls, selectNextCamera, selectPrevCamera } = useStore();
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
  // Manual-zoom mode (issue #47): widen the focal-length slider past the lens's
  // real range to preview hypothetical focal lengths. Both ends are editable.
  const [manualZoom, setManualZoom] = useState(false);
  const [manualMin, setManualMin] = useState(1);
  const [manualMax, setManualMax] = useState(500);
  // Optical presets (issue #47), persisted globally.
  const [presets, setPresets] = useState<PreviewPreset[]>(() => loadJSON<PreviewPreset[]>(PREVIEW_PRESETS_KEY, []));
  const persistPresets = useCallback((next: PreviewPreset[]) => { setPresets(next); saveJSON(PREVIEW_PRESETS_KEY, next); }, []);
  // Decoded wall pattern images, keyed by data URL (issue #45). A tick forces a
  // repaint once an image finishes loading asynchronously.
  const wallImageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imageTick, setImageTick] = useState(0);
  const getWallImage = useCallback((dataUrl: string): HTMLImageElement | null => {
    const cache = wallImageCache.current;
    const existing = cache.get(dataUrl);
    if (existing) return existing.complete && existing.naturalWidth > 0 ? existing : null;
    const img = new Image();
    img.onload = () => setImageTick((t) => t + 1);
    img.src = dataUrl;
    cache.set(dataUrl, img);
    return null;
  }, []);
  // Cache projected person positions during draw() so the click handler can hit-test
  // without re-projecting everything itself.
  const projectedPersons = useRef<{ id: string; sx: number; sy: number; topSy: number; dist: number }[]>([]);

  // ── Locked-person focus tracker ──
  // When cam.lockedPersonId is set, the focus distance follows that target as
  // the camera or the subject moves. Pan/tilt are NOT changed here — the
  // operator still aims manually. Useful for live events where the subject
  // walks around but the operator already has them framed.
  useEffect(() => {
    if (!cam?.lockedPersonId) return;
    const target = persons.find((p) => p.id === cam.lockedPersonId);
    if (!target) return;
    const pos = effectiveCameraPos(cam);
    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const dz = target.height * 0.5 - cam.z; // aim at the subject's centre, not the feet
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (Math.abs(dist - cam.focusDistance) > 0.05) {
      useStore.getState().updateCamera(cam.id, { focusDistance: Math.max(0.1, dist) });
    }
  }, [cam?.lockedPersonId, cam?.x, cam?.y, cam?.z, cam?.focusDistance, cam?.id, cam?.trackOffset, cam?.pan, persons, cam]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !cam) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const camDef = getCameraById(cam.cameraId, useStore.getState().customCameras);
    const lensDef = getLensById(cam.lensId, useStore.getState().customLenses);
    if (!camDef || !lensDef) return;

    const sensor = getEffectiveSensor(camDef, lensDef, cam.useSpeedbooster, cam.sensorModeIndex, cam.activeMount);

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

    const camPos = effectiveCameraPos(cam!);
    const worldToCamera = (wx: number, wy: number, wz: number): CamPoint => {
      const c = cam!;
      const dx = wx - camPos.x;
      const dy = wy - camPos.y;
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
        const screenPt = worldToScreenLocal(camPos.x, camPos.y + dist, 0);
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
        const worldX = camPos.x + i * 2;
        const nearPt = worldToScreenLocal(worldX, camPos.y + 2, 0);
        const farPt = worldToScreenLocal(worldX, camPos.y + 40, 0);
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

    // ── Draw walls from venue (issue #46) ──
    // Each wall is a vertical quad standing on the floor: bottom edge from
    // (x1,y1) to (x2,y2) at z=0, top edge at z=height. Built in camera space and
    // near-plane clipped like the stages so corners behind the camera don't
    // collapse the quad. Drawn back-to-front (farthest first) so nearer walls
    // overpaint farther ones.
    const wallsByDist = walls
      .map((wall) => {
        const midX = (wall.x1 + wall.x2) / 2;
        const midY = (wall.y1 + wall.y2) / 2;
        return { wall, dist: worldToScreen(midX, midY, 0).dist };
      })
      .sort((a, b) => b.dist - a.dist);

    wallsByDist.forEach(({ wall, dist }) => {
      const camCorners = [
        worldToCamera(wall.x1, wall.y1, 0),
        worldToCamera(wall.x2, wall.y2, 0),
        worldToCamera(wall.x2, wall.y2, wall.height),
        worldToCamera(wall.x1, wall.y1, wall.height),
      ];
      const clipped = clipPolygonNear(camCorners);
      if (clipped.length < 3) return;
      const projected = clipped.map((p) => cameraToScreen(p));

      const baseColor = wall.color ?? '#6b7280';
      const pattern = wall.pattern ?? 'solid';

      // Depth-of-field blur for the wall, so a textured wall makes the focus
      // falloff visible (issue #45). Same falloff model as persons.
      const outOfFocus = Math.abs(dist - cam.focusDistance);
      const wallBlur = Math.min(14, (outOfFocus * (cam.focalLength / 50)) / Math.max(1, cam.aperture) * 0.6);

      ctx.save();
      if (wallBlur > 0.5) ctx.filter = `blur(${wallBlur.toFixed(1)}px)`;

      // Clip to the wall quad so the pattern only paints on the wall surface.
      ctx.beginPath();
      ctx.moveTo(projected[0].sx, projected[0].sy);
      for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i].sx, projected[i].sy);
      ctx.closePath();
      ctx.save();
      ctx.clip();

      // Base fill.
      ctx.fillStyle = baseColor + 'cc';
      ctx.fill();

      // Bounding box of the projected polygon (pattern is painted in screen space
      // — not perspective-warped, but it gives the high-frequency detail needed to
      // judge sharpness/blur).
      const xs = projected.map((p) => p.sx);
      const ys = projected.map((p) => p.sy);
      const bx0 = Math.max(-50, Math.min(...xs));
      const bx1 = Math.min(W + 50, Math.max(...xs));
      const by0 = Math.max(-50, Math.min(...ys));
      const by1 = Math.min(H + 50, Math.max(...ys));

      if (pattern === 'grid') {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        const step = 16;
        ctx.beginPath();
        for (let x = bx0; x <= bx1; x += step) { ctx.moveTo(x, by0); ctx.lineTo(x, by1); }
        for (let y = by0; y <= by1; y += step) { ctx.moveTo(bx0, y); ctx.lineTo(bx1, y); }
        ctx.stroke();
      } else if (pattern === 'flowers') {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        const step = 26;
        for (let y = by0; y <= by1; y += step) {
          for (let x = bx0; x <= bx1; x += step) {
            // simple 5-petal flower motif
            for (let k = 0; k < 5; k++) {
              const a = (k / 5) * Math.PI * 2;
              ctx.beginPath();
              ctx.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 2.6, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = 'rgba(250,204,21,0.85)';
            ctx.beginPath();
            ctx.arc(x, y, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
          }
        }
      } else if (pattern === 'image' && wall.patternImage) {
        const img = getWallImage(wall.patternImage);
        if (img) {
          const tile = ctx.createPattern(img, 'repeat');
          if (tile) { ctx.fillStyle = tile; ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0); }
        }
      }
      ctx.restore(); // remove clip

      // Outline (still blurred if out of focus).
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(projected[0].sx, projected[0].sy);
      for (let i = 1; i < projected.length; i++) ctx.lineTo(projected[i].sx, projected[i].sy);
      ctx.closePath();
      ctx.stroke();
      ctx.restore(); // remove blur filter
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

    const drawPerson = (cx: number, feetY: number, headY: number, dist: number, objectType?: StageObjectType, label?: string, customColor?: string) => {
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
      } else if (type === 'chair') {
        const c = customColor ?? '#a16207';
        const seatW = pxH * 0.6;
        const seatY = feetY - pxH * 0.55;
        const backH = pxH * 0.65;
        // Legs
        ctx.strokeStyle = '#57534e'; ctx.lineWidth = Math.max(1, pxH * 0.04);
        ctx.beginPath(); ctx.moveTo(cx - seatW / 2, seatY); ctx.lineTo(cx - seatW / 2, feetY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + seatW / 2, seatY); ctx.lineTo(cx + seatW / 2, feetY); ctx.stroke();
        // Seat
        ctx.fillStyle = c + 'aa'; ctx.strokeStyle = c; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.rect(cx - seatW / 2, seatY, seatW, pxH * 0.08); ctx.fill(); ctx.stroke();
        // Backrest
        ctx.beginPath(); ctx.rect(cx - seatW * 0.45, seatY - backH, seatW * 0.9, backH); ctx.fill(); ctx.stroke();
      } else if (type === 'table') {
        const c = customColor ?? '#a16207';
        const topW = pxH * 1.4;
        const topY = feetY - pxH * 0.75;
        ctx.strokeStyle = '#57534e'; ctx.lineWidth = Math.max(1, pxH * 0.05);
        ctx.beginPath(); ctx.moveTo(cx - topW / 2 + pxH * 0.06, topY + pxH * 0.04); ctx.lineTo(cx - topW / 2 + pxH * 0.06, feetY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + topW / 2 - pxH * 0.06, topY + pxH * 0.04); ctx.lineTo(cx + topW / 2 - pxH * 0.06, feetY); ctx.stroke();
        ctx.fillStyle = c + 'cc'; ctx.strokeStyle = c; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.rect(cx - topW / 2, topY, topW, pxH * 0.08); ctx.fill(); ctx.stroke();
      } else if (type === 'lectern') {
        const c = customColor ?? '#7c3aed';
        const w = pxH * 0.55;
        ctx.fillStyle = c + 'bb'; ctx.strokeStyle = c; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.rect(cx - w / 2, feetY - pxH * 0.85, w, pxH * 0.85); ctx.fill(); ctx.stroke();
        // Slanted top
        ctx.fillStyle = '#1f2937cc'; ctx.strokeStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.6, feetY - pxH * 0.95);
        ctx.lineTo(cx + w * 0.6, feetY - pxH * 0.8);
        ctx.lineTo(cx + w * 0.6, feetY - pxH * 0.72);
        ctx.lineTo(cx - w * 0.6, feetY - pxH * 0.87);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      } else if (type === 'sitting-person') {
        const c = customColor ?? '#38bdf8';
        const pxW = pxH * 0.3;
        const headR = pxH * 0.11;
        // Stool hint
        ctx.strokeStyle = '#57534e'; ctx.lineWidth = Math.max(1, pxH * 0.03);
        ctx.beginPath(); ctx.moveTo(cx - pxW * 0.6, feetY - pxH * 0.05); ctx.lineTo(cx - pxW * 0.6, feetY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + pxW * 0.6, feetY - pxH * 0.05); ctx.lineTo(cx + pxW * 0.6, feetY); ctx.stroke();
        // Torso (short)
        ctx.fillStyle = c + '55'; ctx.strokeStyle = c; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - pxW * 0.55, feetY - pxH * 0.5);
        ctx.lineTo(cx + pxW * 0.55, feetY - pxH * 0.5);
        ctx.lineTo(cx + pxW * 0.4, feetY - pxH * 0.05);
        ctx.lineTo(cx - pxW * 0.4, feetY - pxH * 0.05);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Head
        ctx.fillStyle = '#d4a57488'; ctx.strokeStyle = c;
        ctx.beginPath(); ctx.arc(cx, headY + headR + pxH * 0.05, headR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Thighs horizontal
        ctx.strokeStyle = c + '88'; ctx.lineWidth = Math.max(1, pxH * 0.04);
        ctx.beginPath(); ctx.moveTo(cx - pxW * 0.3, feetY - pxH * 0.1); ctx.lineTo(cx + pxW * 0.8, feetY - pxH * 0.1); ctx.stroke();
      } else if (type === 'schneetiger') {
        const c = customColor ?? '#e0f2fe';
        const bodyW = pxH * 1.3;
        const bodyH = pxH * 0.5;
        const bodyY = feetY - bodyH * 1.3;
        // Legs
        ctx.strokeStyle = c; ctx.lineWidth = Math.max(1.5, pxH * 0.06);
        ctx.beginPath(); ctx.moveTo(cx - bodyW * 0.35, bodyY + bodyH); ctx.lineTo(cx - bodyW * 0.35, feetY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + bodyW * 0.35, bodyY + bodyH); ctx.lineTo(cx + bodyW * 0.35, feetY); ctx.stroke();
        // Body
        ctx.fillStyle = c + 'cc'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (pxH > 10) ctx.roundRect(cx - bodyW / 2, bodyY, bodyW, bodyH, bodyH * 0.4);
        else ctx.rect(cx - bodyW / 2, bodyY, bodyW, bodyH);
        ctx.fill(); ctx.stroke();
        // Stripes
        ctx.strokeStyle = '#1f2937aa'; ctx.lineWidth = Math.max(1, pxH * 0.02);
        for (let i = 1; i < 5; i++) {
          const sx = cx - bodyW / 2 + (bodyW * i) / 5;
          ctx.beginPath(); ctx.moveTo(sx, bodyY + bodyH * 0.1); ctx.lineTo(sx + pxH * 0.04, bodyY + bodyH * 0.9); ctx.stroke();
        }
        // Head
        ctx.fillStyle = c + 'dd'; ctx.strokeStyle = '#334155';
        const hr = pxH * 0.18;
        ctx.beginPath(); ctx.arc(cx + bodyW * 0.45, bodyY + bodyH * 0.3, hr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // Ears
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.moveTo(cx + bodyW * 0.45 - hr * 0.5, bodyY + bodyH * 0.3 - hr); ctx.lineTo(cx + bodyW * 0.45 - hr * 0.2, bodyY + bodyH * 0.3 - hr * 1.5); ctx.lineTo(cx + bodyW * 0.45, bodyY + bodyH * 0.3 - hr); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + bodyW * 0.45 + hr * 0.5, bodyY + bodyH * 0.3 - hr); ctx.lineTo(cx + bodyW * 0.45 + hr * 0.2, bodyY + bodyH * 0.3 - hr * 1.5); ctx.lineTo(cx + bodyW * 0.45, bodyY + bodyH * 0.3 - hr); ctx.closePath(); ctx.fill();
        // Tail
        ctx.strokeStyle = c; ctx.lineWidth = Math.max(1.5, pxH * 0.05);
        ctx.beginPath(); ctx.moveTo(cx - bodyW * 0.5, bodyY + bodyH * 0.3); ctx.quadraticCurveTo(cx - bodyW * 0.85, bodyY, cx - bodyW * 0.75, bodyY - bodyH * 0.4); ctx.stroke();
      } else {
        // Person (or person-guitar) - realistic silhouette
        const pxW = pxH * 0.28;
        const headR = pxH * 0.09;
        const neckY = headY + headR * 2.2;
        const shoulderY = neckY + pxH * 0.03;
        const shoulderW = pxW * 0.55;
        const waistY = feetY - pxH * 0.42;
        const hipW = pxW * 0.4;

        const bodyColor = customColor ?? (type === 'person-guitar' ? '#f97316' : '#22c55e');
        const bodyFill = bodyColor + '44';
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
        const labelColor = customColor ?? (
          type === 'drums' ? '#ef4444' :
          type === 'keys' ? '#8b5cf6' :
          type === 'person-guitar' ? '#f97316' :
          type === 'mic-stand' ? '#9ca3af' :
          type === 'chair' ? '#a16207' :
          type === 'table' ? '#a16207' :
          type === 'lectern' ? '#7c3aed' :
          type === 'sitting-person' ? '#38bdf8' :
          type === 'schneetiger' ? '#e0f2fe' :
          '#22c55e'
        );
        ctx.fillStyle = labelColor;
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, feetY + fontSize + 2);
      }
    }

    projectedPersons.current = [];
    let inFramePersons = 0;
    let totalInFront = 0;
    let nearestCrosshair: { id: string; label: string; dist: number; sx: number; sy: number } | null = null;
    persons.forEach((person) => {
      // Project via worldToCamera + cameraToScreen directly so a person who is
      // physically in front of the camera but within the projection NEAR plane
      // (i.e. very close — < 10 cm) still gets drawn. worldToScreen treats
      // anything inside NEAR as "behindCamera" which would otherwise make the
      // person vanish when zooming in tight, even though they should just
      // become huge.
      const feetCam = worldToCamera(person.x, person.y, 0);
      // Genuinely behind the camera — no chance of being visible
      if (feetCam.z <= 0.001) return;
      totalInFront++;
      const headCam = worldToCamera(person.x, person.y, person.height);
      const feetProj = cameraToScreen(feetCam);
      const headProj = cameraToScreen(headCam);

      // Clamp projected positions to finite safe range so huge close-up values
      // don't blow up the canvas drawing.
      const feetSx = clampScreen(feetProj.sx, 1);
      const feetSy = clampScreen(feetProj.sy, 1);
      const headSy = clampScreen(headProj.sy, -1);

      const pxH = Math.abs(headSy - feetSy);
      if (pxH < 1) return;

      // Skip if entirely off-screen
      const objW = pxH * 0.5;
      if (feetSx + objW < 0) return;
      if (feetSx - objW > W) return;
      if (feetSy < 0 && headSy < 0) return;
      if (feetSy > H && headSy > H) return;

      inFramePersons++;

      // Remember on-screen position for click-to-focus hit-testing
      projectedPersons.current.push({
        id: person.id,
        sx: feetSx,
        sy: feetSy,
        topSy: headSy,
        dist: feetProj.dist,
      });

      // Track person nearest the screen centre (crosshair) for distance overlay
      const torsoSy = (feetSy + headSy) / 2;
      const centreDist = Math.hypot(feetSx - W / 2, torsoSy - H / 2);
      if (centreDist < Math.min(W, H) * 0.18) {
        if (!nearestCrosshair || centreDist < Math.hypot(nearestCrosshair.sx - W / 2, nearestCrosshair.sy - H / 2)) {
          nearestCrosshair = { id: person.id, label: person.label, dist: feetProj.dist, sx: feetSx, sy: torsoSy };
        }
      }

      // ── Depth of Field blur ──
      // Smooth falloff scaled by focal length / aperture, so a fast tele blurs
      // backgrounds aggressively while a wide-stopped-down lens stays sharp.
      // Locked subject (focus-pinned in the operator's frame) always renders
      // sharp regardless of distance.
      let blurPx = 0;
      if (cam.lockedPersonId !== person.id) {
        const outOfFocus = Math.abs(feetProj.dist - cam.focusDistance);
        blurPx = Math.min(12, outOfFocus * (cam.focalLength / 50) / Math.max(1, cam.aperture) * 0.6);
      }
      if (blurPx > 0.5) ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
      drawPerson(feetSx, feetSy, headSy, feetProj.dist, person.objectType, `${person.label} (${person.height.toFixed(1)}m)`, person.color);
      if (blurPx > 0.5) ctx.filter = 'none';
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

      // Distance readout under the crosshair: focus distance + nearest in-frame
      // subject. Helps the operator verify pull-focus while panning.
      const lines: string[] = [`focus ${cam.focusDistance.toFixed(1)}m`];
      if (nearestCrosshair) {
        const n = nearestCrosshair as { label: string; dist: number };
        lines.push(`${n.label}: ${n.dist.toFixed(1)}m`);
      }
      ctx.fillStyle = '#000000aa';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      const lineH = 12;
      const boxW = 120;
      const boxH = lines.length * lineH + 6;
      ctx.fillRect(W / 2 - boxW / 2, H / 2 + 22, boxW, boxH);
      ctx.fillStyle = '#cbd5e1';
      lines.forEach((t, i) => ctx.fillText(t, W / 2, H / 2 + 22 + lineH * (i + 1) - 1));
    }

    // ── Coverage indicator (top-left badge) ──
    // Subtle warning when subjects exist but aren't framed. Locked subject
    // off-frame gets a stronger red badge because that's almost always wrong.
    if (totalInFront > 0) {
      const offFrame = totalInFront - inFramePersons;
      const lockedTarget = cam.lockedPersonId ? persons.find((p) => p.id === cam.lockedPersonId) : null;
      const lockedOff = lockedTarget ? !projectedPersons.current.some((p) => p.id === lockedTarget.id) : false;
      let badgeText: string;
      let badgeColor: string;
      if (lockedOff) {
        badgeText = `⚠ ${lockedTarget!.label} OUT OF FRAME`;
        badgeColor = '#ef4444';
      } else if (offFrame > 0) {
        badgeText = `${inFramePersons}/${totalInFront} in frame`;
        badgeColor = '#fbbf24';
      } else {
        badgeText = `${inFramePersons} in frame`;
        badgeColor = '#22c55e';
      }
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      const tw = ctx.measureText(badgeText).width + 12;
      ctx.fillStyle = '#000000aa';
      ctx.fillRect(4, 4, tw, 18);
      ctx.fillStyle = badgeColor;
      ctx.fillText(badgeText, 10, 16);
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

  }, [cam, venue, persons, walls, cameras, showGrid, showSafeAreas, showThirds, showCrosshair, getWallImage, imageTick]);

  // Repaint synchronously after every render so pan/tilt drags update the canvas
  // on the very next browser frame. The earlier `useEffect` variant was being
  // batched by React under fast drag input, so the 2D/3D views (which bind
  // declaratively to the store) updated immediately while the imperatively-
  // painted canvas lagged or skipped frames.
  useLayoutEffect(() => {
    draw();
  }, [draw]);

  // Resize observer lives in a normal effect — not time-critical.
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    const registry = getExportRegistry();
    registry.capturePreviewCanvas = () => {
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

    return () => { registry.capturePreviewCanvas = null; };
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

    // FOV-scaled sensitivity so the scene moves 1:1 with the mouse: 1 px of
    // cursor motion rotates the camera by the angle one pixel on the canvas
    // spans. Per-camera invert flags reverse the direction without touching
    // sensitivity. Pan & tilt wrap into [-180, 180) so the camera can spin
    // through ±180° instead of hitting a hard clamp.
    const canvas = canvasRef.current;
    const camDef = getCameraById(cam.cameraId, useStore.getState().customCameras);
    const lensDef = getLensById(cam.lensId, useStore.getState().customLenses);
    let panSens = 0.3;
    let tiltSens = 0.2;
    if (canvas && camDef && lensDef) {
      const sensor = getEffectiveSensor(camDef, lensDef, cam.useSpeedbooster, cam.sensorModeIndex, cam.activeMount);
      const fov = computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive);
      const cssW = canvas.clientWidth || canvas.width;
      const cssH = canvas.clientHeight || canvas.height;
      if (cssW > 0) panSens = fov.horizontalDeg / cssW;
      if (cssH > 0) tiltSens = fov.verticalDeg / cssH;
    }
    const invH = cam.invertPreviewH ? -1 : 1;
    const invV = cam.invertPreviewV ? -1 : 1;
    const wrap180 = (v: number) => {
      let w = ((v + 180) % 360 + 360) % 360 - 180;
      if (w === 180) w = -180;
      return w;
    };
    const newPan = wrap180(cam.pan - dx * panSens * invH);
    const newTilt = Math.max(-90, Math.min(45, cam.tilt + dy * tiltSens * invV));
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
  const sensor = camDef && lensDef ? getEffectiveSensor(camDef, lensDef, cam.useSpeedbooster, cam.sensorModeIndex, cam.activeMount) : undefined;
  const adapterInfo = camDef && lensDef ? getAdapterInfo(camDef, lensDef, cam.useSpeedbooster, cam.activeMount) : null;
  const fov = sensor ? computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive) : null;
  const dof = sensor ? computeDof(sensor, cam.focalLength, cam.aperture, cam.focusDistance, cam.extenderActive) : null;
  const lightLoss = adapterInfo ? (adapterInfo.lightLossStops > 0 ? ` (−${adapterInfo.lightLossStops}T)` : adapterInfo.lightLossStops < 0 ? ` (+${Math.abs(adapterInfo.lightLossStops)}T)` : '') : '';

  const camIdx = cameras.findIndex((c) => c.id === cam.id);

  // Upper bound for the focus-distance slider — roughly the venue diagonal.
  const focusMax = Math.max(20, Math.ceil(Math.hypot(venue.widthM, venue.heightM)));

  const addPreset = () => {
    const name = window.prompt('Preset name:', `${cam.focalLength.toFixed(0)}mm f/${cam.aperture.toFixed(1)}`);
    if (!name) return;
    persistPresets([...presets, { id: Date.now().toString(36), name: name.trim(), focalLength: cam.focalLength, aperture: cam.aperture, focusDistance: cam.focusDistance }]);
  };
  const applyPreset = (p: PreviewPreset) => {
    useStore.getState().updateCamera(cam.id, { focalLength: p.focalLength, aperture: p.aperture, focusDistance: p.focusDistance, lockedPersonId: undefined });
    // A preset can hold a focal length outside the lens's native range, so make
    // sure the slider can represent it.
    if (lensDef && (p.focalLength < lensDef.focalLengthMin || p.focalLength > lensDef.focalLengthMax)) {
      setManualZoom(true);
      setManualMin((m) => Math.min(m, Math.floor(p.focalLength)));
      setManualMax((m) => Math.max(m, Math.ceil(p.focalLength)));
    }
  };
  const deletePreset = (id: string) => persistPresets(presets.filter((p) => p.id !== id));

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
            onClick={() => useStore.getState().updateCamera(cam.id, { invertPreviewH: !cam.invertPreviewH })}
            title="Flip horizontal pan direction"
            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${cam.invertPreviewH ? 'border-bc-accent text-bc-accent bg-bc-accent/10' : 'border-bc-border text-gray-500 hover:text-gray-300'}`}
          >
            ↔ Invert H
          </button>
          <button
            onClick={() => useStore.getState().updateCamera(cam.id, { invertPreviewV: !cam.invertPreviewV })}
            title="Flip vertical tilt direction"
            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${cam.invertPreviewV ? 'border-bc-accent text-bc-accent bg-bc-accent/10' : 'border-bc-border text-gray-500 hover:text-gray-300'}`}
          >
            ↕ Invert V
          </button>
          <button
            onClick={() => setFocusPickMode((v) => !v)}
            title={focusPickMode ? 'Click anywhere to leave focus-pick mode' : 'Pick a person in the preview to set focus distance'}
            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${focusPickMode ? 'border-bc-yellow text-bc-yellow bg-bc-yellow/10' : 'border-bc-border text-gray-500 hover:text-gray-300'}`}
          >
            ◎ Focus pick {focusPickMode ? '· ON' : ''}
          </button>
          {cam.lockedPersonId && (
            <button
              onClick={() => useStore.getState().updateCamera(cam.id, { lockedPersonId: undefined })}
              title="Release focus lock"
              className="px-2 py-0.5 rounded text-[10px] font-medium border border-bc-yellow text-bc-yellow bg-bc-yellow/10 flex items-center gap-1"
            >
              <FiLock size={10} /> Unlock {persons.find((p) => p.id === cam.lockedPersonId)?.label ?? 'subject'}
            </button>
          )}
          {!cam.lockedPersonId && projectedPersons.current.length > 0 && (
            <button
              onClick={() => {
                // Lock to the projected person nearest the crosshair (centre).
                const W = canvasRef.current?.clientWidth ?? 0;
                const H = canvasRef.current?.clientHeight ?? 0;
                let best: { id: string; d: number } | null = null;
                for (const p of projectedPersons.current) {
                  const d = Math.hypot(p.sx - W / 2, p.sy - H / 2);
                  if (!best || d < best.d) best = { id: p.id, d };
                }
                if (best) useStore.getState().updateCamera(cam.id, { lockedPersonId: best.id });
              }}
              title="Lock focus distance to the subject closest to the crosshair"
              className="px-2 py-0.5 rounded text-[10px] font-medium border border-bc-border text-gray-500 hover:text-gray-300 flex items-center gap-1"
            >
              <FiUnlock size={10} /> Lock subject
            </button>
          )}
          <span className="text-[10px] text-gray-600 ml-auto">
            {focusPickMode ? 'Click a person to set focus distance' : 'Drag: Pan/Tilt · Scroll: Zoom'}
          </span>
        </div>

        {/* Zoom (focal length) slider — Manual mode (#47) widens the range past
            the lens limits and makes both ends editable. */}
        <div className="px-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-gray-500">Zoom · <span className="font-mono text-gray-300">{cam.focalLength.toFixed(0)}mm</span></span>
            <button
              onClick={() => setManualZoom((on) => {
                const next = !on;
                if (!next && lensDef) {
                  const clamped = Math.min(lensDef.focalLengthMax, Math.max(lensDef.focalLengthMin, cam.focalLength));
                  if (clamped !== cam.focalLength) useStore.getState().updateCamera(cam.id, { focalLength: clamped });
                }
                return next;
              })}
              title="Temporarily scrub focal length beyond the lens's real range"
              className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${manualZoom ? 'border-bc-yellow text-bc-yellow bg-bc-yellow/10' : 'border-bc-border text-gray-500 hover:text-gray-300'}`}
            >
              Manual{manualZoom ? ' · ON' : ''}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {manualZoom ? (
              <input
                type="number" min={1} max={manualMax - 1} value={manualMin}
                onChange={(e) => setManualMin(Math.max(1, Math.min(manualMax - 1, parseFloat(e.target.value) || 1)))}
                className="w-14 bg-bc-dark border border-bc-border rounded px-1 py-0.5 text-[10px] text-gray-300 font-mono"
                title="Manual minimum focal length (mm)"
              />
            ) : (
              <span className="text-[10px] text-gray-500 w-14 font-mono">{lensDef?.focalLengthMin ?? 4}mm</span>
            )}
            <input
              type="range"
              min={manualZoom ? manualMin : (lensDef?.focalLengthMin ?? 4)}
              max={manualZoom ? manualMax : (lensDef?.focalLengthMax ?? 300)}
              step={0.1}
              value={cam.focalLength}
              onChange={(e) => useStore.getState().updateCamera(cam.id, { focalLength: parseFloat(e.target.value) })}
              className="flex-1 accent-bc-accent"
            />
            {manualZoom ? (
              <input
                type="number" min={manualMin + 1} max={2000} value={manualMax}
                onChange={(e) => setManualMax(Math.max(manualMin + 1, Math.min(2000, parseFloat(e.target.value) || 500)))}
                className="w-14 bg-bc-dark border border-bc-border rounded px-1 py-0.5 text-[10px] text-gray-300 font-mono text-right"
                title="Manual maximum focal length (mm)"
              />
            ) : (
              <span className="text-[10px] text-gray-500 w-14 text-right font-mono">{lensDef?.focalLengthMax ?? '?'}mm</span>
            )}
          </div>
        </div>

        {/* Focus distance slider (#47) */}
        <div className="px-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-gray-500">Focus · <span className="font-mono text-gray-300">{cam.focusDistance.toFixed(1)}m</span>{cam.lockedPersonId ? ' · locked' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-14 font-mono">0.5m</span>
            <input
              type="range"
              min={0.5}
              max={focusMax}
              step={0.1}
              value={Math.min(cam.focusDistance, focusMax)}
              onChange={(e) => useStore.getState().updateCamera(cam.id, { focusDistance: Math.max(0.1, parseFloat(e.target.value)), lockedPersonId: undefined })}
              className="flex-1 accent-bc-accent"
            />
            <span className="text-[10px] text-gray-500 w-14 text-right font-mono">{focusMax}m</span>
          </div>
        </div>

        {/* Optical presets (#47) */}
        <div className="px-2 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-gray-500">Presets</span>
          {presets.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-bc-border text-gray-300 hover:border-bc-accent">
              <button onClick={() => applyPreset(p)} title={`${p.focalLength.toFixed(0)}mm · f/${p.aperture.toFixed(1)} · ${p.focusDistance.toFixed(1)}m`}>{p.name}</button>
              <button onClick={() => deletePreset(p.id)} className="text-gray-600 hover:text-bc-red" title="Delete preset"><FiX size={10} /></button>
            </span>
          ))}
          <button onClick={addPreset} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-bc-border text-gray-500 hover:text-bc-accent hover:border-bc-accent" title="Save current focal length / aperture / focus as a preset">
            <FiPlus size={10} /> Add
          </button>
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
