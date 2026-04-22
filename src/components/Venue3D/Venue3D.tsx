import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, Text, PerspectiveCamera } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { getCameraById, getEffectiveSensor } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov } from '../../utils/fov';
import * as THREE from 'three';
import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import type { BackgroundPlan, StageObjectType } from '../../types';
import FixtureMesh3D from '../Lighting/FixtureMesh3D';
import HeatMapFloor3D from '../Lighting/HeatMapFloor3D';
import HeatMapLegend from '../Lighting/HeatMapLegend';
import { getFixtureById } from '../../data/fixtures';

/* ── Draggable group that moves on the XZ ground plane ── */
function DraggableOnFloor({ children, x, z, onDragEnd, onClick, draggable = true }: {
  children: React.ReactNode;
  x: number; z: number;
  onDragEnd?: (newX: number, newZ: number) => void;
  onClick?: () => void;
  draggable?: boolean;
}) {
  const drag3DLocked = useStore((s) => s.drag3DLocked);
  const effectiveDraggable = draggable && !drag3DLocked;
  const groupRef = useRef<THREE.Group>(null!);
  const isDragging = useRef(false);
  const { camera, gl, raycaster, mouse } = useThree();
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const intersection = useMemo(() => new THREE.Vector3(), []);
  const offset = useRef(new THREE.Vector3());

  const projectMouse = useCallback(() => {
    raycaster.setFromCamera(mouse, camera);
    if (raycaster.ray.intersectPlane(floorPlane, intersection)) return intersection;
    return null;
  }, [camera, floorPlane, intersection, mouse, raycaster]);

  const handlePointerDown = useCallback((e: any) => {
    if (!effectiveDraggable) return;
    // Only right mouse button should initiate drag (left = camera look)
    if (typeof e.button === 'number' && e.button !== 2) return;
    e.stopPropagation();
    isDragging.current = true;
    const hit = projectMouse();
    if (hit) offset.current.set(hit.x - x, 0, hit.z - z);
    else offset.current.set(0, 0, 0);
    gl.domElement.style.cursor = 'grabbing';
  }, [effectiveDraggable, gl, projectMouse, x, z]);

  // Global listeners so the drag keeps tracking even when the pointer leaves the mesh.
  useEffect(() => {
    const canvas = gl.domElement;
    const handleMove = () => {
      if (!isDragging.current || !groupRef.current) return;
      const hit = projectMouse();
      if (!hit) return;
      groupRef.current.position.x = hit.x - offset.current.x;
      groupRef.current.position.z = hit.z - offset.current.z;
    };
    const handleUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      canvas.style.cursor = 'default';
      if (groupRef.current && onDragEnd) {
        onDragEnd(groupRef.current.position.x, groupRef.current.position.z);
      }
    };
    canvas.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      canvas.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [gl, onDragEnd, projectMouse]);

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
      onClick={handleClick}
    >
      {children}
    </group>
  );
}

/* ── Floor grid with visible metre labels ── */
function FloorLabels({ widthM, heightM }: { widthM: number; heightM: number }) {
  const labels: JSX.Element[] = [];
  // X-axis labels every 5m
  for (let x = 0; x <= widthM; x += 5) {
    labels.push(
      <Text key={`xl-${x}`} position={[x, 0.02, -0.4]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.35} color="#6b7280" anchorX="center">
        {x}m
      </Text>,
    );
  }
  // Z-axis labels every 5m
  for (let z = 0; z <= heightM; z += 5) {
    labels.push(
      <Text key={`zl-${z}`} position={[-0.5, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.35} color="#6b7280" anchorX="right">
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
 * Mouse (left)  = look (hold left mouse button)
 * Mouse (right) = select/drag objects and cameras
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
      // Left mouse button triggers camera look. Right button is reserved for dragging objects.
      if (e.button !== 0) return;
      isLooking.current = true;
      canvas.style.cursor = 'grabbing';
      canvas.requestPointerLock?.();
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
      <Text position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#93c5fd" anchorX="center" fontWeight="bold">
        {label}
      </Text>
      {/* Stage dimensions */}
      <Text position={[0, 0.15, h / 2 + 0.3]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.25} color="#60a5fa" anchorX="center" fillOpacity={0.53}>
        {w}×{h}m
      </Text>
    </group>
  );
}

function FovPyramid({ cam, isSelected }: { cam: ReturnType<typeof useStore.getState>['cameras'][0]; isSelected: boolean }) {
  const camDef = getCameraById(cam.cameraId);
  const lensDef = getLensById(cam.lensId, useStore.getState().customLenses);
  if (!camDef || !lensDef) return null;

  const sensor = getEffectiveSensor(camDef, lensDef, { adapterId: cam.adapterId, useSpeedbooster: cam.useSpeedbooster });
  const fov = computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive);
  const fovMin = computeFov(sensor, lensDef.focalLengthMax, cam.focusDistance, cam.extenderActive);
  const fovMax = computeFov(sensor, lensDef.focalLengthMin, cam.focusDistance, cam.extenderActive);
  const isZoom = lensDef.focalLengthMin !== lensDef.focalLengthMax;

  const geometry = useMemo(() => {
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
  }, [fov.horizontalDeg, fov.verticalDeg, cam.focusDistance]);

  const geoMin = useMemo(() => {
    if (!isZoom) return null;
    const halfH = Math.tan(((fovMin.horizontalDeg / 2) * Math.PI) / 180) * cam.focusDistance;
    const halfV = Math.tan(((fovMin.verticalDeg / 2) * Math.PI) / 180) * cam.focusDistance;
    const d = cam.focusDistance;
    const vertices = new Float32Array([0,0,0, -halfH,halfV,-d, halfH,halfV,-d, halfH,-halfV,-d, -halfH,-halfV,-d]);
    const indices = [0,1,2, 0,2,3, 0,3,4, 0,4,1, 1,2,3, 1,3,4];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    return geo;
  }, [isZoom, fovMin.horizontalDeg, fovMin.verticalDeg, cam.focusDistance]);

  const geoMax = useMemo(() => {
    if (!isZoom) return null;
    const halfH = Math.tan(((fovMax.horizontalDeg / 2) * Math.PI) / 180) * cam.focusDistance;
    const halfV = Math.tan(((fovMax.verticalDeg / 2) * Math.PI) / 180) * cam.focusDistance;
    const d = cam.focusDistance;
    const vertices = new Float32Array([0,0,0, -halfH,halfV,-d, halfH,halfV,-d, halfH,-halfV,-d, -halfH,-halfV,-d]);
    const indices = [0,1,2, 0,2,3, 0,3,4, 0,4,1, 1,2,3, 1,3,4];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    return geo;
  }, [isZoom, fovMax.horizontalDeg, fovMax.verticalDeg, cam.focusDistance]);

  // The outer pitchRef applies tilt on the local X axis. The base yaw already
  // bakes the pan + model orientation offset – so pitch stays a pure pitch.
  return (
    <group rotation-order="YXZ">
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
      <Text position={[0, 0.5, 0]} fontSize={0.35} color="#ffffff" anchorX="center" fontWeight="bold"
        outlineWidth={0.02} outlineColor="#000000">
        {cam.label}
      </Text>
    </group>
  );
}

function CameraRig({
  cam,
  isSelected,
  onSelect,
}: {
  cam: ReturnType<typeof useStore.getState>['cameras'][0];
  isSelected: boolean;
  onSelect: (cameraId: string) => void;
}) {
  const baseRef = useRef<THREE.Group>(null);
  const liftRef = useRef<THREE.Group>(null);
  const pitchRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (baseRef.current) {
      baseRef.current.position.set(cam.x, 0, cam.y);
      // Bake the FovPyramid's -π/2 orientation offset into the yaw so that the
      // pitchRef rotates around a horizontal world axis – keeping tilt as pure
      // pitch instead of roll.
      baseRef.current.rotation.set(0, THREE.MathUtils.degToRad(-cam.pan) - Math.PI / 2, 0);
    }
    if (liftRef.current) {
      liftRef.current.position.set(cam.trackOffset ?? 0, cam.z, 0);
    }
    if (pitchRef.current) {
      pitchRef.current.rotation.order = 'YXZ';
      pitchRef.current.rotation.set(THREE.MathUtils.degToRad(cam.tilt), 0, 0);
    }
  }, [cam.pan, cam.tilt, cam.x, cam.y, cam.z, cam.trackOffset]);

  return (
    <group
      ref={baseRef}
      position={[cam.x, 0, cam.y]}
      rotation={[0, THREE.MathUtils.degToRad(-cam.pan) - Math.PI / 2, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(cam.id);
      }}
    >
      <group ref={liftRef} position={[0, cam.z, 0]}>
        <group ref={pitchRef} rotation={[THREE.MathUtils.degToRad(cam.tilt), 0, 0]}>
          <FovPyramid cam={cam} isSelected={isSelected} />
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
          {/* Drum kit - wider base, shorter */}
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
          {/* Keyboard on stand */}
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
          {/* Seat */}
          <mesh position={[0, -height * 0.05, 0]}>
            <boxGeometry args={[0.5, 0.05, 0.5]} />
            <meshStandardMaterial color={col} opacity={0.75} transparent />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, height * 0.25, -0.22]}>
            <boxGeometry args={[0.5, height * 0.55, 0.05]} />
            <meshStandardMaterial color={col} opacity={0.75} transparent />
          </mesh>
          {/* Four legs */}
          {[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, -height * 0.3, lz]}>
              <boxGeometry args={[0.04, height * 0.5, 0.04]} />
              <meshStandardMaterial color="#57534e" />
            </mesh>
          ))}
        </>
      ) : type === 'table' ? (
        <>
          {/* Tabletop */}
          <mesh position={[0, height * 0.35, 0]}>
            <boxGeometry args={[1.4, 0.06, 0.8]} />
            <meshStandardMaterial color={col} opacity={0.8} transparent />
          </mesh>
          {/* Four legs */}
          {[[-0.65, -0.35], [0.65, -0.35], [-0.65, 0.35], [0.65, 0.35]].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, -height * 0.07, lz]}>
              <boxGeometry args={[0.06, height * 0.8, 0.06]} />
              <meshStandardMaterial color="#57534e" />
            </mesh>
          ))}
        </>
      ) : type === 'lectern' ? (
        <>
          {/* Pedestal */}
          <mesh position={[0, -height * 0.15, 0]}>
            <boxGeometry args={[0.5, height * 0.7, 0.35]} />
            <meshStandardMaterial color={col} opacity={0.8} transparent />
          </mesh>
          {/* Slanted top surface */}
          <mesh position={[0, height * 0.35, 0]} rotation={[-0.35, 0, 0]}>
            <boxGeometry args={[0.7, 0.04, 0.5]} />
            <meshStandardMaterial color="#1f2937" opacity={0.9} transparent />
          </mesh>
        </>
      ) : type === 'sitting-person' ? (
        <>
          {/* Seated body — shorter torso */}
          <mesh position={[0, -height * 0.1, 0]}>
            <cylinderGeometry args={[0.15, 0.15, height * 0.55, 8]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.2} opacity={0.65} transparent />
          </mesh>
          {/* Head */}
          <mesh position={[0, height * 0.3, 0]}>
            <sphereGeometry args={[0.14, 8, 8]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.2} opacity={0.65} transparent />
          </mesh>
          {/* Legs horizontal */}
          <mesh position={[0, -height * 0.45, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.6, 6]} />
            <meshStandardMaterial color={col} opacity={0.6} transparent />
          </mesh>
        </>
      ) : type === 'schneetiger' ? (
        <>
          {/* Body — elongated box, low profile */}
          <mesh position={[0, -height * 0.1, 0]}>
            <boxGeometry args={[1.5, height * 0.45, 0.6]} />
            <meshStandardMaterial color={col} roughness={0.6} opacity={0.95} transparent />
          </mesh>
          {/* Head */}
          <mesh position={[0.75, 0, 0]}>
            <sphereGeometry args={[0.25, 10, 10]} />
            <meshStandardMaterial color={col} roughness={0.6} />
          </mesh>
          {/* Ears */}
          <mesh position={[0.75, 0.25, -0.15]}>
            <coneGeometry args={[0.06, 0.12, 6]} />
            <meshStandardMaterial color={col} />
          </mesh>
          <mesh position={[0.75, 0.25, 0.15]}>
            <coneGeometry args={[0.06, 0.12, 6]} />
            <meshStandardMaterial color={col} />
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
          {/* Stripes hint */}
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
      {/* Label */}
      <Text position={[0, height * 0.5, 0]} fontSize={0.22} color={col} anchorX="center"
        outlineWidth={0.015} outlineColor="#000000">
        {label} ({height}m)
      </Text>
    </group>
  );
}

export default function Venue3D() {
  const { venue, cameras, persons, backgroundPlan, walls, updatePerson, selectCamera, selectedCameraId } = useStore();
  const appMode = useStore((s) => s.appMode);
  const placedFixtures = useStore((s) => s.placedFixtures);
  const customFixtures = useStore((s) => s.customFixtures);
  const selectedFixtureId = useStore((s) => s.selectedFixtureId);
  const drag3DLocked = useStore((s) => s.drag3DLocked);
  const heatMapEnabled = useStore((s) => s.heatMapEnabled);
  const heatMapTargetLux = useStore((s) => s.heatMapTargetLux);
  const heatMapScale = useStore((s) => s.heatMapScale);

  const fixtureLookup = useCallback(
    (id: string) => getFixtureById(id, customFixtures),
    [customFixtures],
  );

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
        <b style={{ color: '#60a5fa' }}>Left-drag</b> look &nbsp;|&nbsp;
        <b style={{ color: '#60a5fa' }}>Right-drag</b> move objects<br/>
        <b style={{ color: '#60a5fa' }}>WASD</b> Move &nbsp;|&nbsp;
        <b style={{ color: '#60a5fa' }}>Space/Shift</b> vertical &nbsp;|&nbsp;
        <b style={{ color: '#60a5fa' }}>Scroll</b> Dolly
      </div>

      {/* Drag lock toggle */}
      <button
        onClick={() => useStore.getState().toggleDrag3DLocked()}
        style={{
          position: 'absolute', top: 8, right: 128, zIndex: 10,
          background: drag3DLocked ? '#fbbf24cc' : '#1e293bcc',
          border: `1px solid ${drag3DLocked ? '#fbbf24' : '#334155'}`,
          color: drag3DLocked ? '#000' : '#94a3b8',
          padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
          backdropFilter: 'blur(4px)',
        }}
        title={drag3DLocked ? 'Drag locked — click to unlock' : 'Click to lock drag (prevents accidental movement)'}
      >
        {drag3DLocked ? '🔒 Drag locked' : '🔓 Drag free'}
      </button>

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
        <FPSControls mouseLookEnabled={true} />

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

        {/* Cameras — select by clicking, edit via Sidebar */}
        {cameras.map((cam) => (
          <CameraRig
            key={cam.id}
            cam={cam}
            isSelected={cam.id === selectedCameraId}
            onSelect={selectCamera}
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
              <meshStandardMaterial color="#6b7280" opacity={0.6} transparent />
            </mesh>
          );
        })}

        {/* Fixtures (lighting mode) */}
        {appMode === 'lighting' && placedFixtures.map((pf) => (
          <FixtureMesh3D
            key={pf.id}
            placed={pf}
            customFixtures={customFixtures}
            selected={selectedFixtureId === pf.id}
          />
        ))}

        {/* Lighting heat-map on floor */}
        {appMode === 'lighting' && heatMapEnabled && placedFixtures.length > 0 && (
          <HeatMapFloor3D
            placedFixtures={placedFixtures}
            fixtureLookup={fixtureLookup}
            widthM={venue.widthM}
            heightM={venue.heightM}
            targetLux={heatMapTargetLux}
            scaleLux={heatMapScale}
          />
        )}
      </Canvas>

      {/* Heat-map legend overlay (matches 2D) */}
      {appMode === 'lighting' && heatMapEnabled && placedFixtures.length > 0 && (
        <HeatMapLegend
          targetLux={heatMapTargetLux}
          scaleLux={heatMapScale}
          position="bottom-right"
        />
      )}
    </div>
  );
}
