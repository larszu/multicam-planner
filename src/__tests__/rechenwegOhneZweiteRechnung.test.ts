/**
 * Der Rechenweg rechnet nicht selbst.
 *
 * BEFUND (Defektformen-Sweep, Form `zwei-rechnungen`, gemessen 2026-09-07).
 * `components/Sidebar/CalculationBreakdown.tsx` ist die Tafel, die dem Nutzer
 * die Formeln mit seinen Werten zeigt, damit er die Ausgabe nachpruefen kann.
 * Sie rechnete zwei Werte selbst nach:
 *
 *     const D = Math.sqrt(W * W + H * H);        // Sensordiagonale
 *     const personPx = (personH / imgH) * 1080;  // "matches utils/fov.ts"
 *
 * Der Kommentar daneben sagte es offen: „(matches utils/fov.ts:
 * personHeightInFrame)". Eine Uebereinstimmung, die jemand von Hand pflegen
 * muss, ist keine.
 *
 * Und ausgerechnet hier ist sie am teuersten: wer den Rechenweg aufklappt,
 * tut das, weil er der Zahl darueber nicht traut. Eine Tafel, die eine
 * ANDERE Zahl herleitet als der Rechner, ist schlimmer als gar keine.
 *
 * Dazu kamen die nackten Literale im JSX (1.80, 1080, 1500): der gezeigte
 * Rechenweg behauptete eine Formel, die er im Zweifel gar nicht benutzte.
 */
import { describe, it, expect } from 'vitest';
import {
  personHeightInFrame, imageHeightAtDistance, circleOfConfusion,
  diagonalFov, sensorDiagonalMm,
  PERSON_HEIGHT_M, OUTPUT_HEIGHT_PX, COC_DIVISOR,
} from '../utils/fov';
// Quelltext als Zeichenkette (Vite-`?raw`) statt ueber `node:fs`: die
// tsconfig fuehrt bewusst `types: []`, also gibt es hier keine Node-Typen.
import breakdown from '../components/Sidebar/CalculationBreakdown.tsx?raw';
import fovQuelle from '../utils/fov.ts?raw';

const S35 = { w: 24.89, h: 14.0 };

/** Kommentarzeilen zaehlen nicht — die Doku nennt die Zahlen beim Namen. */
const ohneKommentar = (text: string) =>
  text
    .split('\n')
    .filter((z) => !/^\s*(\/\/|\/?\*)/.test(z))
    .join('\n');

const fovCode = ohneKommentar(fovQuelle);

/** Zeilen ohne `//`-Kommentare — der Kopf der Datei zitiert die alten Zeilen. */
const code = ohneKommentar(breakdown);

describe('die Zahlen stehen an einer Stelle', () => {
  it('die Sensordiagonale kommt aus sensorDiagonalMm', () => {
    // Sowohl die Diagonal-FOV als auch der Zerstreuungskreis muessen sie
    // benutzen — sonst waere die Funktion nur eine dritte Kopie.
    expect(circleOfConfusion(S35.w, S35.h)).toBeCloseTo(
      sensorDiagonalMm(S35.w, S35.h) / COC_DIVISOR, 12,
    );
    const fl = 50;
    expect(diagonalFov(S35.w, S35.h, fl)).toBeCloseTo(
      (2 * Math.atan(sensorDiagonalMm(S35.w, S35.h) / (2 * fl)) * 180) / Math.PI, 12,
    );
  });

  it('personHeightInFrame benutzt die exportierten Vorgaben', () => {
    const fl = 50;
    const d = 12;
    const erwartet = (PERSON_HEIGHT_M / imageHeightAtDistance(S35.h, fl, d)) * OUTPUT_HEIGHT_PX;
    expect(personHeightInFrame(S35.h, fl, d)).toBeCloseTo(erwartet, 12);
  });

  it('die Vorgaben sind die, mit denen der Planer arbeitet', () => {
    // Damit dieser Test nicht selbst zur zweiten Rechnung wird, steht hier
    // nur, dass die Werte plausibel und benannt sind — nicht ihre Herkunft.
    expect(PERSON_HEIGHT_M).toBeGreaterThan(1.4);
    expect(PERSON_HEIGHT_M).toBeLessThan(2.2);
    expect(OUTPUT_HEIGHT_PX).toBeGreaterThanOrEqual(720);
    expect(COC_DIVISOR).toBeGreaterThan(0);
  });
});

describe('auch fov.ts baut die Diagonale nur einmal', () => {
  // DIESE Zusicherung fehlte zuerst, und die Gegenprobe hat es gezeigt: als
  // `circleOfConfusion` wieder sein eigenes `Math.sqrt(...) / 1500` bekam,
  // blieb der Lauf gruen — die Zahl ist ja dieselbe. Genau das ist die Form:
  // zwei Rechnungen, die heute uebereinstimmen und morgen nicht mehr.
  it('Math.sqrt steht nur in sensorDiagonalMm', () => {
    const treffer = fovCode.split('\n').filter((z) => z.includes('Math.sqrt'));
    expect(treffer.length, `Math.sqrt an ${treffer.length} Stellen:\n${treffer.join('\n')}`).toBe(1);
    expect(treffer[0]).toContain('sensorWidthMm ** 2');
    const koerper = fovQuelle.split('export function sensorDiagonalMm')[1].split('\n}')[0];
    expect(koerper).toContain('Math.sqrt');
  });

  it('der Teiler 1500 steht nur an der Konstante', () => {
    const treffer = fovCode.split('\n').filter((z) => z.includes('1500'));
    expect(treffer.length, treffer.join('\n')).toBe(1);
    expect(treffer[0]).toContain('COC_DIVISOR');
  });
});

describe('die Tafel rechnet nichts nach', () => {
  it('holt Diagonale und Personenhoehe aus utils/fov', () => {
    expect(code).toContain('sensorDiagonalMm(W, H)');
    expect(code).toContain('personHeightInFrame(H, fe, s)');
  });

  it('baut die Diagonale nicht selbst', () => {
    expect(code).not.toMatch(/Math\.sqrt\s*\(\s*W\s*\*\s*W/);
    expect(code).not.toMatch(/Math\.sqrt\s*\(\s*W\s*\*\*/);
  });

  it('schreibt keine der drei Zahlen als Literal hin', () => {
    // 1.80 / 1080 / 1500 standen im JSX — der gezeigte Rechenweg war damit
    // von der tatsaechlichen Rechnung entkoppelt.
    for (const literal of ['1080', '1500', '1.80', '1.8']) {
      expect(
        code.includes(literal),
        `„${literal}" steht wieder als Literal in der Tafel`,
      ).toBe(false);
    }
  });

  it('nennt die Vorgaben beim Namen, statt sie zu verschweigen', () => {
    // Gegenprobe zum Test darueber: er waere auch gruen, wenn die Zeile
    // ersatzlos verschwaende.
    expect(code).toContain('PERSON_HEIGHT_M');
    expect(code).toContain('OUTPUT_HEIGHT_PX');
    expect(code).toContain('COC_DIVISOR');
  });
});
