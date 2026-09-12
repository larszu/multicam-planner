import { describe, expect, it } from 'vitest';
import quelleRoh from '../components/Sidebar/Calculator.tsx?raw';

/**
 * DER RECHNER HAENGT AN DER GEWAEHLTEN KAMERA — und bleibt es.
 *
 * Nutzer-Auftrag 2026-09-12: „FOV und schaerfetiefen rechner muss verknuepft
 * sein mit der ausgewaehlten kamera."
 *
 * Vorher stand er voellig fuer sich: 2/3", 20 mm, f/2.8, 10 m als feste
 * Anfangswerte, ohne jeden Bezug zum Plan daneben.
 *
 * ─── WARUM DIESER TEST DEN QUELLTEXT LIEST ──────────────────────────────
 *
 * Die Verbindung ist ein Effekt in einer Komponente; sie ohne gerendertes
 * Fenster zu messen ginge nur, indem man sie herauszieht — und eine
 * Herausloesung, die es nur fuer den Test gibt, misst dann den Test.
 *
 * Gemessen wird deshalb das, was beim naechsten Umbau still verloren geht:
 * dass der Rechner die AUSWAHL ueberhaupt liest, und dass er den WIRKSAMEN
 * Sensor nimmt.
 *
 * Der zweite Punkt ist der wichtigere. `camera.sensor` ist der nominale
 * Sensor des Gehaeuses; mit einem B4-Adapter oder in einem Crop-Modus
 * rechnet die Kamera auf einer anderen Flaeche. Genau diese Faelle sind der
 * Grund, warum jemand den Rechner aufmacht — und ein Rechner, der dort den
 * nominalen Wert nimmt, rechnet nicht „ungenau", sondern plausibel falsch.
 *
 * WAS ER NICHT MISST: ob der Effekt wirklich feuert, ob das Loesen beim
 * ersten Reglerzug passiert und ob der Knopf zurueckholt. Das sieht nur ein
 * Fenster.
 */
/**
 * UEBER `?raw` UND NICHT UEBER `node:fs`: die Suite vendoriert diese Datei,
 * und ihr tsconfig kennt die Node-Typen nicht — ein Test, der nur im
 * Ursprungs-Repo kompiliert, bricht dort den Build. Vite loest `?raw` in
 * beiden Baeumen gleich auf.
 */
const quelle: string = quelleRoh;

describe('FOV-/Schärfentiefe-Rechner', () => {
  it('liest die gewählte Kamera aus dem Store', () => {
    expect(quelle).toContain('selectedCameraId');
    expect(quelle).toMatch(/cameras\.find\(/);
  });

  it('nimmt den WIRKSAMEN Sensor, nicht den nominalen', () => {
    expect(quelle).toContain('getEffectiveSensor');
    // Gegenprobe gegen den naheliegenden Rückschritt: `kamera.sensor` direkt
    // zu lesen wäre kürzer und in den meisten Fällen richtig — und mit
    // Adapter oder Crop-Modus falsch.
    expect(quelle).not.toMatch(/\bkamera\.sensor\b/);
  });

  it('schreibt nichts an der Kamera zurück', () => {
    // Ein Rechner ist ein Was-wäre-wenn. Schriebe er zurück, verstellte
    // jedes Ausprobieren den Plan.
    expect(quelle).not.toContain('updateCamera');
  });

  it('löst sich bei eigener Eingabe von der Auswahl', () => {
    expect(quelle).toMatch(/onChange=\{\(e\) => eigen\(/);
  });
});
