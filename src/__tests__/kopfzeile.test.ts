import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ───────────────────────────────────────────────────────────────────────────
// Die Kopfzeile bleibt im Schnitt der Suite (ADR-007 Abschnitt 6).
//
// NUTZER-AUFTRAG 2026-09-11: „Stelle sicher das in allen repos uebergreifend
// das Einstellungen Menue an der gleichen Stelle ist wie im Cable planner und
// das die obere Menueleiste gleich aufgebaut ist. Passe an den Cable planner
// stand an, wenn noetig und vereinheitliche Komponenten."
//
// ─── WOGEGEN DIESER LAUF STEHT ────────────────────────────────────────────
//
// Nicht gegen das Bauen — das ist einmal passiert und steht im Diff. Gegen
// das ZURUECKRUTSCHEN: gegen den naechsten losen Knopf, der neben die Menues
// in die Kopfzeile wandert, weil dort gerade Platz war; gegen die Reiter, die
// wieder in dieselbe Zeile rutschen; gegen einen Einstellungen-Einstieg, der
// nicht mehr der letzte Punkt der Zeile ist. Das faellt niemandem auf, der
// nur diese App benutzt — es faellt dem auf, der zwischen zwei Werkzeugen der
// Suite wechselt und die Bedienung an derselben Stelle sucht.
//
// Der uebergreifende Massstab liegt in der Suite
// (`scripts/chrome-parity.mjs`) und misst alle sechs Apps im selben Baum.
// Dieser Lauf hier ist die Haelfte, die MITWANDERT: er liegt im Repo, das die
// Datei besitzt, und faellt schon vor dem Vendorieren.
//
// ─── WAS ER NICHT KANN ────────────────────────────────────────────────────
//
// Er liest Quelltext. Ob der Knopf im gerenderten Fenster wirklich rechts
// aussen sitzt, sieht er nicht: ein `order-last` an einem anderen Kind wuerde
// ihn taeuschen. Und er misst die REIHENFOLGE der Menues im Markup, nicht die
// im Bild — ein `flex-row-reverse` an der Kopfzeile bliebe ihm verborgen.
// ───────────────────────────────────────────────────────────────────────────

const lies = (...p: string[]): string => readFileSync(resolve(__dirname, '..', ...p), 'utf8');

const kopf = lies('components', 'Layout', 'Header.tsx');
const css = lies('index.css');
const menu = lies('components', 'Layout', 'Menu.tsx');
const einstellungen = lies('components', 'Settings', 'SettingsDialog.tsx');

describe('die Kopfzeile hat das Mass der Suite', () => {
  it('.bc-topbar ist 40 px hoch — als Klasse, nicht als Mass am Element', () => {
    const i = css.indexOf('.bc-topbar {');
    expect(i, 'keine .bc-topbar-Regel').toBeGreaterThan(0);
    const block = css.slice(i, i + 300);
    expect(block).toContain('height: 40px');
    // `flex: none` gehoert dazu: ohne das schrumpft die Zeile, sobald der
    // Inhalt darunter waechst, und die 40 waeren eine Wunschzahl.
    expect(block).toContain('flex: none');
  });

  it('der Einstellungen-Einstieg ist der LETZTE Bedienpunkt der Zeile', () => {
    const rechts = kopf.indexOf('ml-auto flex shrink-0 items-center');
    const knopf = kopf.indexOf("title={t('settings.title', 'Settings')}");
    const ende = kopf.indexOf('</header>');
    expect(rechts, 'keine rechte Gruppe').toBeGreaterThan(0);
    expect(knopf, 'kein Einstellungen-Knopf').toBeGreaterThan(rechts);
    expect(knopf, 'der Knopf steht nicht mehr in der Kopfzeile').toBeLessThan(ende);
    // Ab dem `title`-Attribut des Einstellungen-Knopfes bis zum Ende der
    // Kopfzeile darf KEIN weiterer `<button` mehr aufgehen. Was danach noch
    // kommt, sind die drei versteckten Datei-Felder — die sind keine
    // Bedienpunkte, sie haben kein Bild.
    const danach = kopf.slice(knopf, ende);
    expect(danach.match(/<button/g)?.length ?? 0, 'nach den Einstellungen kommt noch ein Knopf').toBe(0);
  });
});

describe('die Menues sind die der Suite, in ihrer Reihenfolge', () => {
  const stelle = (rolle: string) => kopf.indexOf(`t('app.menu.${rolle}'`);

  it('alle fuenf Menues des Cable Planners sind da', () => {
    for (const rolle of ['file', 'edit', 'tools', 'view', 'help']) {
      expect(stelle(rolle), `kein ${rolle}-Menue`).toBeGreaterThan(0);
    }
  });

  it('File · Edit · Tools · View · Help — in genau dieser Folge', () => {
    // Die Folge ist die des Cable Planners, gemessen an seinem MenuBar.tsx.
    // Sie ist keine Geschmacksfrage: wer zwischen zwei Werkzeugen wechselt,
    // greift nach Muskelgedaechtnis und nicht nach dem Wort.
    const folge = ['file', 'edit', 'tools', 'view', 'help'].map(stelle);
    expect(folge).toEqual([...folge].sort((a, b) => a - b));
  });

  it('Datei fuehrt den gemeinsamen Grundstock', () => {
    for (const punkt of ["'header.new'", "'header.open'", "'header.save'", "'header.saveAs'"]) {
      expect(kopf, `Datei-Menue ohne ${punkt}`).toContain(punkt);
    }
  });

  it('Hilfe fuehrt das Ueber', () => {
    expect(kopf).toContain("'header.about'");
  });
});

describe('die Datei-Eintraege tun, was auf ihnen steht', () => {
  it('„Neues Projekt" fuehrt die Rueckfrage VERNEINT', () => {
    // Ein Bestaetigungsdialog, dessen Abbruch die Tat ausfuehrt, ist
    // schlimmer als gar keiner: er erzeugt genau das Vertrauen, das er dann
    // bricht. Genau dieser Fehler stand am 2026-09-11 im inventory- und im
    // facility-planner, beide aus derselben Vorlage.
    //
    // OHNE KOMMENTARZEILEN gemessen — sonst besaenftigte eine Begruendung,
    // die die alte Zeile woertlich nennt, genau den Lauf, der sie finden
    // soll (dieselbe Falle wie bei B-69).
    const ohneKommentare = kopf
      .split('\n')
      .filter((z) => !z.trimStart().startsWith('//'))
      .join('\n');
    expect(ohneKommentare).toContain('if (!window.confirm(');
    expect(ohneKommentare, 'die Rueckfrage steht unverneint').not.toMatch(/if \(window\.confirm\(/);
  });

  it('„Speichern" und „Speichern unter…" sind nicht derselbe Aufruf', () => {
    expect(kopf).toContain('saveProject()');
    expect(kopf).toContain('handleSaveAs()');
    expect(kopf).toContain('window.prompt(');
    expect(kopf).toContain('saveProject(name)');
  });
});

describe('Reiter und Menueleiste sind zwei Zeilen', () => {
  it('die Reiter stehen in einer eigenen Leiste unter der Kopfzeile', () => {
    // Bis 2026-09-11 standen App-Name, vier Reiter, Layout-Umschalter,
    // Edit-Modus, Presets und sechs lose Knoepfe in EINER 40-px-Zeile.
    expect(css).toContain('.bc-tabbar {');
    const kopfEnde = kopf.indexOf('</header>');
    const leiste = kopf.indexOf('className="bc-tabbar"');
    expect(leiste, 'keine Reiter-Leiste').toBeGreaterThan(kopfEnde);
    expect(kopf.slice(0, kopfEnde), 'die Reiter stehen wieder in der Kopfzeile').not.toContain('TABS.map');
  });
});

describe('die Klappen sind EINE Mechanik, nicht vier Abschriften', () => {
  it('Header.tsx haelt keine eigenen Aussenklick-Effekte mehr', () => {
    // Vorher hatte jede der vier Klappen ihren eigenen `useEffect` mit
    // derselben zwoelfzeiligen Mechanik — und keine davon schloss auf
    // Escape. Die Defektform heisst in dieser Suite `zwei-rechnungen`; hier
    // waren es vier.
    expect(kopf).not.toContain("document.addEventListener('mousedown'");
    expect(menu).toContain("document.addEventListener('mousedown'");
    expect(menu, 'die eine Mechanik kennt Escape nicht').toContain("e.key === 'Escape'");
  });
});

describe('die Einstellungen sagen, was sie NICHT koennen', () => {
  it('kein Thema-Umschalter, und der Grund steht dabei', () => {
    // Der gemeinsame Grundstock der Suite ist Sprache, Thema und Ueber. Das
    // Thema fehlt hier mit Messung: die App traegt rohe Tailwind-Graustufen,
    // die von keinem Token abhaengen, dazu den Canvas des 2D-Plans. Ein
    // Umschalter, der eine halb umgefaerbte App liefert, waere ein
    // PLACEHOLDER. Faellt dieser Lauf, weil jemand die Umstellung gebaut
    // hat: dann gehoert der Umschalter hinein, und diese Zeile wird
    // GEAENDERT statt geloescht.
    expect(einstellungen).toContain("t('settings.language'");
    expect(einstellungen).toContain("t('settings.about'");
    expect(einstellungen, 'ein Thema-Umschalter ohne Thema').not.toContain("t('settings.theme'");
    expect(einstellungen, 'der Grund fuer das fehlende Thema fehlt').toContain('B-70');
  });
});

describe('Gegenprobe zum Lauf selbst', () => {
  it('die gelesenen Dateien sind wirklich da', () => {
    for (const [name, inhalt] of Object.entries({ kopf, css, menu, einstellungen })) {
      expect(inhalt.length, `${name} ist leer`).toBeGreaterThan(400);
    }
  });

  it('ein Menue, das es nicht gibt, wird auch nicht gefunden', () => {
    expect(kopf.indexOf("t('app.menu.gibtEsNicht'")).toBe(-1);
  });
});
