import { Stage, Layer, Rect, Wedge, Circle, Text, Group, Line, Image as KImage } from 'react-konva';
import { useStore } from '../../store/useStore';
import { getCameraById, getEffectiveSensor } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov } from '../../utils/fov';
import type { VenueCamera } from '../../types';
import React, { useRef, useCallback, useEffect, useState } from 'react';
import type Konva from 'konva';

export default function Venue2D() {
  const { venue, setVenue, cameras, selectedCameraId, selectCamera, moveCamera, showAllFov, pixelsPerMeter, persons, updatePerson, updateStage, backgroundPlan, setBackgroundPlan, walls, updateWall } = useStore();
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // Expose stage ref and venue pixel dims for export capture
  useEffect(() => {
    (window as any).__konvaStage = stageRef.current;
    (window as any).__konvaVenueSize = { w: worldW, h: worldH };
    return () => { (window as any).__konvaStage = null; (window as any).__konvaVenueSize = null; };
  });

  // Calibration state
  const [calibActive, setCalibActive] = useState(false);
  const [calibDistM, setCalibDistM] = useState(10);
  const [calibAxis, setCalibAxis] = useState<'x' | 'y'>('x');
  const [calibAutoResize, setCalibAutoResize] = useState(true);
  const [calibScaleLocked, setCalibScaleLocked] = useState(true);
  const [calibPoints, setCalibPoints] = useState<{ x: number; y: number }[]>([]);

  const ppm = pixelsPerMeter;
  const W = venue.widthM * ppm;
  const H = venue.heightM * ppm;

  // Compute world extent including background image
  const bgExtentW = backgroundPlan ? (backgroundPlan.offsetX + backgroundPlan.widthPx * backgroundPlan.scaleX) * ppm : 0;
  const bgExtentH = backgroundPlan ? (backgroundPlan.offsetY + backgroundPlan.heightPx * backgroundPlan.scaleY) * ppm : 0;
  const worldW = Math.max(W, bgExtentW);
  const worldH = Math.max(H, bgExtentH);

  // Measure container and auto-fit zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-fit when venue or container changes (fit full extent)
  useEffect(() => {
    const scaleX = containerSize.w / worldW;
    const scaleY = containerSize.h / worldH;
    const fitZoom = Math.min(scaleX, scaleY, 1) * 0.95; // 95% to leave margin
    setZoom(fitZoom);
    // Center the stage
    setStagePos({
      x: (containerSize.w - worldW * fitZoom) / 2,
      y: (containerSize.h - worldH * fitZoom) / 2,
    });
  }, [containerSize.w, containerSize.h, worldW, worldH]);

  // Wheel zoom around pointer
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldZoom = zoom;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const factor = 1.08;
    const newZoom = Math.max(0.1, Math.min(10, direction > 0 ? oldZoom * factor : oldZoom / factor));

    // Zoom towards pointer position
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldZoom,
      y: (pointer.y - stagePos.y) / oldZoom,
    };
    setZoom(newZoom);
    setStagePos({
      x: pointer.x - mousePointTo.x * newZoom,
      y: pointer.y - mousePointTo.y * newZoom,
    });
  }, [zoom, stagePos]);

  // Load background image when plan changes
  useEffect(() => {
    if (!backgroundPlan) { setBgImage(null); return; }
    const img = new window.Image();
    img.onload = () => setBgImage(img);
    img.src = backgroundPlan.dataUrl;
  }, [backgroundPlan?.dataUrl]);

  // Listen for calibration start/cancel from Sidebar
  useEffect(() => {
    const handler = (e: Event) => {
      const { active, distanceM, axis, autoResize, scaleLocked } = (e as CustomEvent).detail;
      setCalibActive(active);
      setCalibDistM(distanceM);
      setCalibAxis(axis || 'x');
      setCalibAutoResize(autoResize ?? true);
      setCalibScaleLocked(scaleLocked ?? false);
      setCalibPoints([]);
    };
    window.addEventListener('multicam-calibrate', handler);
    return () => window.removeEventListener('multicam-calibrate', handler);
  }, []);

  // Handle calibration clicks on the stage
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!calibActive || !backgroundPlan) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert screen coords to stage-local coords (accounting for zoom & pan)
    const localX = (pointer.x - stagePos.x) / zoom;
    const localY = (pointer.y - stagePos.y) / zoom;

    const newPoints = [...calibPoints, { x: localX, y: localY }];
    setCalibPoints(newPoints);

    if (newPoints.length >= 2) {
      const updatedPlan = { ...backgroundPlan };

      if (calibAxis === 'x') {
        const dx = Math.abs(newPoints[1].x - newPoints[0].x);
        if (dx > 1) {
          const dxImage = dx / (backgroundPlan.scaleX * ppm);
          updatedPlan.scaleX = calibDistM / dxImage;
          if (calibScaleLocked) updatedPlan.scaleY = updatedPlan.scaleX;
        }
      } else {
        const dy = Math.abs(newPoints[1].y - newPoints[0].y);
        if (dy > 1) {
          const dyImage = dy / (backgroundPlan.scaleY * ppm);
          updatedPlan.scaleY = calibDistM / dyImage;
          if (calibScaleLocked) updatedPlan.scaleX = updatedPlan.scaleY;
        }
      }

      setBackgroundPlan(updatedPlan);

      // Auto-resize venue to encompass full floor plan
      if (calibAutoResize) {
        const imgW = updatedPlan.widthPx * updatedPlan.scaleX + updatedPlan.offsetX;
        const imgH = updatedPlan.heightPx * updatedPlan.scaleY + updatedPlan.offsetY;
        if (imgW > venue.widthM || imgH > venue.heightM) {
          setVenue({
            ...venue,
            widthM: Math.max(venue.widthM, Math.ceil(imgW)),
            heightM: Math.max(venue.heightM, Math.ceil(imgH)),
          });
        }
      }

      setCalibActive(false);
      setCalibPoints([]);
      window.dispatchEvent(new CustomEvent('multicam-calibrate-done'));
    }
  }, [calibActive, calibPoints, backgroundPlan, ppm, calibDistM, calibAxis, calibAutoResize, calibScaleLocked, setBackgroundPlan, zoom, stagePos, venue, setVenue]);

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
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#0a0b0f', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
      {/* Zoom indicator */}
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: '#000000aa', padding: '4px 10px', borderRadius: 4, fontSize: 11, color: '#9ca3af', pointerEvents: 'none', backdropFilter: 'blur(4px)' }}>
        {(zoom * 100).toFixed(0)}%
      </div>
      <Stage
        ref={stageRef}
        width={containerSize.w}
        height={containerSize.h}
        scaleX={zoom}
        scaleY={zoom}
        x={stagePos.x}
        y={stagePos.y}
        draggable={!calibActive}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onWheel={handleWheel}
        onClick={handleStageClick}
        style={{ cursor: calibActive ? 'crosshair' : 'grab' }}
      >
      {/* Venue area background */}
      <Layer>
        <Rect x={0} y={0} width={W} height={H} fill="#111318" listening={false} />
      </Layer>

      {/* Background plan image */}
      {bgImage && backgroundPlan && (
        <Layer>
          <KImage
            image={bgImage}
            x={(backgroundPlan.offsetX) * ppm}
            y={(backgroundPlan.offsetY) * ppm}
            width={backgroundPlan.widthPx * backgroundPlan.scaleX * ppm}
            height={backgroundPlan.heightPx * backgroundPlan.scaleY * ppm}
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
          const lensDef = getLensById(cam.lensId, useStore.getState().customLenses);
          if (!camDef || !lensDef) return null;

          const sensor = getEffectiveSensor(camDef, lensDef, cam.useSpeedbooster);
          const fov = computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive);
          const fovMin = computeFov(sensor, lensDef.focalLengthMax, cam.focusDistance, cam.extenderActive); // max FL = narrowest
          const fovMax = computeFov(sensor, lensDef.focalLengthMin, cam.focusDistance, cam.extenderActive); // min FL = widest
          const range = cam.focusDistance * ppm;
          const isSelected = cam.id === selectedCameraId;

          return (
            <React.Fragment key={`fov-group-${cam.id}`}>
              {/* Max FOV (widest, at min focal length) – green */}
              {isSelected && lensDef.focalLengthMin !== lensDef.focalLengthMax && (
                <Wedge
                  x={cam.x * ppm}
                  y={cam.y * ppm}
                  radius={range}
                  angle={fovMax.horizontalDeg}
                  rotation={cam.pan - fovMax.horizontalDeg / 2}
                  fill={'#22c55e10'}
                  stroke={'#22c55e55'}
                  strokeWidth={1}
                  dash={[4, 4]}
                  listening={false}
                />
              )}
              {/* Min FOV (narrowest, at max focal length) – red */}
              {isSelected && lensDef.focalLengthMin !== lensDef.focalLengthMax && (
                <Wedge
                  x={cam.x * ppm}
                  y={cam.y * ppm}
                  radius={range}
                  angle={fovMin.horizontalDeg}
                  rotation={cam.pan - fovMin.horizontalDeg / 2}
                  fill={'#ef444410'}
                  stroke={'#ef444455'}
                  strokeWidth={1}
                  dash={[4, 4]}
                  listening={false}
                />
              )}
              {/* Current FOV */}
              <Wedge
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
            </React.Fragment>
          );
        })}
      </Layer>

      {/* Walls */}
      <Layer>
        {walls.map((w) => (
          <React.Fragment key={`wall-${w.id}`}>
            <Line
              points={[w.x1 * ppm, w.y1 * ppm, w.x2 * ppm, w.y2 * ppm]}
              stroke="#9ca3af"
              strokeWidth={3}
              hitStrokeWidth={10}
              draggable
              onDragEnd={(e) => {
                const dx = e.target.x() / ppm;
                const dy = e.target.y() / ppm;
                e.target.position({ x: 0, y: 0 });
                updateWall(w.id, { x1: w.x1 + dx, y1: w.y1 + dy, x2: w.x2 + dx, y2: w.y2 + dy });
              }}
            />
            <Text
              x={((w.x1 + w.x2) / 2) * ppm - 20}
              y={((w.y1 + w.y2) / 2) * ppm - 14}
              text={w.label}
              fontSize={9}
              fill="#9ca3af"
              align="center"
              width={40}
            />
          </React.Fragment>
        ))}
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

      {/* Calibration overlay */}
      {calibActive && (
        <Layer>
          {/* Dim overlay with instructions */}
          <Rect x={0} y={0} width={W} height={30} fill="#000000" opacity={0.7} listening={false} />
          <Text x={W / 2 - 140} y={8} text={calibPoints.length === 0 ? `Click first point (${calibAxis.toUpperCase()} axis, ${calibDistM}m)` : `Click second point (${calibAxis.toUpperCase()} axis)`} fontSize={14} fill="#22c55e" fontStyle="bold" listening={false} />
          {/* Calibration points */}
          {calibPoints.map((p, i) => (
            <Group key={`cp-${i}`}>
              <Circle x={p.x} y={p.y} radius={6} fill="#22c55e" stroke="#fff" strokeWidth={2} listening={false} />
              <Text x={p.x + 8} y={p.y - 6} text={`P${i + 1}`} fontSize={11} fill="#22c55e" fontStyle="bold" listening={false} />
            </Group>
          ))}
          {/* Line between points */}
          {calibPoints.length === 1 && (
            <Line points={[calibPoints[0].x, calibPoints[0].y, calibPoints[0].x, calibPoints[0].y]} stroke="#22c55e" strokeWidth={2} dash={[6, 4]} listening={false} />
          )}
        </Layer>
      )}
    </Stage>
    </div>
  );
}
