import { describe, expect, it } from 'vitest';
import { isEstimate, isStaleSource } from '../types';
// Quelltext per `?raw` statt ueber node:fs — dieselbe Machart wie
// `cameraListContract.test.ts`. `tsc -b` kennt hier keine Node-Typen, ein
// `readFileSync` bricht also den Build, obwohl vitest damit laeuft.
import formSrc from '../components/Sidebar/CustomCameraForm.tsx?raw';

// ---------------------------------------------------------------------------
// Confirmed-State-Disziplin (Initiative 10), hier in der Form, die dieser
// Planer tatsaechlich hat.
//
// DER BEFUND. `CustomCameraForm` fragt ein Modell nach den Kenndaten einer
// Kamera — Sensormasse, Mount, Crop-Modi — und schrieb die Antwort ohne jede
// Quellenangabe ins Formular. Der Prompt sagte zwar „Fill every field you can
// confirm", aber weder Code noch Nutzer konnten sehen, WAS bestaetigt war.
//
// Die Sensormasse treiben die Bildwinkel- und Schaerfentiefe-Rechnung. Eine
// geratene Zahl sah dort genauso aus wie eine aus dem Datenblatt und genauso
// wie eine von Hand getippte.
//
// UNTERSCHIED ZUM LIGHT-PLANNER. Dort war der Beleg da und wurde beim
// Speichern weggeworfen — reine Aufbewahrung. Hier fehlte er ganz: die
// Abfrage hat ihn nie verlangt. Deshalb aendert dieser Schritt den
// Prompt-Vertrag und nicht nur den Speicherweg.
//
// GLEICHES VOKABULAR, ABSICHTLICH. `Camera.specSource` hat dieselbe Form wie
// `Fixture.specSource` im light-planner. Zwei verschiedene Formen fuer
// dieselbe Frage liefen unweigerlich auseinander.
// ---------------------------------------------------------------------------

describe('Schaetzung und Ablesung sind unterscheidbar', () => {
  it('erkennt die Schaetzung in beiden Sprachen', () => {
    // Der Prompt verlangt „estimate:", der light-planner „geschätzt" — die
    // Erkennung muss beide tragen, sonst ist eine Schaetzung in einem der
    // beiden Planer stillschweigend eine Ablesung.
    expect(isEstimate({ source: 'estimate: derived from the 6K mode' })).toBe(true);
    expect(isEstimate({ source: 'geschätzt aus dem Crop-Faktor' })).toBe(true);
    expect(isEstimate({ source: 'Sony FX9 spec sheet: 35.7 x 18.8 mm' })).toBe(false);
    expect(isEstimate(undefined)).toBe(false);
  });

  it('erkennt einen Beleg, der nicht mehr zum Wert passt', () => {
    // Der Fall, der sonst still luegt: das Modell nannte 35.7, der Nutzer
    // tippte 36.0 — und der Beleg behauptete weiter, 36.0 stuende im
    // Datenblatt.
    const beleg = { value: '35.7', source: 'Sony FX9 spec sheet' };
    expect(isStaleSource(beleg, 35.7)).toBe(false);
    expect(isStaleSource(beleg, 36)).toBe(true);
    expect(isStaleSource(undefined, 36)).toBe(false);
  });
});

describe('die Abfrage verlangt den Beleg ueberhaupt', () => {
  const form = formSrc;

  it('fordert im Prompt eine Quelle je Feld', () => {
    // Der Kern dieses Schritts. Ohne diese Zeilen liefert das Modell wieder
    // nackte Zahlen, und alles Weitere haette nichts zu speichern.
    expect(form).toContain('"verification": [{ "field": string, "value": string, "source": string }]');
    expect(form).toMatch(/For EVERY field you deliver/);
    expect(form).toMatch(/start the source with "estimate:"/);
  });

  it('sagt dem Modell, warum es darauf ankommt', () => {
    // Eine Begruendung im Prompt ist kein Schmuck: sie ist der Unterschied
    // zwischen „Feld ausfuellen" und „nur sagen, was du belegen kannst".
    expect(form).toMatch(/drive the field-of-view calculation/);
  });

  it('nimmt den gelieferten Beleg entgegen und speichert ihn mit', () => {
    expect(form).toContain('Array.isArray(data.verification)');
    expect(form).toContain('specSource: aiSources');
  });

  it('zeigt ihn im Formular an', () => {
    // Ein Beleg, den niemand sieht, ist so gut wie keiner.
    expect(form).toContain('aiSources && Object.keys(aiSources).length > 0');
    expect(form).toContain('isEstimate(entry)');
  });

  it('behaelt einen vorhandenen Beleg beim Bearbeiten', () => {
    expect(form).toContain('initial?.specSource');
  });
});
