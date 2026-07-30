import { describe, expect, it } from 'vitest';
import {
  FULL_STOPS,
  formatAperture,
  formatDistance,
  formatFocal,
  niceTicks,
  posToValue,
  snapToCandidates,
  stepStop,
  stopsInRange,
  valueToPos,
} from '../utils/lensScale';

// Objektiv-Regler-Skalen. Kern der Umstellung: Blende und Brennweite sind
// logarithmisch. Linear gelegt landet der meistgenutzte Bereich auf den ersten
// Prozent der Reglerbahn — genau das pruefen die ersten Tests nach.

describe('valueToPos / posToValue (logarithmisch)', () => {
  it('legt gleiche Verhaeltnisse auf gleiche Wegstrecken', () => {
    // 10→20mm und 200→400mm sind beide eine Verdopplung und muessen darum
    // denselben Weg auf dem Regler belegen.
    const min = 10, max = 400;
    const d1 = valueToPos(20, min, max) - valueToPos(10, min, max);
    const d2 = valueToPos(400, min, max) - valueToPos(200, min, max);
    expect(d1).toBeCloseTo(d2, 6);
  });

  it('gibt dem nutzbaren Bereich spuerbar mehr Platz als linear', () => {
    // 8–900mm-Objektiv: wo endet der Bereich bis 100mm?
    const min = 8, max = 900;
    const logShare = valueToPos(100, min, max);
    const linShare = valueToPos(100, min, max, false);
    expect(linShare).toBeLessThan(0.11); // linear: ~10 % der Bahn
    expect(logShare).toBeGreaterThan(0.5); // logarithmisch: mehr als die Haelfte
  });

  it('ist an den Enden exakt 0 und 1', () => {
    expect(valueToPos(8, 8, 900)).toBeCloseTo(0, 9);
    expect(valueToPos(900, 8, 900)).toBeCloseTo(1, 9);
  });

  it('ist die Umkehrung von posToValue', () => {
    for (const v of [1.4, 4, 35, 120, 850]) {
      expect(posToValue(valueToPos(v, 1.4, 900), 1.4, 900)).toBeCloseTo(v, 6);
    }
  });

  it('klemmt Werte und Positionen ausserhalb der Grenzen ab', () => {
    expect(valueToPos(1, 10, 100)).toBe(0);
    expect(valueToPos(1000, 10, 100)).toBe(1);
    expect(posToValue(-1, 10, 100)).toBeCloseTo(10, 9);
    expect(posToValue(2, 10, 100)).toBeCloseTo(100, 9);
  });

  it('faellt bei nicht-positiven Grenzen auf linear zurueck (kein log(0))', () => {
    expect(Number.isFinite(valueToPos(5, 0, 10))).toBe(true);
    expect(valueToPos(5, 0, 10)).toBeCloseTo(0.5, 9);
  });

  it('liefert brauchbare Werte bei entarteter Spanne (min == max)', () => {
    expect(valueToPos(5, 5, 5)).toBe(0);
    expect(posToValue(0.5, 5, 5)).toBe(5);
  });
});

describe('Blendenstufen', () => {
  it('folgt der Normreihe in √2-Schritten', () => {
    // Jede volle Stufe halbiert das Licht => Verhaeltnis ~1.414.
    const idx = FULL_STOPS.indexOf(2);
    expect(FULL_STOPS[idx + 1] / FULL_STOPS[idx]).toBeCloseTo(Math.SQRT2, 1);
  });

  it('gibt nur Stufen im Bereich zurueck', () => {
    expect(stopsInRange(1.7, 8)).toEqual([2, 2.8, 4, 5.6, 8]);
  });

  it('springt mit stepStop genau eine Stufe', () => {
    expect(stepStop(2.8, 1, 1.4, 22)).toBe(4);
    expect(stepStop(2.8, -1, 1.4, 22)).toBe(2);
  });

  it('laeuft von einem krummen Zwischenwert auf die passende Stufe', () => {
    // Objektiv-Anfangsblende f/1.7 liegt zwischen den Normstufen.
    expect(stepStop(1.7, 1, 1.7, 22)).toBe(2);
    expect(stepStop(3.5, -1, 1.4, 22)).toBe(2.8);
  });

  it('bleibt an den Enden stehen statt darueber hinauszulaufen', () => {
    expect(stepStop(22, 1, 1.4, 22)).toBe(22);
    expect(stepStop(1.4, -1, 1.4, 22)).toBe(1.4);
  });
});

describe('niceTicks', () => {
  it('setzt 1-2-5-Marken je Dekade und immer die Grenzen', () => {
    const t = niceTicks(0.5, 50);
    expect(t[0]).toBe(0.5);
    expect(t[t.length - 1]).toBe(50);
    expect(t).toContain(1);
    expect(t).toContain(10);
  });

  it('bleibt aufsteigend und ohne Ausreisser ausserhalb der Grenzen', () => {
    const t = niceTicks(8, 900);
    expect(t.every((v, i) => i === 0 || v > t[i - 1])).toBe(true);
    expect(t.every((v) => v >= 8 && v <= 900)).toBe(true);
  });

  it('duennt bei sehr grosser Spanne aus, statt die Skala zu ueberfuellen', () => {
    expect(niceTicks(1, 100000, 6).length).toBeLessThanOrEqual(8);
  });
});

describe('snapToCandidates', () => {
  it('rastet auf eine nahe Stufe', () => {
    expect(snapToCandidates(3.95, [2.8, 4, 5.6], 1.4, 22)).toBe(4);
  });

  it('laesst Werte zwischen den Stufen in Ruhe', () => {
    // Bewusst mittig zwischen zwei Stufen -> keine Rastung.
    expect(snapToCandidates(3.3, [2.8, 4, 5.6], 1.4, 22)).toBe(3.3);
  });

  it('misst die Naehe in Reglerposition, nicht im Wert', () => {
    // Am Tele-Ende sind die Zahlen weit auseinander, der Weg aber kurz —
    // absolute Wert-Toleranz wuerde dort gar nicht mehr rasten.
    expect(snapToCandidates(880, [900], 8, 900, 0.02)).toBe(900);
  });

  it('ignoriert Kandidaten ausserhalb der Grenzen', () => {
    expect(snapToCandidates(5, [32], 1.4, 22)).toBe(5);
  });
});

describe('Formatierung', () => {
  it('zeigt kurze Brennweiten mit Nachkommastelle', () => {
    expect(formatFocal(8.4)).toBe('8.4mm');
    expect(formatFocal(85)).toBe('85mm');
  });

  it('zeigt nahe Distanzen in cm, mittlere fein, ferne gerundet', () => {
    expect(formatDistance(0.5)).toBe('50cm');
    expect(formatDistance(4.25)).toBe('4.3m');
    // Direkteingabe 12.5 muss auch 12.5 anzeigen, nicht auf 13 gerundet —
    // sonst wirkt die Eingabe verworfen.
    expect(formatDistance(12.5)).toBe('12.5m');
    expect(formatDistance(12)).toBe('12m');
    expect(formatDistance(142.4)).toBe('142m');
  });

  it('formatiert Blenden wie auf dem Objektiv', () => {
    expect(formatAperture(1.7)).toBe('f/1.7');
    expect(formatAperture(11)).toBe('f/11');
  });
});
