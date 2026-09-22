import { describe, it, expect } from 'vitest';
import { dofBand } from '../utils/dofBand';
import type { SensorSize } from '../types';

const S35: SensorSize = { name: 'Super 35', widthMm: 24.89, heightMm: 14.0, cropFactor: 1.39 };

describe('dofBand', () => {
  it('liefert ein Band um den Fokusabstand', () => {
    const b = dofBand(S35, 50, 2.8, 5, 1, 100);
    expect(b).not.toBeNull();
    expect(b!.vonM).toBeLessThan(5);
    expect(b!.bisM).toBeGreaterThan(5);
    expect(b!.gekuerzt).toBe(false);
  });

  it('kuerzt eine unendliche Ferngrenze und sagt es', () => {
    // Weitwinkel, geschlossene Blende, weit fokussiert: die Ferngrenze liegt
    // im Unendlichen. Genau dann darf das Band nicht verschwinden — das war
    // der Grund fuer dieses Modul.
    const b = dofBand(S35, 14, 11, 50, 1, 40);
    expect(b).not.toBeNull();
    expect(Number.isFinite(b!.bisM)).toBe(true);
    expect(b!.bisM).toBe(40);
    expect(b!.gekuerzt).toBe(true);
  });

  it('kuerzt auch eine endliche Ferngrenze jenseits der Zeichenflaeche', () => {
    const b = dofBand(S35, 50, 8, 10, 1, 12);
    expect(b).not.toBeNull();
    expect(b!.bisM).toBe(12);
    expect(b!.gekuerzt).toBe(true);
  });

  it('gibt ohne Fokusabstand nichts zurueck', () => {
    expect(dofBand(S35, 50, 2.8, 0, 1, 100)).toBeNull();
  });

  it('gibt nichts zurueck, wenn die Zeichenflaeche vor der Nahgrenze endet', () => {
    // maxM kleiner als die Nahgrenze: es gaebe nichts zu zeichnen, und ein
    // Band mit negativer Breite waere schlimmer als keines.
    expect(dofBand(S35, 100, 2, 20, 1, 1)).toBeNull();
  });
});
