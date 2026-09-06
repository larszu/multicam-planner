import { describe, expect, it } from 'vitest';
import {
  ACCESS_LABEL,
  CARD_FINDING_LABEL,
  UNSTATED,
  cardExtraRows,
  cardFindings,
  commsLines,
  kitLines,
  normaliseCardExtras,
  riggingLines,
} from '../utils/cameraCardExtras';
import { cameraSheetFingerprint } from '../utils/documentContent';
import type { VenueCamera } from '../types';
import extrasQuelle from '../utils/cameraCardExtras.ts?raw';
import panelQuelle from '../components/Export/ExportPanel.tsx?raw';
import storeQuelle from '../store/useStore.ts?raw';
import sidebarQuelle from '../components/Sidebar/Sidebar.tsx?raw';

// ---------------------------------------------------------------------------
// Rigging, Comms und Kit auf der Kamerakarte (Bedarfe 59, 60, 61).
//
//   > Riser/platform, height, load rating, ladder access and power are agreed
//   > verbally […]; THE CAMERA OP FINDS OUT ON SITE.                      (59)
//   > Channel assignment is verbal; […] CANNOT LEAVE A TRIPOD TO CHANGE A
//   > BELTPACK BATTERY.                                                   (60)
//   > The equipment list is assembled in a spreadsheet, retyped or pasted into
//   > the rental request.                                                 (61)
//
// Die Karte samt Stempel gibt es seit ADR-004 Inkrement 4 (Bedarf 57). Was
// fehlte, sind die Angaben, die der Operator vor Ort braucht.
// ---------------------------------------------------------------------------

const cam = (over: Partial<VenueCamera> = {}): VenueCamera =>
  ({
    id: over.id ?? 'c1',
    label: over.label ?? 'CAM 1',
    cameraId: 'x',
    lensId: 'y',
    x: 0,
    y: 0,
    z: over.z ?? 1.5,
    pan: 0,
    tilt: 0,
    focalLength: 50,
    aperture: 4,
    focusDistance: 5,
    color: '#fff',
    extenderActive: 1,
    ...over,
  }) as VenueCamera;

const arten = (c: VenueCamera, alle: VenueCamera[] = [c]): string[] =>
  cardFindings(c, alle).map((f) => f.kind);

// ── 1. Nichts wird geraten ─────────────────────────────────────────────────

describe('nichts wird geraten und nichts bekommt einen Vorgabewert', () => {
  it('schreibt „nicht angegeben" statt einer erfundenen Traglast', () => {
    // Die Zahl steht auf einem Blatt, nach dem sich jemand auf ein Podest
    // stellt.
    const zeilen = riggingLines(cam());
    expect(zeilen.filter((z) => z.includes(UNSTATED))).toHaveLength(5);
    expect(extrasQuelle).not.toMatch(/loadLimitKg\s*(\?\?|\|\|)\s*\d/);
  });

  it('nimmt „ebenerdig" nicht an', () => {
    // An einer Position mit Leiter ist das die teuerste Annahme des Tages.
    expect(riggingLines(cam()).some((z) => z.includes(ACCESS_LABEL.unstated))).toBe(true);
    expect(riggingLines(cam()).some((z) => z.includes(ACCESS_LABEL.level))).toBe(false);
  });

  it('lässt keine Zeile weg, wenn nichts eingetragen ist', () => {
    // Eine weggelassene Zeile liest sich als „gibt es nichts zu sagen".
    expect(riggingLines(cam())).toHaveLength(5);
    expect(commsLines(cam())).toHaveLength(4);
  });

  it('erfindet kein Kit', () => {
    expect(kitLines(cam())).toEqual([]);
    expect(kitLines(cam({ kit: ['Stativ', '  ', 'Regenschutz'] }))).toEqual([
      'Stativ',
      'Regenschutz',
    ]);
  });
});

// ── 2. Die Befunde ─────────────────────────────────────────────────────────

describe('cardFindings', () => {
  it('meldet eine Position ohne jede Rigging-Angabe', () => {
    expect(arten(cam())).toContain('rigging-unstated');
  });

  it('meldet ein Podest ohne Traglast', () => {
    const c = cam({ rigging: { riser: '4×4 ft Intellistage' } });
    expect(arten(c)).toContain('load-unstated');
    expect(arten(c)).not.toContain('rigging-unstated');
  });

  it('meldet einen fehlenden Zugang und fehlenden Strom', () => {
    const c = cam({ rigging: { riser: 'Podest', loadLimitKg: 300 } });
    expect(arten(c)).toContain('access-unstated');
    expect(arten(c)).toContain('power-unstated');
  });

  it('schweigt, sobald alles dasteht', () => {
    const c = cam({
      rigging: { riser: 'Podest', loadLimitKg: 300, access: 'ladder', powerDrop: 'K3/2' },
      comms: { channel: 'A', batteryPlan: 'Wechsel in der Pause' },
    });
    expect(arten(c)).toEqual([]);
  });

  it('meldet eine Kamera, die tiefer steht als ihr eigenes Podest', () => {
    const c = cam({
      z: 0.8,
      rigging: { riser: 'Podest', riserHeightM: 1.2, loadLimitKg: 300, access: 'ladder', powerDrop: 'K1' },
      comms: { channel: 'A', batteryPlan: 'x' },
    });
    expect(arten(c)).toContain('camera-below-riser');
  });

  it('meldet einen fehlenden Comms-Kanal', () => {
    expect(arten(cam())).toContain('channel-unstated');
  });

  it('meldet zwei Positionen mit demselben Beltpack', () => {
    const a = cam({ id: 'a', label: 'CAM 1', comms: { channel: 'A', beltpackId: 'BP-3' } });
    const b = cam({ id: 'b', label: 'CAM 2', comms: { channel: 'B', beltpackId: 'BP-3' } });
    const f = cardFindings(a, [a, b]).find((x) => x.kind === 'beltpack-duplicate');
    expect(f?.text).toContain('CAM 2');
  });

  it('meldet kein Duplikat, wenn die Kennung nur einmal vorkommt', () => {
    const a = cam({ id: 'a', comms: { channel: 'A', beltpackId: 'BP-3' } });
    const b = cam({ id: 'b', comms: { channel: 'B', beltpackId: 'BP-4' } });
    expect(arten(a, [a, b])).not.toContain('beltpack-duplicate');
  });

  it('verlangt den Akku-Plan NUR an erhöhten Positionen', () => {
    // Ebenerdig neben dem Gang ist der Akkuwechsel kein Planungsthema, und ein
    // Befund dort waere Rauschen. Der Beleg nennt genau den Fall, dass der
    // Operator das Stativ nicht verlassen kann.
    const eben = cam({
      rigging: { riser: 'kein', loadLimitKg: 0, access: 'level', powerDrop: 'K1' },
      comms: { channel: 'A' },
    });
    expect(arten(eben)).not.toContain('battery-unplanned');

    const oben = cam({
      rigging: { riser: 'Podest', riserHeightM: 2, loadLimitKg: 300, access: 'ladder', powerDrop: 'K1' },
      comms: { channel: 'A' },
    });
    expect(arten(oben)).toContain('battery-unplanned');
  });

  it('gibt jeder Befundart eine Beschriftung', () => {
    for (const k of Object.keys(CARD_FINDING_LABEL)) {
      expect(CARD_FINDING_LABEL[k as never]).toBeTruthy();
    }
  });
});

// ── 3. Der Stempel ─────────────────────────────────────────────────────────

describe('was auf dem Blatt steht, geht in den Stempel', () => {
  const basis = {
    label: 'CAM 1',
    camera: 'Sony HDC',
    lens: 'Canon',
    optik: [50, 4],
    position: [0, 0, 1.5, 0, 0],
    alle: [],
  };

  it('ändert den Fingerabdruck, wenn sich der Comms-Kanal ändert', () => {
    // Der Fall, um den es geht: gleiche Optik, gleiche Position, anderer Kanal
    // — ohne diese Zeilen trügen beide Karten denselben Stempel, und der
    // Operator mit dem älteren Blatt schaltet auf den falschen Kanal.
    const a = cameraSheetFingerprint({
      ...basis,
      extras: cardExtraRows(cam({ comms: { channel: 'A' } })),
    });
    const b = cameraSheetFingerprint({
      ...basis,
      extras: cardExtraRows(cam({ comms: { channel: 'B' } })),
    });
    expect(a).not.toBe(b);
  });

  it('ändert ihn auch bei einer anderen Traglast', () => {
    const a = cameraSheetFingerprint({
      ...basis,
      extras: cardExtraRows(cam({ rigging: { loadLimitKg: 300 } })),
    });
    const b = cameraSheetFingerprint({
      ...basis,
      extras: cardExtraRows(cam({ rigging: { loadLimitKg: 500 } })),
    });
    expect(a).not.toBe(b);
  });

  it('lässt ihn gleich, wenn sich nichts ändert', () => {
    const c = cam({ comms: { channel: 'A' } });
    expect(cameraSheetFingerprint({ ...basis, extras: cardExtraRows(c) })).toBe(
      cameraSheetFingerprint({ ...basis, extras: cardExtraRows(c) }),
    );
  });

  it('wird von der Karte auch wirklich mitgegeben', () => {
    expect(panelQuelle).toMatch(/extras: cardExtraRows\(targetCam\)/);
  });
});

// ── 4. Die Karte und das Laden ─────────────────────────────────────────────

describe('die Karte zeichnet die Blöcke', () => {
  it('druckt Rigging und Comms IMMER, das Kit nur wenn es eines gibt', () => {
    expect(panelQuelle).toMatch(/ctx\.fillText\('RIGGING'/);
    expect(panelQuelle).toMatch(/ctx\.fillText\('COMMS'/);
    expect(panelQuelle).toMatch(/if \(kit\.length > 0\) \{/);
  });

  it('hebt „nicht angegeben" in BEIDEN Blöcken farblich ab', () => {
    // Erste Fassung prüfte nur, dass die Hervorhebung irgendwo vorkommt — und
    // blieb grün, als sie aus dem Rigging-Block verschwand, weil der
    // Comms-Block sie noch trug.
    const treffer = panelQuelle.match(/line\.includes\(UNSTATED\) \? '#f59e0b'/g) ?? [];
    expect(treffer).toHaveLength(2);
  });
});

describe('normaliseCardExtras', () => {
  it('wirft einen unbekannten Zugangswert weg', () => {
    expect(normaliseCardExtras({ rigging: { access: 'seilbahn' } }).rigging).toBeUndefined();
  });

  it('wirft eine Traglast weg, die keine Zahl ist', () => {
    expect(normaliseCardExtras({ rigging: { loadLimitKg: 'viel' } }).rigging).toBeUndefined();
    expect(normaliseCardExtras({ rigging: { loadLimitKg: 300 } }).rigging?.loadLimitKg).toBe(300);
  });

  it('lässt leere Blöcke ganz weg', () => {
    const out = normaliseCardExtras({ rigging: {}, comms: {}, kit: [] });
    expect(out.rigging).toBeUndefined();
    expect(out.comms).toBeUndefined();
    expect(out.kit).toBeUndefined();
  });

  it('speichert `unstated` nicht als Wert', () => {
    // Es ist die Abwesenheit, nicht eine Angabe. Gespeichert wäre es Ballast.
    expect(normaliseCardExtras({ rigging: { access: 'unstated' } }).rigging).toBeUndefined();
  });

  it('läuft auf dem Lade-Pfad', () => {
    expect(storeQuelle).toMatch(/\.\.\.normaliseCardExtras\(c\),/);
  });
});

describe('die Oberfläche', () => {
  it('zeigt die Befunde dort, wo man sie beheben kann', () => {
    expect(sidebarQuelle).toMatch(/const kartenBefunde = cardFindings\(cam, cameras\)/);
    expect(sidebarQuelle).toMatch(/CARD_FINDING_LABEL\[f\.kind\]/);
  });

  it('behandelt ein leeres Zahlenfeld als „nicht angegeben", nicht als 0', () => {
    expect(sidebarQuelle).toMatch(
      /return v\.trim\(\) === '' \|\| !Number\.isFinite\(n\) \? undefined : n/,
    );
  });
});
