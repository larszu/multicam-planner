// Waechter fuer die Oberflaechen-Regeln (ADR-007 der av-planner-suite).
// Lauf: `npm run brand:check`
//
// ─── WARUM EIN SKRIPT UND KEIN VITEST-TEST ─────────────────────────────────
//
// Zuerst stand das hier als `src/__tests__/markenTokens.test.ts`. Vitest lief
// gruen, `tsc -b` brach ab: die App-tsconfig kennt keine Node-Typen, und ein
// Waechter, der die CSS-Datei lesen muss, braucht `node:fs` — `?raw` liefert
// fuer Stylesheets einen leeren String, weil Vite sie gesondert behandelt.
// Die tsconfig fuer eine Pruefdatei aufzubohren waere der falsche Weg: dann
// haette der ganze `src`-Baum Node-Typen, die er nicht haben soll.
//
// Als Skript neben `docs-reachable.mjs` und `actions-node-runtime.mjs` ist es
// dort, wo die uebrigen Repo-Pruefungen liegen — und es laeuft in derselben
// CI-Stufe.
//
// ─── WARUM DIE WERTE HIER EIN ZWEITES MAL STEHEN ───────────────────────────
//
// Sie stehen maschinenlesbar in `@avplan/ui` (`src/brand.ts`) — aber der
// MultiCam-Planer haengt nicht an diesem Paket: er wird in die Suite
// vendoriert, nicht umgekehrt. Ohne diesen Check waere der Rueckweg in die
// alte Near-Black-Welt eine Zeile, die niemandem auffaellt.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(hier, '..', 'src/index.css'), 'utf8');

const token = (name) => {
  const m = css.match(new RegExp(`${name}:\\s*([^;]+);`));
  return m ? m[1].trim() : '';
};

// ── 1. Die Palette ist die der Marke ──────────────────────────────────────
assert.equal(token('--color-bc-dark'), '#132040', 'Grund ist Deep Navy');
assert.equal(token('--color-bc-panel'), '#1D324F', 'Panel ist Zumpe Navy');
assert.equal(token('--color-bc-text'), '#E1ECEF', 'Fliesstext ist Eisblau');
assert.equal(token('--color-bc-accent'), '#F6F5F0', 'Aktionsflaeche ist Off-White');
assert.equal(token('--color-bc-accent-text'), '#132040', 'darauf steht Navy');
assert.equal(token('--color-bc-muted'), '#8C9CB3', 'Gedaempft ist Stahlblau');

// ── 2. Status ist nicht Signal ────────────────────────────────────────────
assert.equal(token('--color-bc-green'), '#2F7D5C');
assert.equal(token('--color-bc-red'), '#B04A3F');
assert.equal(token('--color-bc-yellow'), '#C8892B');
assert.equal(token('--color-bc-signal'), '#D6402E', 'Tally-Rot ist das Signal');
assert.notEqual(token('--color-bc-red'), token('--color-bc-signal'), 'zwei Toene, zwei Zwecke');

// ── 3. Rot kommt genau einmal vor: in der Definition des Signals ─────────
const rotZeilen = css
  .split('\n')
  .map((z) => z.trim())
  .filter((z) => z.toUpperCase().includes('#D6402E'));
assert.ok(
  rotZeilen.every((z) => z.startsWith('--color-bc-signal:')),
  `Tally-Rot steht ausserhalb von --color-bc-signal: ${rotZeilen.join(' | ')}`,
);

// ── 4. Der Fokusring ist das Signal ───────────────────────────────────────
assert.ok(css.includes('outline: 2px solid var(--color-bc-signal)'), 'Fokusring fehlt');
assert.ok(css.includes('outline-offset: 3px'), 'Fokus-Abstand fehlt');

// ── 5. Keine Rundungen, keine Verlaeufe, keine Fremd-Palette ─────────────
assert.ok(!/border-radius:\s*(50%|[1-9])/.test(css), 'harter Radius gefunden');
assert.ok(!/linear-gradient|radial-gradient/.test(css), 'Verlauf gefunden');
for (const alt of ['#0f1117', '#1a1d27', '#2a2d3a', '#3b82f6']) {
  assert.ok(!css.toLowerCase().includes(alt), `alter Near-Black-Wert ${alt} steht noch da`);
}

console.log('brand:check ok — Oberflaechen-Regeln (ADR-007) eingehalten');
