import React from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, Text, PerspectiveCamera, Html, TransformControls } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { getCameraById, getEffectiveSensor } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov } from '../../utils/fov';
import { effectiveCameraPos } from '../../utils/camera';
import * as THREE from 'three';
import { configureTextBuilder } from 'troika-three-text';
import { getExportRegistry } from '../../store/exportRegistry';
import type { FramingState } from '../../store/exportRegistry';
import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import type { BackgroundPlan, StageObjectType } from '../../types';
import robotoFont from '../../assets/fonts/Roboto-Regular.ttf';

// ── Apple-Silicon / Electron 3D-view fix (issue #35) ──
// drei's <Text> uses troika-three-text, which by default does its font
// typesetting + SDF generation inside a Web Worker created from a Blob URL.
// On some platforms (notably M-series Macs and the sandboxed Electron
// renderer) that worker fails to boot — troika logs
//   "Worker module function was called but `init` did not return a callable function"
// and the glyph promise never resolves. Every label then suspends, so the
// whole <Canvas> stays unmounted behind React's Suspense fallback and the
// panel hangs forever on "Loading 3D View…".
//
// Forcing useWorker:false runs typesetting + SDF generation synchronously on
// the main thread, sidestepping the broken worker entirely. This app only
// renders a handful of short labels, so the cost is negligible. Must be called
// before the first font request (module load time) and against the same troika
// instance drei imports (single hoisted copy in node_modules).
configureTextBuilder({ useWorker: false });

// Bundled label font (Roboto Regular, Apache-2.0 — see assets/fonts/Roboto-LICENSE.txt).
// IMPORTANT: this MUST be a .ttf/.otf/.woff — troika-three-text throws
// "woff2 fonts not supported" on a .woff2, and its loader swallows the error
// without resolving the promise, which was the *second* cause of the infinite
// "Loading 3D View…" hang. Inlined as a base64 data: URL at build time
// (vite.config.ts assetsInlineLimit) so every 3D <Text> renders fully offline —
// no runtime CDN/font fetch, CSP stays strict.
const LABEL_FONT = robotoFont;

/* ── Draggable group that moves on the XZ ground plane ── */
function DraggableOnFloor({ children, x, z, onDragEnd, onClick }: {
  children: React.ReactNode;
  x: number; z: number;
  onDragEnd?: (newX: number, newZ: number) => void;
  onClick?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const isDragging = useRef(false);
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const intersection = useMemo(() => new THREE.Vector3(), []);
  const offset = useRef(new THREE.Vector3());

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    isDragging.current = true;
    // Calculate offset between pointer hit and group position
    const raycaster = e.ray ? new THREE.Raycaster(e.ray.origin, e.ray.direction) : null;
    if (raycaster) {
      raycaster.ray.intersectPlane(floorPlane, intersection);
      offset.current.set(intersection.x - x, 0, intersection.z - z);
    }
  }, [floorPlane, x, z, intersection]);

  const handlePointerMove = useCallback((e: any) => {
    if (!isDragging.current) return;
    e.stopPropagation();
    const raycaster = e.ray ? new THREE.Raycaster(e.ray.origin, e.ray.direction) : null;
    if (raycaster && groupRef.current) {
      raycaster.ray.intersectPlane(floorPlane, intersection);
      groupRef.current.position.x = intersection.x - offset.current.x;
      groupRef.current.position.z = intersection.z - offset.current.z;
    }
  }, [floorPlane, intersection]);

  const handlePointerUp = useCallback((e: any) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    if (groupRef.current && onDragEnd) {
      onDragEnd(groupRef.current.position.x, groupRef.current.position.z);
    }
  }, [onDragEnd]);

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    onClick?.();
  }, [onClick]);

  // Reset position when props change (external update)
  useEffect(() => {
    if (groupRef.current && !isDragging.current) {
      groupRef.current.position.x = x;
      groupRef.current.position.z = z;
    }
  }, [x, z]);

  return (
    <group
      ref={groupRef}
      position={[x, 0, z]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      {children}
    </group>
  );
}

/* ── Floor grid with visible metre labels ── */
function FloorLabels({ widthM, heightM }: { widthM: number; heightM: number }) {
  // React 19 moved JSX out of the global namespace — the equivalent type now
  // lives at React.JSX.Element.
  const labels: React.JSX.Element[] = [];
  // X-axis labels every 5m
  for (let x = 0; x <= widthM; x += 5) {
    labels.push(
      <Text key={`xl-${x}`} font={LABEL_FONT} position={[x, 0.02, -0.4]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.35} color="#6b7280" anchorX="center">
        {x}m
      </Text>,
    );
  }
  // Z-axis labels every 5m
  for (let z = 0; z <= heightM; z += 5) {
    labels.push(
      <Text key={`zl-${z}`} font={LABEL_FONT} position={[-0.5, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.35} color="#6b7280" anchorX="right">
        {z}m
      </Text>,
    );
  }
  return <>{labels}</>;
}

/* ── Venue boundary walls (wireframe) ── */
function VenueWalls({ widthM, heightM }: { widthM: number; heightM: number }) {
  const points = useMemo(() => {
    const h = 4; // wall height
    const pts: THREE.Vector3[] = [];
    // bottom outline
    pts.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(widthM, 0, 0));
    pts.push(new THREE.Vector3(widthM, 0, 0), new THREE.Vector3(widthM, 0, heightM));
    pts.push(new THREE.Vector3(widthM, 0, heightM), new THREE.Vector3(0, 0, heightM));
    pts.push(new THREE.Vector3(0, 0, heightM), new THREE.Vector3(0, 0, 0));
    // verticals
    for (const [x, z] of [[0, 0], [widthM, 0], [widthM, heightM], [0, heightM]]) {
      pts.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, h, z));
    }
    // top outline
    pts.push(new THREE.Vector3(0, h, 0), new THREE.Vector3(widthM, h, 0));
    pts.push(new THREE.Vector3(widthM, h, 0), new THREE.Vector3(widthM, h, heightM));
    pts.push(new THREE.Vector3(widthM, h, heightM), new THREE.Vector3(0, h, heightM));
    pts.push(new THREE.Vector3(0, h, heightM), new THREE.Vector3(0, h, 0));
    return pts;
  }, [widthM, heightM]);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return g;
  }, [points]);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#4a5568" opacity={0.5} transparent />
    </lineSegments>
  );
}

/* ── FPS-style controller (always active) ──
 * WASD      = move forward/back/strafe
 * Space     = up
 * Shift     = down
 * Mouse     = look (hold left-click or right-click)
 * Scroll    = move forward/back (dolly)
 * Ctrl      = sprint (2×)
 */
function FPSControls({ mouseLookEnabled }: { mouseLookEnabled: boolean }) {
  const { camera, gl } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const yaw = useRef(0);
  const pitch = useRef(-0.3);
  const isLooking = useRef(false);
  const speed = 6; // m/s base

  // Sync yaw from initial camera orientation, keep pitch tilted down
  useEffect(() => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    yaw.current = Math.atan2(-dir.x, -dir.z);
    pitch.current = -0.35; // ~20° downward so the venue floor is always visible
  }, [camera]);

  // Listen for reset event
  useEffect(() => {
    const handleReset = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      camera.position.set(detail.x, detail.y, detail.z);
      yaw.current = 0;
      pitch.current = -0.3;
    };
    window.addEventListener('multicam-3d-reset', handleReset);
    return () => window.removeEventListener('multicam-3d-reset', handleReset);
  }, [camera]);

  useEffect(() => {
    const registry = getExportRegistry();
    registry.framing3D = {
      save: (): FramingState => ({
        pos: camera.position.toArray() as [number, number, number],
        yaw: yaw.current,
        pitch: pitch.current,
      }),
      apply: (state: FramingState) => {
        camera.position.fromArray(state.pos);
        yaw.current = state.yaw;
        pitch.current = state.pitch;
      },
      fitVenue: (widthM: number, heightM: number) => {
        const diag = Math.sqrt(widthM * widthM + heightM * heightM);
        const camX = widthM / 2;
        const camY = diag * 0.55;
        const camZ = heightM + diag * 0.4;
        const targetX = widthM / 2;
        const targetY = 0;
        const targetZ = heightM / 2;
        const dx = targetX - camX;
        const dy = targetY - camY;
        const dz = targetZ - camZ;
        const horizDist = Math.sqrt(dx * dx + dz * dz);
        camera.position.set(camX, camY, camZ);
        yaw.current = Math.atan2(-dx, -dz);
        pitch.current = Math.atan2(dy, horizDist);
      },
    };
    return () => { registry.framing3D = null; };
  }, [camera]);

  useEffect(() => {
    const canvas = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(k) || e.code === 'Space' || e.key === 'Shift' || e.key === 'Control') {
        e.preventDefault();
        keys.current.add(e.code === 'Space' ? ' ' : k === 'control' ? 'ctrl' : k);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const k = e.key.toLowerCase();
      keys.current.delete(e.code === 'Space' ? ' ' : k === 'control' ? 'ctrl' : k);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!mouseLookEnabled) return;
      isLooking.current = true;
      canvas.style.cursor = 'grabbing';
      // Try pointer lock for smoother FPS look
      if (e.button === 2) {
        canvas.requestPointerLock?.();
      }
    };
    const onMouseUp = () => {
      isLooking.current = false;
      canvas.style.cursor = mouseLookEnabled ? 'grab' : 'default';
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock?.();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isLooking.current && document.pointerLockElement !== canvas) return;
      yaw.current -= e.movementX * 0.002;
      pitch.current -= e.movementY * 0.002;
      pitch.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch.current));
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Scroll = zoom in/out along look direction (including vertical)
      const dir = new THREE.Vector3(
        -Math.sin(yaw.current) * Math.cos(pitch.current),
        Math.sin(pitch.current),
        -Math.cos(yaw.current) * Math.cos(pitch.current),
      );
      const dolly = dir.multiplyScalar(-e.deltaY * 0.02);
      camera.position.add(dolly);
    };

    const onContext = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContext);
    canvas.style.cursor = mouseLookEnabled ? 'grab' : 'default';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContext);
    };
  }, [camera, gl, mouseLookEnabled]);

  useFrame((_, delta) => {
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const move = new THREE.Vector3();

    if (keys.current.has('w')) move.add(forward);
    if (keys.current.has('s')) move.sub(forward);
    if (keys.current.has('a')) move.add(right);
    if (keys.current.has('d')) move.sub(right);
    if (keys.current.has(' ')) move.y += 1;
    if (keys.current.has('shift')) move.y -= 1;

    if (move.length() > 0) {
      const sprint = keys.current.has('ctrl') ? 2.5 : 1;
      move.normalize().multiplyScalar(speed * sprint * delta);
      camera.position.add(move);
    }

    // Apply look direction – use Euler directly so roll is always 0
    camera.rotation.order = 'YXZ';
    camera.rotation.set(pitch.current, yaw.current, 0);
  });

  return null;
}

function StageMesh({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label: string }) {
  return (
    <group position={[x + w / 2, 0.05, y + h / 2]}>
      <mesh>
        <boxGeometry args={[w, 0.1, h]} />
        <meshStandardMaterial color="#3b82f6" opacity={0.4} transparent />
      </mesh>
      {/* Stage edge glow */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, 0.1, h)]} />
        <lineBasicMaterial color="#60a5fa" />
      </lineSegments>
      <Text font={LABEL_FONT} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#93c5fd" anchorX="center" fontWeight="bold">
        {label}
      </Text>
      {/* Stage dimensions */}
      <Text font={LABEL_FONT} position={[0, 0.15, h / 2 + 0.3]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.25} color="#60a5fa" anchorX="center" fillOpacity={0.53}>
        {w}×{h}m
      </Text>
    </group>
  );
}

function FovPyramid({ cam, isSelected }: { cam: ReturnType<typeof useStore.getState>['cameras'][0]; isSelected: boolean }) {
  const camDef = getCameraById(cam.cameraId, useStore.getState().customCameras);
  const lensDef = getLensById(cam.lensId, useStore.getState().customLenses);

  // Alle Hooks muessen unbedingt (in gleicher Reihenfolge bei jedem Render)
  // laufen — daher null-safe ableiten und erst NACH den Hooks early-returnen.
  const sensor = camDef && lensDef
    ? getEffectiveSensor(camDef, lensDef, cam.useSpeedbooster, cam.sensorModeIndex, cam.activeMount)
    : null;
  const fov = sensor ? computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive) : null;
  const fovMin = sensor && lensDef ? computeFov(sensor, lensDef.focalLengthMax, cam.focusDistance, cam.extenderActive) : null;
  const fovMax = sensor && lensDef ? computeFov(sensor, lensDef.focalLengthMin, cam.focusDistance, cam.extenderActive) : null;
  const isZoom = !!lensDef && lensDef.focalLengthMin !== lensDef.focalLengthMax;

  const geometry = useMemo(() => {
    if (!fov) return null;
    const halfH = Math.tan(((fov.horizontalDeg / 2) * Math.PI) / 180) * cam.focusDistance;
    const halfV = Math.tan(((fov.verticalDeg / 2) * Math.PI) / 180) * cam.focusDistance;
    const d = cam.focusDistance;

    const vertices = new Float32Array([
      0, 0, 0,
      -halfH, halfV, -d,
      halfH, halfV, -d,
      halfH, -halfV, -d,
      -halfH, -halfV, -d,
    ]);
    const indices = [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 1, 2, 3, 1, 3, 4];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [fov?.horizontalDeg, fov?.verticalDeg, cam.focusDistance]);

  const geoMin = useMemo(() => {
    if (!isZoom || !fovMin) return null;
    const halfH = Math.tan(((fovMin.horizontalDeg / 2) * Math.PI) / 180) * cam.focusDistance;
    const halfV = Math.tan(((fovMin.verticalDeg / 2) * Math.PI) / 180) * cam.focusDistance;
    const d = cam.focusDistance;
    const vertices = new Float32Array([0,0,0, -halfH,halfV,-d, halfH,halfV,-d, halfH,-halfV,-d, -halfH,-halfV,-d]);
    const indices = [0,1,2, 0,2,3, 0,3,4, 0,4,1, 1,2,3, 1,3,4];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    return geo;
  }, [isZoom, fovMin?.horizontalDeg, fovMin?.verticalDeg, cam.focusDistance]);

  const geoMax = useMemo(() => {
    if (!isZoom || !fovMax) return null;
    const halfH = Math.tan(((fovMax.horizontalDeg / 2) * Math.PI) / 180) * cam.focusDistance;
    const halfV = Math.tan(((fovMax.verticalDeg / 2) * Math.PI) / 180) * cam.focusDistance;
    const d = cam.focusDistance;
    const vertices = new Float32Array([0,0,0, -halfH,halfV,-d, halfH,halfV,-d, halfH,-halfV,-d, -halfH,-halfV,-d]);
    const indices = [0,1,2, 0,2,3, 0,3,4, 0,4,1, 1,2,3, 1,3,4];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    return geo;
  }, [isZoom, fovMax?.horizontalDeg, fovMax?.verticalDeg, cam.focusDistance]);

  // Guard nach den Hooks: ohne gueltige Kamera/Linse gibt es keine Geometrie.
  if (!geometry) return null;

  return (
    // The pyramid mesh is modelled looking along -Z. Both the pitch (rotate-X)
    // and the camera-orientation rotate-Y(-90°) used to live on this group, but
    // R3F applies child transforms before parent ones — so the Y rotation
    // landed BEFORE the X rotation, leaving pitch acting around the pyramid's
    // own axis (i.e. rolling it). The reorientation is now applied one level
    // up in CameraRig, AFTER the parent pitchRef, so pitch stays pitch.
    <group>
      {/* Camera body */}
      <mesh>
        <boxGeometry args={[0.3, 0.2, 0.4]} />
        <meshStandardMaterial color={cam.color} emissive={cam.color} emissiveIntensity={isSelected ? 0.5 : 0.15} />
      </mesh>
      {/* FOV volume */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={cam.color}
          opacity={isSelected ? 0.25 : 0.1}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Wireframe */}
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={cam.color} opacity={isSelected ? 0.8 : 0.3} transparent />
      </lineSegments>
      {/* Min FOV wireframe (red) */}
      {isSelected && geoMin && (
        <lineSegments geometry={geoMin}>
          <lineBasicMaterial color="#ef4444" opacity={0.4} transparent />
        </lineSegments>
      )}
      {/* Max FOV wireframe (green) */}
      {isSelected && geoMax && (
        <lineSegments geometry={geoMax}>
          <lineBasicMaterial color="#22c55e" opacity={0.4} transparent />
        </lineSegments>
      )}
      {/* Label */}
      <Text font={LABEL_FONT} position={[0, 0.5, 0]} fontSize={0.35} color="#ffffff" anchorX="center" fontWeight="bold"
        outlineWidth={0.02} outlineColor="#000000">
        {cam.label}
      </Text>
    </group>
  );
}

type CameraEditMode = 'move' | 'height' | 'pan' | 'tilt';

function normalizeDegrees(angle: number) {
  let normalized = angle;
  while (normalized > 180) normalized -= 360;
  while (normalized <= -180) normalized += 360;
  return normalized;
}

function CameraRig({
  cam,
  isSelected,
  isUnlocked,
  editMode,
  onSelect,
  onToggleLock,
  onEditModeChange,
  venueWidth,
  venueHeight,
}: {
  cam: ReturnType<typeof useStore.getState>['cameras'][0];
  isSelected: boolean;
  isUnlocked: boolean;
  editMode: CameraEditMode;
  onSelect: (cameraId: string) => void;
  onToggleLock: (cameraId: string) => void;
  onEditModeChange: (mode: CameraEditMode) => void;
  venueWidth: number;
  venueHeight: number;
}) {
  const { moveCamera, updateCamera } = useStore();
  const baseRef = useRef<THREE.Group>(null);
  const liftRef = useRef<THREE.Group>(null);
  const pitchRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const pos = effectiveCameraPos(cam);
    if (baseRef.current) {
      baseRef.current.position.set(pos.x, 0, pos.y);
      baseRef.current.rotation.set(0, THREE.MathUtils.degToRad(-cam.pan), 0);
    }
    if (liftRef.current) {
      liftRef.current.position.set(0, cam.z, 0);
    }
    if (pitchRef.current) {
      // Tilt rotates around the camera's LOCAL right axis. Once the inner
      // FovPyramid group reorients the model from -Z to +X, the camera's right
      // axis lines up with the parent group's Z (+Z in world for default pan).
      // Rotating around X here would tumble the pyramid around its forward
      // axis (= roll), so the pitch rotation has to go on Z.
      pitchRef.current.rotation.set(0, 0, THREE.MathUtils.degToRad(cam.tilt));
    }
  }, [cam.pan, cam.tilt, cam.x, cam.y, cam.z, cam.trackOffset, cam]);

  const commitMove = useCallback(() => {
    if (!baseRef.current) return;
    // TransformControls drag operates on the *effective* (offset) position,
    // so back out the trackOffset to recover the parked position before
    // clamping into the venue bounds.
    const offset = cam.trackOffset ?? 0;
    const panRad = (cam.pan * Math.PI) / 180;
    const dropX = baseRef.current.position.x - Math.cos(panRad) * offset;
    const dropY = baseRef.current.position.z - Math.sin(panRad) * offset;
    const nextX = Math.max(0, Math.min(venueWidth, dropX));
    const nextY = Math.max(0, Math.min(venueHeight, dropY));
    baseRef.current.position.set(nextX + Math.cos(panRad) * offset, 0, nextY + Math.sin(panRad) * offset);
    moveCamera(cam.id, nextX, nextY);
  }, [cam.id, cam.pan, cam.trackOffset, moveCamera, venueHeight, venueWidth]);

  const commitHeight = useCallback(() => {
    if (!liftRef.current) return;
    const nextZ = Math.max(0, liftRef.current.position.y);
    liftRef.current.position.set(0, nextZ, 0);
    updateCamera(cam.id, { z: nextZ });
  }, [cam.id, updateCamera]);

  const commitPan = useCallback(() => {
    if (!baseRef.current) return;
    const nextPan = normalizeDegrees(-THREE.MathUtils.radToDeg(baseRef.current.rotation.y));
    baseRef.current.rotation.set(0, THREE.MathUtils.degToRad(-nextPan), 0);
    updateCamera(cam.id, { pan: nextPan });
  }, [cam.id, updateCamera]);

  const commitTilt = useCallback(() => {
    if (!pitchRef.current) return;
    const nextTilt = Math.max(-90, Math.min(45, THREE.MathUtils.radToDeg(pitchRef.current.rotation.z)));
    pitchRef.current.rotation.set(0, 0, THREE.MathUtils.degToRad(nextTilt));
    updateCamera(cam.id, { tilt: nextTilt });
  }, [cam.id, updateCamera]);

  const buttonStyle = (active = false) => ({
    background: active ? '#3b82f6' : '#111827',
    border: `1px solid ${active ? '#60a5fa' : '#334155'}`,
    color: active ? '#ffffff' : '#94a3b8',
    borderRadius: 4,
    padding: '3px 6px',
    fontSize: 10,
    cursor: 'pointer',
  } as const);

  return (
    <group
      ref={baseRef}
      position={[cam.x, 0, cam.y]}
      rotation={[0, THREE.MathUtils.degToRad(-cam.pan), 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(cam.id);
      }}
    >
      {isSelected && isUnlocked && editMode === 'move' && baseRef.current && (
        <TransformControls object={baseRef.current} mode="translate" showX showY={false} showZ size={0.9} onMouseUp={commitMove} />
      )}
      {isSelected && isUnlocked && editMode === 'pan' && baseRef.current && (
        <TransformControls object={baseRef.current} mode="rotate" showX={false} showY showZ={false} size={0.9} onMouseUp={commitPan} />
      )}

      <group ref={liftRef} position={[0, cam.z, 0]}>
        {isSelected && (
          <Html position={[0, 1.15, 0]} center style={{ pointerEvents: 'auto' }}>
            <div
              style={{
                display: 'flex',
                gap: 4,
                alignItems: 'center',
                background: 'rgba(15, 23, 42, 0.92)',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: '6px 8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button type="button" onClick={() => onToggleLock(cam.id)} style={buttonStyle(isUnlocked)}>
                {isUnlocked ? 'Lock' : 'Unlock'}
              </button>
              <button type="button" disabled={!isUnlocked} onClick={() => onEditModeChange('move')} style={buttonStyle(editMode === 'move' && isUnlocked)}>
                XY
              </button>
              <button type="button" disabled={!isUnlocked} onClick={() => onEditModeChange('height')} style={buttonStyle(editMode === 'height' && isUnlocked)}>
                Z
              </button>
              <button type="button" disabled={!isUnlocked} onClick={() => onEditModeChange('pan')} style={buttonStyle(editMode === 'pan' && isUnlocked)}>
                Pan
              </button>
              <button type="button" disabled={!isUnlocked} onClick={() => onEditModeChange('tilt')} style={buttonStyle(editMode === 'tilt' && isUnlocked)}>
                Tilt
              </button>
            </div>
          </Html>
        )}

        {isSelected && isUnlocked && editMode === 'height' && liftRef.current && (
          <TransformControls object={liftRef.current} mode="translate" showX={false} showY showZ={false} size={0.9} onMouseUp={commitHeight} />
        )}

        <group ref={pitchRef} rotation={[0, 0, THREE.MathUtils.degToRad(cam.tilt)]}>
          {isSelected && isUnlocked && editMode === 'tilt' && pitchRef.current && (
            <TransformControls object={pitchRef.current} mode="rotate" showX={false} showY={false} showZ size={0.9} onMouseUp={commitTilt} />
          )}
          {/* Reorient the pyramid (modelled along -Z) so it points along the
              camera's pan axis. Applying this group AFTER pitchRef means pitch
              acts on the camera's right axis (X) before reorientation, giving a
              proper pitch instead of roll. */}
          <group rotation={[0, -Math.PI / 2, 0]}>
            <FovPyramid cam={cam} isSelected={isSelected} />
          </group>
        </group>
      </group>
    </group>
  );
}

/* ── Floor plan image texture overlay on ground ── */
function FloorPlanOverlay({ plan }: { plan: BackgroundPlan }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      tex.colorSpace = THREE.SRGBColorSpace;
      setTexture(tex);
    };
    img.src = plan.dataUrl;
    return () => { texture?.dispose(); };
  }, [plan.dataUrl]);

  if (!texture) return null;

  const w = plan.widthPx * plan.scaleX;
  const h = plan.heightPx * plan.scaleY;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[plan.offsetX + w / 2, 0.02, plan.offsetY + h / 2]}
    >
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent opacity={plan.opacity} depthWrite={false} />
    </mesh>
  );
}

function PersonMesh({ x, z, height, label, objectType, color }: { x: number; z: number; height: number; label: string; objectType?: StageObjectType; color?: string }) {
  const type = objectType ?? 'person';
  const defaultColor =
    type === 'drums' ? '#ef4444' :
    type === 'keys' ? '#8b5cf6' :
    type === 'person-guitar' ? '#f97316' :
    type === 'sitting-person' ? '#38bdf8' :
    type === 'mic-stand' ? '#6b7280' :
    type === 'chair' ? '#a16207' :
    type === 'table' ? '#a16207' :
    type === 'lectern' ? '#7c3aed' :
    type === 'schneetiger' ? '#e0f2fe' :
    '#f59e0b';
  const col = color ?? defaultColor;

  return (
    <group position={[x, height / 2, z]}>
      {type === 'drums' ? (
        <>
          <mesh position={[0, -height * 0.15, 0]}>
            <cylinderGeometry args={[0.5, 0.6, height * 0.5, 12]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.2} opacity={0.6} transparent />
          </mesh>
          <mesh position={[-0.3, height * 0.1, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 12]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} opacity={0.7} transparent />
          </mesh>
          <mesh position={[0.3, height * 0.15, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.05, 12]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} opacity={0.7} transparent />
          </mesh>
        </>
      ) : type === 'keys' ? (
        <>
          <mesh position={[0, -height * 0.1, 0]}>
            <boxGeometry args={[1.2, height * 0.15, 0.4]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.2} opacity={0.6} transparent />
          </mesh>
          <mesh position={[-0.4, -height * 0.35, 0]}>
            <cylinderGeometry args={[0.03, 0.03, height * 0.5, 6]} />
            <meshStandardMaterial color="#9ca3af" opacity={0.5} transparent />
          </mesh>
          <mesh position={[0.4, -height * 0.35, 0]}>
            <cylinderGeometry args={[0.03, 0.03, height * 0.5, 6]} />
            <meshStandardMaterial color="#9ca3af" opacity={0.5} transparent />
          </mesh>
        </>
      ) : type === 'chair' ? (
        <>
          <mesh position={[0, -height * 0.05, 0]}>
            <boxGeometry args={[0.5, 0.05, 0.5]} />
            <meshStandardMaterial color={col} opacity={0.75} transparent />
          </mesh>
          <mesh position={[0, height * 0.25, -0.22]}>
            <boxGeometry args={[0.5, height * 0.55, 0.05]} />
            <meshStandardMaterial color={col} opacity={0.75} transparent />
          </mesh>
          {[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, -height * 0.3, lz]}>
              <boxGeometry args={[0.04, height * 0.5, 0.04]} />
              <meshStandardMaterial color="#57534e" />
            </mesh>
          ))}
        </>
      ) : type === 'table' ? (
        <>
          <mesh position={[0, height * 0.35, 0]}>
            <boxGeometry args={[1.4, 0.06, 0.8]} />
            <meshStandardMaterial color={col} opacity={0.8} transparent />
          </mesh>
          {[[-0.65, -0.35], [0.65, -0.35], [-0.65, 0.35], [0.65, 0.35]].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, -height * 0.07, lz]}>
              <boxGeometry args={[0.06, height * 0.8, 0.06]} />
              <meshStandardMaterial color="#57534e" />
            </mesh>
          ))}
        </>
      ) : type === 'lectern' ? (
        <>
          {/* Slanted top */}
          <mesh position={[0, height * 0.42, 0]} rotation={[-0.3, 0, 0]}>
            <boxGeometry args={[0.7, 0.05, 0.45]} />
            <meshStandardMaterial color={col} opacity={0.85} transparent />
          </mesh>
          {/* Column */}
          <mesh position={[0, -height * 0.05, 0]}>
            <boxGeometry args={[0.35, height * 0.85, 0.35]} />
            <meshStandardMaterial color={col} opacity={0.65} transparent />
          </mesh>
        </>
      ) : type === 'sitting-person' ? (
        <>
          {/* Torso shorter, lower */}
          <mesh position={[0, -height * 0.05, 0]}>
            <cylinderGeometry args={[0.18, 0.18, height * 0.45, 8]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.2} opacity={0.6} transparent />
          </mesh>
          {/* Head */}
          <mesh position={[0, height * 0.32, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.2} opacity={0.6} transparent />
          </mesh>
          {/* Legs flat */}
          <mesh position={[0, -height * 0.4, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.5, 6]} />
            <meshStandardMaterial color={col} opacity={0.5} transparent />
          </mesh>
        </>
      ) : type === 'schneetiger' ? (
        <>
          {/* Body */}
          <mesh position={[0, -height * 0.05, 0]}>
            <boxGeometry args={[1.5, height * 0.25, 0.6]} />
            <meshStandardMaterial color={col} opacity={0.95} transparent />
          </mesh>
          {/* Head */}
          <mesh position={[0.85, height * 0.12, 0]}>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshStandardMaterial color={col} opacity={0.95} transparent />
          </mesh>
          {/* Tail */}
          <mesh position={[-0.85, -0.05, 0]} rotation={[0, 0, 0.4]}>
            <cylinderGeometry args={[0.04, 0.04, 0.8, 6]} />
            <meshStandardMaterial color={col} />
          </mesh>
          {/* Legs */}
          {[[-0.55, -0.22], [0.55, -0.22], [-0.55, 0.22], [0.55, 0.22]].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, -height * 0.35, lz]}>
              <cylinderGeometry args={[0.08, 0.08, height * 0.4, 6]} />
              <meshStandardMaterial color={col} />
            </mesh>
          ))}
          {/* Stripe band hint */}
          <mesh position={[0, height * 0.13, 0]}>
            <boxGeometry args={[1.51, 0.03, 0.61]} />
            <meshStandardMaterial color="#1f2937" opacity={0.6} transparent />
          </mesh>
        </>
      ) : (
        <>
          {/* Generic person (or guitarist / mic-stand) */}
          <mesh position={[0, -height * 0.1, 0]}>
            <cylinderGeometry args={[0.15, 0.15, height * 0.65, 8]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.2} opacity={0.6} transparent />
          </mesh>
          <mesh position={[0, height * 0.3, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.2} opacity={0.6} transparent />
          </mesh>
          {type === 'person-guitar' && (
            <mesh position={[0.2, -height * 0.05, 0.15]} rotation={[0, 0, 0.3]}>
              <boxGeometry args={[0.12, height * 0.4, 0.06]} />
              <meshStandardMaterial color="#92400e" emissive="#92400e" emissiveIntensity={0.15} opacity={0.7} transparent />
            </mesh>
          )}
          {type === 'mic-stand' && (
            <mesh position={[0, height * 0.15, 0]}>
              <cylinderGeometry args={[0.015, 0.015, height * 0.8, 6]} />
              <meshStandardMaterial color="#9ca3af" opacity={0.7} transparent />
            </mesh>
          )}
        </>
      )}
      <Text font={LABEL_FONT} position={[0, height * 0.5, 0]} fontSize={0.22} color={col} anchorX="center"
        outlineWidth={0.015} outlineColor="#000000">
        {label} ({height}m)
      </Text>
    </group>
  );
}

export default function Venue3D() {
  const { venue, cameras, persons, backgroundPlan, walls, updatePerson, selectCamera, selectedCameraId } = useStore();
  const [unlockedCameraId, setUnlockedCameraId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<CameraEditMode>('move');

  useEffect(() => {
    if (unlockedCameraId && !cameras.some((camera) => camera.id === unlockedCameraId)) {
      setUnlockedCameraId(null);
    }
  }, [cameras, unlockedCameraId]);

  const handleReset = useCallback(() => {
    window.dispatchEvent(new CustomEvent('multicam-3d-reset', {
      detail: { x: venue.widthM / 2, y: 15, z: venue.heightM + 10 },
    }));
  }, [venue.widthM, venue.heightM]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 500, position: 'relative' }}>
      {/* Controls hint */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8, zIndex: 10,
        background: '#000000aa', padding: '8px 12px', borderRadius: 6,
        fontSize: 11, color: '#9ca3af', lineHeight: 1.6, backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
      }}>
        <b style={{ color: '#60a5fa' }}>Select camera</b> → unlock to edit<br/>
        <b style={{ color: '#60a5fa' }}>XY</b> floor move &nbsp;|&nbsp;
        <b style={{ color: '#60a5fa' }}>Z</b> height &nbsp;|&nbsp;
        <b style={{ color: '#60a5fa' }}>Pan/Tilt</b> rotate axes<br/>
        <b style={{ color: '#60a5fa' }}>WASD</b> Move &nbsp;|&nbsp;
        <b style={{ color: '#60a5fa' }}>Space/Shift</b> vertical &nbsp;|&nbsp;
        <b style={{ color: '#60a5fa' }}>Scroll</b> Dolly
      </div>

      {/* Reset View button */}
      <button
        onClick={handleReset}
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 10,
          background: '#1e293bcc', border: '1px solid #334155', color: '#94a3b8',
          padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
          backdropFilter: 'blur(4px)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#60a5fa'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#334155'; }}
      >
        ↻ Reset View
      </button>

      <Canvas shadows gl={{ preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[venue.widthM / 2, 15, venue.heightM + 10]} fov={50} />
        <FPSControls mouseLookEnabled={unlockedCameraId === null} />

        {/* Improved lighting */}
        <ambientLight intensity={0.7} color="#e8eaf0" />
        <directionalLight position={[10, 20, 10]} intensity={1.0} color="#ffffff" />
        <directionalLight position={[-10, 15, -5]} intensity={0.3} color="#94a3b8" />
        <hemisphereLight args={['#b0c4de', '#1e293b', 0.4]} />

        {/* Floor — brighter */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[venue.widthM / 2, 0, venue.heightM / 2]}>
          <planeGeometry args={[venue.widthM, venue.heightM]} />
          <meshStandardMaterial color="#252a36" />
        </mesh>

        {/* Floor plan overlay */}
        {backgroundPlan && <FloorPlanOverlay plan={backgroundPlan} />}

        {/* Grid — brighter lines */}
        <Grid
          args={[venue.widthM, venue.heightM]}
          position={[venue.widthM / 2, 0.01, venue.heightM / 2]}
          cellSize={1}
          cellThickness={0.6}
          cellColor="#3a4050"
          sectionSize={5}
          sectionThickness={1.5}
          sectionColor="#4a5568"
        />

        {/* Venue walls wireframe */}
        <VenueWalls widthM={venue.widthM} heightM={venue.heightM} />

        {/* Floor labels */}
        <FloorLabels widthM={venue.widthM} heightM={venue.heightM} />

        {/* Stages */}
        {venue.stages.map((s) => (
          <StageMesh key={s.id} x={s.x} y={s.y} w={s.width} h={s.height} label={s.label} />
        ))}

        {/* Cameras with explicit unlock + gizmo editing */}
        {cameras.map((cam) => (
          <CameraRig
            key={cam.id}
            cam={cam}
            isSelected={cam.id === selectedCameraId}
            isUnlocked={cam.id === unlockedCameraId}
            editMode={editMode}
            onSelect={selectCamera}
            onToggleLock={(cameraId) => {
              setUnlockedCameraId((current) => {
                if (current === cameraId) return null;
                setEditMode('move');
                return cameraId;
              });
            }}
            onEditModeChange={setEditMode}
            venueWidth={venue.widthM}
            venueHeight={venue.heightM}
          />
        ))}

        {/* Reference persons from store – draggable */}
        {persons.map((p) => (
          <DraggableOnFloor
            key={p.id}
            x={p.x}
            z={p.y}
            onDragEnd={(nx, nz) => updatePerson(p.id, { x: nx, y: nz })}
          >
            <PersonMesh x={0} z={0} height={p.height} label={p.label} objectType={p.objectType} color={p.color} />
          </DraggableOnFloor>
        ))}

        {/* Walls */}
        {walls.map((w) => {
          const dx = w.x2 - w.x1;
          const dy = w.y2 - w.y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const cx = (w.x1 + w.x2) / 2;
          const cy = (w.y1 + w.y2) / 2;
          const angle = Math.atan2(dy, dx);
          return (
            <mesh key={w.id} position={[cx, w.height / 2, cy]} rotation={[0, -angle, 0]}>
              <boxGeometry args={[len, w.height, 0.15]} />
              <meshStandardMaterial color={w.color ?? '#6b7280'} opacity={0.6} transparent />
            </mesh>
          );
        })}
      </Canvas>
    </div>
  );
}
