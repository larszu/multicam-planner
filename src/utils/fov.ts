import type { SensorSize, FovResult, DofResult } from '../types';

const DEG = 180 / Math.PI;

/** Horizontal FOV in degrees */
export function horizontalFov(sensorWidthMm: number, focalLengthMm: number): number {
  return 2 * Math.atan(sensorWidthMm / (2 * focalLengthMm)) * DEG;
}

/** Vertical FOV in degrees */
export function verticalFov(sensorHeightMm: number, focalLengthMm: number): number {
  return 2 * Math.atan(sensorHeightMm / (2 * focalLengthMm)) * DEG;
}

/** Diagonal FOV */
export function diagonalFov(sensorWidthMm: number, sensorHeightMm: number, focalLengthMm: number): number {
  const diag = Math.sqrt(sensorWidthMm ** 2 + sensorHeightMm ** 2);
  return 2 * Math.atan(diag / (2 * focalLengthMm)) * DEG;
}

/** Image width at a given distance (metres) */
export function imageWidthAtDistance(sensorWidthMm: number, focalLengthMm: number, distanceM: number): number {
  const hFov = horizontalFov(sensorWidthMm, focalLengthMm);
  return 2 * distanceM * Math.tan((hFov / 2) / DEG);
}

/** Image height at a given distance (metres) */
export function imageHeightAtDistance(sensorHeightMm: number, focalLengthMm: number, distanceM: number): number {
  const vFov = verticalFov(sensorHeightMm, focalLengthMm);
  return 2 * distanceM * Math.tan((vFov / 2) / DEG);
}

/** 35mm equivalent focal length */
export function equivalentFocalLength(focalLengthMm: number, cropFactor: number): number {
  return focalLengthMm * cropFactor;
}

/** Full FOV computation */
export function computeFov(
  sensor: SensorSize,
  focalLengthMm: number,
  distanceM: number,
  extender: number = 1,
): FovResult {
  const effectiveFl = focalLengthMm * extender;
  return {
    horizontalDeg: horizontalFov(sensor.widthMm, effectiveFl),
    verticalDeg: verticalFov(sensor.heightMm, effectiveFl),
    diagonalDeg: diagonalFov(sensor.widthMm, sensor.heightMm, effectiveFl),
    imageWidthAtDistance: imageWidthAtDistance(sensor.widthMm, effectiveFl, distanceM),
    imageHeightAtDistance: imageHeightAtDistance(sensor.heightMm, effectiveFl, distanceM),
    equivalentFocalLength: equivalentFocalLength(effectiveFl, sensor.cropFactor),
  };
}

/** Circle of confusion for a sensor (diagonal-based, standard formula) */
export function circleOfConfusion(sensorWidthMm: number, sensorHeightMm: number): number {
  const diag = Math.sqrt(sensorWidthMm ** 2 + sensorHeightMm ** 2);
  return diag / 1500; // standard approximation
}

/** Hyperfocal distance in metres */
export function hyperfocalDistance(focalLengthMm: number, aperture: number, cocMm: number): number {
  return (focalLengthMm ** 2) / (aperture * cocMm) / 1000 + focalLengthMm / 1000;
}

/** Depth of field */
export function computeDof(
  sensor: SensorSize,
  focalLengthMm: number,
  aperture: number,
  focusDistanceM: number,
  extender: number = 1,
): DofResult {
  const effectiveFl = focalLengthMm * extender;
  const coc = circleOfConfusion(sensor.widthMm, sensor.heightMm);
  const H = hyperfocalDistance(effectiveFl, aperture, coc);
  const s = focusDistanceM;

  const nearLimit = (H * s) / (H + (s - effectiveFl / 1000));
  const farLimitRaw = (H * s) / (H - (s - effectiveFl / 1000));
  const farLimit = farLimitRaw < 0 ? Infinity : farLimitRaw;
  const totalDof = farLimit === Infinity ? Infinity : farLimit - nearLimit;

  return { nearLimit, farLimit, totalDof, hyperfocal: H, circleOfConfusion: coc };
}

/** Person height in pixels given sensor, focal length, distance, and output resolution */
export function personHeightInFrame(
  sensorHeightMm: number,
  focalLengthMm: number,
  distanceM: number,
  personHeightM: number = 1.8,
  outputHeightPx: number = 1080,
): number {
  const imgH = imageHeightAtDistance(sensorHeightMm, focalLengthMm, distanceM);
  return (personHeightM / imgH) * outputHeightPx;
}

/** FOV cone end-points for 2D drawing (returns two points from camera position) */
export function fovConePoints(
  x: number,
  y: number,
  rotationDeg: number,
  hFovDeg: number,
  range: number,
): { left: { x: number; y: number }; right: { x: number; y: number } } {
  const halfFov = (hFovDeg / 2) / DEG;
  const rot = rotationDeg / DEG;
  return {
    left: {
      x: x + range * Math.cos(rot - halfFov),
      y: y + range * Math.sin(rot - halfFov),
    },
    right: {
      x: x + range * Math.cos(rot + halfFov),
      y: y + range * Math.sin(rot + halfFov),
    },
  };
}
