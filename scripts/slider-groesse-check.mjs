#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────────
// Sind die Schieberegler zu treffen? — Lauf: `npm run slider:check`
//
// Nutzer-Meldung 2026-09-09: „Passe auch die Ui von allen slidern an sodass
// man sie gut bedienen kann."
//
// GEMESSEN WURDE VORHER: `input[type="range"] { height: 4px }` mit einem
// 14 x 14 px grossen Griff. Vier Pixel sind die GANZE Trefferflaeche in der
// Hoehe — das Element ist so hoch wie seine Bahn. WCAG 2.2, Erfolgskriterium
// 2.5.8 („Target Size (Minimum)", Stufe AA) nennt 24 px als Mindestmass.
//
// WAS DIESER LAUF PRUEFT — UND WAS ER AUSDRUECKLICH NICHT KANN.
//
// Er liest die Zahlen aus dem Stilblatt und aus den Klassen an den Reglern.
// Das ist WENIGER als eine Messung am gerenderten Fenster: was `gap`,
// Zeilenhoehe und ein umgebendes `transform` daraus machen, sieht er nicht.
// `cable-planner/scripts/ui-targets.mjs` misst so etwas richtig, mit einem
// echten Browser und `getBoundingClientRect()` — und der Kopf jener Datei
// sagt auch, warum: „Eine Trefferflaeche misst man am gerenderten Element,
// nicht an Klassennamen."
//
// Warum es hier trotzdem steht: die beiden Wege, auf denen ein Regler wieder
// schrumpft, sind BEIDE textlich sichtbar — jemand dreht die Zahl im
// Stilblatt zurueck, oder jemand haengt an einen einzelnen Regler eine
// Utility-Klasse wie `h-1`, die das Stilblatt ueberschreibt. Genau diese
// zwei fragt der Lauf ab, und er sagt von sich aus, dass er nur diese zwei
// kennt. Eine Pruefung, die ihre Grenze verschweigt, ist die gefaehrlichere.
// ───────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), '..');
const STIL = join(WURZEL, 'src/index.css');

/** WCAG 2.2 SC 2.5.8, Stufe AA. Eine Norm mit einer Zahl. */
const MINDESTHOEHE = 24;
/** Der sichtbare Griff. Kleiner als das findet der Daumen die Bahn nicht. */
const MINDESTGRIFF = 18;

const fehler = [];

// ── 1. Das Stilblatt ──────────────────────────────────────────────────────
const css = readFileSync(STIL, 'utf8');

const block = (selektor) => {
  const i = css.indexOf(selektor);
  if (i < 0) return null;
  const auf = css.indexOf('{', i);
  const zu = css.indexOf('}', auf);
  return auf < 0 || zu < 0 ? null : css.slice(auf + 1, zu);
};

const px = (rumpf, eigenschaft) => {
  if (!rumpf) return null;
  const m = new RegExp(`${eigenschaft}\\s*:\\s*(\\d+(?:\\.\\d+)?)px`).exec(rumpf);
  return m ? Number(m[1]) : null;
};

const rumpfElement = block('input[type="range"] {');
const hoehe = px(rumpfElement, 'height');
if (hoehe === null) {
  fehler.push('input[type="range"] hat keine Hoehe in px — dann misst dieser Lauf nichts.');
} else if (hoehe < MINDESTHOEHE) {
  fehler.push(
    `Die Trefferflaeche ist ${hoehe} px hoch, gebraucht werden ${MINDESTHOEHE} ` +
      '(WCAG 2.2 SC 2.5.8, Stufe AA).',
  );
}

for (const [name, selektor] of [
  ['WebKit', 'input[type="range"]::-webkit-slider-thumb {'],
  ['Firefox', 'input[type="range"]::-moz-range-thumb {'],
]) {
  const rumpf = block(selektor);
  if (!rumpf) {
    // Ohne den Firefox-Zweig bleibt es dort beim Standardaussehen, und die
    // Messung stimmte nur in einem Browser.
    fehler.push(`Der Griff fuer ${name} fehlt (${selektor.replace(' {', '')}).`);
    continue;
  }
  const g = px(rumpf, 'width');
  if (g === null) fehler.push(`Der Griff fuer ${name} hat keine Breite in px.`);
  else if (g < MINDESTGRIFF) {
    fehler.push(`Der Griff fuer ${name} ist ${g} px breit, gebraucht werden ${MINDESTGRIFF}.`);
  }
}

// ── 2. Kein Regler schrumpft sich per Klasse zurueck ──────────────────────
//
// Der zweite Weg, und der leisere: das Stilblatt bleibt richtig, aber an
// EINEM Regler haengt `h-1`. Tailwind-Utilities gewinnen gegen den
// Element-Selektor, und der Regler ist wieder 4 px hoch — nur faellt es
// niemandem auf, weil die anderen stimmen.
const dateien = [];
const gehe = (d) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) { if (e !== 'node_modules') gehe(p); }
    else if (/\.tsx?$/.test(e)) dateien.push(p);
  }
};
gehe(join(WURZEL, 'src'));

/** `h-1`, `h-[4px]`, `h-0.5` — alles, was eine Hoehe unter 24 px setzt. */
const VERDAECHTIG = /\bh-(?:px|0(?:\.5)?|1(?:\.5)?|2|3|4|5|\[\s*(\d+)px\s*\])\b/;
let geprueft = 0;
for (const datei of dateien) {
  const quelle = readFileSync(datei, 'utf8');
  // Von jedem `type="range"` das umgebende JSX-Element bis zum `>`.
  for (const m of quelle.matchAll(/<input\b[^>]*type="range"[^>]*>/g)) {
    geprueft += 1;
    const klassen = /className="([^"]*)"/.exec(m[0])?.[1] ?? '';
    const treffer = VERDAECHTIG.exec(klassen);
    if (!treffer) continue;
    const zahl = treffer[1] ? Number(treffer[1]) : null;
    if (zahl !== null && zahl >= MINDESTHOEHE) continue;
    const zeile = quelle.slice(0, m.index).split('\n').length;
    fehler.push(
      `${datei.replace(WURZEL + '/', '')}:${zeile} — der Regler traegt "${treffer[0]}" und ` +
        'ueberschreibt damit die Hoehe aus dem Stilblatt.',
    );
  }
}

// ── 3. Die Gegenprobe zum Lauf selbst ─────────────────────────────────────
//
// Ohne sie waere ein Lauf, der KEINEN Regler findet, gruen — und genau so
// sieht ein kaputtes Muster aus.
if (geprueft === 0) {
  fehler.push(
    'Kein einziger `type="range"` gefunden. Entweder gibt es keine Regler mehr ' +
      '(dann gehoert dieser Lauf weg), oder das Muster passt nicht mehr.',
  );
}

if (fehler.length > 0) {
  console.error('FEHLER: Schieberegler sind nicht zu treffen:\n' +
    fehler.map((f) => `  · ${f}`).join('\n'));
  process.exit(1);
}

console.log(
  `OK: ${geprueft} Schieberegler, Trefferflaeche ${hoehe} px (Norm ${MINDESTHOEHE}), ` +
    'Griff in beiden Browser-Familien gesetzt.',
);
console.log(
  'Gemessen wurde am Stilblatt und an den Klassen — nicht am gerenderten ' +
    'Fenster. Was `gap`, Zeilenhoehe und ein umgebendes `transform` daraus ' +
    'machen, sieht dieser Lauf nicht.',
);
