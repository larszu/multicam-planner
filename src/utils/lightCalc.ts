// Photometric lighting calculations – adapted from larszu/light-planner
// Supports Gaussian falloff, elliptical beams, frost widening, and heat-map generation.
import type { Fixture, PlacedFixture, PhotometricData } from '../types/lighting';
import { gelStackTransmission } from '../data/gels';
import { GELS } from '../data/gels';

const DEG2RAD = Math.PI / 180;

/** Effective beam angle accounting for frost/diffusion gels. */
function effectiveBeamAngleWithFrost(baseAngle: number, gelIds?: string[]): number {
  if (!gelIds || gelIds.length === 0) return baseAngle;
  let widen = 0;
  for (const id of gelIds) {
    const g = GELS.find((x) => x.id === id);
    if (!g) continue;
    if (g.type === 'frost' || g.type === 'diffusion') {
      widen += (g.diffusionLevel ?? 0.4) * 20; // up to +20° per heavy frost
    }
  }
  return baseAngle + widen;
}

function candelaFromPhotometric(p: PhotometricData): number {
  return p.lux * p.distance * p.distance;
}

function peakIntensityFromLumens(lumens: number, beamAngleDeg: number, ratio: number): number {
  // For a Gaussian beam with FWHM = beamAngleDeg, the total luminous flux is
  //   Φ ≈ 2π · I₀ · σ_x · σ_y
  // so the peak candela is I₀ = Φ / (2π · σ_x · σ_y). Using σ = halfAngle/√(2·ln2)
  // this reduces to I₀ = Φ · ln2 · 2 / (π · halfW · halfH).
  const halfW = (beamAngleDeg / 2) * DEG2RAD;
  const halfH = halfW / Math.max(ratio, 0.1);
  const sigmaW = halfW / Math.sqrt(2 * Math.LN2);
  const sigmaH = halfH / Math.sqrt(2 * Math.LN2);
  const denom = 2 * Math.PI * sigmaW * sigmaH;
  return denom > 0 ? lumens / denom : 0;
}

function peakIntensity(
  lumens: number | undefined,
  beamAngleDeg: number,
  ratio: number,
  photometric?: PhotometricData,
): number {
  if (photometric && photometric.lux > 0 && photometric.distance > 0) {
    return candelaFromPhotometric(photometric);
  }
  if (!lumens) return 0;
  return peakIntensityFromLumens(lumens, beamAngleDeg, ratio);
}

function beamSigma(beamAngleDeg: number): number {
  const halfAngle = (beamAngleDeg / 2) * DEG2RAD;
  return halfAngle / Math.sqrt(2 * Math.LN2);
}

/** Illuminance (lux) from a single fixture at floor point (px, py). */
export function luxFromFixture(
  fixture: Fixture,
  placed: PlacedFixture,
  px: number,
  py: number,
): number {
  const h = placed.z;
  if (h <= 0) return 0;

  const dimFactor = placed.dimming / 100;
  if (dimFactor <= 0) return 0;

  // `beamAngle` here is the 50 % (FWHM) angle used to derive the Gaussian σ.
  // Zoom override (`currentBeamAngle`) is a FWHM value too (spec conventions).
  // We intentionally do NOT use `fixture.fieldAngle` (10 % angle) here – that
  // would make the Gaussian ~1.8× too wide and over-illuminate the beam edge.
  let beamAngle = placed.currentBeamAngle ?? fixture.beamAngle;
  const ratio = fixture.beamRatioWH;

  beamAngle = effectiveBeamAngleWithFrost(beamAngle, placed.gelFilterIds);
  const gelTransmission = gelStackTransmission(placed.gelFilterIds);

  const dx = px - placed.x;
  const dy = py - placed.y;
  const r2 = dx * dx + dy * dy;
  const dist2 = r2 + h * h;
  const dist = Math.sqrt(dist2);
  if (dist < 0.001) return 0;

  const aDx = placed.aimX - placed.x;
  const aDy = placed.aimY - placed.y;
  const aimDist = Math.sqrt(aDx * aDx + aDy * aDy + h * h);
  if (aimDist < 0.001) return 0;

  const axU = aDx / aimDist;
  const ayU = aDy / aimDist;
  const azU = -h / aimDist;

  const pxU = dx / dist;
  const pyU = dy / dist;
  const pzU = -h / dist;

  const cosTheta = axU * pxU + ayU * pyU + azU * pzU;
  const theta = Math.acos(Math.min(1, Math.max(-1, cosTheta)));

  let effectiveTheta = theta;
  if (ratio !== 1 && theta > 1e-6) {
    const bodyRad = placed.bodyRotation * DEG2RAD;
    const aimFloorLen = Math.sqrt(aDx * aDx + aDy * aDy);
    let aimFloorAngle = 0;
    if (aimFloorLen > 0.01) aimFloorAngle = Math.atan2(aDy, aDx);
    const wideAngle = aimFloorAngle + bodyRad;

    const offX = px - placed.aimX;
    const offY = py - placed.aimY;
    const wideComponent = offX * Math.cos(wideAngle) + offY * Math.sin(wideAngle);
    const narrowComponent = -offX * Math.sin(wideAngle) + offY * Math.cos(wideAngle);
    const scaledNarrow = narrowComponent * ratio;
    const effOff = Math.sqrt(wideComponent * wideComponent + scaledNarrow * scaledNarrow);
    const origOff = Math.sqrt(offX * offX + offY * offY);
    if (origOff > 0.01) effectiveTheta = theta * (effOff / origOff);
  }

  const sigma = beamSigma(beamAngle);
  const Ipeak = peakIntensity(fixture.lumens, beamAngle, ratio, fixture.photometric) * dimFactor * gelTransmission;
  const I = Ipeak * Math.exp(-(effectiveTheta * effectiveTheta) / (2 * sigma * sigma));
  const cosIncidence = h / dist;
  return (I * cosIncidence) / dist2;
}

/** Total illuminance at (px, py) from all fixtures. */
export function totalLux(
  placed: PlacedFixture[],
  px: number,
  py: number,
  fixtureLookup: (id: string) => Fixture | undefined,
): number {
  let sum = 0;
  for (const pf of placed) {
    const def = fixtureLookup(pf.fixtureId);
    if (!def) continue;
    sum += luxFromFixture(def, pf, px, py);
  }
  return sum;
}

/** 2D lux grid for a rectangle. */
export function computeHeatMap(
  placed: PlacedFixture[],
  fixtureLookup: (id: string) => Fixture | undefined,
  originX: number,
  originY: number,
  widthM: number,
  heightM: number,
  resX: number,
  resY: number,
): { data: Float32Array; maxLux: number } {
  const data = new Float32Array(resX * resY);
  const stepX = widthM / resX;
  const stepY = heightM / resY;
  let maxLux = 0;

  for (let yi = 0; yi < resY; yi++) {
    const py = originY + (yi + 0.5) * stepY;
    for (let xi = 0; xi < resX; xi++) {
      const px = originX + (xi + 0.5) * stepX;
      const lux = totalLux(placed, px, py, fixtureLookup);
      data[yi * resX + xi] = lux;
      if (lux > maxLux) maxLux = lux;
    }
  }
  return { data, maxLux };
}

export function luxToColor(lux: number, maxScale: number): [number, number, number, number] {
  if (lux <= 0) return [0, 0, 0, 0];
  const t = Math.min(lux / maxScale, 1);
  let r: number, g: number, b: number;
  if (t < 0.25) {
    const s = t / 0.25;
    r = 0; g = Math.round(s * 255); b = 255;
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    r = 0; g = 255; b = Math.round((1 - s) * 255);
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    r = Math.round(s * 255); g = 255; b = 0;
  } else {
    const s = (t - 0.75) / 0.25;
    r = 255; g = Math.round((1 - s) * 255); b = 0;
  }
  const alpha = Math.round(40 + t * 160);
  return [r, g, b, alpha];
}

export function luxToColorTarget(lux: number, target: number): [number, number, number, number] {
  if (lux <= 0 || target <= 0) return [0, 0, 0, 0];
  const ratio = lux / target;
  let r: number, g: number, b: number, alpha: number;
  if (ratio < 0.8) {
    const t = Math.min(ratio / 0.8, 1);
    r = 0; g = Math.round(t * 180); b = Math.round(100 + t * 155);
    alpha = Math.round(60 + t * 120);
  } else if (ratio <= 1.2) {
    const t = (ratio - 0.8) / 0.4;
    r = Math.round(t * 60); g = Math.round(180 + t * 75); b = Math.round(40 * (1 - t));
    alpha = Math.round(120 + t * 60);
  } else {
    const t = Math.min((ratio - 1.2) / 1.8, 1);
    r = 255; g = Math.round(255 * (1 - t)); b = 0;
    alpha = Math.round(160 + t * 60);
  }
  return [r, g, b, alpha];
}

/**
 * Compute pan (azimuth on floor, degrees, 0 = +X east, CCW positive)
 * and tilt (angle from straight-down, degrees, 0 = straight down, 90 = horizontal).
 */
export function aimToPanTilt(placed: PlacedFixture): { pan: number; tilt: number } {
  const dx = placed.aimX - placed.x;
  const dy = placed.aimY - placed.y;
  const horiz = Math.sqrt(dx * dx + dy * dy);
  const pan = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180
  const tilt = (Math.atan2(horiz, placed.z) * 180) / Math.PI; // 0 straight down .. 90 horizontal
  return { pan, tilt };
}

/** Given pan/tilt + fixture position/height, compute aim point on floor. */
export function panTiltToAim(
  x: number,
  y: number,
  z: number,
  panDeg: number,
  tiltDeg: number,
): { aimX: number; aimY: number } {
  const clampedTilt = Math.max(0, Math.min(89.9, tiltDeg));
  const horiz = Math.tan(clampedTilt * DEG2RAD) * z;
  const panRad = panDeg * DEG2RAD;
  return {
    aimX: x + Math.cos(panRad) * horiz,
    aimY: y + Math.sin(panRad) * horiz,
  };
}
