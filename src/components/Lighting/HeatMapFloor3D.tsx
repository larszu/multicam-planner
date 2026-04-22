import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { computeHeatMap, luxToColor, luxToColorTarget } from '../../utils/lightCalc';
import type { PlacedFixture, Fixture } from '../../types/lighting';

interface Props {
  placedFixtures: PlacedFixture[];
  fixtureLookup: (id: string) => Fixture | undefined;
  widthM: number;
  heightM: number;
  targetLux: number;
  scaleLux: number;
  resolution?: number;
}

/**
 * Renders the photometric heat-map as a textured plane slightly above the
 * 3D floor. Uses the same colour mapping as the 2D Konva overlay so both
 * views stay in sync.
 */
export default function HeatMapFloor3D({
  placedFixtures,
  fixtureLookup,
  widthM,
  heightM,
  targetLux,
  scaleLux,
  resolution = 140,
}: Props) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cacheKey = useMemo(() => {
    return `${placedFixtures.map((f) =>
      `${f.id}:${f.x.toFixed(2)}:${f.y.toFixed(2)}:${f.z.toFixed(2)}:${f.aimX.toFixed(2)}:${f.aimY.toFixed(2)}:${f.dimming}:${f.currentBeamAngle ?? 'd'}:${(f.gelFilterIds ?? []).join(',')}`
    ).join('|')}|${widthM.toFixed(1)}|${heightM.toFixed(1)}|${targetLux}|${scaleLux}|${resolution}`;
  }, [placedFixtures, widthM, heightM, targetLux, scaleLux, resolution]);

  useEffect(() => {
    if (placedFixtures.length === 0 || widthM <= 0 || heightM <= 0) {
      setTexture(null);
      return;
    }
    const aspect = widthM / heightM;
    const resX = aspect >= 1 ? resolution : Math.max(20, Math.round(resolution * aspect));
    const resY = aspect >= 1 ? Math.max(20, Math.round(resolution / aspect)) : resolution;

    const { data } = computeHeatMap(
      placedFixtures,
      fixtureLookup,
      0,
      0,
      widthM,
      heightM,
      resX,
      resY,
    );

    const canvas = canvasRef.current ?? document.createElement('canvas');
    canvas.width = resX;
    canvas.height = resY;
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(resX, resY);
    const useTarget = targetLux > 0;
    for (let i = 0; i < data.length; i++) {
      const [r, g, b, a] = useTarget
        ? luxToColorTarget(data[i], targetLux)
        : luxToColor(data[i], scaleLux);
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = a;
    }
    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    // Default flipY=true is correct: the plane is rotated -PI/2 around X, so
    // canvas row 0 (low plan-y / py≈0) must land at UV v=1, which after the
    // rotation sits at world z=0 — matching the 2D overlay orientation.
    tex.needsUpdate = true;
    setTexture((prev) => {
      prev?.dispose();
      return tex;
    });

    return () => {
      tex.dispose();
    };
  }, [cacheKey, placedFixtures, fixtureLookup, widthM, heightM, targetLux, scaleLux, resolution]);

  if (!texture) return null;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[widthM / 2, 0.02, heightM / 2]}
      renderOrder={2}
    >
      <planeGeometry args={[widthM, heightM]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.75}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
