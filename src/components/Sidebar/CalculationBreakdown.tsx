import type { Camera, Lens, SensorSize, FovResult, DofResult } from '../../types';

/**
 * Step-by-step rendering of the optical formulas used by the calculator, with
 * the camera's current values substituted in. Useful for sanity-checking the
 * outputs in the sidebar without having to re-derive the math by hand.
 *
 * The formulas mirror `src/utils/fov.ts` exactly. Numeric formatting is kept
 * compact (≤ 3 decimals) so the table fits in the narrow camera card column.
 */
interface CalculationBreakdownProps {
  camDef: Camera;
  lensDef: Lens;
  sensor: SensorSize;
  fov: FovResult;
  dof: DofResult;
  focalLength: number;
  extender: number;
  aperture: number;
  focusDistance: number;
}

const fmt = (n: number, digits = 2): string => {
  if (!isFinite(n)) return '∞';
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toFixed(0);
  if (abs >= 10) return n.toFixed(1);
  if (abs >= 1) return n.toFixed(digits);
  if (abs >= 0.01) return n.toFixed(3);
  return n.toExponential(2);
};

export function CalculationBreakdown({
  sensor,
  fov,
  dof,
  focalLength,
  extender,
  aperture,
  focusDistance,
}: CalculationBreakdownProps) {
  const W = sensor.widthMm;
  const H = sensor.heightMm;
  const f = focalLength;
  const ext = extender;
  const fe = f * ext; // effective focal length
  const N = aperture;
  const c = dof.circleOfConfusion; // mm
  const s = focusDistance; // m
  const D = Math.sqrt(W * W + H * H); // sensor diagonal in mm
  const personH = 1.8;

  // Person height in pixels (matches utils/fov.ts:personHeightInFrame)
  const imgH = fov.imageHeightAtDistance;
  const personPx = (personH / imgH) * 1080;

  const Row = ({ label, expr, color = 'text-gray-300' }: { label: string; expr: React.ReactNode; color?: string }) => (
    <div className="grid grid-cols-12 gap-1 leading-snug">
      <div className={`col-span-3 ${color} font-semibold`}>{label}</div>
      <div className="col-span-9 text-gray-400 break-words">{expr}</div>
    </div>
  );

  return (
    <div className="bg-bc-dark rounded p-2 border border-bc-border text-[10px] font-mono space-y-1">
      <div className="text-bc-accent font-bold text-[11px] mb-1">CALCULATION TRACE</div>

      <div className="text-gray-500 text-[9px] -mt-0.5 mb-1">
        Sensor {sensor.name} · W={fmt(W)} mm · H={fmt(H)} mm · diag D={fmt(D)} mm
        {ext !== 1 && <> · f_eff = {fmt(f)} × {ext} = {fmt(fe)} mm</>}
      </div>

      <Row
        label="FOV_h"
        expr={<>2·atan(W / (2·f_eff)) = 2·atan({fmt(W)} / (2·{fmt(fe)})) = <span className="text-bc-green">{fmt(fov.horizontalDeg)}°</span></>}
      />
      <Row
        label="FOV_v"
        expr={<>2·atan(H / (2·f_eff)) = 2·atan({fmt(H)} / (2·{fmt(fe)})) = <span className="text-bc-green">{fmt(fov.verticalDeg)}°</span></>}
      />
      <Row
        label="FOV_d"
        expr={<>2·atan(D / (2·f_eff)) = 2·atan({fmt(D)} / (2·{fmt(fe)})) = <span className="text-bc-green">{fmt(fov.diagonalDeg)}°</span></>}
      />
      <Row
        label="Img W"
        expr={<>2·d·tan(FOV_h/2) = 2·{fmt(s)}·tan({fmt(fov.horizontalDeg / 2)}°) = <span className="text-bc-green">{fmt(fov.imageWidthAtDistance)} m</span></>}
      />
      <Row
        label="Img H"
        expr={<>2·d·tan(FOV_v/2) = 2·{fmt(s)}·tan({fmt(fov.verticalDeg / 2)}°) = <span className="text-bc-green">{fmt(fov.imageHeightAtDistance)} m</span></>}
      />
      <Row
        label="35mm eq"
        expr={<>f_eff · crop = {fmt(fe)} · {fmt(sensor.cropFactor, 3)} = <span className="text-bc-green">{fmt(fov.equivalentFocalLength)} mm</span></>}
      />

      <div className="border-t border-bc-border my-1" />

      <Row
        label="CoC"
        expr={<>D / 1500 = {fmt(D)} / 1500 = <span className="text-bc-yellow">{(c * 1000).toFixed(1)} µm</span></>}
        color="text-gray-300"
      />
      <Row
        label="Hyperf."
        expr={<>f_eff² / (N·c)/1000 + f_eff/1000 = {fmt(fe)}² / ({fmt(N)}·{fmt(c, 4)})/1000 + {fmt(fe)}/1000 = <span className="text-bc-yellow">{fmt(dof.hyperfocal)} m</span></>}
        color="text-gray-300"
      />
      <Row
        label="DoF near"
        expr={<>(H·s) / (H + s − f_eff/1000) = ({fmt(dof.hyperfocal)}·{fmt(s)}) / ({fmt(dof.hyperfocal)} + {fmt(s)} − {fmt(fe / 1000, 3)}) = <span className="text-bc-yellow">{fmt(dof.nearLimit)} m</span></>}
        color="text-gray-300"
      />
      <Row
        label="DoF far"
        expr={<>(H·s) / (H − s + f_eff/1000) = ({fmt(dof.hyperfocal)}·{fmt(s)}) / ({fmt(dof.hyperfocal)} − {fmt(s)} + {fmt(fe / 1000, 3)}) = <span className="text-bc-yellow">{fmt(dof.farLimit)} m</span></>}
        color="text-gray-300"
      />
      <Row
        label="DoF total"
        expr={<>far − near = {fmt(dof.farLimit)} − {fmt(dof.nearLimit)} = <span className="text-bc-yellow">{fmt(dof.totalDof)} m</span></>}
        color="text-gray-300"
      />

      <div className="border-t border-bc-border my-1" />

      <Row
        label="Person"
        expr={<>1.80 / img_h · 1080 = 1.80 / {fmt(imgH)} · 1080 = <span className="text-bc-red">{fmt(personPx, 0)} px</span> ({fmt((personPx / 1080) * 100, 1)}%)</>}
        color="text-gray-300"
      />
    </div>
  );
}
