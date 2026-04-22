import { useEffect, useMemo, useState } from 'react';
import { Image as KImage, Rect } from 'react-konva';
import { computeHeatMap, luxToColor, luxToColorTarget } from '../../utils/lightCalc';
import type { PlacedFixture, Fixture } from '../../types/lighting';

interface Props {
  placedFixtures: PlacedFixture[];
  fixtureLookup: (id: string) => Fixture | undefined;
  originX: number; // metres
  originY: number;
  widthM: number;
  heightM: number;
  ppm: number;
  targetLux: number;
  scaleLux: number; // fallback scale when targetLux=0
  resolution?: number; // grid cells along longest side
}

/**
 * Renders the photometric heat-map as a Konva Image overlay.
 * Recomputes whenever fixtures / target / scale / world rect change.
 */
export default function HeatMapOverlay({
  placedFixtures, fixtureLookup, originX, originY, widthM, heightM, ppm,
  targetLux, scaleLux, resolution = 140,
}: Props) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  const cacheKey = useMemo(() => {
    return `${placedFixtures.map((f) =>
      `${f.id}:${f.x.toFixed(2)}:${f.y.toFixed(2)}:${f.z.toFixed(2)}:${f.aimX.toFixed(2)}:${f.aimY.toFixed(2)}:${f.dimming}:${f.currentBeamAngle ?? 'd'}:${(f.gelFilterIds ?? []).join(',')}`
    ).join('|')}|${originX.toFixed(1)}|${originY.toFixed(1)}|${widthM.toFixed(1)}|${heightM.toFixed(1)}|${targetLux}|${scaleLux}|${resolution}`;
  }, [placedFixtures, originX, originY, widthM, heightM, targetLux, scaleLux, resolution]);

  useEffect(() => {
    if (placedFixtures.length === 0 || widthM <= 0 || heightM <= 0) {
      setCanvas(null);
      return;
    }
    const aspect = widthM / heightM;
    const resX = aspect >= 1 ? resolution : Math.max(20, Math.round(resolution * aspect));
    const resY = aspect >= 1 ? Math.max(20, Math.round(resolution / aspect)) : resolution;

    const { data } = computeHeatMap(
      placedFixtures, fixtureLookup,
      originX, originY, widthM, heightM,
      resX, resY,
    );

    const off = document.createElement('canvas');
    off.width = resX; off.height = resY;
    const ctx = off.getContext('2d');
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
    setCanvas(off);
  }, [cacheKey, fixtureLookup, placedFixtures, originX, originY, widthM, heightM, targetLux, scaleLux, resolution]);

  if (!canvas) {
    return (
      <Rect
        x={originX * ppm}
        y={originY * ppm}
        width={widthM * ppm}
        height={heightM * ppm}
        fill="transparent"
        listening={false}
      />
    );
  }

  return (
    <KImage
      image={canvas}
      x={originX * ppm}
      y={originY * ppm}
      width={widthM * ppm}
      height={heightM * ppm}
      listening={false}
      opacity={0.75}
    />
  );
}
