import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text, PerspectiveCamera } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { getCameraById, getEffectiveSensor } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov } from '../../utils/fov';
import * as THREE from 'three';
import { useMemo } from 'react';

function StageMesh({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label: string }) {
  return (
    <group position={[x + w / 2, 0.05, y + h / 2]}>
      <mesh>
        <boxGeometry args={[w, 0.1, h]} />
        <meshStandardMaterial color="#3b82f6" opacity={0.3} transparent />
      </mesh>
      <Text position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.6} color="#3b82f6" anchorX="center">
        {label}
      </Text>
    </group>
  );
}

function FovPyramid({ cam }: { cam: ReturnType<typeof useStore.getState>['cameras'][0] }) {
  const { selectedCameraId } = useStore();
  const camDef = getCameraById(cam.cameraId);
  const lensDef = getLensById(cam.lensId);
  if (!camDef || !lensDef) return null;

  const sensor = getEffectiveSensor(camDef, lensDef);
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
        <meshStandardMaterial color={cam.color} />
      </mesh>
      {/* FOV volume */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={cam.color}
          opacity={isSelected ? 0.2 : 0.08}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Wireframe */}
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={cam.color} opacity={isSelected ? 0.6 : 0.2} transparent />
      </lineSegments>
      {/* Label */}
      <Text position={[0, 0.4, 0]} fontSize={0.3} color="#ffffff" anchorX="center">
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
        <meshStandardMaterial color="#f59e0b" opacity={0.5} transparent />
      </mesh>
      {/* Head */}
      <mesh position={[0, height * 0.3, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#f59e0b" opacity={0.5} transparent />
      </mesh>
      {/* Label */}
      <Text position={[0, height * 0.45, 0]} fontSize={0.2} color="#f59e0b" anchorX="center">
        {label}
      </Text>
    </group>
  );
}

export default function Venue3D() {
  const { venue, cameras, persons } = useStore();

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 500 }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[venue.widthM / 2, 15, venue.heightM + 10]} fov={50} />
        <OrbitControls target={[venue.widthM / 2, 0, venue.heightM / 2]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} />

        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[venue.widthM / 2, 0, venue.heightM / 2]}>
          <planeGeometry args={[venue.widthM, venue.heightM]} />
          <meshStandardMaterial color="#1a1d27" />
        </mesh>

        {/* Grid */}
        <Grid
          args={[venue.widthM, venue.heightM]}
          position={[venue.widthM / 2, 0.01, venue.heightM / 2]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#2a2d3a"
          sectionSize={5}
          sectionColor="#3a3d4a"
        />

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
