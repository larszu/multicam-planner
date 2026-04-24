import { Canvas, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useEffect } from 'react';
import type { VenueCamera, ReferencePerson, StageObjectType, Wall, Stage } from '../../types';
import { getLiveCameraPosition } from '../../types';
import { computeFov } from '../../utils/fov';
import type { SensorSize } from '../../types';
import { useStore } from '../../store/useStore';
import FixtureMesh3D from '../Lighting/FixtureMesh3D';

/**
 * Photorealistic WebGL preview from a virtual camera's point of view.
 * Re-uses the venue geometry (walls, stages, persons, stage objects) but renders with
 * real lighting, shadows and HDRI environment for a production-looking still frame.
 */
interface Preview3DProps {
  cam: VenueCamera;
  cameras: VenueCamera[];
  persons: ReferencePerson[];
  walls: Wall[];
  stages: Stage[];
  sensor: SensorSize | undefined;
  width: number;
  height: number;
}

function PersonBody({ p }: { p: ReferencePerson }) {
  const type: StageObjectType = p.objectType ?? 'person';
  const color = p.color ?? (
    type === 'drums' ? '#ef4444' :
    type === 'keys' ? '#8b5cf6' :
    type === 'person-guitar' ? '#f97316' :
    type === 'sitting-person' ? '#38bdf8' :
    type === 'mic-stand' ? '#9ca3af' :
    type === 'chair' ? '#a16207' :
    type === 'table' ? '#a16207' :
    type === 'lectern' ? '#7c3aed' :
    type === 'schneetiger' ? '#e0f2fe' :
    '#d9a066'
  );
  const h = p.height;

  if (type === 'chair') {
    return (
      <group position={[p.x, 0, p.y]}>
        <mesh position={[0, h * 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.05, 0.5]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[0, h * 0.75, -0.22]} castShadow>
          <boxGeometry args={[0.5, h * 0.55, 0.05]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        {[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, h * 0.2, lz]} castShadow>
            <boxGeometry args={[0.04, h * 0.4, 0.04]} />
            <meshStandardMaterial color="#3f3f46" />
          </mesh>
        ))}
      </group>
    );
  }
  if (type === 'table') {
    return (
      <group position={[p.x, 0, p.y]}>
        <mesh position={[0, h * 0.82, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 0.06, 0.8]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
        </mesh>
        {[[-0.65, -0.35], [0.65, -0.35], [-0.65, 0.35], [0.65, 0.35]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, h * 0.41, lz]} castShadow>
            <boxGeometry args={[0.06, h * 0.78, 0.06]} />
            <meshStandardMaterial color="#3f3f46" />
          </mesh>
        ))}
      </group>
    );
  }
  if (type === 'lectern') {
    return (
      <group position={[p.x, 0, p.y]}>
        <mesh position={[0, h * 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, h * 0.7, 0.35]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0, h * 0.75, 0]} rotation={[-0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.7, 0.04, 0.5]} />
          <meshStandardMaterial color="#1f2937" roughness={0.5} />
        </mesh>
      </group>
    );
  }
  if (type === 'schneetiger') {
    return (
      <group position={[p.x, 0, p.y]}>
        <mesh position={[0, h * 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, h * 0.45, 0.6]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh position={[0.75, h * 0.65, 0]} castShadow>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        <mesh position={[0.75, h * 0.9, -0.15]} castShadow>
          <coneGeometry args={[0.06, 0.12, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0.75, h * 0.9, 0.15]} castShadow>
          <coneGeometry args={[0.06, 0.12, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[-0.85, h * 0.6, 0]} rotation={[0, 0, 0.4]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {[[-0.55, -0.22], [0.55, -0.22], [-0.55, 0.22], [0.55, 0.22]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, h * 0.2, lz]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, h * 0.4, 8]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
      </group>
    );
  }
  if (type === 'drums') {
    return (
      <group position={[p.x, 0, p.y]}>
        <mesh position={[0, h * 0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.5, 0.55, h * 0.5, 16]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[-0.3, h * 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.3, h * 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    );
  }
  if (type === 'keys') {
    return (
      <group position={[p.x, 0, p.y]}>
        <mesh position={[-0.4, h * 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, h * 0.6, 8]} />
          <meshStandardMaterial color="#52525b" metalness={0.3} />
        </mesh>
        <mesh position={[0.4, h * 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, h * 0.6, 8]} />
          <meshStandardMaterial color="#52525b" metalness={0.3} />
        </mesh>
        <mesh position={[0, h * 0.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.1, 0.4]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
        <mesh position={[0, h * 0.71, 0.1]} castShadow>
          <boxGeometry args={[1.15, 0.03, 0.18]} />
          <meshStandardMaterial color="#fafafa" roughness={0.4} />
        </mesh>
      </group>
    );
  }
  if (type === 'mic-stand') {
    return (
      <group position={[p.x, 0, p.y]}>
        <mesh position={[0, h * 0.02, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.2, 0.04, 16]} />
          <meshStandardMaterial color="#27272a" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, h * 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, h, 8]} />
          <meshStandardMaterial color="#a1a1aa" metalness={0.6} />
        </mesh>
        <mesh position={[0, h * 1.0, 0]} castShadow>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshStandardMaterial color="#18181b" roughness={0.8} />
        </mesh>
      </group>
    );
  }
  if (type === 'sitting-person') {
    return (
      <group position={[p.x, 0, p.y]}>
        {/* Stool */}
        <mesh position={[0, h * 0.35, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.04, 16]} />
          <meshStandardMaterial color="#44403c" roughness={0.7} />
        </mesh>
        <mesh position={[0, h * 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, h * 0.35, 8]} />
          <meshStandardMaterial color="#27272a" metalness={0.4} />
        </mesh>
        {/* Torso */}
        <mesh position={[0, h * 0.65, 0]} castShadow>
          <capsuleGeometry args={[0.18, h * 0.25, 8, 16]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        {/* Head */}
        <mesh position={[0, h * 0.95, 0]} castShadow>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshStandardMaterial color="#d9a066" roughness={0.6} />
        </mesh>
        {/* Thighs */}
        <mesh position={[0, h * 0.42, 0.25]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.4, 6, 10]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      </group>
    );
  }

  // Standing person (or guitarist)
  return (
    <group position={[p.x, 0, p.y]}>
      {/* Legs */}
      <mesh position={[-0.1, h * 0.25, 0]} castShadow>
        <capsuleGeometry args={[0.07, h * 0.4, 6, 10]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      <mesh position={[0.1, h * 0.25, 0]} castShadow>
        <capsuleGeometry args={[0.07, h * 0.4, 6, 10]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, h * 0.65, 0]} castShadow>
        <capsuleGeometry args={[0.17, h * 0.35, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Head */}
      <mesh position={[0, h * 0.93, 0]} castShadow>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial color="#d9a066" roughness={0.6} />
      </mesh>
      {/* Hair */}
      <mesh position={[0, h * 0.97, -0.01]} castShadow>
        <sphereGeometry args={[0.115, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color="#3f2e1a" roughness={0.9} />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.22, h * 0.7, 0]} rotation={[0, 0, 0.15]} castShadow>
        <capsuleGeometry args={[0.06, h * 0.3, 6, 10]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0.22, h * 0.7, 0]} rotation={[0, 0, -0.15]} castShadow>
        <capsuleGeometry args={[0.06, h * 0.3, 6, 10]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {type === 'person-guitar' && (
        <mesh position={[0.18, h * 0.55, 0.2]} rotation={[0.2, 0, 0.4]} castShadow>
          <boxGeometry args={[0.12, h * 0.35, 0.08]} />
          <meshStandardMaterial color="#92400e" roughness={0.5} metalness={0.15} />
        </mesh>
      )}
    </group>
  );
}

function WallMesh({ wall }: { wall: Wall }) {
  const cx = (wall.x1 + wall.x2) / 2;
  const cz = (wall.y1 + wall.y2) / 2;
  const dx = wall.x2 - wall.x1;
  const dz = wall.y2 - wall.y1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  return (
    <mesh position={[cx, wall.height / 2, cz]} rotation={[0, -angle, 0]} castShadow receiveShadow>
      <boxGeometry args={[len, wall.height, 0.12]} />
      <meshStandardMaterial color="#1f2937" roughness={0.85} />
    </mesh>
  );
}

function StageFloor({ s }: { s: Stage }) {
  return (
    <mesh position={[s.x + s.width / 2, 0.02, s.y + s.height / 2]} receiveShadow>
      <boxGeometry args={[s.width, 0.04, s.height]} />
      <meshStandardMaterial color="#312e81" roughness={0.7} />
    </mesh>
  );
}

function CameraRigMesh({ cam }: { cam: VenueCamera }) {
  const live = getLiveCameraPosition(cam);
  const bodyH = 0.18;
  const bodyW = 0.22;
  const bodyL = 0.34;
  const yawRad = THREE.MathUtils.degToRad(-cam.pan - 90);
  return (
    <group position={[live.x, 0, live.y]}>
      {/* Tripod legs */}
      {[0, 120, 240].map((deg) => {
        const r = THREE.MathUtils.degToRad(deg);
        return (
          <mesh
            key={deg}
            position={[Math.cos(r) * 0.18, live.z / 2, Math.sin(r) * 0.18]}
            rotation={[Math.atan2(0.18, live.z), 0, -Math.atan2(Math.sin(r) * 0.18, live.z)]}
            castShadow
          >
            <cylinderGeometry args={[0.015, 0.02, live.z * 1.05, 8]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.55} metalness={0.3} />
          </mesh>
        );
      })}
      {/* Head + body yawed by pan */}
      <group position={[0, live.z, 0]} rotation={[0, yawRad, 0]}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[bodyW, bodyH, bodyL]} />
          <meshStandardMaterial color="#0f0f10" roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Lens barrel */}
        <mesh
          position={[0, 0.04, -bodyL / 2 - 0.08]}
          rotation={[Math.PI / 2 + THREE.MathUtils.degToRad(cam.tilt), 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.05, 0.05, 0.16, 16]} />
          <meshStandardMaterial color="#151515" roughness={0.35} metalness={0.6} />
        </mesh>
        {/* Red tally */}
        <mesh position={[0, 0.04 + bodyH / 2 + 0.012, 0.1]} castShadow>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.5} />
        </mesh>
      </group>
      <Text position={[0, live.z + 0.25, 0]} fontSize={0.18} color="#f87171" anchorX="center" anchorY="middle">
        {cam.label}
      </Text>
    </group>
  );
}

function StageSpotlight({ target }: { target: [number, number, number] }) {
  const lightRef = useMemo(() => new THREE.Object3D(), []);
  lightRef.position.set(target[0], target[1], target[2]);
  return (
    <>
      <primitive object={lightRef} />
      <spotLight
        position={[target[0] - 3, 6, target[2] - 3]}
        angle={0.55}
        penumbra={0.6}
        intensity={120}
        distance={25}
        decay={1.5}
        color="#ffe8c2"
        castShadow
        target={lightRef}
      />
      <spotLight
        position={[target[0] + 3, 6, target[2] - 3]}
        angle={0.55}
        penumbra={0.6}
        intensity={120}
        distance={25}
        decay={1.5}
        color="#dceaff"
        castShadow
        target={lightRef}
      />
    </>
  );
}

function CanvasExposer() {
  const { gl } = useThree();
  useEffect(() => {
    (window as any).__capturePreviewCanvas = () => gl.domElement;
    return () => { delete (window as any).__capturePreviewCanvas; };
  }, [gl]);
  return null;
}

export default function Preview3D({ cam, cameras, persons, walls, stages, sensor, width, height }: Preview3DProps) {
  const live = getLiveCameraPosition(cam);
  const appMode = useStore((s) => s.appMode);
  const placedFixtures = useStore((s) => s.placedFixtures);
  const customFixtures = useStore((s) => s.customFixtures);

  // Compute horizontal FOV from sensor + focal length; R3F expects vertical FOV
  const fovVerticalDeg = useMemo(() => {
    if (!sensor) return 45;
    const fov = computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive);
    return fov.verticalDeg;
  }, [sensor, cam.focalLength, cam.focusDistance, cam.extenderActive]);

  // Camera rotation: R3F uses Y-up, XZ ground plane. Pan around Y, tilt around local X.
  const rotation = useMemo(() => {
    const e = new THREE.Euler(
      THREE.MathUtils.degToRad(cam.tilt),
      THREE.MathUtils.degToRad(-cam.pan - 90), // −90° aligns pan=0 with +Y in planner
      0,
      'YXZ'
    );
    return e;
  }, [cam.pan, cam.tilt]);

  // Each person faces the nearest camera (on the ground plane)
  const personsWithYaw = useMemo(() => {
    return persons.map((p) => {
      let best: VenueCamera | null = null;
      let bestD = Infinity;
      for (const c of cameras) {
        const cp = getLiveCameraPosition(c);
        const d = (cp.x - p.x) * (cp.x - p.x) + (cp.y - p.y) * (cp.y - p.y);
        if (d < bestD) { bestD = d; best = c; }
      }
      let yaw = 0;
      if (best) {
        const cp = getLiveCameraPosition(best);
        // Persons should face TOWARDS the camera: in R3F the person mesh's "front" is +Z by construction,
        // so yaw rotates around Y axis (world).
        yaw = Math.atan2(cp.x - p.x, cp.y - p.y);
      }
      return { p, yaw };
    });
  }, [persons, cameras]);

  // Stage centre for spot lights
  const stageCenter: [number, number, number] | null = stages.length > 0
    ? [stages[0].x + stages[0].width / 2, 0.5, stages[0].y + stages[0].height / 2]
    : null;

  return (
    <div data-preview-3d="true" style={{ width, height, position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <PerspectiveCamera
          makeDefault
          position={[live.x, live.z, live.y]}
          rotation={rotation as any}
          fov={fovVerticalDeg}
          near={0.1}
          far={400}
        />
        {/* Lighting */}
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[10, 14, 6]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
        />
        <CanvasExposer />
        <hemisphereLight args={['#8ab4ff', '#2a2d2f', 0.3]} />
        {stageCenter && appMode !== 'lighting' && <StageSpotlight target={stageCenter} />}

        {/* Lit by the actual rig in Licht-Modus */}
        {appMode === 'lighting' && placedFixtures.map((pf) => (
          <FixtureMesh3D key={pf.id} placed={pf} customFixtures={customFixtures} showVolumetric={false} />
        ))}

        {/* HDRI environment removed (photorealistic mode disabled) */}

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#111827" roughness={0.9} />
        </mesh>

        {/* Venue geometry */}
        {walls.map((w) => <WallMesh key={w.id} wall={w} />)}
        {stages.map((s) => <StageFloor key={s.id} s={s} />)}
        {personsWithYaw.map(({ p, yaw }) => (
          <group key={p.id} position={[p.x, 0, p.y]} rotation={[0, yaw, 0]}>
            <PersonBody p={{ ...p, x: 0, y: 0 }} />
          </group>
        ))}

        {/* Other cameras as physical rigs */}
        {cameras.filter((c) => c.id !== cam.id).map((c) => (
          <CameraRigMesh key={c.id} cam={c} />
        ))}

        {/* Subtle distance fog */}
        <fog attach="fog" args={['#0a0e14', 8, 120]} />

        {/* Small on-screen label if no persons (empty scene hint) */}
        {persons.length === 0 && (
          <Text position={[live.x + Math.cos(THREE.MathUtils.degToRad(cam.pan)) * 4, live.z, live.y + Math.sin(THREE.MathUtils.degToRad(cam.pan)) * 4]} fontSize={0.4} color="#475569">
            (no subjects placed)
          </Text>
        )}
      </Canvas>
    </div>
  );
}
