// Bewegungsstil je Kamera-Montage (#62 Folgefeature).
//
// Bisher fuhr jede Shot-/Preset-Fahrt mit EINER Kurve (kubisches Ease-in/out) —
// egal ob die Kamera auf einem Stativ, einem Dolly, einem Technocrane oder auf
// der Schulter sitzt. Real unterscheiden sich diese Rigs aber deutlich:
//
//   • Stativ/Fix   — kurzer, praeziser Schwenk, klarer Ein-/Ausstieg.
//   • Pedestal     — sauber gefuehrt, etwas weicher als das Stativ.
//   • Dolly        — traege Masse: langer Anlauf, langes Ausrollen.
//   • Jib / Crane  — weicher Bogen, setzt sanft ab.
//   • Technocrane  — am weichsten und laengsten; der Arm teleskopiert zusaetzlich.
//   • Steadicam    — schwebend, laeuft minimal ueber und pendelt sich ein.
//   • Gimbal       — weich, aber flinker als Steadicam.
//   • Handheld     — nie ganz ruhig, feines Zittern ueberlagert die Fahrt.
//
// Ausserdem hat jedes Rig **Geschwindigkeitsgrenzen**. Damit laesst sich sagen,
// ob eine geplante Fahrtzeit ueberhaupt zu schaffen ist ("6 m Dolly in 2 s"
// geht nicht) — der eigentliche Planungswert.
//
// Zahlenbasis fuer den Technocrane: Techno 22 faehrt teleskopisch mit
// ~4'9"/s ≈ 1.45 m/s aus und ein.
import type { CameraMountType, VenueCamera } from '../types';

export interface MotionProfile {
  /** Kurzname fuer die UI. */
  label: string;
  /** Beschreibt den Charakter in einem Halbsatz (Tooltip). */
  hint: string;
  /**
   * Zeitkurve 0..1 → 0..1. Muss bei 0 mit 0 und bei 1 mit 1 enden; dazwischen
   * darf sie ueberschwingen (Steadicam).
   */
  ease: (t: number) => number;
  /** Maximale Fahrgeschwindigkeit ueber Grund bzw. auf der Schiene (m/s). */
  maxTravelMps: number;
  /** Maximale Schwenk-/Neigegeschwindigkeit (Grad/s). */
  maxRotDps: number;
  /** Maximale Hoehenaenderung (m/s). */
  maxLiftMps: number;
  /** Zoomtempo als Brennweiten-Verhaeltnis pro Sekunde (2 = Verdopplung/s). */
  maxZoomRatioPerS: number;
  /** Amplitude des ueberlagerten Zitterns in Grad (0 = ruhig). */
  jitterDeg: number;
  /** Kuerzeste Fahrt, die auf diesem Rig noch sauber aussieht (s). */
  minDurationS: number;
}

// ── Kurvenformen ───────────────────────────────────────────────────────────
const easeCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Traeger: laengerer Anlauf und laengeres Ausrollen als kubisch. */
const easeQuintic = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);
/** Schwebend: laeuft leicht ueber und pendelt sich ein. */
const easeSettle = (t: number) => {
  if (t >= 1) return 1;
  const c = 1.70158 * 0.6;
  const u = t - 1;
  return 1 + (c + 1) * u ** 3 + c * u ** 2;
};
/** Weich, aber ohne langen Anlauf. */
const easeQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export const MOTION_PROFILES: Record<CameraMountType, MotionProfile> = {
  tripod: {
    label: 'Stativ',
    hint: 'Kurzer, praeziser Schwenk mit klarem Ein- und Ausstieg.',
    ease: easeCubic,
    maxTravelMps: 0.3, maxRotDps: 60, maxLiftMps: 0.15, maxZoomRatioPerS: 2.2,
    jitterDeg: 0, minDurationS: 0.4,
  },
  hihat: {
    label: 'Hi-Hat',
    hint: 'Bodennah und starr — nur Schwenk/Neigung.',
    ease: easeCubic,
    maxTravelMps: 0.1, maxRotDps: 55, maxLiftMps: 0.05, maxZoomRatioPerS: 2.2,
    jitterDeg: 0, minDurationS: 0.4,
  },
  pedestal: {
    label: 'Pedestal',
    hint: 'Sauber gefuehrt, Saeule hebt/senkt gleichmaessig.',
    ease: easeCubic,
    maxTravelMps: 0.8, maxRotDps: 50, maxLiftMps: 0.4, maxZoomRatioPerS: 2.0,
    jitterDeg: 0, minDurationS: 0.6,
  },
  jib: {
    label: 'Jib / Crane',
    hint: 'Weicher Bogen, setzt sanft ab.',
    ease: easeQuintic,
    maxTravelMps: 1.0, maxRotDps: 35, maxLiftMps: 0.8, maxZoomRatioPerS: 1.7,
    jitterDeg: 0, minDurationS: 1.2,
  },
  technocrane: {
    label: 'Technocrane',
    hint: 'Teleskopierender Arm — weichste und laengste Fahrt.',
    ease: easeQuintic,
    // Teleskop faehrt real mit ~1.45 m/s (Techno 22).
    maxTravelMps: 1.45, maxRotDps: 30, maxLiftMps: 1.0, maxZoomRatioPerS: 1.6,
    jitterDeg: 0, minDurationS: 1.5,
  },
  dolly: {
    label: 'Dolly',
    hint: 'Traege Masse: langer Anlauf, langes Ausrollen.',
    ease: easeQuintic,
    maxTravelMps: 1.2, maxRotDps: 40, maxLiftMps: 0.25, maxZoomRatioPerS: 1.8,
    jitterDeg: 0, minDurationS: 1.0,
  },
  slider: {
    label: 'Slider',
    hint: 'Kurzer, sehr gleichmaessiger Weg — feine Kontrolle.',
    ease: easeCubic,
    maxTravelMps: 0.4, maxRotDps: 45, maxLiftMps: 0.1, maxZoomRatioPerS: 2.0,
    jitterDeg: 0, minDurationS: 0.8,
  },
  cablecam: {
    label: 'Cable-Cam',
    hint: 'Fliegend an Seilen — weite, weiche Boegen, pendelt leicht nach.',
    ease: easeSettle,
    maxTravelMps: 12, maxRotDps: 60, maxLiftMps: 6, maxZoomRatioPerS: 1.8,
    jitterDeg: 0.08, minDurationS: 1.5,
  },
  drone: {
    label: 'Drohne',
    hint: 'Frei im Raum, weiche Beschleunigung, leichte Drift.',
    ease: easeQuad,
    maxTravelMps: 15, maxRotDps: 90, maxLiftMps: 8, maxZoomRatioPerS: 1.8,
    jitterDeg: 0.15, minDurationS: 1.0,
  },
  scissorlift: {
    label: 'Hebebuehne',
    hint: 'Hebt langsam und ruhig; horizontal kaum beweglich.',
    ease: easeQuintic,
    maxTravelMps: 0.3, maxRotDps: 40, maxLiftMps: 0.35, maxZoomRatioPerS: 1.9,
    jitterDeg: 0.05, minDurationS: 2.0,
  },
  remotehead: {
    label: 'Remote-Head',
    hint: 'Motorisch praezise, sehr schnelle Schwenks moeglich.',
    ease: easeCubic,
    maxTravelMps: 0.2, maxRotDps: 180, maxLiftMps: 0.1, maxZoomRatioPerS: 2.5,
    jitterDeg: 0, minDurationS: 0.2,
  },
  carmount: {
    label: 'Fahrzeug',
    hint: 'Folgt dem Fahrzeug — schnell, mit Fahrbahn-Unruhe.',
    ease: easeQuad,
    maxTravelMps: 20, maxRotDps: 60, maxLiftMps: 0.2, maxZoomRatioPerS: 1.9,
    jitterDeg: 0.25, minDurationS: 1.0,
  },
  rickshaw: {
    label: 'Rickshaw',
    hint: 'Geschoben — gleichmaessig, aber nicht ganz ruhig.',
    ease: easeQuintic,
    maxTravelMps: 2.5, maxRotDps: 50, maxLiftMps: 0.2, maxZoomRatioPerS: 1.9,
    jitterDeg: 0.18, minDurationS: 1.0,
  },
  gimbal: {
    label: 'Gimbal',
    hint: 'Weich gefuehrt, flinker als Steadicam.',
    ease: easeQuad,
    maxTravelMps: 1.6, maxRotDps: 90, maxLiftMps: 0.5, maxZoomRatioPerS: 2.0,
    jitterDeg: 0.05, minDurationS: 0.5,
  },
  steadicam: {
    label: 'Steadicam',
    hint: 'Schwebend, laeuft leicht ueber und pendelt sich ein.',
    ease: easeSettle,
    maxTravelMps: 1.8, maxRotDps: 70, maxLiftMps: 0.6, maxZoomRatioPerS: 1.9,
    jitterDeg: 0.12, minDurationS: 0.8,
  },
  handheld: {
    label: 'Handheld',
    hint: 'Nie ganz ruhig — feines Zittern ueberlagert die Fahrt.',
    ease: easeQuad,
    maxTravelMps: 1.5, maxRotDps: 120, maxLiftMps: 0.7, maxZoomRatioPerS: 2.4,
    jitterDeg: 0.35, minDurationS: 0.3,
  },
  fixed: {
    label: 'Fest montiert',
    hint: 'Starr — nur Zoom/Fokus, keine Fahrt.',
    ease: easeCubic,
    maxTravelMps: 0.05, maxRotDps: 45, maxLiftMps: 0.05, maxZoomRatioPerS: 2.2,
    jitterDeg: 0, minDurationS: 0.3,
  },
};

/** Profil einer Kamera; ohne gesetzte Montage gilt „Stativ". */
export function profileForMount(mount?: CameraMountType): MotionProfile {
  return MOTION_PROFILES[mount ?? 'tripod'] ?? MOTION_PROFILES.tripod;
}

/**
 * Zeitkurve des Profils, an den Raendern hart auf 0/1 geklemmt — ein
 * ueberschwingendes Profil darf die Fahrt nicht ueber das Ziel hinaus enden
 * lassen.
 */
export function motionEase(profile: MotionProfile, t: number): number {
  const c = clamp01(t);
  if (c === 0) return 0;
  if (c === 1) return 1;
  return profile.ease(c);
}

/**
 * Kleines, ruhiges Zittern fuer Handheld/Steadicam. Bewusst deterministisch
 * (Summe zweier unharmonischer Sinus) statt Zufall: dieselbe Fahrt sieht bei
 * jedem Abspielen gleich aus, und es flackert nicht.
 * Faehrt an den Enden aus, damit Start- und Zielbild exakt getroffen werden.
 */
export function motionJitter(profile: MotionProfile, t: number, seed = 0): { pan: number; tilt: number } {
  if (profile.jitterDeg <= 0) return { pan: 0, tilt: 0 };
  const c = clamp01(t);
  const envelope = Math.sin(Math.PI * c); // 0 an beiden Enden, 1 in der Mitte
  const a = profile.jitterDeg * envelope;
  return {
    pan: a * Math.sin(c * 37 + seed),
    tilt: a * 0.7 * Math.sin(c * 23 + seed * 1.7 + 1.3),
  };
}

/**
 * Physikalisch noetige Mindestdauer fuer die Fahrt `from` → `to` auf diesem
 * Rig. Jede Achse wird einzeln geprueft; die langsamste bestimmt die Dauer.
 * Ergebnis ist nie kleiner als `minDurationS`.
 */
export function feasibleDuration(
  profile: MotionProfile,
  from: Partial<VenueCamera>,
  to: Partial<VenueCamera>,
): number {
  const d = (k: keyof VenueCamera) => {
    const a = from[k];
    const b = to[k];
    return typeof a === 'number' && typeof b === 'number' ? Math.abs(b - a) : 0;
  };

  const travel = Math.hypot(d('x'), d('y')) + d('trackOffset');
  const rot = Math.max(d('pan'), d('tilt'));
  const lift = d('z');

  const fa = typeof from.focalLength === 'number' ? from.focalLength : 0;
  const fb = typeof to.focalLength === 'number' ? to.focalLength : 0;
  const zoomRatio = fa > 0 && fb > 0 ? Math.abs(Math.log(fb / fa)) : 0;

  return Math.max(
    profile.minDurationS,
    travel / profile.maxTravelMps,
    rot / profile.maxRotDps,
    lift / profile.maxLiftMps,
    zoomRatio / Math.log(profile.maxZoomRatioPerS),
  );
}

/** Auf zwei Nachkommastellen gerundete Mindestdauer — fuer Anzeigen. */
export function feasibleDurationRounded(
  profile: MotionProfile,
  from: Partial<VenueCamera>,
  to: Partial<VenueCamera>,
): number {
  return Math.round(feasibleDuration(profile, from, to) * 10) / 10;
}
