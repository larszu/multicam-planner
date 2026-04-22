import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { getFixtureById, FIXTURE_CATEGORY_COLOR } from '../../data/fixtures';
import { gelStackColor } from '../../data/gels';
import type { PlacedFixture, Fixture } from '../../types/lighting';

interface Props {
  placed: PlacedFixture;
  customFixtures: Fixture[];
  showVolumetric?: boolean;
  selected?: boolean;
}

/**
 * Renders a placed fixture as an R3F scene element: yoke + body + spot light
 * aimed at the floor target, with optional volumetric beam cone.
 */
export default function FixtureMesh3D({ placed, customFixtures, showVolumetric = true, selected = false }: Props) {
  const fixture = getFixtureById(placed.fixtureId, customFixtures);
  const lightRef = useRef<THREE.SpotLight>(null!);
  const targetRef = useRef<THREE.Object3D>(new THREE.Object3D());

  useEffect(() => {
    if (lightRef.current) {
      lightRef.current.target = targetRef.current;
    }
  }, []);

  const colorHex = useMemo(() => {
    if (!fixture) return '#ffffff';
    const gel = gelStackColor(placed.gelFilterIds);
    if (gel) return gel;
    // CCT -> warm/cool tint
    const cct = placed.currentColorTemp ?? fixture.colorTemp;
    if (!cct) return FIXTURE_CATEGORY_COLOR[fixture.category];
    if (cct >= 5500) return '#ffffff';
    if (cct >= 4200) return '#fff4d8';
    if (cct >= 3400) return '#ffd99f';
    return '#ffc28a';
  }, [fixture, placed.gelFilterIds, placed.currentColorTemp]);

  if (!fixture) return null;

  const beamAngle = (placed.currentBeamAngle ?? fixture.fieldAngle);
  const halfAngleRad = (beamAngle / 2) * (Math.PI / 180);
  // Scene uses: x=plan-x, y=height (z in PlacedFixture), z=plan-y
  const pos: [number, number, number] = [placed.x, placed.z, placed.y];
  const targetPos: [number, number, number] = [placed.aimX, 0, placed.aimY];
  const throwDist = Math.hypot(placed.aimX - placed.x, placed.aimY - placed.y, placed.z);

  // Intensity scaling: wattage * dimming (with a sensible cap so scene isn't blown out)
  const intensity = Math.min(8, (fixture.wattage / 150) * (placed.dimming / 100));

  // Body orientation so yoke visually points toward aim
  const yaw = Math.atan2(placed.aimX - placed.x, placed.aimY - placed.y);

  return (
    <group>
      <spotLight
        ref={lightRef}
        position={pos}
        angle={halfAngleRad}
        penumbra={0.4}
        intensity={intensity}
        distance={Math.max(throwDist * 1.6, 20)}
        color={colorHex}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
      <primitive object={targetRef.current} position={targetPos} />

      {/* Yoke + body */}
      <group position={pos} rotation={[0, yaw, 0]}>
        {/* Mounting plate / truss clamp */}
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.22, 0.04, 0.12]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        {/* Yoke arms */}
        <mesh position={[-0.12, -0.05, 0]}>
          <boxGeometry args={[0.02, 0.25, 0.02]} />
          <meshStandardMaterial color="#555" />
        </mesh>
        <mesh position={[0.12, -0.05, 0]}>
          <boxGeometry args={[0.02, 0.25, 0.02]} />
          <meshStandardMaterial color="#555" />
        </mesh>
        {/* Body (fixture housing) */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.28, 16]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Lens / front glow */}
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.02, 24]} />
          <meshStandardMaterial color={colorHex} emissive={colorHex} emissiveIntensity={placed.dimming / 100} />
        </mesh>

        {/* Selection ring */}
        {selected && (
          <mesh position={[0, -0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.18, 0.22, 32]} />
            <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>

      {/* Volumetric cone (visualisation) */}
      {showVolumetric && throwDist > 0.1 && (
        <VolumetricCone
          from={pos}
          to={targetPos}
          halfAngleRad={halfAngleRad}
          color={colorHex}
          opacity={0.07 * (placed.dimming / 100)}
        />
      )}
    </group>
  );
}

function VolumetricCone({ from, to, halfAngleRad, color, opacity }: {
  from: [number, number, number];
  to: [number, number, number];
  halfAngleRad: number;
  color: string;
  opacity: number;
}) {
  const [fx, fy, fz] = from;
  const [tx, ty, tz] = to;
  const dx = tx - fx, dy = ty - fy, dz = tz - fz;
  const length = Math.hypot(dx, dy, dz);
  const radius = Math.tan(halfAngleRad) * length;

  // ConeGeometry has apex at local +Y and base (wide) at local -Y.
  // We want the APEX at the fixture ('from') and the WIDE BASE at the target ('to').
  // So rotate so local +Y points from target -> fixture (i.e. the negated direction).
  const mid: [number, number, number] = [(fx + tx) / 2, (fy + ty) / 2, (fz + tz) / 2];
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3(-dx, -dy, -dz).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
  const euler = new THREE.Euler().setFromQuaternion(quat);

  return (
    <mesh position={mid} rotation={[euler.x, euler.y, euler.z]}>
      <coneGeometry args={[radius, length, 24, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}
