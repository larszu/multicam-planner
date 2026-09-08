// ───────────────────────────────────────────────────────────────────────────
// Die Quellsprache dieses Repos — erklaert, geprueft, und ehrlich darueber,
// was hier noch nicht messbar ist (E-17/E-20).
//
// DIE ENTSCHEIDUNG (Eigentuemer, 2026-09-08): die Quellsprache ist eine
// Eigenschaft des REPOS, nicht der Suite. `multicam-planner` und
// `sony-camera-bridge` sind ENGLISCH-quellig; `cable-planner` und
// `light-planner` deutsch-quellig.
//
// Belegt wurde das am Bestand, nicht am Wunsch: die Suite-Kopie dieses Planers
// ist zweisprachig aufgebaut mit Englisch als Quellsprache
// (`t('ns.key', 'English source')`) und einem deutschen Override-Dict — 482
// Schluessel in 14 Dateien. Die Richtung zu drehen hiesse, ~500 Zeichenketten
// erneut anzufassen, ohne dass ein Nutzer einen Unterschied saehe.
//
// WAS HIER OBEN STIMMT UND WAS NOCH NICHT. Dieses Repo, UPSTREAM, hat gar
// keine i18n: `grep` findet in `src/` keinen einzigen `useTranslation`-Aufruf
// und kein `i18n`-Verzeichnis, die Oberflaeche ist fest deutsch. Das ist der
// Rueckweg-Fall B-25 — die Arbeit ist getan, nur in der falschen Richtung, und
// sie zurueckzuholen ist kein Kopieren, weil die Kopien an diesen Dateien weit
// auseinander sind.
//
// DESHALB MISST DIESER LAUF HIER NOCH NICHTS, UND ER SAGT DAS AUCH. Ein
// Waechter, der ohne Gegenstand „bestanden" meldet, ist schlimmer als keiner:
// er sieht aus wie eine Zusicherung. Was er heute leistet, ist die
// Deklaration festzuhalten und dafuer zu sorgen, dass ihre beiden Stellen
// nicht auseinanderlaufen.
//
// UND ER SCHALTET SICH SELBST SCHARF. Sobald der erste `t('key', 'Fallback')`
// in `src/` steht — also sobald B-25 anfaengt —, misst er und faellt bei jeder
// Zeile in der anderen Sprache. Niemand muss daran denken.
// ───────────────────────────────────────────────────────────────────────────
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../', import.meta.url).pathname
const SRC = join(ROOT, 'src')

/** Woerter, die es NUR im Deutschen gibt. */
const DEUTSCH = [
  'der', 'die', 'das', 'den', 'dem', 'des', 'und', 'oder', 'nicht', 'kein',
  'keine', 'keinen', 'ist', 'sind', 'wird', 'werden', 'wurde', 'für', 'fuer',
  'mit', 'von', 'vom', 'zum', 'zur', 'beim', 'aus', 'eine', 'einen', 'einem',
  'einer', 'nur', 'noch', 'schon', 'wenn', 'dann', 'auch', 'kann', 'muss',
  'darf', 'soll', 'sollen', 'steht', 'gibt', 'sich', 'dieser', 'diese',
  'dieses', 'nach', 'bei', 'über', 'ueber', 'ohne', 'durch', 'gegen', 'sowie',
  'damit', 'wieder', 'immer', 'jede', 'jeder', 'jedes', 'alle', 'allen',
]

/**
 * Woerter, die es NUR im Englischen gibt.
 *
 * `a`, `an`, `was`, `will`, `also`, `in`, `so`, `man` und `only` fehlen in
 * beiden Listen mit Absicht: sie kommen in beiden Sprachen vor (oder in
 * Fachbegriffen wie „read-only") und haben in einer fruehen Fassung im
 * cable-planner deutsche Zeilen als englisch gemeldet. Ein Waechter, der bei
 * richtigen Zeilen anschlaegt, wird abgeschaltet und nicht gelesen.
 */
const ENGLISCH = [
  'the', 'and', 'not', 'with', 'for', 'from', 'this', 'that', 'these',
  'those', 'your', 'you', 'are', 'been', 'have', 'has', 'if', 'then', 'than',
  'when', 'which', 'what', 'who', 'how', 'there', 'into', 'about', 'before',
  'after', 'each', 'every', 'any', 'some', 'please', 'cannot', 'does',
  'doesn', 'isn', 'aren', 'would', 'should', 'could', 'must', 'select',
  'missing', 'unknown',
]

const wortMuster = (woerter) =>
  new RegExp(`(^|[^\\p{L}])(${woerter.join('|')})([^\\p{L}]|$)`, 'iu')

const DE_MUSTER = wortMuster(DEUTSCH)
const EN_MUSTER = wortMuster(ENGLISCH)
const UMLAUTE = /[äöüßÄÖÜ]/

/** Die Sprache EINER Zeichenkette — oder `null` ohne Merkmal. */
export const klassifiziere = (roh) => {
  const text = String(roh).replace(/\{[^}]*\}/g, ' ')
  if (text.trim().length < 4) return null
  const de = UMLAUTE.test(text) || DE_MUSTER.test(text)
  const en = EN_MUSTER.test(text)
  if (de && !en) return 'de'
  if (en && !de) return 'en'
  return null
}

/** Als Funktion, weil ein `/g`-Ausdruck seinen Suchstand mitschleppt. */
export const fallbackMuster = () =>
  /\b(?:t|translate)\(\s*(?:[A-Za-z]+\s*,\s*)?(['"])[^'"]+\1\s*,\s*(['"])((?:[^\\]|\\.)*?)\2/g

const dateien = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) dateien(p, out)
    else if (/\.tsx?$/.test(p)) out.push(p)
  }
  return out
}

const fehler = (satz) => {
  console.error(`FEHLER: ${satz}`)
  process.exit(1)
}

const paket = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const erklaert = paket.avplan?.sourceLanguage
if (!erklaert) fehler('package.json: avplan.sourceLanguage fehlt — die Quellsprache ist nicht erklaert.')
if (erklaert !== 'de' && erklaert !== 'en') {
  fehler(`package.json: avplan.sourceLanguage ist "${erklaert}" — erlaubt sind "de" und "en".`)
}

// Die zweite Stelle: die README, die ein Mensch liest. Gehen beide
// auseinander, glaubt jede Seite etwas anderes — schlimmer als gar keine
// Angabe, weil dann jeder die Stelle zitiert, die ihm passt.
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8')
const inReadme = /\*\*Source language:\*\*\s*`([a-z]{2})`/.exec(readme)
if (!inReadme) fehler('README.md nennt die Quellsprache nicht.')
if (inReadme[1] !== erklaert) {
  fehler(`README.md sagt "${inReadme[1]}", package.json sagt "${erklaert}".`)
}

let de = 0
let en = 0
let unklar = 0
const abweichend = []

for (const datei of dateien(SRC)) {
  const quelle = readFileSync(datei, 'utf8')
  for (const m of quelle.matchAll(fallbackMuster())) {
    const sprache = klassifiziere(m[3])
    if (!sprache) {
      unklar += 1
      continue
    }
    if (sprache === 'de') de += 1
    else en += 1
    if (sprache !== erklaert) abweichend.push(`${relative(SRC, datei)}: ${m[3].slice(0, 100)}`)
  }
}

// Die Bedingung ist `de + en`, NICHT die Zahl der gefundenen Zeichenketten.
// Ein einzelner Treffer ohne Sprachmerkmal — etwa aus einer Testdatei — ist
// keine Messung, und „bestanden" darauf zu melden waere genau die Zusicherung,
// die dieser Lauf hier noch nicht geben kann. Erste Fassung tat das: sie fand
// eine unklare Zeile in `src/__tests__/` und meldete Erfolg.
const zugeordnet = de + en

if (zugeordnet === 0) {
  // KEIN „bestanden". Was hier steht, ist der Stand und nicht eine
  // Zusicherung — und es ist zugleich die Aufgabe, die noch offen ist.
  console.log(`Quellsprache erklaert: "${erklaert}" (package.json und README stimmen ueberein).`)
  console.log(
    `Gemessen wurde NICHTS: keine der ${unklar} gefundenen Zeichenketten traegt ein ` +
      'Sprachmerkmal, und in src/ steht kein uebersetzter Oberflaechen-Text. Dieses Repo ' +
      'hat upstream keine i18n — die Oberflaeche ist fest deutsch, waehrend die ' +
      'Suite-Kopie englisch-quellig mit deutschem Override laeuft (B-25, Rueckweg).',
  )
  console.log(
    'Der Lauf schaltet sich selbst scharf: sobald der erste Fallback in src/ steht, ' +
      'misst er und faellt bei jeder Zeile in der anderen Sprache.',
  )
  process.exit(0)
}

console.log(`Quellsprache "${erklaert}": ${de} deutsch, ${en} englisch, ${unklar} ohne Merkmal`)

if (abweichend.length) {
  console.error(`\n${abweichend.length} Fallback(s) nicht in der Quellsprache:`)
  for (const z of abweichend) console.error(`  ${z}`)
  console.error(
    '\nEntweder die Zeile uebersetzen — oder, wenn die Quellsprache wirklich ' +
      'wechseln soll, die Deklaration in package.json UND README.md aendern.',
  )
  process.exit(1)
}

console.log('Alle Quellsprachen-Checks bestanden.')
