import { describe, expect, it } from 'vitest';
import { dragIsOwn, dropToParked } from '../utils/venueDrag';

// ───────────────────────────────────────────────────────────────────────────
// Nutzer-Meldung 2026-09-07: „wenn man im 2D-Plan ne Kamera schwenkt per
// Mausbewegung springt die Kamera an ne falsche Stelle."
//
// Der Schwenk-Griff sitzt IN der ziehbaren Kamera-Gruppe. Konva lässt
// `dragend` aufsteigen (`bubble = true`), also erreichte das Ende des
// Griff-Drags den `onDragEnd` der Gruppe — mit dem GRIFF als `target`, dessen
// Koordinaten gruppen-lokal sind. Durch `ppm` geteilt: ein paar Zentimeter.
// Die Kamera sprang in die Ecke.
// ───────────────────────────────────────────────────────────────────────────

const gruppe = { id: 'cam-group' };
const griff = { id: 'pan-handle' };

describe('ein Drag-Handler rechnet nur mit seinem eigenen Knoten', () => {
  it('nimmt das Ereignis an, das am Knoten selbst entstanden ist', () => {
    expect(dragIsOwn({ target: gruppe, currentTarget: gruppe })).toBe(true);
  });

  it('lehnt das aufgestiegene Ereignis des Schwenk-Griffs ab', () => {
    expect(dragIsOwn({ target: griff, currentTarget: gruppe })).toBe(false);
  });

  it('vergleicht Identität, nicht Inhalt — zwei gleiche Knoten sind zwei Knoten', () => {
    expect(dragIsOwn({ target: { id: 'a' }, currentTarget: { id: 'a' } })).toBe(false);
  });
});

describe('die Parkposition wird aus dem Drop zurückgerechnet', () => {
  const grundriss = { venueWidthM: 20, venueHeightM: 10 };

  it('ist ohne Fahrweg-Versatz der Drop selbst', () => {
    const d = dropToParked({ dropX: 5, dropY: 4, rigYawDeg: 0, trackOffset: 0, ...grundriss });
    expect(d).toEqual({ parkedX: 5, parkedY: 4, markerX: 5, markerY: 4 });
  });

  it('zieht den Versatz entlang der Rig-Achse ab, nicht entlang der Blickrichtung', () => {
    const d = dropToParked({ dropX: 8, dropY: 4, rigYawDeg: 0, trackOffset: 3, ...grundriss });
    expect(d.parkedX).toBeCloseTo(5);
    expect(d.parkedY).toBeCloseTo(4);
  });

  it('rechnet die Marke nach dem Begrenzen zurück, damit beide zusammenpassen', () => {
    // Drop weit rechts hinaus: die Parkposition wird begrenzt, und die Marke
    // muss auf genau diese begrenzte Position plus Versatz zurückspringen.
    const d = dropToParked({ dropX: 99, dropY: 4, rigYawDeg: 0, trackOffset: 2, ...grundriss });
    expect(d.parkedX).toBe(20);
    expect(d.markerX).toBeCloseTo(22);
  });

  it('begrenzt auch nach oben und links auf null', () => {
    const d = dropToParked({ dropX: -7, dropY: -3, rigYawDeg: 0, trackOffset: 0, ...grundriss });
    expect(d).toMatchObject({ parkedX: 0, parkedY: 0 });
  });

  it('dreht den Versatz mit der Rig-Achse', () => {
    const d = dropToParked({ dropX: 5, dropY: 7, rigYawDeg: 90, trackOffset: 3, ...grundriss });
    expect(d.parkedX).toBeCloseTo(5);
    expect(d.parkedY).toBeCloseTo(4);
  });
});

// Die Regel muss AN DER STELLE STEHEN, an der der Fehler passiert ist —
// sonst ist `dragIsOwn` eine ungenutzte Funktion und die Kamera springt
// wieder.
describe('der Grundriss wendet die Regel auch an', () => {
  it('prüft im Kamera-Drag-Ende, wer gezogen hat', async () => {
    const src = (await import('../components/Venue2D/Venue2D.tsx?raw')).default as string;
    const handler = src.slice(src.indexOf('const handleCamDragEnd'));
    expect(handler.slice(0, 1400)).toContain('dragIsOwn(e)');
  });

  it('lässt den Schwenk-Griff sein Drag-Ende nicht aufsteigen', async () => {
    const src = (await import('../components/Venue2D/Venue2D.tsx?raw')).default as string;
    const griff = src.slice(src.indexOf('handlePanRotate(cam, e)'));
    expect(griff.slice(0, 260)).toContain('onDragEnd');
  });
});
