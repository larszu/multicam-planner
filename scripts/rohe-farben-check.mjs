import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ───────────────────────────────────────────────────────────────────────────
// Kein rohes Grau mehr in `src/` — gemessen, nicht zugesagt (B-70).
//
// ─── WOGEGEN DIESER LAUF STEHT ────────────────────────────────────────────
//
// Nicht gegen den Umbau — der ist passiert und steht im Diff. Gegen das
// ZURUECKRUTSCHEN, und zwar gegen eine besonders stille Form davon.
//
// Bis zum 2026-09-11 trug `src/` 406 rohe Farb-Utilities: `text-white`,
// `text-gray-200/300/400/500/600`, `bg-white/[0.06]`, `bg-black/60`. Solange
// die App nur dunkel war, sah man ihnen nichts an — sie waren zufaellig
// richtig. Genau deshalb konnte es dazu kommen, dass es 406 werden.
//
// Mit dem Hell-Thema ist jede davon ein Defekt, der sich NICHT von selbst
// meldet: die bc-*-Token springen um, die rohe Klasse nicht, und das
// Ergebnis ist hellgrauer Text auf weissem Grund. Wer im Dunkel-Thema
// arbeitet — also fast jeder, der hier etwas baut — sieht es nie.
//
// Eine Klasse ist schnell geschrieben und die Folge steht in einer Ansicht,
// die der Schreiber nicht offen hat. Dagegen hilft kein Merksatz, sondern
// diese Zaehlung.
//
// ─── WAS ER NICHT KANN ────────────────────────────────────────────────────
//
// Er liest Klassennamen. Ob die Farbe DAHINTER im Hell-Thema lesbar ist,
// sieht er nicht — ein Token mit einem schlecht gewaehlten Wert kommt hier
// grün durch. Kontrast misst er nicht.
//
// Und er sieht nur Tailwind-Utilities. Ein `style={{ color: '#fff' }}` faellt
// ihm nicht auf; dafuer steht die Palette im 2D-Plan, die ausdruecklich zwei
// Saetze fuehrt.
// ───────────────────────────────────────────────────────────────────────────

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');

const dateien = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) dateien(p, out);
    else if (/\.tsx?$/.test(p) && !/__tests__/.test(p)) out.push(p);
  }
  return out;
};

/**
 * Eine rohe Farb-Utility: eine Tailwind-Klasse, die eine Farbe NENNT statt
 * eine Rolle.
 *
 * `black`/`white` stehen mit drin, weil sie die haeufigsten waren (116×
 * `text-white`) und weil gerade sie im Hell-Thema unsichtbar werden.
 */
const ROH =
  /\b(?:bg|text|border|ring|divide|placeholder|fill|stroke|from|to|via|decoration|outline|accent|caret|shadow)-(?:white|black|slate|gray|zinc|neutral|stone)(?:-\d{2,3})?(?:\/(?:\[[^\]]+\]|\d{1,3}))?(?![\w-])/g;

// Der Abschluss ist `(?![\w-])` und NICHT `\b`. Ein `\b` nach der optionalen
// Deckkraft verlangt eine Wortgrenze — nach `bg-white/[0.06]` steht aber ein
// `]`, und auf `]` folgt ein `"`, also zwei Nicht-Wortzeichen. Das `\b`
// scheiterte dort, der Ausdruck fiel auf die kuerzere Fassung zurueck und
// meldete `bg-white` STATT `bg-white/[0.06]`. Gefunden hat das die Probe in
// Lauf 1 — ein Muster, das den Fund nur halb benennt, schickt jemanden an
// die falsche Stelle.

/**
 * Kommentare fallen weg, BEVOR gezaehlt wird.
 *
 * Der Grund steht im Kopf von `SettingsDialog.tsx`: dort stand die
 * Begruendung, warum es das Hell-Thema noch nicht gibt, und sie nannte die
 * rohen Klassen woertlich als Beleg. Der Umstellungs-Lauf hat sie prompt
 * mit-ersetzt. Ein Waechter, der eine Begruendung als Verstoss zaehlt,
 * verbietet das Erklaeren — und wer nicht mehr erklaeren darf, schaltet ihn
 * ab.
 */
const ohneKommentare = (quelle) =>
  quelle.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const funde = [];
let geprueft = 0;
let zeichen = 0;
for (const datei of dateien(SRC)) {
  const quelle = readFileSync(datei, 'utf8');
  geprueft += 1;
  zeichen += quelle.length;
  for (const m of ohneKommentare(quelle).matchAll(ROH)) {
    funde.push(`${relative(SRC, datei)}: ${m[0]}`);
  }
}

// ─── Die vier Messungen ────────────────────────────────────────────────────

// 0. DIE GEGENPROBE ZUERST: es wurde ueberhaupt etwas gelesen.
//
// Ohne sie waere der Lauf mit einem kaputten Verzeichnis-Scan still gruen —
// die schlimmste Sorte gruen, weil sie nach Arbeit aussieht. Gemessen am
// 2026-09-11: 94 Dateien, rund 1,16 Mio. Zeichen. Die Schwellen wandern mit:
// wer die App ausbaut, hebt sie und schreibt die neue Messung dazu.
assert.ok(geprueft > 60, `nur ${geprueft} Dateien gelesen — der Scan ist kaputt`);
assert.ok(zeichen > 200_000, `nur ${zeichen} Zeichen gelesen — der Scan ist kaputt`);

// 1. DAS MUSTER FAENGT WIRKLICH, WONACH ES SUCHT.
//
// Die wichtigere der beiden Gegenproben: ein Muster, das nichts mehr findet,
// meldet ebenfalls null Funde. Es an einer Zeile zu pruefen, die es finden
// MUSS, trennt „sauber" von „blind".
//
// Die Zeile hat schon einmal einen Fehler gefangen: der Ausdruck endete auf
// `\b`, und nach `bg-white/[0.06]` steht ein `]`, auf das ein `"` folgt —
// zwei Nicht-Wortzeichen, also keine Wortgrenze. Der Ausdruck fiel auf die
// kuerzere Fassung zurueck und meldete `bg-white` STATT `bg-white/[0.06]`.
// Ein Muster, das den Fund nur halb benennt, schickt jemanden an die falsche
// Stelle.
{
  const probe = 'className="text-white bg-gray-500 hover:bg-white/[0.06] border-slate-700"';
  assert.deepEqual(
    [...probe.matchAll(ROH)].map((m) => m[0]),
    ['text-white', 'bg-gray-500', 'bg-white/[0.06]', 'border-slate-700'],
  );
  // Und ein Token darf NICHT anschlagen — sonst waere jede Zeile ein Fund,
  // und der Lauf waere in einer Stunde abgeschaltet.
  assert.deepEqual([...'className="text-bc-muted bg-bc-panel"'.matchAll(ROH)], []);
}

// 2. DER KOMMENTARFILTER NIMMT NUR KOMMENTARE WEG.
{
  assert.ok(!ohneKommentare('// text-white im Text\nconst a = 1;').includes('text-white'));
  assert.ok(!ohneKommentare('/* bg-gray-500 */ const b = 2;').includes('bg-gray-500'));
  // Eine URL ist kein Kommentar: `//` darin darf nicht den Rest der Zeile
  // schlucken, sonst verschwaende echter Code aus der Messung.
  assert.ok(ohneKommentare("const u = 'https://x/y'; const c = 'text-white';").includes('text-white'));
}

// 3. ES GIBT KEINE ROHE FARB-UTILITY MEHR.
if (funde.length > 0) {
  console.error(`\n${funde.length} rohe Farb-Utility(s) in src/:`);
  for (const f of funde) console.error(`  ${f}`);
  console.error(
    '\nDie bc-*-Token springen mit dem Thema um, eine rohe Klasse nicht — ' +
      'im Hell-Thema steht dort hellgrauer Text auf weissem Grund. ' +
      'Die Rollen: text-bright · text · muted · dim · faint (siehe index.css).',
  );
  process.exit(1);
}

console.log(
  `Rohe Farben: keine. ${geprueft} Dateien, ${Math.round(zeichen / 1000)}k Zeichen geprueft.`,
);
