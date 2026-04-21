import { Group, Circle, Line, Arc, Text, Ellipse } from 'react-konva';
import type Konva from 'konva';
import { getFixtureById, FIXTURE_CATEGORY_COLOR, computeBeamFootprint } from '../../data/fixtures';
import { gelStackColor } from '../../data/gels';
import type { PlacedFixture, Fixture } from '../../types/lighting';

interface Props {
  placed: PlacedFixture;
  customFixtures: Fixture[];
  ppm: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onMoveAim: (aimX: number, aimY: number) => void;
}

export default function FixtureIcon2D({ placed, customFixtures, ppm, selected, onSelect, onMove, onMoveAim }: Props) {
  const fixture = getFixtureById(placed.fixtureId, customFixtures);
  if (!fixture) return null;

  const color = gelStackColor(placed.gelFilterIds) ?? FIXTURE_CATEGORY_COLOR[fixture.category];
  const fp = computeBeamFootprint(fixture, placed);

  // Body position in px
  const bx = placed.x * ppm;
  const by = placed.y * ppm;
  const ax = placed.aimX * ppm;
  const ay = placed.aimY * ppm;

  // Beam footprint on floor (ellipse) centered on aim, rotated with body
  const majorPx = fp.majorAxis * ppm;
  const minorPx = fp.minorAxis * ppm;
  const aimAngleDeg = Math.atan2(ay - by, ax - bx) * 180 / Math.PI;

  const handleBodyDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    const nx = e.target.x() / ppm;
    const ny = e.target.y() / ppm;
    onMove(nx, ny);
  };
  const handleAimDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    const nx = e.target.x() / ppm;
    const ny = e.target.y() / ppm;
    onMoveAim(nx, ny);
  };

  const iconSize = 10;
  const bodyRadius = iconSize;

  return (
    <Group onClick={onSelect} onTap={onSelect}>
      {/* Beam footprint */}
      <Ellipse
        x={ax}
        y={ay}
        radiusX={majorPx / 2}
        radiusY={minorPx / 2}
        rotation={aimAngleDeg + placed.bodyRotation}
        fill={color}
        opacity={0.18 * (placed.dimming / 100)}
        stroke={color}
        strokeWidth={selected ? 1.5 : 0.5}
        dash={[4, 3]}
        listening={false}
      />

      {/* Aim line */}
      <Line
        points={[bx, by, ax, ay]}
        stroke={color}
        strokeWidth={selected ? 2 : 1}
        dash={[6, 4]}
        opacity={0.8}
        listening={false}
      />

      {/* Aim handle */}
      <Circle
        x={ax}
        y={ay}
        radius={5}
        fill="white"
        stroke={color}
        strokeWidth={2}
        draggable
        onDragMove={handleAimDrag}
        onDragEnd={handleAimDrag}
      />

      {/* Fixture body */}
      <Group
        x={bx}
        y={by}
        draggable
        onDragMove={handleBodyDrag}
        onDragEnd={handleBodyDrag}
      >
        {/* Selection halo */}
        {selected && (
          <Circle radius={bodyRadius + 4} stroke="#38bdf8" strokeWidth={2} />
        )}
        {/* Main body */}
        <Circle radius={bodyRadius} fill={color} stroke="#111" strokeWidth={1} />
        {/* Category indicator – small arc showing beam angle */}
        <Arc
          innerRadius={0}
          outerRadius={bodyRadius - 2}
          angle={fixture.fieldAngle}
          rotation={-fixture.fieldAngle / 2 - 90}
          fill="rgba(0,0,0,0.35)"
        />
        {/* Wattage/label */}
        <Text
          text={placed.label ?? `${fixture.wattage}W`}
          x={-20}
          y={bodyRadius + 2}
          width={40}
          align="center"
          fontSize={9}
          fill="#111"
        />
      </Group>
    </Group>
  );
}
