// ───────────────────────────────────────────────────────────────────────────
// Read-only Ansicht fremder .avplan-Domaenen.
//
// MultiCam bearbeitet die Lampen nicht, soll sie aber EINSEHEN koennen: aus der
// verlustfrei mitgefuehrten "lighting"-Domaene (Light-Planner ProjectData)
// werden die platzierten Lampen defensiv extrahiert und im 2D-Venue als
// read-only Marker gezeigt. Die Domaene ist `unknown` → robust gegen Schema-
// Abweichungen, wirft nie.
// ───────────────────────────────────────────────────────────────────────────

export interface ForeignFixture {
  id: string;
  x: number;
  y: number;
  colorTemp?: number;
  name?: string;
  aimX?: number;
  aimY?: number;
  dimming?: number;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** Extrahiert die platzierten Lampen aus einer fremden lighting-Domaene. */
export function foreignFixturesFrom(lighting: unknown): ForeignFixture[] {
  const list = (lighting as { fixtures?: unknown } | null | undefined)?.fixtures;
  if (!Array.isArray(list)) return [];
  const out: ForeignFixture[] = [];
  for (const f of list) {
    if (!f || typeof f !== 'object') continue;
    const o = f as Record<string, unknown>;
    const x = num(o.x);
    const y = num(o.y);
    if (x === undefined || y === undefined) continue;
    const fixture = o.fixture as { name?: unknown } | undefined;
    out.push({
      id: String(o.id ?? ''),
      x, y,
      colorTemp: num(o.currentColorTemp),
      name: typeof fixture?.name === 'string' ? fixture.name : undefined,
      aimX: num(o.aimX),
      aimY: num(o.aimY),
      dimming: num(o.dimming),
    });
  }
  return out;
}

/** Grobe Farbtemperatur → RGB-Kennfarbe fuer den Marker. */
export function cctToColor(cct?: number): string {
  if (cct === undefined) return '#fbbf24'; // amber default
  if (cct < 3200) return '#fb923c'; // warm orange
  if (cct < 4500) return '#fde68a'; // warm white
  if (cct < 5600) return '#fef9c3'; // neutral
  return '#bae6fd'; // cool blue
}
