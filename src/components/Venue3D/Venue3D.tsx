import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, Text, PerspectiveCamera } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { getCameraById, getEffectiveSensor } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov } from '../../utils/fov';
import * as THREE from 'three';
import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import type { BackgroundPlan, StageObjectType } from '../../types';

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
 * Mouse     = look (hold left-click or right-click)
 * Scroll    = move forward/back (dolly)
 * Ctrl      = sprint (2×)
 */
function FPSControls() {
  const { camera, gl } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const yaw = useRef(0);
  const pitch = useRef(-0.3);
  const isLooking = useRef(false);
  const speed = 6; // m/s base

  // Sync yaw/pitch from initial camera orientation
  useEffect(() => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    yaw.current = Math.atan2(-dir.x, -dir.z);
    pitch.current = Math.asin(Math.max(-1, Math.min(1, dir.y)));
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
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(k) || e.code === 'Space' || e.key === 'Shift' || e.key === 'Control') {
        e.preventDefault();
        keys.current.add(e.code === 'Space' ? ' ' : k === 'control' ? 'ctrl' : k);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.current.delete(e.code === 'Space' ? ' ' : k === 'control' ? 'ctrl' : k);
    };

    const onMouseDown = (e: MouseEvent) => {
      isLooking.current = true;
      canvas.style.cursor = 'grabbing';
      // Try pointer lock for smoother FPS look
      if (e.button === 2) {
        canvas.requestPointerLock?.();
      }
    };
    const onMouseUp = () => {
      isLooking.current = false;
      canvas.style.cursor = 'grab';
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
    canvas.style.cursor = 'grab';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContext);
    };
  }, [camera, gl]);

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

    // Apply look direction
    const dir = new THREE.Vector3(
      -Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      -Math.cos(yaw.current) * Math.cos(pitch.current),
    );
    camera.lookAt(camera.position.clone().add(dir));
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
      <Text position={[0, 0.15, h / 2 + 0.3]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.25} color="#60a5fa88" anchorX="center">
        {w}×{h}m
      </Text>
    </group>
  );
}

function FovPyramid({ cam }: { cam: ReturnType<typeof useStore.getState>['cameras'][0] }) {
  const { selectedCameraId } = useStore();
  const camDef = getCameraById(cam.cameraId);
  const lensDef = getLensById(cam.lensId);
  if (!camDef || !lensDef) return null;

  const sensor = getEffectiveSensor(camDef, lensDef, cam.useSpeedbooster);
  const fov = computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive);
  const isSelected = cam.id === selectedCameraId;

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

  const panRad = (cam.pan * Math.PI) / 180;
  const tiltRad = (cam.tilt * Math.PI) / 180;

  return (
    <group position={[cam.x, cam.z, cam.y]} rotation={[tiltRad, -panRad - Math.PI / 2, 0]}>
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
      {/* Label */}
      <Text position={[0, 0.5, 0]} fontSize={0.35} color="#ffffff" anchorX="center" fontWeight="bold"
        outlineWidth={0.02} outlineColor="#000000">
        {cam.label}
      </Text>
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

function PersonMesh({ x, z, height, label, objectType }: { x: number; z: number; height: number; label: string; objectType?: StageObjectType }) {
  const type = objectType ?? 'person';
  const color = type === 'drums' ? '#ef4444' : type === 'keys' ? '#8b5cf6' : type === 'person-guitar' ? '#f97316' : type === 'mic-stand' ? '#6b7280' : '#f59e0b';

  return (
    <group position={[x, height / 2, z]}>
      {type === 'drums' ? (
        <>
          {/* Drum kit - wider base, shorter */}
          <mesh position={[0, -height * 0.15, 0]}>
            <cylinderGeometry args={[0.5, 0.6, height * 0.5, 12]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} opacity={0.6} transparent />
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
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} opacity={0.6} transparent />
          </mesh>
          {/* Stand legs */}
          <mesh position={[-0.4, -height * 0.35, 0]}>
            <cylinderGeometry args={[0.03, 0.03, height * 0.5, 6]} />
            <meshStandardMaterial color="#9ca3af" opacity={0.5} transparent />
          </mesh>
          <mesh position={[0.4, -height * 0.35, 0]}>
            <cylinderGeometry args={[0.03, 0.03, height * 0.5, 6]} />
            <meshStandardMaterial color="#9ca3af" opacity={0.5} transparent />
          </mesh>
        </>
      ) : (
        <>
          {/* Body */}
          <mesh position={[0, -height * 0.1, 0]}>
            <cylinderGeometry args={[0.15, 0.15, height * 0.65, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} opacity={0.6} transparent />
          </mesh>
          {/* Head */}
          <mesh position={[0, height * 0.3, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} opacity={0.6} transparent />
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
      <Text position={[0, height * 0.5, 0]} fontSize={0.22} color={color} anchorX="center"
        outlineWidth={0.015} outlineColor="#000000">
        {label} ({height}m)
      </Text>
    </group>
  );
}

export default function Venue3D() {
  const { venue, cameras, persons, backgroundPlan } = useStore();

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
        <b style={{ color: '#60a5fa' }}>WASD</b> Move &nbsp;|&nbsp;
        <b style={{ color: '#60a5fa' }}>Space</b> Up &nbsp;|&nbsp;
        <b style={{ color: '#60a5fa' }}>Shift</b> Down &nbsp;|&nbsp;
        <b style={{ color: '#60a5fa' }}>Ctrl</b> Sprint<br/>
        <b style={{ color: '#60a5fa' }}>Mouse drag</b> Look &nbsp;|&nbsp;
        <b style={{ color: '#60a5fa' }}>Scroll</b> Dolly &nbsp;|&nbsp;
        <b style={{ color: '#60a5fa' }}>Right-click</b> Pointer lock
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
        <FPSControls />

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

        {/* Cameras with FOV */}
        {cameras.map((cam) => (
          <FovPyramid key={cam.id} cam={cam} />
        ))}

        {/* Reference persons from store */}
        {persons.map((p) => (
          <PersonMesh key={p.id} x={p.x} z={p.y} height={p.height} label={p.label} objectType={p.objectType} />
        ))}
      </Canvas>
    </div>
  );
}
