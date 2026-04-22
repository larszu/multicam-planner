import { Stage, Layer, Rect, Wedge, Circle, Text, Group, Line, Image as KImage } from 'react-konva';
import { useStore } from '../../store/useStore';
import { getCameraById, getEffectiveSensor } from '../../data/cameras';
import { getLensById } from '../../data/lenses';
import { computeFov } from '../../utils/fov';
import type { VenueCamera, Wall } from '../../types';
import React, { useRef, useCallback, useEffect, useState } from 'react';
import type Konva from 'konva';
import FixtureIcon2D from '../Lighting/FixtureIcon2D';
import HeatMapOverlay from '../Lighting/HeatMapOverlay';
import { getFixtureById } from '../../data/fixtures';

export default function Venue2D() {
  const {
    venue, setVenue, cameras, selectedCameraId, selectCamera, moveCamera, showAllFov, pixelsPerMeter,
    persons, updatePerson, updateStage, backgroundPlan, setBackgroundPlan, walls, updateWall, addWall,
    appMode, placedFixtures, customFixtures, selectedFixtureId, selectFixture,
    fixtureToPlace, setFixtureToPlace, addPlacedFixture, movePlacedFixture, movePlacedFixtureAim,
    heatMapEnabled, heatMapTargetLux, heatMapScale,
  } = useStore();
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // ── Wall drawing mode ──
  const [drawingWall, setDrawingWall] = useState(false);
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null);
  const [wallCursor, setWallCursor] = useState<{ x: number; y: number } | null>(null);
  const shiftHeld = useRef(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Shift') shiftHeld.current = true;
      if (e.key === 'Escape') {
        setWallStart(null);
        setWallCursor(null);
      }
    };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftHeld.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Listen for wall-draw-mode toggle from sidebar or toolbar
  useEffect(() => {
    const handler = (e: Event) => {
      setDrawingWall((e as CustomEvent).detail?.active ?? true);
      setWallStart(null);
      setWallCursor(null);
    };
    window.addEventListener('multicam-wall-draw', handler);
    return () => window.removeEventListener('multicam-wall-draw', handler);
  }, []);

  /** Snap endpoint when shift is held: 0, 45, 90° increments */
  const snapPoint = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (!shiftHeld.current) return end;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const dist = Math.sqrt(dx * dx + dy * dy);
    return { x: start.x + Math.cos(snapAngle) * dist, y: start.y + Math.sin(snapAngle) * dist };
  }, []);

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

  // Expose stage ref and venue pixel dims for export capture
  useEffect(() => {
    (window as any).__konvaStage = stageRef.current;
    (window as any).__konvaVenueSize = { w: worldW, h: worldH };
    (window as any).__capture2DExport = () => {
      const stage = stageRef.current;
      if (!stage) return null;
      try {
        return stage.toCanvas({
          x: 0,
          y: 0,
          width: worldW,
          height: worldH,
          pixelRatio: 2,
        }) as HTMLCanvasElement;
      } catch {
        return null;
      }
    };
    return () => {
      (window as any).__konvaStage = null;
      (window as any).__konvaVenueSize = null;
      delete (window as any).__capture2DExport;
    };
  }, [worldW, worldH]);

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

  const getPointerWorldPoint = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    const localX = (pointer.x - stagePos.x) / zoom;
    const localY = (pointer.y - stagePos.y) / zoom;
    return {
      xPx: Math.max(0, Math.min(worldW, localX)),
      yPx: Math.max(0, Math.min(worldH, localY)),
    };
  }, [stagePos.x, stagePos.y, zoom, worldW, worldH]);

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
    const point = getPointerWorldPoint();
    if (!point) return;

    // Lighting mode: place selected fixture
    if (appMode === 'lighting' && fixtureToPlace) {
      const wx = point.xPx / ppm;
      const wy = point.yPx / ppm;
      addPlacedFixture(fixtureToPlace.id, wx, wy);
      // Keep the chosen fixture active so user can place multiple with further clicks
      return;
    }

    if (drawingWall) {
      const worldPoint = { x: point.xPx / ppm, y: point.yPx / ppm };
      if (!wallStart) {
        setWallStart(worldPoint);
        setWallCursor(worldPoint);
        return;
      }

      const snappedEnd = snapPoint(wallStart, worldPoint);
      const length = Math.hypot(snappedEnd.x - wallStart.x, snappedEnd.y - wallStart.y);
      if (length >= 0.1) {
        addWall({
          x1: wallStart.x,
          y1: wallStart.y,
          x2: snappedEnd.x,
          y2: snappedEnd.y,
          label: `Wall ${walls.length + 1}`,
        });
      }
      setWallStart(null);
      setWallCursor(null);
      return;
    }

    if (!calibActive || !backgroundPlan) return;

    const localX = point.xPx;
    const localY = point.yPx;

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
  }, [addWall, backgroundPlan, calibActive, calibAutoResize, calibAxis, calibDistM, calibPoints, calibScaleLocked, drawingWall, getPointerWorldPoint, ppm, setBackgroundPlan, setVenue, snapPoint, venue, wallStart, walls.length, appMode, fixtureToPlace, addPlacedFixture]);

  const handleStageMouseMove = useCallback(() => {
    if (!drawingWall || !wallStart) return;
    const point = getPointerWorldPoint();
    if (!point) return;
    setWallCursor(snapPoint(wallStart, { x: point.xPx / ppm, y: point.yPx / ppm }));
  }, [drawingWall, getPointerWorldPoint, ppm, snapPoint, wallStart]);

  const handleWallEndpointDragMove = useCallback((wall: Wall, end: 'start' | 'end', e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const rawPoint = { x: node.x() / ppm, y: node.y() / ppm };

    if (end === 'start') {
      const snapped = snapPoint({ x: wall.x2, y: wall.y2 }, rawPoint);
      updateWall(wall.id, { x1: snapped.x, y1: snapped.y });
      return;
    }

    const snapped = snapPoint({ x: wall.x1, y: wall.y1 }, rawPoint);
    updateWall(wall.id, { x2: snapped.x, y2: snapped.y });
  }, [ppm, snapPoint, updateWall]);

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
        draggable={!calibActive && !drawingWall}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onMouseMove={handleStageMouseMove}
        style={{ cursor: calibActive || drawingWall ? 'crosshair' : 'grab' }}
      >
      {/* ── Layer 1: Static background (venue, image, grid, scale bar) ── */}
      <Layer listening={false}>
        <Rect x={0} y={0} width={W} height={H} fill="#111318" />
        {bgImage && backgroundPlan && (
          <KImage
            image={bgImage}
            x={(backgroundPlan.offsetX) * ppm}
            y={(backgroundPlan.offsetY) * ppm}
            width={backgroundPlan.widthPx * backgroundPlan.scaleX * ppm}
            height={backgroundPlan.heightPx * backgroundPlan.scaleY * ppm}
            opacity={backgroundPlan.opacity}
          />
        )}
        {Array.from({ length: Math.floor(venue.widthM) + 1 }).map((_, i) => (
          <Group key={`vg-${i}`}>
            <Line points={[i * ppm, 0, i * ppm, H]} stroke="#1e2030" strokeWidth={1} />
            <Text x={i * ppm + 2} y={2} text={`${i}m`} fontSize={9} fill="#555" />
          </Group>
        ))}
        {Array.from({ length: Math.floor(venue.heightM) + 1 }).map((_, i) => (
          <Group key={`hg-${i}`}>
            <Line points={[0, i * ppm, W, i * ppm]} stroke="#1e2030" strokeWidth={1} />
            <Text x={2} y={i * ppm + 2} text={`${i}m`} fontSize={9} fill="#555" />
          </Group>
        ))}
        <Rect x={0} y={0} width={W} height={H} stroke="#2a2d3a" strokeWidth={2} />
        {/* Scale bar */}
        <Line points={[10, H - 20, 10 + 5 * ppm, H - 20]} stroke="#666" strokeWidth={2} />
        <Line points={[10, H - 25, 10, H - 15]} stroke="#666" strokeWidth={2} />
        <Line points={[10 + 5 * ppm, H - 25, 10 + 5 * ppm, H - 15]} stroke="#666" strokeWidth={2} />
        <Text x={10} y={H - 38} text="5m" fontSize={11} fill="#666" />
      </Layer>

      {/* ── Layer 2: Interactive objects (FOV, stages, walls, persons, cameras) ── */}
      <Layer>
        {/* FOV cones (non-interactive, rendered first = behind everything) */}
        {cameras.map((cam) => {
          if (!showAllFov && cam.id !== selectedCameraId) return null;
          const camDef = getCameraById(cam.cameraId);
          const lensDef = getLensById(cam.lensId, useStore.getState().customLenses);
          if (!camDef || !lensDef) return null;

          const sensor = getEffectiveSensor(camDef, lensDef, { adapterId: cam.adapterId, useSpeedbooster: cam.useSpeedbooster });
          const fov = computeFov(sensor, cam.focalLength, cam.focusDistance, cam.extenderActive);
          const fovMin = computeFov(sensor, lensDef.focalLengthMax, cam.focusDistance, cam.extenderActive);
          const fovMax = computeFov(sensor, lensDef.focalLengthMin, cam.focusDistance, cam.extenderActive);
          const range = cam.focusDistance * ppm;
          const isSelected = cam.id === selectedCameraId;

          return (
            <React.Fragment key={`fov-group-${cam.id}`}>
              {isSelected && lensDef.focalLengthMin !== lensDef.focalLengthMax && (
                <Wedge
                  x={cam.x * ppm} y={cam.y * ppm} radius={range}
                  angle={fovMax.horizontalDeg} rotation={cam.pan - fovMax.horizontalDeg / 2}
                  fill={'#22c55e10'} stroke={'#22c55e55'} strokeWidth={1} dash={[4, 4]} listening={false}
                />
              )}
              {isSelected && lensDef.focalLengthMin !== lensDef.focalLengthMax && (
                <Wedge
                  x={cam.x * ppm} y={cam.y * ppm} radius={range}
                  angle={fovMin.horizontalDeg} rotation={cam.pan - fovMin.horizontalDeg / 2}
                  fill={'#ef444410'} stroke={'#ef444455'} strokeWidth={1} dash={[4, 4]} listening={false}
                />
              )}
              <Wedge
                x={cam.x * ppm} y={cam.y * ppm} radius={range}
                angle={fov.horizontalDeg} rotation={cam.pan - fov.horizontalDeg / 2}
                fill={cam.color + (isSelected ? '30' : '15')}
                stroke={cam.color + (isSelected ? 'cc' : '66')}
                strokeWidth={isSelected ? 2 : 1} listening={false}
              />
            </React.Fragment>
          );
        })}

        {/* Stages */}
        {venue.stages.map((s) => (
          <Group key={s.id} x={s.x * ppm} y={s.y * ppm} draggable={!drawingWall} onDragEnd={(e) => handleStageDragEnd(s.id, e)}>
            <Rect width={s.width * ppm} height={s.height * ppm} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth={2} cornerRadius={4} />
            <Text x={4} y={4} text={s.label} fontSize={12} fill="#3b82f6" fontStyle="bold" />
            <Text x={4} y={s.height * ppm - 16} text={`${s.width}×${s.height}m`} fontSize={9} fill="#3b82f688" />
          </Group>
        ))}

        {/* Walls */}
        {walls.map((w) => (
          <React.Fragment key={`wall-${w.id}`}>
            <Line
              points={[w.x1 * ppm, w.y1 * ppm, w.x2 * ppm, w.y2 * ppm]}
              stroke="#9ca3af" strokeWidth={3} hitStrokeWidth={10}
              draggable={!drawingWall}
              onDragEnd={(e) => {
                const dx = e.target.x() / ppm;
                const dy = e.target.y() / ppm;
                e.target.position({ x: 0, y: 0 });
                updateWall(w.id, { x1: w.x1 + dx, y1: w.y1 + dy, x2: w.x2 + dx, y2: w.y2 + dy });
              }}
            />
            <Circle x={w.x1 * ppm} y={w.y1 * ppm} radius={5} fill="#0f1117" stroke="#f59e0b" strokeWidth={2} draggable={!drawingWall} onDragMove={(e) => handleWallEndpointDragMove(w, 'start', e)} />
            <Circle x={w.x2 * ppm} y={w.y2 * ppm} radius={5} fill="#0f1117" stroke="#f59e0b" strokeWidth={2} draggable={!drawingWall} onDragMove={(e) => handleWallEndpointDragMove(w, 'end', e)} />
            <Text x={((w.x1 + w.x2) / 2) * ppm - 20} y={((w.y1 + w.y2) / 2) * ppm - 14} text={w.label} fontSize={9} fill="#9ca3af" align="center" width={40} />
          </React.Fragment>
        ))}
        {drawingWall && wallStart && wallCursor && (
          <>
            <Line points={[wallStart.x * ppm, wallStart.y * ppm, wallCursor.x * ppm, wallCursor.y * ppm]} stroke="#f59e0b" strokeWidth={2} dash={[6, 4]} listening={false} />
            <Circle x={wallStart.x * ppm} y={wallStart.y * ppm} radius={4} fill="#f59e0b" listening={false} />
          </>
        )}

        {/* Persons */}
        {persons.map((p) => {
          const type = p.objectType ?? 'person';
          const col = p.color ?? (
            type === 'drums' ? '#ef4444' :
            type === 'keys' ? '#8b5cf6' :
            type === 'person-guitar' ? '#f97316' :
            type === 'sitting-person' ? '#38bdf8' :
            type === 'mic-stand' ? '#9ca3af' :
            type === 'chair' ? '#a16207' :
            type === 'table' ? '#a16207' :
            type === 'lectern' ? '#7c3aed' :
            type === 'schneetiger' ? '#e0f2fe' :
            '#f59e0b'
          );
          const footW = Math.max(6, p.width * ppm);
          return (
            <Group key={p.id} x={p.x * ppm} y={p.y * ppm} draggable onDragEnd={(e) => handlePersonDragEnd(p.id, e)}>
              {type === 'table' || type === 'drums' || type === 'keys' ? (
                <Rect x={-footW / 2} y={-footW / 4} width={footW} height={footW / 2} fill={col} opacity={0.55} stroke={col} strokeWidth={1} cornerRadius={2} />
              ) : type === 'schneetiger' ? (
                <Rect x={-footW / 2} y={-footW / 4} width={footW} height={footW / 2} fill={col} opacity={0.85} stroke="#1f2937" strokeWidth={1} cornerRadius={footW / 4} />
              ) : (
                <Circle radius={Math.max(5, footW / 3)} fill={col} stroke="#fff" strokeWidth={1} opacity={0.85} />
              )}
              <Text x={-26} y={8} text={`${p.label} (${p.height}m)`} fontSize={9} fill={col} align="center" width={52} />
            </Group>
          );
        })}

        {/* Camera icons (on top) */}
        {cameras.map((cam) => {
          const isSelected = cam.id === selectedCameraId;
          return (
            <Group key={`cam-${cam.id}`} x={cam.x * ppm} y={cam.y * ppm} draggable={!drawingWall} onDragEnd={(e) => handleCamDragEnd(cam, e)} onClick={() => selectCamera(cam.id)} onTap={() => selectCamera(cam.id)}>
              <Circle radius={isSelected ? 10 : 8} fill={cam.color} stroke={isSelected ? '#fff' : cam.color} strokeWidth={isSelected ? 3 : 1} shadowColor={cam.color} shadowBlur={isSelected ? 12 : 0} />
              <Line points={[0, 0, 14 * Math.cos((cam.pan * Math.PI) / 180), 14 * Math.sin((cam.pan * Math.PI) / 180)]} stroke={cam.color} strokeWidth={2} />
              <Text x={-16} y={12} text={cam.label} fontSize={11} fill="#fff" fontStyle="bold" align="center" width={32} />
            </Group>
          );
        })}
      </Layer>

      {/* ── Lighting layer ── */}
      {appMode === 'lighting' && (
        <Layer>
          {heatMapEnabled && placedFixtures.length > 0 && (
            <HeatMapOverlay
              placedFixtures={placedFixtures}
              fixtureLookup={(id) => getFixtureById(id, customFixtures)}
              originX={0}
              originY={0}
              widthM={venue.widthM}
              heightM={venue.heightM}
              ppm={ppm}
              targetLux={heatMapTargetLux}
              scaleLux={heatMapScale}
            />
          )}
          {placedFixtures.map((pf) => (
            <FixtureIcon2D
              key={pf.id}
              placed={pf}
              customFixtures={customFixtures}
              ppm={ppm}
              selected={selectedFixtureId === pf.id}
              onSelect={() => selectFixture(pf.id)}
              onMove={(x, y) => movePlacedFixture(pf.id, x, y)}
              onMoveAim={(ax, ay) => movePlacedFixtureAim(pf.id, ax, ay)}
            />
          ))}
        </Layer>
      )}

      {/* ── Layer 3: Calibration overlay (conditional) ── */}
      {calibActive && (
        <Layer>
          <Rect x={0} y={0} width={W} height={30} fill="#000000" opacity={0.7} listening={false} />
          <Text x={W / 2 - 140} y={8} text={calibPoints.length === 0 ? `Click first point (${calibAxis.toUpperCase()} axis, ${calibDistM}m)` : `Click second point (${calibAxis.toUpperCase()} axis)`} fontSize={14} fill="#22c55e" fontStyle="bold" listening={false} />
          {calibPoints.map((p, i) => (
            <Group key={`cp-${i}`}>
              <Circle x={p.x} y={p.y} radius={6} fill="#22c55e" stroke="#fff" strokeWidth={2} listening={false} />
              <Text x={p.x + 8} y={p.y - 6} text={`P${i + 1}`} fontSize={11} fill="#22c55e" fontStyle="bold" listening={false} />
            </Group>
          ))}
          {calibPoints.length === 1 && (
            <Line points={[calibPoints[0].x, calibPoints[0].y, calibPoints[0].x, calibPoints[0].y]} stroke="#22c55e" strokeWidth={2} dash={[6, 4]} listening={false} />
          )}
        </Layer>
      )}
    </Stage>
    </div>
  );
}
