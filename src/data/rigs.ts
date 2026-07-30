// Katalog konkreter Kamera-Rigs (Montagen).
//
// `CameraMountType` ist die KATEGORIE (bestimmt Bewegungsprofil und generelles
// Verhalten). Ein Rig hier ist ein KONKRETES Geraet mit echten Maßen — genau
// das, was ein 12-ft-Jimmy-Jib von einem 30-ft-Jimmy-Jib unterscheidet.
//
// Aufbau analog zu CAMERAS / LENSES: fester Katalog, per `VenueCamera.rigId`
// gewaehlt. Ohne Rig gelten die Kategorie-Defaults aus MOUNT_HEIGHT_RANGE.
//
// Maßeinheiten durchgehend Meter. Zoll/Fuß aus den Datenblaettern umgerechnet
// (1 ft = 0.3048 m). Wo ein Datenblatt keine Objektivhoehe nennt, ist sie aus
// Auslegerlaenge und typischem Anstellwinkel geschaetzt — solche Eintraege sind
// im `notes`-Feld als Schaetzung markiert, damit niemand sie fuer eine
// Herstellerangabe haelt.
import type { CameraMountType } from '../types';

export interface CameraRig {
  id: string;
  name: string;
  manufacturer?: string;
  /** Kategorie — bestimmt Bewegungsprofil und UI-Verhalten. */
  type: CameraMountType;
  /** Niedrigste erreichbare Objektivhoehe (m). */
  minHeightM: number;
  /** Hoechste erreichbare Objektivhoehe (m). */
  maxHeightM: number;
  /** Auslegerlaenge / Reach vom Drehpunkt zur Kamera (m) — Jib, Kran. */
  armLengthM?: number;
  /** Teleskopweg (m) — nur Technocrane/SuperTechno. */
  telescopeM?: number;
  /**
   * Standard-Fahrweg (m): Schienenlaenge bei Dolly/Slider, Schwenkweg bei Jib.
   * Beim Dolly vom Nutzer ueberschreibbar (`VenueCamera.trackLengthM`), weil die
   * Schiene aus Sektionen beliebig lang gelegt wird.
   */
  trackLengthM?: number;
  /** Benoetigte Standflaeche Breite x Tiefe (m) — Platzbedarf im Plan. */
  footprintM?: { w: number; d: number };
  /** Maximale Kamera-Nutzlast (kg). */
  payloadKg?: number;
  notes?: string;
}

const FT = 0.3048;
/** Fuß → Meter, auf cm gerundet. */
const ft = (feet: number) => Math.round(feet * FT * 100) / 100;

// ── Jimmy Jib Triangle ─────────────────────────────────────────────────────
// Der Ausleger wird aus 3-ft-Sektionen gebaut; lieferbare Reichweiten sind
// 6, 9, 12, 15, 18, 24, 30 und 40 ft (Reach = Drehpunkt → Kamera).
// Nutzlast: bis 30 ft ~50 lb (23 kg), bei 40 ft nur noch ~25 lb (11 kg).
// Platzbedarf: 180°-Schwenk mit 9-ft-Heck ≈ 12 × 24 ft, 360° ≈ 24 × 24 ft.
const JIMMY_JIB_FEET = [6, 9, 12, 15, 18, 24, 30, 40] as const;

const jimmyJibs: CameraRig[] = JIMMY_JIB_FEET.map((feet) => {
  const arm = ft(feet);
  // Objektivhoehe geschaetzt: Drehpunkt ~1.5 m + Ausleger bei ~55° Anstellung.
  const maxH = Math.round((1.5 + arm * Math.sin((55 * Math.PI) / 180)) * 10) / 10;
  return {
    id: `jimmyjib-triangle-${feet}ft`,
    name: `Jimmy Jib Triangle ${feet} ft`,
    manufacturer: 'Jimmy Jib',
    type: 'jib' as CameraMountType,
    minHeightM: 0.3,
    maxHeightM: maxH,
    armLengthM: arm,
    // Schwenkweg der Kamera auf dem Bogen — konservativ die halbe Bogenlaenge
    // eines 90°-Schwenks.
    trackLengthM: Math.round(arm * (Math.PI / 2) * 0.5 * 10) / 10,
    footprintM: feet >= 24 ? { w: ft(24), d: ft(24) } : { w: ft(12), d: ft(24) },
    payloadKg: feet >= 40 ? 11 : 23,
    notes:
      `Ausleger aus 3-ft-Sektionen. Objektivhoehe geschaetzt (Drehpunkt 1.5 m, ~55°). ` +
      (feet >= 40 ? 'Bei 40 ft nur leichte Kameras (~11 kg).' : 'Bis 30 ft ~23 kg Nutzlast.'),
  };
});

// ── Technocrane / SuperTechno (teleskopierend) ──────────────────────────────
// Herstellerangaben (Pro-Cam / MTJIBS), auf Meter umgerechnet:
//   Techno 15      — 15' Objektivhoehe, 8'2"  Teleskopweg, 16'3" Arm, 80 lb
//   Techno 22      — 24' (ueberschlagen), 15'6" Teleskop, 27'1" Arm, 35 lb
//   SuperTechno 15 — 15' unterschlagen (17' ueber), 9'5" Teleskop, 19'3" Arm
//   SuperTechno 30 — 30' unterschlagen, 22'8" Teleskop, 39'2" Arm, 80 lb
//   SuperTechno 50 — Zwischengroesse der Baureihe
//   SuperTechno 75 — 80' ueberschlagen, 62'8" Teleskop, 89'1" Arm, 80 lb
const technocranes: CameraRig[] = [
  {
    id: 'techno-15', name: 'Technocrane 15′', manufacturer: 'Technocrane', type: 'technocrane',
    minHeightM: 0.5, maxHeightM: ft(15), armLengthM: ft(16.25), telescopeM: ft(8.17),
    trackLengthM: ft(8.17), footprintM: { w: 0.79, d: 3.0 }, payloadKg: 36,
    notes: 'Basisbreite 2′7″, Tuerdurchfahrt ab 6′.',
  },
  {
    id: 'techno-22', name: 'Technocrane 22′', manufacturer: 'Technocrane', type: 'technocrane',
    minHeightM: 0.5, maxHeightM: ft(24), armLengthM: ft(27.08), telescopeM: ft(15.5),
    trackLengthM: ft(15.5), footprintM: { w: 0.79, d: 3.5 }, payloadKg: 16,
    notes: 'Teleskopiert mit ~4′9″/s (1.45 m/s). Nutzlast 35 lb.',
  },
  {
    id: 'supertechno-15', name: 'SuperTechno 15′', manufacturer: 'SuperTechno', type: 'technocrane',
    minHeightM: 0.5, maxHeightM: ft(17), armLengthM: ft(19.25), telescopeM: ft(9.42),
    trackLengthM: ft(9.42), footprintM: { w: 0.85, d: 3.2 }, payloadKg: 36,
    notes: '15′ unterschlagen, 17′ ueberschlagen.',
  },
  {
    id: 'supertechno-30', name: 'SuperTechno 30′', manufacturer: 'SuperTechno', type: 'technocrane',
    minHeightM: 0.6, maxHeightM: ft(30), armLengthM: ft(39.17), telescopeM: ft(22.67),
    trackLengthM: ft(22.67), footprintM: { w: 1.1, d: 4.5 }, payloadKg: 36,
  },
  {
    id: 'supertechno-50', name: 'SuperTechno 50′', manufacturer: 'SuperTechno', type: 'technocrane',
    minHeightM: 0.8, maxHeightM: ft(50), armLengthM: ft(60), telescopeM: ft(40),
    trackLengthM: ft(40), footprintM: { w: 1.3, d: 6.0 }, payloadKg: 36,
    notes: 'Zwischengroesse der Baureihe — Maße ueberschlaegig.',
  },
  {
    id: 'supertechno-75', name: 'SuperTechno 75′', manufacturer: 'SuperTechno', type: 'technocrane',
    minHeightM: 1.0, maxHeightM: ft(80), armLengthM: ft(89.08), telescopeM: ft(62.67),
    trackLengthM: ft(62.67), footprintM: { w: 1.6, d: 8.0 }, payloadKg: 36,
    notes: '80′ ueberschlagene Objektivhoehe.',
  },
  {
    id: 'scorpio-45', name: 'Scorpio 45′', manufacturer: 'Scorpio', type: 'technocrane',
    minHeightM: 0.8, maxHeightM: ft(45), armLengthM: ft(52), telescopeM: ft(30),
    trackLengthM: ft(30), footprintM: { w: 1.3, d: 5.5 }, payloadKg: 36,
    notes: 'Maße ueberschlaegig.',
  },
];

// ── Dollies (Schiene) ──────────────────────────────────────────────────────
// Schienen werden aus Sektionen gelegt: gaengig 4 ft und 8 ft gerade, dazu
// 10 ft und 45°-Kurven. J.L. Fisher faehrt auf 24.5″ Spurweite (0.62 m) und
// bietet Kurvenradien von 10′- bis 70′-Kreisen.
// `trackLengthM` ist hier der VORSCHLAG — im Plan pro Kamera ueberschreibbar.
const dollies: CameraRig[] = [
  {
    id: 'fisher-10', name: 'Fisher Model 10', manufacturer: 'J.L. Fisher', type: 'dolly',
    minHeightM: 0.58, maxHeightM: 1.75, trackLengthM: ft(16),
    footprintM: { w: 0.78, d: 1.35 }, payloadKg: 90,
    notes: 'Spurweite 24.5″ (0.62 m).',
  },
  {
    id: 'fisher-11', name: 'Fisher Model 11', manufacturer: 'J.L. Fisher', type: 'dolly',
    minHeightM: 0.53, maxHeightM: 1.68, trackLengthM: ft(16),
    footprintM: { w: 0.74, d: 1.25 }, payloadKg: 80,
    notes: 'Spurweite 24.5″ (0.62 m).',
  },
  {
    id: 'panther-classic', name: 'Panther Classic', manufacturer: 'Panther', type: 'dolly',
    minHeightM: 0.55, maxHeightM: 1.80, trackLengthM: ft(16),
    footprintM: { w: 0.80, d: 1.20 }, payloadKg: 100,
  },
  {
    id: 'doorway-dolly', name: 'Doorway Dolly', type: 'dolly',
    minHeightM: 0.45, maxHeightM: 1.60, trackLengthM: ft(12),
    footprintM: { w: 0.71, d: 1.22 }, payloadKg: 70,
    notes: 'Passt durch Standardtueren.',
  },
  {
    id: 'western-dolly', name: 'Western Dolly', type: 'dolly',
    minHeightM: 0.40, maxHeightM: 1.50, trackLengthM: ft(12),
    footprintM: { w: 0.91, d: 1.52 }, payloadKg: 90,
  },
  {
    id: 'skater-dolly', name: 'Skater-Dolly (Tischschiene)', type: 'dolly',
    minHeightM: 0.15, maxHeightM: 0.45, trackLengthM: ft(8),
    footprintM: { w: 0.35, d: 0.35 }, payloadKg: 8,
    notes: 'Kleines Schienensystem, gerade + 45°-Kurven.',
  },
];

// ── Slider ─────────────────────────────────────────────────────────────────
const sliders: CameraRig[] = [
  { id: 'slider-60', name: 'Slider 60 cm', type: 'slider', minHeightM: 0.2, maxHeightM: 1.8, trackLengthM: 0.6, payloadKg: 10 },
  { id: 'slider-100', name: 'Slider 100 cm', type: 'slider', minHeightM: 0.2, maxHeightM: 1.8, trackLengthM: 1.0, payloadKg: 12 },
  { id: 'slider-150', name: 'Slider 150 cm', type: 'slider', minHeightM: 0.2, maxHeightM: 1.8, trackLengthM: 1.5, payloadKg: 15 },
  { id: 'dana-dolly', name: 'Dana Dolly (Speedrail)', type: 'slider', minHeightM: 0.3, maxHeightM: 1.8, trackLengthM: 1.8, payloadKg: 20, notes: 'Laenge ueber Speedrail-Rohre frei waehlbar.' },
];

// ── Stative, Pedestals, Bodennah ───────────────────────────────────────────
const staticRigs: CameraRig[] = [
  { id: 'tripod-standard', name: 'Stativ (Standard)', type: 'tripod', minHeightM: 0.6, maxHeightM: 1.9, footprintM: { w: 0.9, d: 0.9 }, payloadKg: 25 },
  { id: 'tripod-tall', name: 'Stativ (hoch / Tall)', type: 'tripod', minHeightM: 1.0, maxHeightM: 2.6, footprintM: { w: 1.1, d: 1.1 }, payloadKg: 25 },
  { id: 'tripod-baby', name: 'Baby-Stativ', type: 'tripod', minHeightM: 0.35, maxHeightM: 0.9, footprintM: { w: 0.7, d: 0.7 }, payloadKg: 25 },
  { id: 'hihat', name: 'Hi-Hat', type: 'hihat', minHeightM: 0.12, maxHeightM: 0.3, footprintM: { w: 0.5, d: 0.5 }, payloadKg: 30 },
  { id: 'ped-vinten-osprey', name: 'Vinten Osprey Elite', manufacturer: 'Vinten', type: 'pedestal', minHeightM: 0.62, maxHeightM: 1.62, footprintM: { w: 1.0, d: 1.0 }, payloadKg: 80 },
  { id: 'ped-sachtler-combi', name: 'Sachtler Combi-Pedestal', manufacturer: 'Sachtler', type: 'pedestal', minHeightM: 0.60, maxHeightM: 1.55, footprintM: { w: 1.0, d: 1.0 }, payloadKg: 60 },
  { id: 'fixed-wall', name: 'Wand-/Deckenhalter', type: 'fixed', minHeightM: 0.0, maxHeightM: 12.0, footprintM: { w: 0.2, d: 0.2 }, payloadKg: 15 },
];

// ── Fliegend / motorisch / fahrend ─────────────────────────────────────────
// Spidercam gibt es als Light (kleinere Raeume), Field (grosse Flaechen) und
// Mini (kompakteste Variante); der Kopf ist ein gyro-stabilisierter Remote-Head.
const flyingRigs: CameraRig[] = [
  { id: 'spidercam-mini', name: 'Spidercam Mini', manufacturer: 'Spidercam', type: 'cablecam', minHeightM: 2, maxHeightM: 15, trackLengthM: 40, payloadKg: 12, notes: 'Kompakteste Variante.' },
  { id: 'spidercam-light', name: 'Spidercam Light', manufacturer: 'Spidercam', type: 'cablecam', minHeightM: 2, maxHeightM: 25, trackLengthM: 80, payloadKg: 15, notes: 'Fuer kleinere Raeume/Hallen.' },
  { id: 'spidercam-field', name: 'Spidercam Field', manufacturer: 'Spidercam', type: 'cablecam', minHeightM: 3, maxHeightM: 40, trackLengthM: 150, payloadKg: 20, notes: 'Grosse Stadien/Flaechen, 4 Seile.' },
  { id: 'drone-fpv', name: 'Drohne (FPV / leicht)', type: 'drone', minHeightM: 0.5, maxHeightM: 120, trackLengthM: 200, payloadKg: 1.5 },
  { id: 'drone-heavy', name: 'Drohne (Heavy-Lift)', type: 'drone', minHeightM: 1.0, maxHeightM: 120, trackLengthM: 150, payloadKg: 10 },
  { id: 'scissorlift-8', name: 'Scherenbuehne 8 m', type: 'scissorlift', minHeightM: 1.2, maxHeightM: 8, footprintM: { w: 1.2, d: 2.5 }, payloadKg: 200 },
  { id: 'scissorlift-12', name: 'Scherenbuehne 12 m', type: 'scissorlift', minHeightM: 1.2, maxHeightM: 12, footprintM: { w: 1.5, d: 2.9 }, payloadKg: 250 },
  { id: 'newton-s2', name: 'Newton S2 (Remote-Head)', manufacturer: 'Newton Nordic', type: 'remotehead', minHeightM: 0.3, maxHeightM: 3.0, payloadKg: 12, notes: 'Gyro-stabilisiert, Pan/Tilt/Roll + Zoom/Fokus/Blende.' },
  { id: 'bullhead-studio', name: 'Bullhead Studio (Remote-Head)', manufacturer: 'Slidekamera', type: 'remotehead', minHeightM: 0.3, maxHeightM: 3.0, payloadKg: 10, notes: '2-Achs-Kopf fuer Kraene und Slider.' },
  { id: 'carmount-hood', name: 'Fahrzeug — Hood/Motorhaube', type: 'carmount', minHeightM: 1.0, maxHeightM: 1.6, trackLengthM: 50, payloadKg: 20 },
  { id: 'carmount-tray', name: 'Fahrzeug — Hostess Tray', type: 'carmount', minHeightM: 0.8, maxHeightM: 1.5, trackLengthM: 50, payloadKg: 15 },
  { id: 'rickshaw', name: 'Kamera-Rickshaw', type: 'rickshaw', minHeightM: 0.8, maxHeightM: 2.0, trackLengthM: 30, footprintM: { w: 0.8, d: 1.6 }, payloadKg: 60 },
];

// ── Getragen ───────────────────────────────────────────────────────────────
const bodyRigs: CameraRig[] = [
  { id: 'steadicam-vest', name: 'Steadicam (Weste)', type: 'steadicam', minHeightM: 0.3, maxHeightM: 2.0, payloadKg: 20 },
  { id: 'gimbal-handheld', name: 'Gimbal (einhaendig)', type: 'gimbal', minHeightM: 0.3, maxHeightM: 2.1, payloadKg: 4.5 },
  { id: 'gimbal-heavy', name: 'Gimbal (Heavy / Ronin)', type: 'gimbal', minHeightM: 0.3, maxHeightM: 2.1, payloadKg: 10 },
  { id: 'handheld-shoulder', name: 'Schulter / Handheld', type: 'handheld', minHeightM: 1.0, maxHeightM: 1.9, payloadKg: 15 },
  { id: 'easyrig', name: 'Easyrig', type: 'handheld', minHeightM: 1.0, maxHeightM: 2.0, payloadKg: 18, notes: 'Entlastet die Schulter, laesst die Bewegung ruhiger werden.' },
];

export const RIGS: CameraRig[] = [
  ...staticRigs,
  ...jimmyJibs,
  ...technocranes,
  ...dollies,
  ...sliders,
  ...flyingRigs,
  ...bodyRigs,
];

export function getRigById(id?: string): CameraRig | undefined {
  return id ? RIGS.find((r) => r.id === id) : undefined;
}

/** Alle Rigs einer Kategorie — fuer die Auswahl im UI. */
export function rigsForType(type: CameraMountType): CameraRig[] {
  return RIGS.filter((r) => r.type === type);
}

// ── Dolly-Schienen aus Sektionen ───────────────────────────────────────────
/**
 * Gaengige Schienen-Sektionen in Metern. Eine Strecke wird daraus gelegt, darum
 * sind sinnvolle Gesamtlaengen Vielfache/Summen dieser Stuecke.
 *
 * BEWUSST unrundiert (4 * 0.3048 statt 1.22): mit auf Zentimeter gerundeten
 * Sektionen ist eine 10-ft-Sektion 3.05 m "lang" und eine exakt 10 ft lange
 * Wunschstrecke (3.048 m) passt nicht mehr in ihr eigenes Stueck — die Zerlegung
 * fiele dann auf 8 ft + 4 ft zurueck. Gerundet wird erst bei der Anzeige.
 */
export const TRACK_SECTIONS_M = [4 * FT, 8 * FT, 10 * FT] as const;

/**
 * Zerlegt eine Wunschlaenge in Sektionen (groesste zuerst) und liefert die
 * tatsaechlich legbare Laenge samt Stueckliste. Damit steht im Plan nicht nur
 * "12.4 m Schiene", sondern was dafuer gebraucht wird.
 */
export function trackSectionPlan(lengthM: number): { total: number; sections: { lengthM: number; count: number }[] } {
  let rest = Math.max(0, lengthM);
  const sections: { lengthM: number; count: number }[] = [];
  for (const s of [...TRACK_SECTIONS_M].sort((a, b) => b - a)) {
    const count = Math.floor(rest / s + 1e-9);
    if (count > 0) {
      sections.push({ lengthM: s, count });
      rest -= count * s;
    }
  }
  // Rest kleiner als die kuerzeste Sektion: eine kurze Sektion zusaetzlich,
  // sonst waere die Strecke kuerzer als gewuenscht.
  if (rest > 0.05) {
    const shortest = Math.min(...TRACK_SECTIONS_M);
    const existing = sections.find((s) => s.lengthM === shortest);
    if (existing) existing.count += 1;
    else sections.push({ lengthM: shortest, count: 1 });
  }
  const total = Math.round(sections.reduce((sum, s) => sum + s.lengthM * s.count, 0) * 100) / 100;
  return { total, sections };
}
