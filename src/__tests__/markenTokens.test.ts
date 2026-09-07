import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// ───────────────────────────────────────────────────────────────────────────
// ADR-007 (av-planner-suite) — „die UI ist nicht konsistent. lege globale UI
// Regeln fest, die für alle Repos gelten."
//
// Die Werte stehen maschinenlesbar in `@avplan/ui` (`src/brand.ts`), aber der
// MultiCam-Planer hängt nicht an diesem Paket — er wird in die Suite
// vendoriert, nicht umgekehrt. Dieser Test trägt sie ein zweites Mal, und das
// ist Absicht: ohne ihn wäre der Rückweg in die eigene Near-Black-Welt eine
// Zeile, die niemandem auffällt.
// ───────────────────────────────────────────────────────────────────────────

const css = readFileSync(resolve(__dirname, '..', 'index.css'), 'utf8');

const token = (name: string): string => {
  const m = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  return m ? m[1].trim() : '';
};

describe('die bc-Tokens zeigen auf die Marke', () => {
  it('trägt Deep Navy als Grund und Zumpe Navy als Panel', () => {
    expect(token('--color-bc-dark')).toBe('#132040');
    expect(token('--color-bc-panel')).toBe('#1D324F');
  });

  it('setzt Eisblau als Fließtext und Off-White als Aktionsfläche', () => {
    expect(token('--color-bc-text')).toBe('#E1ECEF');
    expect(token('--color-bc-accent')).toBe('#F6F5F0');
    expect(token('--color-bc-accent-text')).toBe('#132040');
  });

  it('führt die Status-Töne des Handbuchs, nicht die von Tailwind', () => {
    expect(token('--color-bc-green')).toBe('#2F7D5C');
    expect(token('--color-bc-red')).toBe('#B04A3F');
    expect(token('--color-bc-yellow')).toBe('#C8892B');
  });
});

describe('Rot ist das Signal', () => {
  it('steht genau einmal — als --color-bc-signal', () => {
    const treffer = css
      .split('\n')
      .filter((z) => z.toUpperCase().includes('#D6402E'))
      .map((z) => z.trim());
    expect(treffer.every((z) => z.startsWith('--color-bc-signal:'))).toBe(true);
  });

  it('trägt den Tastatur-Fokusring — 2 px, 3 px Abstand', () => {
    expect(css).toContain('outline: 2px solid var(--color-bc-signal)');
    expect(css).toContain('outline-offset: 3px');
  });

  it('ist nicht Fehlerrot — anderer Ton, anderer Zweck', () => {
    expect(token('--color-bc-red')).not.toBe('#D6402E');
  });
});

describe('keine Rundungen, keine Verläufe, keine Fremd-Palette', () => {
  it('lässt keinen Radius stehen', () => {
    expect(css).not.toMatch(/border-radius:\s*(50%|[1-9])/);
  });

  it('kennt keinen Verlauf', () => {
    expect(css).not.toMatch(/linear-gradient|radial-gradient/);
  });

  it('führt die alten Near-Black-Werte nicht mehr', () => {
    for (const alt of ['#0f1117', '#1a1d27', '#2a2d3a', '#3b82f6']) {
      expect(css.toLowerCase()).not.toContain(alt);
    }
  });
});
