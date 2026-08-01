import { describe, it, expect } from 'vitest';
import {
  FRONT_BOTTOM_FRACTION,
  HORIZON_TOP_FRACTION,
  VIEW3D_ASPECT,
  VIEW3D_CAM_HEIGHT_M,
  VIEW3D_FOV_DEG,
  defaultCameraPos,
  defaultPitchRad,
  camHeightFor,
  centrePitchRad,
  defaultView,
  fitDistanceM,
  groundPitchRad,
  widthFitDistanceM,
} from '../utils/view3d';

/** Wo landet ein Bodenpunkt bei dieser Neigung? 0 = oben, 1 = unten. */
function screenFraction(camHeightM: number, distM: number, pitchRad: number, fovDeg = VIEW3D_FOV_DEG): number {
  const halfFov = (fovDeg * Math.PI) / 360;
  const depression = Math.atan(camHeightM / distM);
  const offset = Math.tan(depression - Math.abs(pitchRad)) / Math.tan(halfFov);
  return (offset + 1) / 2;
}

/** Wie weit steht die seitliche Hallenkante vom Bildrand entfernt? <1 = drin. */
function widthUsage(widthM: number, distToCentreM: number, fovDeg = VIEW3D_FOV_DEG, aspect = VIEW3D_ASPECT): number {
  const halfFov = (fovDeg * Math.PI) / 360;
  const halfFovH = Math.atan(Math.tan(halfFov) * aspect);
  return Math.atan(widthM / 2 / distToCentreM) / halfFovH;
}

describe('groundPitchRad', () => {
  it('setzt den Zielpunkt genau auf den gewuenschten Bildanteil', () => {
    const pitch = groundPitchRad(15, 25);
    expect(screenFraction(15, 25, pitch)).toBeCloseTo(HORIZON_TOP_FRACTION, 5);
  });

  it('trifft den Anteil auch bei anderer Hoehe, Entfernung und Bildwinkel', () => {
    for (const [h, d, fov, f] of [
      [8, 40, 50, 0.2],
      [25, 30, 35, 0.1],
      [15, 60, 70, 0.3],
    ] as const) {
      const pitch = groundPitchRad(h, d, fov, f);
      expect(screenFraction(h, d, pitch, fov)).toBeCloseTo(f, 5);
    }
  });

  it('nimmt bei extremer Geometrie die Grenze in Kauf statt zu ueberdrehen', () => {
    const pitch = groundPitchRad(25, 12, 35, 0.1);
    expect(pitch).toBe(-1.35);
    expect(screenFraction(25, 12, pitch, 35)).toBeGreaterThan(0.1);
  });

  it('neigt nach unten und bei ferner Kante flacher', () => {
    expect(groundPitchRad(15, 25)).toBeLessThan(0);
    expect(Math.abs(groundPitchRad(15, 60))).toBeLessThan(Math.abs(groundPitchRad(15, 15)));
  });

  it('faengt Null- und Negativwerte ab', () => {
    expect(Number.isFinite(groundPitchRad(0, 0))).toBe(true);
    expect(Number.isFinite(groundPitchRad(-5, -5))).toBe(true);
  });
});

describe('fitDistanceM', () => {
  it('legt beide Hallenkanten auf ihre Zielanteile', () => {
    const depth = 15;
    const h = camHeightFor(depth);
    const dist = fitDistanceM(depth, h);
    const pitch = groundPitchRad(h, dist);
    expect(screenFraction(h, dist, pitch)).toBeCloseTo(HORIZON_TOP_FRACTION, 4);
    expect(screenFraction(h, dist - depth, pitch)).toBeCloseTo(FRONT_BOTTOM_FRACTION, 4);
  });

  it('funktioniert ueber sehr unterschiedliche Hallentiefen', () => {
    for (const depth of [4, 15, 40, 120]) {
      const h = camHeightFor(depth);
      const dist = fitDistanceM(depth, h);
      const pitch = groundPitchRad(h, dist);
      expect(screenFraction(h, dist - depth, pitch)).toBeCloseTo(FRONT_BOTTOM_FRACTION, 3);
    }
  });

  it('steht immer hinter der Halle', () => {
    for (const depth of [1, 15, 200]) {
      expect(fitDistanceM(depth, camHeightFor(depth))).toBeGreaterThan(depth);
    }
  });

  it('rueckt bei tieferer Halle weiter weg', () => {
    expect(fitDistanceM(40, camHeightFor(40))).toBeGreaterThan(fitDistanceM(15, camHeightFor(15)));
  });
});

describe('widthFitDistanceM', () => {
  it('haelt die Halle seitlich im Bild', () => {
    for (const [w, d] of [[20, 15], [80, 20], [6, 40]] as const) {
      const dist = widthFitDistanceM(w, d);
      expect(widthUsage(w, dist - d / 2)).toBeLessThan(1);
    }
  });

  it('braucht fuer eine breitere Halle mehr Abstand', () => {
    expect(widthFitDistanceM(80, 15)).toBeGreaterThan(widthFitDistanceM(20, 15));
  });
});

describe('defaultView', () => {
  it('fuellt bei der Standardhalle den grossen Teil der Bildhoehe', () => {
    const { pos, pitch } = defaultView(20, 15);
    const top = screenFraction(pos[1], pos[2], pitch);
    const bottom = screenFraction(pos[1], pos[2] - 15, pitch);
    expect(top).toBeLessThan(0.2);
    expect(bottom).toBeGreaterThan(0.75);
    expect(bottom - top).toBeGreaterThan(0.6);
  });

  it('steht mittig vor der Halle und ueber dem Boden', () => {
    const { pos } = defaultView(20, 15);
    expect(pos[0]).toBe(10);
    expect(pos[1]).toBeGreaterThan(0);
    expect(pos[1]).toBeLessThanOrEqual(VIEW3D_CAM_HEIGHT_M);
    expect(pos[2]).toBeGreaterThan(15);
  });

  it('geht bei flacher Halle tiefer', () => {
    expect(defaultView(20, 4).pos[1]).toBeLessThan(defaultView(20, 40).pos[1]);
  });

  it('zentriert, wenn die Breite die Kamera weiter zurueckzwingt', () => {
    // 20 x 4 m: die Breite bestimmt den Abstand, die Halle bleibt ein schmales
    // Band. Es soll mittig liegen statt oben angeklebt mit leerer Restflaeche.
    const { pos, pitch } = defaultView(20, 4);
    const top = screenFraction(pos[1], pos[2], pitch);
    const bottom = screenFraction(pos[1], pos[2] - 4, pitch);
    expect((top + bottom) / 2).toBeCloseTo(0.5, 2);
    expect(top).toBeGreaterThan(HORIZON_TOP_FRACTION);
  });

  it('haelt die Halle bei jeder Hallenform vollstaendig im Bild', () => {
    for (const [w, d] of [[20, 15], [80, 60], [10, 40], [60, 8]] as const) {
      const { pos, pitch } = defaultView(w, d);
      const top = screenFraction(pos[1], pos[2], pitch);
      const bottom = screenFraction(pos[1], pos[2] - d, pitch);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(1);
      expect(bottom).toBeGreaterThan(top);
      expect(widthUsage(w, pos[2] - d / 2)).toBeLessThan(1);
    }
  });

  it('heftet die hintere Kante oben an, wenn die Hoehe bestimmt', () => {
    // Schmale, tiefe Halle: hier gewinnt die Hoehenanpassung eindeutig.
    const { pos, pitch } = defaultView(10, 40);
    expect(screenFraction(pos[1], pos[2], pitch)).toBeCloseTo(HORIZON_TOP_FRACTION, 3);
  });

  it('geht am Umschaltpunkt stetig ueber', () => {
    // Bei der Standardhalle liegen Hoehen- und Breitenbedarf dicht beieinander.
    // Egal welcher gewinnt, die hintere Kante muss oben bleiben.
    for (const [w, d] of [[19, 15], [20, 15], [21, 15], [24, 15]] as const) {
      const { pos, pitch } = defaultView(w, d);
      expect(screenFraction(pos[1], pos[2], pitch)).toBeLessThan(0.25);
    }
  });

  it('weicht bei sehr breiter Halle nach hinten aus, statt sie abzuschneiden', () => {
    const schmal = defaultView(10, 15);
    const breit = defaultView(90, 15);
    expect(breit.pos[2]).toBeGreaterThan(schmal.pos[2]);
    expect(widthUsage(90, breit.pos[2] - 7.5)).toBeLessThan(1);
  });

  it('neigt deutlich staerker als die fruehere feste Vorgabe von -0.3', () => {
    expect(defaultView(20, 15).pitch).toBeLessThan(-0.3);
  });

  it('bleibt bei unsinnigen Maßen endlich', () => {
    for (const [w, d] of [[0, 0], [-5, -5], [1e6, 1e6]] as const) {
      const { pos, pitch } = defaultView(w, d);
      expect(pos.every((v) => Number.isFinite(v))).toBe(true);
      expect(Number.isFinite(pitch)).toBe(true);
    }
  });
});

describe('centrePitchRad', () => {
  it('legt beide Kanten gleich weit von der Mitte', () => {
    const pitch = centrePitchRad(10, 40, 20);
    const top = screenFraction(10, 40, pitch);
    const bottom = screenFraction(10, 20, pitch);
    expect((top + bottom) / 2).toBeCloseTo(0.5, 4);
  });

  it('neigt nach unten und bleibt in den Grenzen', () => {
    const pitch = centrePitchRad(10, 40, 20);
    expect(pitch).toBeLessThan(0);
    expect(pitch).toBeGreaterThanOrEqual(-1.35);
  });
});

describe('defaultCameraPos / defaultPitchRad', () => {
  it('liefern dasselbe wie defaultView', () => {
    const v = defaultView(24, 18);
    expect(defaultCameraPos(24, 18)).toEqual(v.pos);
    expect(defaultPitchRad(24, 18)).toBe(v.pitch);
  });
});
