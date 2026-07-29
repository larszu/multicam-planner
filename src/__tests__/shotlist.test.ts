import { describe, expect, it } from 'vitest';
import {
  TRANSITION_CYCLE,
  easeInOut,
  interpolateCamera,
  nextTransitionMode,
  transitionSeconds,
} from '../utils/cameraTransition';
import {
  defaultShotName,
  indexOfShot,
  shotStateFromCamera,
  shotTargetFromState,
  stepShotIndex,
} from '../utils/shot';
import {
  buildStoryboardHtml,
  contactSheetSize,
  sheetColumns,
  shotOpticsLabel,
  shotTransitionLabel,
} from '../utils/storyboard';
import type { Shot, Shotlist, VenueCamera } from '../types';

// Shotlist-/Storyboard-Tool (#62 Punkt 5). Getestet ist die reine Logik:
// Fahrt-Interpolation, Sequenz-Navigation und die Storyboard-Aufbereitung.
// Die React-Schicht darueber ist duenn und haelt keinen eigenen Zustand.

const cam = (over: Partial<VenueCamera> = {}): VenueCamera =>
  ({
    id: 'cam-1',
    label: 'CAM 1',
    cameraId: 'sony-hdc',
    lensId: 'canon-x',
    x: 2,
    y: 3,
    z: 1.5,
    pan: 90,
    tilt: -10,
    focalLength: 35,
    aperture: 2.8,
    focusDistance: 4.2,
    color: '#f00',
    extenderActive: 1,
    ...over,
  }) as VenueCamera;

const shot = (over: Partial<Shot> = {}): Shot => ({
  id: 's1',
  name: 'WS Buehne',
  cameraId: 'cam-1',
  state: shotStateFromCamera(cam()),
  transition: 'fast',
  ...over,
});

describe('transitionSeconds', () => {
  it('bildet die Presets aus dem Issue ab (OFF/3s/10s)', () => {
    expect(transitionSeconds('off')).toBe(0);
    expect(transitionSeconds('fast')).toBe(3);
    expect(transitionSeconds('slow')).toBe(10);
  });

  it('nutzt bei "manual" die eingestellte Zeit', () => {
    expect(transitionSeconds('manual', 6)).toBe(6);
  });

  it('faellt bei unbrauchbarer Manuell-Zeit auf 0 zurueck (harter Schnitt)', () => {
    // Sonst wuerde eine negative/NaN-Dauer die Fahrt nie beenden.
    expect(transitionSeconds('manual', -5)).toBe(0);
    expect(transitionSeconds('manual', Number.NaN)).toBe(0);
    expect(transitionSeconds('manual')).toBe(0);
  });
});

describe('nextTransitionMode', () => {
  it('klickt zyklisch durch OFF → Schnell → Langsam → Manuell → OFF', () => {
    expect(nextTransitionMode('off')).toBe('fast');
    expect(nextTransitionMode('fast')).toBe('slow');
    expect(nextTransitionMode('slow')).toBe('manual');
    expect(nextTransitionMode('manual')).toBe('off');
    expect(TRANSITION_CYCLE).toHaveLength(4);
  });
});

describe('easeInOut', () => {
  it('startet bei 0, endet bei 1 und ist in der Mitte 0.5', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 6);
  });

  it('beschleunigt am Anfang langsam und bremst am Ende ab', () => {
    // Kern der Ease-in/out-Kurve: erstes Viertel legt weniger Weg zurueck als
    // ein linearer Verlauf, letztes Viertel mehr.
    expect(easeInOut(0.25)).toBeLessThan(0.25);
    expect(easeInOut(0.75)).toBeGreaterThan(0.75);
  });

  it('klemmt Werte ausserhalb 0..1 ab', () => {
    expect(easeInOut(-1)).toBe(0);
    expect(easeInOut(2)).toBe(1);
  });
});

describe('interpolateCamera', () => {
  it('interpoliert jeden numerischen Parameter einzeln', () => {
    const from = cam({ pan: 0, focalLength: 20 });
    const patch = interpolateCamera(from, { pan: 100, focalLength: 60 }, 0.5);
    expect(patch.pan).toBe(50);
    expect(patch.focalLength).toBe(40);
  });

  it('laesst nicht-numerische Felder waehrend der Fahrt unangetastet', () => {
    // `lockedPersonId: undefined` darf erst am Ende greifen, nicht mittendrin.
    const patch = interpolateCamera(cam(), { pan: 10, lockedPersonId: undefined }, 0.5);
    expect('lockedPersonId' in patch).toBe(false);
  });

  it('ignoriert Ziele ohne numerischen Startwert', () => {
    const from = cam({ trackOffset: undefined });
    const patch = interpolateCamera(from, { trackOffset: 5 }, 0.5);
    expect('trackOffset' in patch).toBe(false);
  });
});

describe('shotStateFromCamera / shotTargetFromState', () => {
  it('friert genau die Preset-Parameter aus Punkt 3 ein', () => {
    expect(shotStateFromCamera(cam())).toEqual({
      x: 2, y: 3, z: 1.5, pan: 90, tilt: -10,
      focalLength: 35, aperture: 2.8, focusDistance: 4.2, trackOffset: 0,
    });
  });

  it('setzt fehlendes trackOffset auf 0 statt undefined', () => {
    // Sonst reisst die Interpolation ab (kein numerischer Startwert).
    expect(shotStateFromCamera(cam({ trackOffset: undefined })).trackOffset).toBe(0);
  });

  it('loest beim Anfahren den Fokus-Lock', () => {
    const target = shotTargetFromState(shotStateFromCamera(cam()));
    expect(target.lockedPersonId).toBeUndefined();
    expect('lockedPersonId' in target).toBe(true);
  });

  it('schlaegt einen sprechenden Shot-Namen vor', () => {
    expect(defaultShotName(cam())).toBe('CAM 1 · 35mm');
  });
});

describe('stepShotIndex', () => {
  it('laeuft zyklisch vorwaerts und rueckwaerts (Q/E)', () => {
    expect(stepShotIndex(0, 3, 1)).toBe(1);
    expect(stepShotIndex(2, 3, 1)).toBe(0);
    expect(stepShotIndex(0, 3, -1)).toBe(2);
  });

  it('startet ohne aktiven Shot am Anfang bzw. Ende', () => {
    expect(stepShotIndex(-1, 3, 1)).toBe(0);
    expect(stepShotIndex(-1, 3, -1)).toBe(2);
  });

  it('meldet bei leerer Liste -1', () => {
    expect(stepShotIndex(-1, 0, 1)).toBe(-1);
  });
});

describe('indexOfShot', () => {
  it('findet den Shot und meldet Unbekanntes als -1', () => {
    const shots = [shot({ id: 'a' }), shot({ id: 'b' })];
    expect(indexOfShot(shots, 'b')).toBe(1);
    expect(indexOfShot(shots, 'weg')).toBe(-1);
    expect(indexOfShot(shots, null)).toBe(-1);
  });
});

describe('Storyboard-Aufbereitung', () => {
  it('beschriftet die Optik einer Kachel', () => {
    expect(shotOpticsLabel(shot())).toBe('35mm · f/2.8 · 4.2m');
  });

  it('zeigt die Fahrtdauer, bei OFF ohne Sekunden', () => {
    expect(shotTransitionLabel(shot({ transition: 'fast' }))).toBe('Schnell (3s)');
    expect(shotTransitionLabel(shot({ transition: 'off' }))).toBe('OFF');
    expect(shotTransitionLabel(shot({ transition: 'manual', transitionSeconds: 7 }))).toBe('Manuell (7s)');
  });

  it('bleibt bei wenigen Shots schmal statt rechts leer zu laufen', () => {
    // 1–2 Shots ergaben frueher trotzdem einen 3-spaltigen Bogen mit toter
    // Flaeche rechts. Jetzt waechst die Breite mit der Shot-Zahl bis max. 3.
    expect(sheetColumns(1)).toBe(1);
    expect(sheetColumns(2)).toBe(2);
    expect(sheetColumns(3)).toBe(3);
    expect(sheetColumns(7)).toBe(3);
    expect(contactSheetSize(2).width).toBeLessThan(contactSheetSize(3).width);
  });

  it('waechst der Kontaktbogen zeilenweise, sobald die Spalten voll sind', () => {
    const three = contactSheetSize(3); // 3 Spalten, 1 Zeile
    const four = contactSheetSize(4); // 3 Spalten, 2 Zeilen
    expect(four.width).toBe(three.width);
    expect(four.height).toBeGreaterThan(three.height);
  });

  it('behaelt auch fuer 0 Shots eine gueltige Groesse', () => {
    const empty = contactSheetSize(0);
    expect(empty.width).toBeGreaterThan(0);
    expect(empty.height).toBeGreaterThan(0);
  });

  it('escapet Nutzertext im Druck-HTML (kein HTML-Einschleusen)', () => {
    const list: Shotlist = {
      id: 'l1',
      name: '<script>alert(1)</script>',
      shots: [shot({ name: 'A & B', note: '<b>fett</b>' })],
    };
    const html = buildStoryboardHtml(list);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
    expect(html).toContain('&lt;b&gt;fett&lt;/b&gt;');
  });

  it('nennt jeden Shot mit laufender Nummer im Druck-HTML', () => {
    const list: Shotlist = { id: 'l1', name: 'Show', shots: [shot({ id: 'a' }), shot({ id: 'b', name: 'CU' })] };
    const html = buildStoryboardHtml(list, 'Studio 1');
    expect(html).toContain('Studio 1');
    expect(html).toContain('>01<');
    expect(html).toContain('>02<');
    expect(html).toContain('CU');
  });
});
