import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Text, PerspectiveCamera } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { getCameraById, getEffectiveSensor } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov } from '../../utils/fov';
import * as THREE from 'three';
import { useMemo, useRef, useEffect, useState, useCallback } from 'react';

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

/* ── WASD First-person walk controller ── */
function WASDControls({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const yaw = useRef(0);
  const pitch = useRef(-0.3);
  const speed = 8; // m/s

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'q', 'e'].includes(k)) {
        e.preventDefault();
        if (down) keys.current.add(k); else keys.current.delete(k);
      }
    };
    const onDown = (e: KeyboardEvent) => onKey(e, true);
    const onUp = (e: KeyboardEvent) => onKey(e, false);
    const onMouse = (e: MouseEvent) => {
      if (!(e.buttons & 2)) return; // right-click drag for look
      yaw.current -= e.movementX * 0.003;
      pitch.current -= e.movementY * 0.003;
      pitch.current = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch.current));
    };
    const onContext = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('contextmenu', onContext);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('contextmenu', onContext);
    };
  }, [enabled]);

  useFrame((_, delta) => {
    if (!enabled) return;
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const move = new THREE.Vector3();
    if (keys.current.has('w')) move.add(forward);
    if (keys.current.has('s')) move.sub(forward);
    if (keys.current.has('d')) move.add(right);
    if (keys.current.has('a')) move.sub(right);
    if (keys.current.has('e')) move.y += 1;
    if (keys.current.has('q')) move.y -= 1;
    if (move.length() > 0) {
      move.normalize().multiplyScalar(speed * delta);
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

function PersonMesh({ x, z, height, label }: { x: number; z: number; height: number; label: string }) {
  return (
    <group position={[x, height / 2, z]}>
      {/* Body */}
      <mesh position={[0, -height * 0.1, 0]}>
        <cylinderGeometry args={[0.15, 0.15, height * 0.65, 8]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.2} opacity={0.6} transparent />
      </mesh>
      {/* Head */}
      <mesh position={[0, height * 0.3, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.2} opacity={0.6} transparent />
      </mesh>
      {/* Label */}
      <Text position={[0, height * 0.5, 0]} fontSize={0.22} color="#fbbf24" anchorX="center"
        outlineWidth={0.015} outlineColor="#000000">
        {label} ({height}m)
      </Text>
    </group>
  );
}

export default function Venue3D() {
  const { venue, cameras, persons } = useStore();
  const [walkMode, setWalkMode] = useState(false);
  const controlsRef = useRef<any>(null);

  const toggleWalk = useCallback(() => setWalkMode((v) => !v), []);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 500, position: 'relative' }}>
      {/* Mode indicator overlay */}
      <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', gap: 6 }}>
        <button
          onClick={toggleWalk}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: `1px solid ${walkMode ? '#3b82f6' : '#4a5568'}`,
            background: walkMode ? '#3b82f620' : '#1a1d2799',
            color: walkMode ? '#60a5fa' : '#9ca3af',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
          }}
        >
          {walkMode ? '🚶 WASD Walk (active)' : '🎥 Orbit Mode'}
        </button>
      </div>
      {walkMode && (
        <div style={{
          position: 'absolute', bottom: 8, left: 8, zIndex: 10,
          background: '#000000aa', padding: '8px 12px', borderRadius: 6,
          fontSize: 11, color: '#9ca3af', lineHeight: 1.5, backdropFilter: 'blur(4px)',
        }}>
          <b style={{ color: '#60a5fa' }}>WASD</b> Move &nbsp;|&nbsp;
          <b style={{ color: '#60a5fa' }}>Q/E</b> Down/Up &nbsp;|&nbsp;
          <b style={{ color: '#60a5fa' }}>Right-click drag</b> Look
        </div>
      )}

      <Canvas shadows gl={{ preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[venue.widthM / 2, 15, venue.heightM + 10]} fov={50} />
        {!walkMode && (
          <OrbitControls ref={controlsRef} target={[venue.widthM / 2, 0, venue.heightM / 2]} />
        )}
        <WASDControls enabled={walkMode} />

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
          <PersonMesh key={p.id} x={p.x} z={p.y} height={p.height} label={p.label} />
        ))}
      </Canvas>
    </div>
  );
}
