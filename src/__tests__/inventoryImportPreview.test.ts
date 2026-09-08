import { describe, it, expect } from 'vitest';
// `?raw` statt `node:fs`: dieses Repo fuehrt `types: []` und hat kein
// @types/node, also waere ein Datei-Leser ueber node ein `tsc -b`-Fehler im
// Build. Vite liefert den Quelltext als Zeichenkette, und `vite/client` ist
// bereits deklariert (src/vite-env.d.ts).
import dialogQuelle from '../inventory/InventoryDialog.tsx?raw';
import {
  VORSCHAU_SORTEN,
  importVorschau,
  sortenVorschau,
  vorschauIstLeer,
  vorschauSumme,
  wendeAn,
  type ImportMode,
} from '../inventory/importPreview';

// ---------------------------------------------------------------------------
// Der Lager-Import zeigt VORHER, was er tut (E-15, Backlog B-22).
//
// DER BEFUND. `InventoryDialog.doImport` stellte eine einzige Ja/Nein-Frage:
//
//   const replace = window.confirm(
//     'Bestehenden Bestand ERSETZEN? Abbrechen = zusammenfuehren (merge).')
//
// „Abbrechen" fuehrte zusammen. Es gab an dieser Stelle keinen Weg, gar nichts
// zu tun — und die Frage stand ohne eine einzige Zahl daneben. Wer „ersetzen"
// waehlte, loeschte den projektuebergreifenden Bestand, ohne zu sehen, wie
// viele Positionen daran haengen; ein Undo fuer diesen Store gibt es nicht,
// und der naechste `localStorage`-Schreibvorgang macht es endgueltig.
//
// Dieselbe Pruefung steht im light-planner als `npm run preview:check`
// (`light#97`). Sie hier zu wiederholen ist kein Duplikat, sondern der Punkt:
// das Lager-Format ist app-uebergreifend, also muss auch die Auskunft
// darueber, was ein Import taete, in beiden Apps dieselbe sein.
// ---------------------------------------------------------------------------

/** Ein Lager-Artikel, so schlank wie moeglich — id + zwei Felder reichen. */
interface Satz {
  id: string;
  model: string;
  manufacturer?: string;
  deviceTypeId?: string;
}

const satz = (id: string, model: string, rest: Partial<Satz> = {}): Satz => ({ id, model, ...rest });

describe('Die Vorschau rechnet wie der Import', () => {
  // Nicht „ich habe beides gelesen und es sieht gleich aus": die Vorschau wird
  // gegen `wendeAn` gehalten, also gegen `mergeById` selbst — dieselbe
  // Funktion, die `importSnapshot` im Store benutzt.
  const faelle: { name: string; vorhanden: Satz[]; eingehend: Satz[] }[] = [
    { name: 'leeres Lager', vorhanden: [], eingehend: [satz('a', 'FX9'), satz('b', 'FX6')] },
    {
      name: 'Ueberschneidung mit Aenderung',
      vorhanden: [satz('a', 'FX9'), satz('c', 'Nur lokal')],
      eingehend: [satz('a', 'FX9 II'), satz('b', 'Neu')],
    },
    { name: 'nichts gemeinsam', vorhanden: [satz('x', 'Alt')], eingehend: [satz('y', 'Neu')] },
    {
      name: 'identische Datei',
      vorhanden: [satz('a', 'FX9'), satz('b', 'FX6')],
      eingehend: [satz('a', 'FX9'), satz('b', 'FX6')],
    },
    {
      name: 'v1-Datei ohne deviceTypeId',
      vorhanden: [satz('a', 'FX9', { deviceTypeId: 'guid-1' })],
      eingehend: [satz('a', 'FX9')],
    },
  ];

  for (const modus of ['merge', 'replace'] as ImportMode[]) {
    for (const fall of faelle) {
      it(`${fall.name} / ${modus}: jede gemeldete Sorte stimmt mit dem Ergebnis`, () => {
        const v = sortenVorschau(fall.vorhanden, fall.eingehend, modus);
        const nachher = wendeAn(fall.vorhanden, fall.eingehend, modus);
        const nachherIds = new Set(nachher.map((x) => x.id));
        const vorherIds = new Set(fall.vorhanden.map((x) => x.id));

        for (const id of v.neu) {
          expect(vorherIds.has(id), `"${id}" als neu gemeldet, war aber da`).toBe(false);
          expect(nachherIds.has(id), `"${id}" als neu gemeldet, fehlt im Ergebnis`).toBe(true);
        }
        for (const id of v.entfernt) {
          expect(vorherIds.has(id), `"${id}" als entfernt gemeldet, war nie da`).toBe(true);
          expect(nachherIds.has(id), `"${id}" als entfernt gemeldet, steht im Ergebnis`).toBe(false);
        }
        for (const id of [...v.gleich, ...v.unberuehrt]) {
          expect(nachher.find((x) => x.id === id)).toEqual(fall.vorhanden.find((x) => x.id === id));
        }
        for (const id of v.geaendert) {
          expect(nachher.find((x) => x.id === id)).not.toEqual(fall.vorhanden.find((x) => x.id === id));
        }

        // Und umgekehrt: nichts faellt unter den Tisch. Genau diese
        // Rueckrichtung hat im light-planner die fehlende Kategorie
        // `unberuehrt` gefunden — „steht in keiner Liste" ist eine stille
        // dritte Sorte, und die kann niemand richtig raten.
        const genannt = new Set([...v.neu, ...v.geaendert, ...v.gleich, ...v.entfernt, ...v.unberuehrt]);
        for (const id of [...vorherIds, ...nachherIds]) {
          expect(genannt.has(id), `"${id}" kommt in der Vorschau gar nicht vor`).toBe(true);
        }
      });
    }
  }
});

describe('Zusammenfuehren nimmt nie etwas weg', () => {
  const vorhanden = [satz('a', 'A'), satz('b', 'B'), satz('c', 'C')];
  const eingehend = [satz('a', 'A neu')];

  it('meldet keine Entfernungen und nimmt auch keine vor', () => {
    const m = sortenVorschau(vorhanden, eingehend, 'merge');
    expect(m.entfernt).toEqual([]);
    expect(wendeAn(vorhanden, eingehend, 'merge').map((x) => x.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('sagt, was stehen bleibt — dieselben Ids, die "ersetzen" loeschen wuerde', () => {
    // Ohne diese Zusicherung waere „nimmt nichts weg" eine Behauptung ueber
    // eine leere Liste statt eine Aussage ueber b und c.
    expect(sortenVorschau(vorhanden, eingehend, 'merge').unberuehrt.sort()).toEqual(['b', 'c']);
    const r = sortenVorschau(vorhanden, eingehend, 'replace');
    expect(r.entfernt.sort()).toEqual(['b', 'c']);
    expect(r.unberuehrt).toEqual([]);
  });
});

describe('Eine v1-Datei ist keine Aenderung', () => {
  // ADR-005, Regel 2: eine Projektion darf nicht ueberschreiben. Die Datei
  // ohne `deviceTypeId` sagt zu diesem Feld NICHTS.
  const vorhanden = [satz('a', 'FX9', { deviceTypeId: 'guid-1', manufacturer: 'Sony' })];
  const v1 = [satz('a', 'FX9')];

  it('beim Zusammenfuehren nicht', () => {
    const m = sortenVorschau(vorhanden, v1, 'merge');
    expect(m.gleich).toEqual(['a']);
    expect(m.geaendert).toEqual([]);
  });

  it('beim Ersetzen schon — dort geht die Typ-Identitaet wirklich verloren', () => {
    expect(sortenVorschau(vorhanden, v1, 'replace').geaendert).toEqual(['a']);
  });
});

describe('Inhaltsgleich heisst feldweise, nicht zeichenweise', () => {
  const vorhanden = [{ id: 'a', model: 'X', manufacturer: 'Sony' }];

  it('die Feld-Reihenfolge entscheidet nicht', () => {
    const gedreht = [{ manufacturer: 'Sony', model: 'X', id: 'a' }];
    expect(sortenVorschau(vorhanden, gedreht, 'replace').gleich).toEqual(['a']);
  });

  it('ein explizit undefiniertes Feld ist kein Inhalt', () => {
    const explizit = [{ id: 'a', model: 'X', manufacturer: 'Sony', deviceTypeId: undefined }];
    expect(sortenVorschau(vorhanden, explizit, 'replace').gleich).toEqual(['a']);
  });

  it('ein echter Unterschied faellt durch', () => {
    expect(sortenVorschau(vorhanden, [{ id: 'a', model: 'Y', manufacturer: 'Sony' }], 'replace').geaendert)
      .toEqual(['a']);
  });
});

describe('Alle vier Sorten', () => {
  // Der Import bringt Artikel, Lagerorte, Sets und Einheiten in einer Datei —
  // und `replace` loescht alle vier. Eine Vorschau, die nur die Artikel
  // zaehlt, zeigt beim gefaehrlichsten Fall die kleinste Zahl.
  const voll = {
    items: [satz('i1', 'A'), satz('i2', 'B')],
    nodes: [satz('n1', 'Regal')],
    sets: [satz('s1', 'Set')],
    units: [satz('u1', 'Einheit')],
  };

  it('"ersetzen" verschweigt keine davon', () => {
    const v = importVorschau(voll, { items: [], nodes: [], sets: [], units: [] }, 'replace');
    for (const sorte of VORSCHAU_SORTEN) expect(v[sorte].entfernt.length).toBeGreaterThan(0);
    expect(vorschauSumme(v).entfernt).toBe(5);
  });

  it('eine Datei ohne eine Sorte ist beim Zusammenfuehren kein Grund, sie anzufassen', () => {
    const v = importVorschau(voll, { items: [satz('i3', 'C')] }, 'merge');
    expect(v.items.neu).toEqual(['i3']);
    expect(v.nodes).toEqual({ neu: [], geaendert: [], gleich: [], entfernt: [], unberuehrt: ['n1'] });
  });
});

describe('"Nichts zu tun" ist eine Antwort', () => {
  const bestand = { items: [satz('i1', 'A')], nodes: [satz('n1', 'Regal')], sets: [], units: [] };

  it('dieselbe Datei nochmal aendert nichts', () => {
    const v = importVorschau(bestand, bestand, 'merge');
    expect(vorschauSumme(v).gleich).toBe(2);
    expect(vorschauIstLeer(v)).toBe(true);
  });

  it('eine leere Datei im Modus "merge" auch nicht', () => {
    const v = importVorschau(bestand, {}, 'merge');
    expect(vorschauSumme(v).unberuehrt).toBe(2);
    expect(vorschauIstLeer(v)).toBe(true);
  });

  it('ein einziger neuer Datensatz macht daraus einen Import', () => {
    expect(vorschauIstLeer(importVorschau(bestand, { items: [satz('i2', 'B')] }, 'merge'))).toBe(false);
  });

  it('eine leere Datei im Modus "replace" loescht den Bestand', () => {
    const v = importVorschau(bestand, {}, 'replace');
    expect(vorschauIstLeer(v)).toBe(false);
    expect(vorschauSumme(v).entfernt).toBe(2);
  });
});

describe('Die Vorschau schreibt nichts', () => {
  // Sie laeuft, waehrend der Nutzer noch entscheidet. Wuerde sie ihre Eingaben
  // anfassen, waere der Import beim Abbrechen halb passiert.
  //
  // Mehr als ein Element, und bewusst nicht nach Id sortiert: mit einer
  // einelementigen Liste waere ein Umsortieren an Ort und Stelle nicht
  // messbar — im light-planner kam genau diese Gegenprobe zuerst gruen
  // zurueck.
  it('faellt weder ueber den Bestand noch ueber die Datei her', () => {
    const vorhanden = [satz('c', 'C', { manufacturer: 'Sony' }), satz('a', 'A'), satz('b', 'B')];
    const eingehend = [satz('b', 'B neu'), satz('a', 'A')];
    const vorherKopie = structuredClone(vorhanden);
    const eingehendKopie = structuredClone(eingehend);

    sortenVorschau(vorhanden, eingehend, 'merge');
    sortenVorschau(vorhanden, eingehend, 'replace');

    expect(vorhanden).toEqual(vorherKopie);
    expect(eingehend).toEqual(eingehendKopie);
  });
});

describe('Der Weg ist verdrahtet', () => {
  // Kommentare fallen vorher weg: diese Pruefung darf nicht von Prosa
  // zufriedenzustellen sein, die den alten Aufruf bloss ERWAEHNT — der Kopf
  // dieser Datei zitiert ihn selbst.
  const dialog = dialogQuelle
    .split('\n')
    .filter((z: string) => !/^\s*(\/\/|\*|\/\*)/.test(z))
    .join('\n');

  it('fragt nicht mehr per window.confirm', () => {
    expect(dialog).not.toMatch(/window\.confirm/);
  });

  it('rechnet eine Vorschau und nennt ihre Zahlen', () => {
    expect(dialog).toMatch(/importVorschau\(/);
    expect(dialog).toMatch(/vorschauSumme\(/);
  });

  it('hat drei Ausgaenge — und der dritte ist der, den es vorher nicht gab', () => {
    // Geprueft wird der HANDLER, nicht die Beschriftung.
    //
    // Erster Anlauf stand hier als `/setPending\(null\)[^>]*>Abbrechen</` —
    // das las die deutsche Aufschrift mit. In der vendorten Suite-Kopie steht
    // dort `{t('inventory.preview.cancel', 'Cancel')}`, und der Waechter wurde
    // an einer RICHTIGEN Aenderung rot. Ein Waechter, der das tut, wird
    // geaendert statt gelesen. Der Knopf, der `pending` leert, ist die
    // Zusicherung; wie er heisst, ist die Uebersetzung.
    //
    // Kollisionsfrei bleibt es trotzdem: der Abbruch des FORMULARS heisst
    // `setForm(null)`.
    expect(dialog).toMatch(/onClick=\{\(\) => setPending\(null\)\}/);
    expect(dialog).toMatch(/onClick=\{doImportConfirm\}/);
  });

  it('bietet beide Antworten zur Wahl', () => {
    // Beide Modi werden AUFGEZAEHLT — auch das unabhaengig von der
    // Beschriftung. Faellt einer weg, ist die Wahl keine mehr.
    expect(dialog).toMatch(/\(\['merge', 'replace'\] as ImportMode\[\]\)\.map/);
  });

  it('importiert den Modus, den die gezeigte Vorschau gerechnet hat', () => {
    expect(dialog).toMatch(/importSnapshot\(pending\.snap, pending\.mode\)/);
  });
});
