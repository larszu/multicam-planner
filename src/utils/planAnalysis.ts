// ── AI floor-plan analysis: prompt + result mapping (issues #39 / #40) ────────
//
// The model receives the rendered floor-plan image and returns geometry as
// *fractions* of the image (0..1, origin top-left). Working in fractions means
// the model never has to know the real-world scale — we convert fractions to
// metres on our side using the plan's own pixel size and scale, so walls and
// stages line up with the plan whatever its calibration.

import type { BackgroundPlan } from '../types';

export interface PlanTasks {
  walls: boolean;
  stages: boolean;
  scale: boolean;
}

export interface AnalysisResult {
  walls?: { x1f: number; y1f: number; x2f: number; y2f: number; label?: string }[];
  stages?: { xf: number; yf: number; wf: number; hf: number; label?: string }[];
  scale?: { metersPerPixel: number | null; note?: string };
}

export function buildPlanPrompt(tasks: PlanTasks): string {
  const wants: string[] = [];
  if (tasks.walls) wants.push('walls');
  if (tasks.stages) wants.push('stages');
  if (tasks.scale) wants.push('scale');

  const schema: string[] = ['{'];
  if (tasks.walls) {
    schema.push('  "walls": [{ "x1f": number, "y1f": number, "x2f": number, "y2f": number, "label": string }],');
  }
  if (tasks.stages) {
    schema.push('  "stages": [{ "xf": number, "yf": number, "wf": number, "hf": number, "label": string }],');
  }
  if (tasks.scale) {
    schema.push('  "scale": { "metersPerPixel": number | null, "note": string }');
  }
  schema.push('}');

  return [
    'You are an architectural floor-plan analyser for a broadcast camera planning tool.',
    `Analyse the attached floor-plan image and extract: ${wants.join(', ')}.`,
    '',
    'Coordinate system: the image origin (0,0) is the TOP-LEFT corner, x increases',
    'to the right, y increases downward. Express every coordinate as a FRACTION of',
    'the image dimensions in the range 0..1 (so the centre of the image is 0.5, 0.5).',
    '',
    tasks.walls
      ? '- walls: each straight wall segment as a line from (x1f,y1f) to (x2f,y2f). Trace the actual drawn walls; do not invent a bounding box. Give each a short label.'
      : '',
    tasks.stages
      ? '- stages: each stage/podium/platform as an axis-aligned rectangle with top-left (xf,yf) and size (wf,hf) as fractions. Label each.'
      : '',
    tasks.scale
      ? '- scale: if the plan shows a scale bar or a dimension annotation (e.g. "5 m", "1:100"), estimate metersPerPixel for this image and explain briefly in note. If you cannot determine it, return metersPerPixel: null.'
      : '',
    '',
    'Return ONLY a JSON object matching this schema (no markdown, no commentary):',
    ...schema,
  ]
    .filter(Boolean)
    .join('\n');
}

function clampFrac(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Convert an image fraction to a world X coordinate in metres for this plan. */
function fracToX(plan: BackgroundPlan, xf: number): number {
  return plan.offsetX + clampFrac(xf) * plan.widthPx * plan.scaleX;
}
function fracToY(plan: BackgroundPlan, yf: number): number {
  return plan.offsetY + clampFrac(yf) * plan.heightPx * plan.scaleY;
}

export function wallsFromResult(
  result: AnalysisResult,
  plan: BackgroundPlan,
): { x1: number; y1: number; x2: number; y2: number; label: string }[] {
  if (!Array.isArray(result.walls)) return [];
  return result.walls.map((w, i) => ({
    x1: fracToX(plan, w.x1f),
    y1: fracToY(plan, w.y1f),
    x2: fracToX(plan, w.x2f),
    y2: fracToY(plan, w.y2f),
    label: (w.label && String(w.label)) || `AI Wall ${i + 1}`,
  }));
}

export function stagesFromResult(
  result: AnalysisResult,
  plan: BackgroundPlan,
): { x: number; y: number; width: number; height: number; label: string }[] {
  if (!Array.isArray(result.stages)) return [];
  return result.stages.map((s, i) => ({
    x: fracToX(plan, s.xf),
    y: fracToY(plan, s.yf),
    width: Math.max(0.5, clampFrac(s.wf) * plan.widthPx * plan.scaleX),
    height: Math.max(0.5, clampFrac(s.hf) * plan.heightPx * plan.scaleY),
    label: (s.label && String(s.label)) || `AI Stage ${i + 1}`,
  }));
}
