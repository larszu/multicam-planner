import type { Fixture, PhotometricData, PlacedFixture } from '../types/lighting';

/**
 * Curated fixture library – real-world units so Lux calculations are meaningful
 * but kept small on purpose. Add more via Sidebar > custom fixtures.
 */
export const FIXTURES: Fixture[] = [
  // ── Theatrical profiles ──
  {
    id: 'etc-source-four-19',
    name: 'Source Four 19°',
    manufacturer: 'ETC',
    category: 'profile',
    wattage: 575,
    lumens: 16400,
    photometric: { lux: 25000, distance: 5, beamAngle: 19 },
    beamAngle: 16,
    fieldAngle: 19,
    beamShape: 'circular',
    beamRatioWH: 1,
    colorTemp: 3050,
    cri: 100,
    weight: 5.4,
  },
  {
    id: 'etc-source-four-36',
    name: 'Source Four 36°',
    manufacturer: 'ETC',
    category: 'profile',
    wattage: 575,
    lumens: 15000,
    photometric: { lux: 11500, distance: 5, beamAngle: 36 },
    beamAngle: 30,
    fieldAngle: 36,
    beamShape: 'circular',
    beamRatioWH: 1,
    colorTemp: 3050,
    cri: 100,
    weight: 5.4,
  },
  // ── Fresnels ──
  {
    id: 'arri-650',
    name: 'Arri 650 Plus',
    manufacturer: 'Arri',
    category: 'fresnel',
    wattage: 650,
    lumens: 17500,
    photometric: { lux: 10000, distance: 3, beamAngle: 40 },
    beamAngle: 15,
    fieldAngle: 55,
    beamShape: 'circular',
    beamRatioWH: 1,
    zoomRange: [15, 55],
    colorTemp: 3200,
    cri: 100,
    weight: 4.1,
  },
  // ── PAR ──
  {
    id: 'par64-cp62',
    name: 'PAR 64 CP62 MFL',
    manufacturer: 'Generic',
    category: 'par',
    wattage: 1000,
    lumens: 20000,
    photometric: { lux: 12000, distance: 5 },
    beamAngle: 12,
    fieldAngle: 22,
    beamShape: 'elliptical',
    beamRatioWH: 2.2,
    colorTemp: 3200,
    cri: 100,
    weight: 3.5,
  },
  // ── LED wash ──
  {
    id: 'astera-titan',
    name: 'Titan Tube',
    manufacturer: 'Astera',
    category: 'wash',
    wattage: 72,
    lumens: 3500,
    photometric: { lux: 430, distance: 2, beamAngle: 140 },
    beamAngle: 120,
    fieldAngle: 140,
    beamShape: 'linear',
    beamRatioWH: 10,
    colorTempRange: [1750, 10000],
    colorTemp: 5600,
    cri: 96,
    weight: 2.5,
    dmxChannels: 15,
  },
  {
    id: 'aputure-ls-600d',
    name: 'LS 600d Pro',
    manufacturer: 'Aputure',
    category: 'spot',
    wattage: 720,
    lumens: 60000,
    photometric: { lux: 35000, distance: 3 },
    beamAngle: 50,
    fieldAngle: 55,
    beamShape: 'circular',
    beamRatioWH: 1,
    colorTemp: 5600,
    cri: 96,
    weight: 7.2,
    dmxChannels: 4,
  },
  // ── LED panels ──
  {
    id: 'arri-skypanel-s60',
    name: 'SkyPanel S60-C',
    manufacturer: 'ARRI',
    category: 'led-panel',
    wattage: 450,
    lumens: 30000,
    photometric: { lux: 6800, distance: 3 },
    beamAngle: 105,
    fieldAngle: 115,
    beamShape: 'rectangular',
    beamRatioWH: 1.8,
    colorTempRange: [2800, 10000],
    colorTemp: 5600,
    cri: 95,
    weight: 9.4,
    dmxChannels: 12,
  },
  {
    id: 'aputure-nova-p300c',
    name: 'Nova P300c',
    manufacturer: 'Aputure',
    category: 'led-panel',
    wattage: 350,
    lumens: 20000,
    photometric: { lux: 4500, distance: 3 },
    beamAngle: 110,
    fieldAngle: 120,
    beamShape: 'rectangular',
    beamRatioWH: 1.35,
    colorTempRange: [2000, 10000],
    colorTemp: 5600,
    cri: 96,
    weight: 8.5,
    dmxChannels: 9,
  },
  // ── Moving heads ──
  {
    id: 'martin-mac-aura',
    name: 'MAC Aura PXL',
    manufacturer: 'Martin',
    category: 'moving-wash',
    wattage: 500,
    lumens: 14000,
    photometric: { lux: 8200, distance: 5 },
    beamAngle: 8,
    fieldAngle: 58,
    beamShape: 'circular',
    beamRatioWH: 1,
    zoomRange: [8, 58],
    colorTemp: 0,
    weight: 15.5,
    dmxChannels: 42,
  },
  {
    id: 'robe-pointe',
    name: 'Pointe',
    manufacturer: 'Robe',
    category: 'moving-beam',
    wattage: 280,
    lumens: 12500,
    photometric: { lux: 52000, distance: 10 },
    beamAngle: 5,
    fieldAngle: 20,
    beamShape: 'circular',
    beamRatioWH: 1,
    zoomRange: [5, 20],
    colorTemp: 7200,
    weight: 18,
    dmxChannels: 32,
  },
  // ── Cyc / floods ──
  {
    id: 'altman-cyc-1000',
    name: 'Cyc 1000',
    manufacturer: 'Altman',
    category: 'cyc',
    wattage: 1000,
    lumens: 25000,
    photometric: { lux: 1800, distance: 3 },
    beamAngle: 90,
    fieldAngle: 120,
    beamShape: 'rectangular',
    beamRatioWH: 1.8,
    colorTemp: 3200,
    weight: 7.5,
  },
];

const FIXTURE_MAP = new Map(FIXTURES.map((f) => [f.id, f]));

export function getFixtureById(id: string, custom: Fixture[] = []): Fixture | undefined {
  return FIXTURE_MAP.get(id) ?? custom.find((f) => f.id === id);
}

/**
 * Compute illuminance (lux) at the aim point using the inverse-square law,
 * derived from the fixture's photometric reference (lux @ distance) and
 * adjusted for dimming and any gel filters' transmission factor.
 */
export function computeLuxAtAim(
  fixture: Fixture,
  placed: PlacedFixture,
  gelTransmission = 1,
): number {
  const ref: PhotometricData | undefined = fixture.photometric ?? (fixture.lumens
    ? { lux: fixture.lumens / 10, distance: 1 }
    : undefined);
  if (!ref) return 0;
  const throwDist = Math.hypot(placed.aimX - placed.x, placed.aimY - placed.y, placed.z);
  if (throwDist <= 0.01) return 0;
  const base = ref.lux * (ref.distance * ref.distance) / (throwDist * throwDist);
  return base * (placed.dimming / 100) * gelTransmission;
}

/** Beam footprint (major/minor axis radii in metres on the floor). */
export function computeBeamFootprint(fixture: Fixture, placed: PlacedFixture) {
  const throwDist = Math.hypot(placed.aimX - placed.x, placed.aimY - placed.y, placed.z);
  const beam = placed.currentBeamAngle ?? fixture.fieldAngle;
  const halfAngle = (beam / 2) * (Math.PI / 180);
  const r = Math.tan(halfAngle) * throwDist;
  const ratio = fixture.beamRatioWH;
  return {
    radius: r,
    majorAxis: r * Math.sqrt(ratio),
    minorAxis: r / Math.sqrt(ratio),
    throwDist,
  };
}

export const FIXTURE_CATEGORY_LABELS: Record<Fixture['category'], string> = {
  profile: 'Profil',
  fresnel: 'Fresnel',
  par: 'PAR',
  wash: 'Wash',
  spot: 'LED-Spot',
  'moving-wash': 'Moving Wash',
  'moving-spot': 'Moving Spot',
  'moving-beam': 'Moving Beam',
  blinder: 'Blinder',
  cyc: 'Cyc',
  flood: 'Flood',
  followspot: 'Followspot',
  'led-panel': 'LED-Panel',
  custom: 'Custom',
};

export const FIXTURE_CATEGORY_COLOR: Record<Fixture['category'], string> = {
  profile: '#f59e0b',
  fresnel: '#fb923c',
  par: '#fbbf24',
  wash: '#a3e635',
  spot: '#f97316',
  'moving-wash': '#60a5fa',
  'moving-spot': '#3b82f6',
  'moving-beam': '#8b5cf6',
  blinder: '#e5e7eb',
  cyc: '#22d3ee',
  flood: '#fde047',
  followspot: '#ec4899',
  'led-panel': '#34d399',
  custom: '#94a3b8',
};
