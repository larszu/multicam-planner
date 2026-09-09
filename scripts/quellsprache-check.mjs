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
//
// ── ZWEITE MESSUNG, seit B-61 (2026-09-09): DER SPRACHMIX ───────────────────
//
// Der Rueckweg ist durch, und der Lauf oben meldet „0 deutsch". Das ist wahr
// und trotzdem irrefuehrend: er sieht NUR die Fallbacks in `t()`. Die
// Beschriftungen, die gar nicht gewickelt sind, sieht er nicht — und davon
// gibt es hier reichlich Deutsche in einer Oberflaeche mit Quellsprache `en`:
// die Rig-Steuerung sagt „Tasten aktiv" und „Fahrweg (J / L)", die Shotlist
// „Neue Shotlist", der Objektiv-Regler „Eine Stufe zurueck". Wer Englisch
// waehlt, bekommt eine Oberflaeche, in der die Kamera-Karte englisch und die
// Rig-Steuerung deutsch ist.
//
// Das ist derselbe Befund, den E-17 fuer `sony-camera-bridge` als Fehler
// benannt und `sony#22` dort beseitigt hat — samt der Reihenfolge, die sich
// dort bewaehrt hat: ERST den Zaehler scharf machen und die heutige Zahl als
// GRENZE festhalten, DANN uebersetzen und die Grenze mitsenken. Andersherum
// uebersetzt man einmal und laesst die Luecke ab morgen wieder wachsen.
//
// Zwei Fehler des dortigen Laufs sind hier von Anfang an vermieden, weil sie
// drueben schon Geld gekostet haben:
//   1. ER SAH KOMMENTARE FUER LITERALE. Die Kommentare dieses Repos sind
//      deutsch (Konvention), die Oberflaeche englisch. Ein Lauf, der beides in
//      einen Topf wirft, meldet bei jedem gut kommentierten Commit einen
//      Verstoss, den es nicht gibt. Kommentare werden vor dem Messen entfernt.
//   2. ER SAH NUR ATTRIBUTE, NICHT DEN JSX-TEXT. Der groesste Teil der
//      sichtbaren Texte steht zwischen den Tags, nicht in Anfuehrungszeichen.
//      Hier wird beides gelesen.
//
// DIE GRENZE IST IN BEIDE RICHTUNGEN SCHARF: wer uebersetzt und die Grenze
// nicht heruntersetzt, faellt ebenfalls durch — sonst deckte sie ab morgen
// wieder Zuwachs.
//
// ── UND WAS DIESE MESSUNG NICHT KANN, gemessen statt vermutet ──────────────
//
// Das JSX-Muster ist `>text<`. In einer .tsx-Datei trifft das auch CODE: die
// Vergleichsoperatoren `>` und `<` stehen mitten in Ausdruecken
// (`if (clipped.length > 2)`, `arr.filter(n => n.id === x)`), und dazwischen
// steht dann ein Stueck Quelltext.
//
// HIER FAELLT DAS NICHT AUF, und der Grund ist eine Asymmetrie, die man
// kennen muss, bevor man diesen Lauf in ein anderes Repo traegt: gezaehlt
// wird nur, was als DEUTSCH durchgeht. Ein Code-Schnipsel traegt `if`, `for`,
// `const`, `return`, `this` — englische Stoppwoerter. Er wird also als
// englisch klassifiziert und faellt aus der Zaehlung.
//
// GEGENPROBE, damit das keine Vermutung bleibt: derselbe Lauf ueber DIESES
// Repo, aber in die andere Richtung gemessen (Ziel `en`), findet SECHS
// Treffer — allesamt Code-Schnipsel aus `CameraPreview.tsx`, keine einzige
// Beschriftung. Ueber `cable-planner` (deutsch-quellig, Ziel `en`) sind es
// 35, ueber `light-planner` 12 — ebenfalls ausnahmslos Code.
//
// DARAUS FOLGT: dieser Lauf laesst sich NICHT als Kopie in die
// deutsch-quelligen Repos tragen. Dort waere er ein Fehlalarm-Automat, und
// nach dem dritten Mal schaltet ihn jemand ab. Wer ihn dort haben will,
// braucht ein JSX-Muster, das Code von Text unterscheidet — kein
// Nachziehen dieser Datei. Das steht als eigener Punkt im Backlog.
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

// ── Zweite Messung: der Sprachmix in UNGEWICKELTEM Text (B-61) ─────────────

/**
 * Die Obergrenze, nicht das Ziel.
 *
 * Sie stand am 2026-09-09 auf 37 — das war der gemessene Stand direkt nach
 * dem Abschluss des Rueckwegs (B-25). Am selben Tag sind die 37 gewickelt und
 * uebersetzt worden; die Grenze ist damit auf NULL gesenkt.
 *
 * Sie darf SINKEN und nicht steigen: wer eine deutsche Beschriftung
 * hinzufuegt, faellt durch; wer uebersetzt und die Zahl stehen laesst,
 * ebenfalls. Ohne die zweite Haelfte waere sie ab morgen wieder ein Deckel
 * ueber wachsendem Mix. Auf null bedeutet sie: JEDE neue Zeichenkette in der
 * anderen Sprache faellt sofort auf.
 */
const MIX_GRENZE = 0

/** Kommentare raus — sie sind hier deutsch und gehoeren nicht auf den Schirm. */
const ohneKommentare = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')

/**
 * Sichtbarer Text, der NICHT in einem `t()`-Fallback steht.
 *
 * Gelesen wird beides — die Attribute UND die JSX-Textknoten. Der zweite Teil
 * ist der, an dem der Lauf im sony-camera-bridge zuerst vorbeisah: „Neue
 * Shotlist" steht zwischen den Tags, nicht in Anfuehrungszeichen.
 */
const SICHTBARE_ATTRIBUTE = /\b(?:title|aria-label|placeholder|label|alt|summary|submitLabel|hint)=(?:"([^"]{4,})"|\{\s*'((?:[^'\\]|\\.){4,}?)'\s*\})/g
const JSX_TEXT = />([^<>{}]{4,})</g
// Auch das Template-Literal, nicht nur die Anfuehrungszeichen. GEFUNDEN, weil
// der `dialogs:native`-Waechter der Suite eine Stelle meldete, die dieser
// Lauf hier gruen durchgelassen hatte: `window.confirm(\`Shotlist "…" mit N
// Shots loeschen?\`)`. Eine Rueckfrage mit eingesetztem Namen steht praktisch
// immer im Backtick — ausgerechnet die Form also, die das erste Muster nicht
// kannte.
const RUFE = /\b(?:alert|confirm|prompt)\(\s*(?:(['"])((?:[^\\]|\\.){4,}?)\1|`((?:[^`\\]|\\.){4,}?)`)/g

const sichtbareTexte = (quelle, jsx) => {
  const text = ohneKommentare(quelle)
  // Was in einem Fallback steht, ist gewickelt — das misst die erste Haelfte.
  const ohneFallbacks = text.replace(fallbackMuster(), ' ')
  const raus = []
  for (const m of ohneFallbacks.matchAll(SICHTBARE_ATTRIBUTE)) raus.push(m[1] ?? m[2])
  for (const m of ohneFallbacks.matchAll(RUFE)) raus.push(m[2] ?? m[3])
  if (jsx) {
    for (const m of ohneFallbacks.matchAll(JSX_TEXT)) {
      const t = m[1].trim()
      if (t && !t.startsWith('{')) raus.push(t)
    }
  }
  return raus
}

const andereSprache = erklaert === 'de' ? 'en' : 'de'
const mix = []
for (const datei of dateien(SRC)) {
  const rel = relative(SRC, datei)
  // Das Woerterbuch ist per Definition in der anderen Sprache, und Tests sind
  // keine Oberflaeche. Beides zu zaehlen hiesse, eine Zahl zu fuehren, die
  // niemand auf null bringen kann — und eine solche Zahl liest niemand.
  if (rel.startsWith('i18n/') || rel.includes('__tests__')) continue
  for (const roh of sichtbareTexte(readFileSync(datei, 'utf8'), datei.endsWith('.tsx'))) {
    if (klassifiziere(roh) === andereSprache) mix.push(`${rel}: ${roh.slice(0, 90)}`)
  }
}

console.log(
  `\nSprachmix: ${mix.length} ungewickelte Zeichenkette(n) in "${andereSprache}" ` +
    `(Grenze ${MIX_GRENZE}).`,
)
if (mix.length > MIX_GRENZE) {
  console.error(`\n${mix.length - MIX_GRENZE} mehr als erlaubt:`)
  for (const z of mix.slice(0, 40)) console.error(`  ${z}`)
  if (mix.length > 40) console.error(`  … und ${mix.length - 40} weitere`)
  console.error(
    `\nEntweder wickeln und uebersetzen — oder, wenn es wirklich so bleiben ` +
      'soll, MIX_GRENZE mit Begruendung anheben. Das Anheben ist die Ausnahme ' +
      'und gehoert begruendet; das Senken ist der Normalfall.',
  )
  process.exit(1)
}
if (mix.length < MIX_GRENZE) {
  console.error(
    `\nDie Grenze steht auf ${MIX_GRENZE}, gemessen sind ${mix.length}. ` +
      'MIX_GRENZE auf den neuen Wert setzen — eine Grenze ueber dem Ist deckt ' +
      'ab morgen wieder Zuwachs, und genau dagegen steht sie hier.',
  )
  process.exit(1)
}

console.log('Alle Quellsprachen-Checks bestanden.')
