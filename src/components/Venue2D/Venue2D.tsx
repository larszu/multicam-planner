import { Stage, Layer, Rect, Wedge, Circle, Text, Group, Line, Image as KImage } from 'react-konva';
import { useStore } from '../../store/useStore';
import { getCameraById, getEffectiveSensor } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov } from '../../utils/fov';
import type { VenueCamera } from '../../types';
import { useRef, useCallback, useEffect, useState } from 'react';
import type Konva from 'konva';

export default function Venue2D() {
  const { venue, cameras, selectedCameraId, selectCamera, moveCamera, showAllFov, pixelsPerMeter, persons, updatePerson, updateStage, backgroundPlan } = useStore();
  const stageRef = useRef<Konva.Stage>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  const ppm = pixelsPerMeter;
  const W = venue.widthM * ppm;
  const H = venue.heightM * ppm;

  // Load background image when plan changes
  useEffect(() => {
    if (!backgroundPlan) { setBgImage(null); return; }
    const img = new window.Image();
    img.onload = () => setBgImage(img);
    img.src = backgroundPlan.dataUrl;
  }, [backgroundPlan?.dataUrl]);

  const handleCamDragEnd = useCallback(
    (cam: VenueCamera, e: Konva.KonvaEventObject<DragEvent>) => {
      const newX = e.target.x() / ppm;
      const newY = e.target.y() / ppm;
      moveCamera(cam.id, Math.max(0, Math.min(venue.widthM, newX)), Math.max(0, Math.min(venue.heightM, newY)));
    },
    [moveCamera, ppm, venue],
  );

  const handleStageDragEnd = useCallback(
    (stageId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const newX = e.target.x() / ppm;
      const newY = e.target.y() / ppm;
      updateStage(stageId, { x: Math.max(0, newX), y: Math.max(0, newY) });
    },
    [updateStage, ppm],
  );

  const handlePersonDragEnd = useCallback(
    (personId: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const newX = e.target.x() / ppm;
      const newY = e.target.y() / ppm;
      updatePerson(personId, { x: Math.max(0, Math.min(venue.widthM, newX)), y: Math.max(0, Math.min(venue.heightM, newY)) });
    },
    [updatePerson, ppm, venue],
  );

  return (
    <Stage ref={stageRef} width={W} height={H} style={{ background: '#111318', borderRadius: 8 }}>
      {/* Background plan image */}
      {bgImage && backgroundPlan && (
        <Layer>
          <KImage
            image={bgImage}
            x={(backgroundPlan.offsetX) * ppm}
            y={(backgroundPlan.offsetY) * ppm}
            width={backgroundPlan.widthPx * backgroundPlan.scale * ppm}
            height={backgroundPlan.heightPx * backgroundPlan.scale * ppm}
            opacity={backgroundPlan.opacity}
            listening={false}
          />
        </Layer>
      )}

      {/* Grid + rulers */}
      <Layer>
        {Array.from({ length: Math.floor(venue.widthM) + 1 }).map((_, i) => (
          <Group key={`vg-${i}`}>
            <Line points={[i * ppm, 0, i * ppm, H]} stroke="#1e2030" strokeWidth={1} />
            {/* Horizontal ruler text */}
            <Text x={i * ppm + 2} y={2} text={`${i}m`} fontSize={9} fill="#555" />
          </Group>
        ))}
        {Array.from({ length: Math.floor(venue.heightM) + 1 }).map((_, i) => (
          <Group key={`hg-${i}`}>
            <Line points={[0, i * ppm, W, i * ppm]} stroke="#1e2030" strokeWidth={1} />
            {/* Vertical ruler text */}
            <Text x={2} y={i * ppm + 2} text={`${i}m`} fontSize={9} fill="#555" />
          </Group>
        ))}
        {/* Venue border */}
        <Rect x={0} y={0} width={W} height={H} stroke="#2a2d3a" strokeWidth={2} />
      </Layer>

      {/* Stages (draggable) */}
      <Layer>
        {venue.stages.map((s) => (
          <Group
            key={s.id}
            x={s.x * ppm}
            y={s.y * ppm}
            draggable
            onDragEnd={(e) => handleStageDragEnd(s.id, e)}
          >
            <Rect
              width={s.width * ppm}
              height={s.height * ppm}
              fill="rgba(59,130,246,0.15)"
              stroke="#3b82f6"
              strokeWidth={2}
              cornerRadius={4}
            />
            <Text
              x={4}
              y={4}
              text={s.label}
              fontSize={12}
              fill="#3b82f6"
              fontStyle="bold"
            />
            {/* Stage dimensions */}
            <Text
              x={4}
              y={s.height * ppm - 16}
              text={`${s.width}×${s.height}m`}
              fontSize={9}
              fill="#3b82f688"
            />
          </Group>
        ))}
      </Layer>

      {/* Reference persons (draggable) */}
      <Layer>
        {persons.map((p) => (
          <Group
            key={p.id}
            x={p.x * ppm}
            y={p.y * ppm}
            draggable
            onDragEnd={(e) => handlePersonDragEnd(p.id, e)}
          >
            {/* Person circle */}
            <Circle radius={6} fill="#f59e0b" stroke="#fff" strokeWidth={1} opacity={0.8} />
            {/* Label */}
            <Text x={-20} y={8} text={`${p.label} (${p.height}m)`} fontSize={9} fill="#f59e0b" align="center" width={40} />
          </Group>
        ))}
      </Layer>

      {/* FOV cones */}
      <Layer>
        {cameras.map((cam) => {
          if (!showAllFov && cam.id !== selectedCameraId) return null;
          const camDef = getCameraById(cam.cameraId);
          const lensDef = getLensById(cam.lensId);
          if (!camDef || !lensDef) return null;

          const sensor = getEffectiveSensor(camDef, lensDef);
          const fov = computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive);
          const range = cam.focusDistance * ppm;
          const isSelected = cam.id === selectedCameraId;

          return (
            <Wedge
              key={`fov-${cam.id}`}
              x={cam.x * ppm}
              y={cam.y * ppm}
              radius={range}
              angle={fov.horizontalDeg}
              rotation={cam.pan - fov.horizontalDeg / 2}
              fill={cam.color + (isSelected ? '30' : '15')}
              stroke={cam.color + (isSelected ? 'cc' : '66')}
              strokeWidth={isSelected ? 2 : 1}
              listening={false}
            />
          );
        })}
      </Layer>

      {/* Camera icons */}
      <Layer>
        {cameras.map((cam) => {
          const isSelected = cam.id === selectedCameraId;
          return (
            <Group
              key={`cam-${cam.id}`}
              x={cam.x * ppm}
              y={cam.y * ppm}
              draggable
              onDragEnd={(e) => handleCamDragEnd(cam, e)}
              onClick={() => selectCamera(cam.id)}
              onTap={() => selectCamera(cam.id)}
            >
              {/* Camera body */}
              <Circle
                radius={isSelected ? 10 : 8}
                fill={cam.color}
                stroke={isSelected ? '#fff' : cam.color}
                strokeWidth={isSelected ? 3 : 1}
                shadowColor={cam.color}
                shadowBlur={isSelected ? 12 : 0}
              />
              {/* Direction indicator */}
              <Line
                points={[0, 0, 14 * Math.cos((cam.pan * Math.PI) / 180), 14 * Math.sin((cam.pan * Math.PI) / 180)]}
                stroke={cam.color}
                strokeWidth={2}
              />
              {/* Label */}
              <Text
                x={-16}
                y={12}
                text={cam.label}
                fontSize={11}
                fill="#fff"
                fontStyle="bold"
                align="center"
                width={32}
              />
            </Group>
          );
        })}
      </Layer>

      {/* Scale bar */}
      <Layer>
        <Line points={[10, H - 20, 10 + 5 * ppm, H - 20]} stroke="#666" strokeWidth={2} />
        <Line points={[10, H - 25, 10, H - 15]} stroke="#666" strokeWidth={2} />
        <Line points={[10 + 5 * ppm, H - 25, 10 + 5 * ppm, H - 15]} stroke="#666" strokeWidth={2} />
        <Text x={10} y={H - 38} text="5m" fontSize={11} fill="#666" />
      </Layer>
    </Stage>
  );
}
