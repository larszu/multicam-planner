/**
 * Der Rueckweg fuer B-25, als Messung statt als Vorsatz.
 *
 * DIE LAGE. Die Suite-Kopie dieses Planers ist zweisprachig (Englisch als
 * Quell-Sprache, deutsches Override-Dict); dieses Repo ist es nicht. Die
 * Arbeit ist also getan, nur in der falschen Richtung — B-5 nennt das einen
 * Rueckweg-Fall.
 *
 * WARUM DER RUECKWEG KEIN KOPIEREN IST, und das ist der Grund fuer dieses
 * Skript: die beiden Kopien sind an denselben Dateien LANGE auseinander.
 * Gemessen ueber `planner-drift.mjs` sind es 21 zweiseitige Dateien, allein
 * `Sidebar.tsx` mit 204 Zeilen nur in der Suite und 160 nur hier. Wer die
 * Suite-Datei herueberkopiert, holt die Uebersetzung — und loescht dabei
 * alles, was hier seither entstanden ist. Ein `.avplan`-Import, eine
 * ErrorBoundary, die Objektiv-Adapter-Rechnung: alles Dinge, die es DRUEBEN
 * nicht gibt.
 *
 * WAS DIESER LAUF BEANTWORTET: welche vom Nutzer SICHTBAREN Zeichenketten
 * dieses Repos in der Suite-Kopie keine Entsprechung haben — weder als
 * englischer Quell-String noch als deutscher Eintrag im Override-Dict. Genau
 * diese Saetze muessten beim Rueckweg neu uebersetzt werden; alle anderen
 * sind drueben schon vorhanden und lassen sich uebernehmen.
 *
 * WAS ER NICHT MISST: Code. Eine Zeile wie `const handleLoad = (id: string)`
 * steht in beiden Dateien, nur anders umbrochen — sie als „fehlend" zu melden
 * waere ein Fehlalarm, der die echten Funde zudeckt. Deshalb werden
 * ausschliesslich Zeichenketten an den Stellen gelesen, an denen ein Text auf
 * den Schirm kommt: JSX-Textknoten und die Attribute `title`, `aria-label`,
 * `placeholder`, `label`, `alt` sowie `alert(`/`confirm(`.
 *
 * OHNE DIE SUITE-KOPIE misst er nichts und sagt das — er faellt nicht. Dieses
 * Repo steht auch allein; der Nachbarbaum ist nicht seine Voraussetzung.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HIER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SUITE =
  process.env.AVPLAN_SUITE || resolve(HIER, '..', 'av-planner-suite', 'apps', 'multicam-planner')

if (!existsSync(join(SUITE, 'src', 'i18n'))) {
  console.log(
    'Die Suite-Kopie mit der i18n liegt nicht neben diesem Repo — es wird nichts gemessen.\n' +
      `Gesucht unter: ${SUITE}\n` +
      'Mit `AVPLAN_SUITE=<pfad>` laesst sich der Ort setzen. Kein Fehler: dieses Repo ' +
      'steht auch allein.',
  )
  process.exit(0)
}

const dateien = (wurzel) => {
  const raus = []
  const gehe = (dir) => {
    for (const e of readdirSync(dir)) {
      const voll = join(dir, e)
      if (statSync(voll).isDirectory()) gehe(voll)
      else if (/\.tsx?$/.test(voll)) raus.push(voll)
    }
  }
  gehe(wurzel)
  return raus
}

const norm = (s) => s.replace(/\s+/g, ' ').trim()

/**
 * Die Stellen, an denen ein Text auf den Schirm kommt.
 *
 * Bewusst eng: lieber ein paar Saetze uebersehen als die Liste mit Bezeichnern
 * und Klassennamen fluten. Was diese Muster nicht finden, findet beim
 * Rueckweg der Mensch, der die Datei ohnehin Zeile fuer Zeile anfasst.
 */
const JSX_TEXT = />([^<>{}]{3,}?)</g

const SICHTBAR = [
  // title="…", aria-label='…', placeholder={`…`}, label="…", alt="…"
  /(?:title|aria-label|placeholder|label|alt)=\{?["'`]([^"'`\\]{3,})["'`]/g,
  // alert('…'), confirm('…')
  /(?:alert|confirm)\(\s*["'`]([^"'`\\]{3,})["'`]/g,
  // t('key', 'Quelle') — die Quell-Strings der Suite-Kopie.
  /\bt\(\s*['"][\w.-]+['"]\s*,\s*['"]([^'"\\]{3,})['"]/g,
]

/**
 * `jsx` steuert, ob auch `<tag>Text</tag>` gelesen wird — und das nur in
 * `.tsx`. In einer `.ts` gibt es kein JSX, und das Muster traf dort etwas
 * ganz anderes: `arr<T>(f.items), nodes: arr<U>(...)` sieht zwischen den
 * spitzen Klammern aus wie ein Textknoten. Gemessen waren das drei
 * Fehlalarme in `inventory/portable.ts` — genau die Sorte, die eine Liste
 * unbrauchbar macht, weil man ihr nicht mehr traut.
 */
const texte = (quelle, jsx) => {
  const raus = new Set()
  for (const muster of jsx ? [JSX_TEXT, ...SICHTBAR] : SICHTBAR) {
    for (const m of quelle.matchAll(muster)) {
      const s = norm(m[1])
      // Reine Symbol-/Zahlenfolgen sind kein Satz.
      if (s.replace(/[^\p{L}]/gu, '').length >= 3) raus.add(s)
    }
  }
  return raus
}

const dictText = existsSync(join(SUITE, 'src', 'i18n', 'de'))
  ? readdirSync(join(SUITE, 'src', 'i18n', 'de'))
      .map((f) => readFileSync(join(SUITE, 'src', 'i18n', 'de', f), 'utf8'))
      .join('\n')
  : ''
const imDict = new Set(
  [...dictText.matchAll(/['"]([^'"\\]{3,})['"]\s*,?\s*$/gm)].map((m) => norm(m[1])),
)

// Das HIESIGE Woerterbuch. Es zu lesen ist der Unterschied zwischen zwei
// voellig verschiedenen Befunden, die vorher beide als „ohne Entsprechung"
// gezaehlt wurden:
//
//   (a) Der Satz hat hier keinen Schluessel und drueben keine Entsprechung —
//       niemand hat ihn je uebersetzt. DAS ist Arbeit.
//   (b) Der Satz ist HIER gewickelt und HIER uebersetzt, nur die Suite-Kopie
//       kennt ihn noch nicht. Das ist keine Arbeit, das ist ein Vorsprung.
//
// Ohne die Trennung STEIGT die Zahl, sobald jemand eine Datei wickelt und
// uebersetzt — die erledigte Arbeit saehe aus wie neue. Genau daran erkennt
// man einen Zaehler, dem man nicht mehr glaubt.
const meinDictText = existsSync(join(HIER, 'src', 'i18n', 'de'))
  ? readdirSync(join(HIER, 'src', 'i18n', 'de'))
      .map((f) => readFileSync(join(HIER, 'src', 'i18n', 'de', f), 'utf8'))
      .join('\n')
  : ''
// Welche Schluessel hier eine deutsche Form haben.
const meineSchluessel = new Set(
  [...meinDictText.matchAll(/^\s*'([^']+)':\s*'/gm)].map((m) => m[1]),
)
/**
 * Die englischen Quell-Strings, deren Schluessel hier uebersetzt ist.
 *
 * NICHT das Woerterbuch selbst abfragen: nach dem Wickeln steht im Quelltext
 * der ENGLISCHE Fallback, und der steht naturgemaess nicht im deutschen Dict.
 * Wer hier das Dict abfragt, misst „ist der englische Satz zufaellig auch ein
 * deutsches Wort" — und bekommt bei 105 uebersetzten Saetzen die Antwort
 * „vier". Genau so ein Zaehler stand hier einen Versuch lang.
 */
const uebersetztHier = (text) =>
  new Set(
    [...text.matchAll(/t\('([^']+)',\s*'((?:[^'\\]|\\.)*)'\)/g)]
      .filter((m) => meineSchluessel.has(m[1]))
      .map((m) => norm(m[2].replace(/\\'/g, "'"))),
  )

const eigene = dateien(join(HIER, 'src'))
let gesamt = 0
let ohneEntsprechung = 0
let nurVorsprung = 0
const proDatei = []

for (const voll of eigene) {
  const rel = relative(join(HIER, 'src'), voll).split(sep).join('/')
  const drueben = join(SUITE, 'src', rel)
  const jsx = voll.endsWith('.tsx')
  const meine = texte(readFileSync(voll, 'utf8'), jsx)
  if (meine.size === 0) continue
  const ihre = existsSync(drueben) ? texte(readFileSync(drueben, 'utf8'), jsx) : new Set()
  const nichtDrueben = [...meine].filter((s) => !ihre.has(s) && !imDict.has(s))
  const hierUebersetzt = uebersetztHier(readFileSync(voll, 'utf8'))
  const fehlend = nichtDrueben.filter((s) => !hierUebersetzt.has(s))
  gesamt += meine.size
  ohneEntsprechung += fehlend.length
  nurVorsprung += nichtDrueben.length - fehlend.length
  if (fehlend.length) proDatei.push({ rel, meine: meine.size, fehlend })
}

proDatei.sort((a, b) => b.fehlend.length - a.fehlend.length)

/**
 * DIE ZWEITE FRAGE, und sie ist beim Bauen die wichtigere geworden: laesst
 * sich die Suite-Datei ueberhaupt herueberholen?
 *
 * Gemessen: von den 14 gewickelten Dateien der Suite-Kopie ziehen ZEHN ein
 * Paket herein, das es nur im Suite-Baum gibt — `@avplan/ui` (Dialoge),
 * `@avplan/onboarding-core`, `@avplan/inventory-core`. Fuer die ist ein
 * Kopieren keine Option, egal wie klein der Text-Unterschied ist; ihre
 * Wicklung muss von Hand auf die hiesige Datei uebertragen werden.
 *
 * Das ist der eigentliche Preis des Rueckwegs, und ohne diese Spalte saehe
 * er nach „88 Prozent stehen schon drueben" aus.
 */
const SUITE_PAKETE = /@avplan\/[a-z-]+/g
const gewickelt = []
for (const voll of dateien(join(SUITE, 'src'))) {
  const text = readFileSync(voll, 'utf8')
  if (!/\buseTranslation\(/.test(text)) continue
  const rel = relative(join(SUITE, 'src'), voll).split(sep).join('/')
  if (rel === 'i18n/index.ts') continue
  const pakete = [...new Set(text.match(SUITE_PAKETE) ?? [])]
  const hier = join(HIER, 'src', rel)
  const schonGewickelt = existsSync(hier) && /\buseTranslation\(/.test(readFileSync(hier, 'utf8'))
  gewickelt.push({ rel, pakete, schonGewickelt })
}
gewickelt.sort((a, b) => Number(a.schonGewickelt) - Number(b.schonGewickelt) || a.rel.localeCompare(b.rel))

const fertig = gewickelt.filter((g) => g.schonGewickelt).length
const blockiert = gewickelt.filter((g) => !g.schonGewickelt && g.pakete.length).length
console.log(
  `\nUebernahme-Stand: ${fertig} von ${gewickelt.length} gewickelten Dateien sind hier ` +
    `angekommen. ${blockiert} der uebrigen ziehen ein Suite-eigenes Paket herein und ` +
    'lassen sich nicht kopieren — ihre Wicklung muss von Hand uebertragen werden.',
)
for (const g of gewickelt) {
  const marke = g.schonGewickelt ? 'da   ' : g.pakete.length ? 'HAND ' : 'offen'
  console.log(`  ${marke} ${g.rel}${g.pakete.length ? '   [' + g.pakete.join(', ') + ']' : ''}`)
}

console.log(
  `${gesamt} sichtbare Zeichenketten in src/, davon ${ohneEntsprechung} ohne deutsche Form ` +
    '— weder drueben noch hier.',
)
console.log(
  `${proDatei.length} Datei(en) betroffen — das ist die Arbeit, die der Rueckweg noch neu ` +
    'uebersetzen muss.',
)
console.log(
  `Weitere ${nurVorsprung} Zeichenketten kennt die Suite-Kopie nicht, sind hier aber ` +
    'bereits uebersetzt — das ist kein Rueckstand, sondern ein Vorsprung, den die ' +
    'Suite beim naechsten Vendoring mitnimmt.\n',
)
for (const d of proDatei) {
  console.log(`  ${d.rel} — ${d.fehlend.length} von ${d.meine}`)
  for (const s of d.fehlend.slice(0, 5)) console.log(`      · ${s.slice(0, 92)}`)
  if (d.fehlend.length > 5) console.log(`      … und ${d.fehlend.length - 5} weitere`)
}

// Kein Fehlschlag. Dieser Lauf ZAEHLT den Rueckweg, er erzwingt ihn nicht —
// eine Zahl, die heute rot ist und erst nach Tagen Arbeit gruen wird, waere
// genau der Dauer-Rotzustand, gegen den die anderen Waechter dieses Repos
// geschrieben sind.
console.log('\n(Dieser Lauf meldet, er urteilt nicht — B-25 ist bewusst mehrstufig.)')
