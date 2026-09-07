// ───────────────────────────────────────────────────────────────────────────
// Drift-Guard fuer das Kamera-Listen-Format `camera-list` v1.
//
// Das Format ist in ZWEI Apps dupliziert: multicam-planner schreibt
// (src/utils/cameraExport.ts), cable-planner liest (src/renderer/lib/
// multicamCameraImport.ts). Beide Modulkoepfe behaupten einander:
// „Schema-identisch zum Cable-Planner" bzw. „Gegenstueck: multicam-planner".
//
// Diese Behauptung stand bis ADR-005 Inkrement 4 unter KEINEM Test. Beide
// Seiten testeten nur sich selbst gegen selbstgeschriebene Fixtures — eine
// Aenderung auf einer Seite waere auf beiden Seiten gruen durchgelaufen.
// Die Schemata waren dabei tatsaechlich identisch; es hielt sie nur nichts.
//
// Gleiches Muster wie src/__tests__/inventoryContract.test.ts: der
// eingefrorene CONTRACT unten steht WORTGLEICH in cable-planner
// tests/cameraListContract.test.ts. Aendert jemand das Schema in EINEM Repo,
// schlaegt dessen Guard fehl. Kein Test in einem Repo kann den Code des
// anderen ausfuehren — aber Auseinanderlaufen wird laut, statt still.
//
// !!! Wenn dieser Contract bewusst geaendert wird:
//   1. CAMERA_LIST_VERSION erhoehen (Abwaertskompatibilitaet beachten),
//   2. die identische Aenderung im cable-planner nachziehen,
//   3. die eingefrorenen Key-Listen in BEIDEN Guards anpassen.
// ───────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { interfaceKeys } from './support/interfaceKeys';
import cameraExportSrc from '../utils/cameraExport.ts?raw';
import {
  CAMERA_LIST_KIND,
  CAMERA_LIST_VERSION,
  toCameraList,
  parseCameraList,
  type CameraListEntry,
  type CameraListExchange,
} from '../utils/cameraExport';
import type { VenueCamera, Camera } from '../types';

// Eingefrorener Contract — MUSS in beiden Repos identisch sein.
const CONTRACT = {
  kind: 'camera-list',
  version: 1,
  envelopeKeys: ['app', 'appVersion', 'cameras', 'exportedAt', 'formatVersion', 'kind'],
  entryKeys: ['deviceTypeId', 'id', 'label', 'manufacturer', 'model', 'x', 'y'],
} as const;

// Voll besetzter Muster-Eintrag (jedes Feld gesetzt). Er haelt die Laufzeit-
// Form fest — NICHT die Typ-Vollstaendigkeit: ein neues optionales Feld
// laesst ihn unveraendert. Dafuer ist der interfaceKeys-Test weiter unten da.
const entry: CameraListEntry = {
  id: 'vc1',
  label: 'Kamera 1',
  manufacturer: 'Blackmagic Design',
  model: 'URSA Broadcast G2',
  deviceTypeId: 'dt-cam-0001',
  x: 3.5,
  y: 7.25,
};
const exchange: CameraListExchange = {
  kind: CAMERA_LIST_KIND,
  formatVersion: CAMERA_LIST_VERSION,
  app: 'multicam-planner',
  appVersion: '1.2.3',
  exportedAt: '2026-01-01T00:00:00.000Z',
  cameras: [entry],
};

const sortedKeys = (o: object) => Object.keys(o).sort();

describe('camera-list Wire-Contract (Drift-Guard)', () => {
  it('Format-Marker + Version sind eingefroren', () => {
    expect(CAMERA_LIST_KIND).toBe(CONTRACT.kind);
    expect(CAMERA_LIST_VERSION).toBe(CONTRACT.version);
  });

  it('Envelope-Shape ist eingefroren', () => {
    expect(sortedKeys(exchange)).toEqual(CONTRACT.envelopeKeys);
  });

  it('Feld-Namen des Kamera-Eintrags sind eingefroren', () => {
    expect(sortedKeys(entry)).toEqual(CONTRACT.entryKeys);
  });

  it('fängt auch ein neu hinzugefügtes OPTIONALES Feld', () => {
    // Die Muster-Literale oben wuerden das nicht tun. Hier gegen den
    // Interface-Rumpf im Quelltext — dieselbe Pruefung wie im cable-planner,
    // damit der zweiseitige Vertrag auf beiden Seiten gleich scharf ist.
    expect(interfaceKeys(cameraExportSrc, 'CameraListEntry')).toEqual(CONTRACT.entryKeys);
    expect(interfaceKeys(cameraExportSrc, 'CameraListExchange')).toEqual(CONTRACT.envelopeKeys);
  });

  it('der ECHTE Exporter schreibt genau den eingefrorenen Envelope', () => {
    // Anders als die cable-Seite (die nur liest) kann hier der Exporter
    // selbst laufen — der Guard prueft also nicht nur die Typen, sondern das,
    // was wirklich in der Datei landet.
    const placed = [
      { id: 'vc1', cameraId: 'cam-a', label: 'Kamera 1', x: 3.5, y: 7.25 },
    ] as unknown as VenueCamera[];
    const lib = {
      'cam-a': {
        manufacturer: 'Blackmagic Design',
        model: 'URSA Broadcast G2',
        deviceTypeId: 'dt-cam-0001',
      },
    } as unknown as Record<string, Camera>;

    const out = toCameraList(placed, (id) => lib[id], {
      appVersion: '1.2.3',
      exportedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(sortedKeys(out)).toEqual(CONTRACT.envelopeKeys);
    expect(sortedKeys(out.cameras[0])).toEqual(CONTRACT.entryKeys);
    expect(out).toEqual(exchange);
  });

  it('parse lehnt fremdes Format und fremde Version ab', () => {
    expect(() => parseCameraList(JSON.stringify({ ...exchange, kind: 'something-else' }))).toThrow();
    expect(() =>
      parseCameraList(JSON.stringify({ ...exchange, formatVersion: CONTRACT.version + 1 })),
    ).toThrow();
    expect(() => parseCameraList(JSON.stringify({ ...exchange, cameras: undefined }))).toThrow();
    expect(() => parseCameraList('not json')).toThrow();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Der Vertrag kennt nicht nur die Namen der Felder, sondern ihre Bedeutung.
//
// BEFUND (Defektformen-Sweep, Form `vertrag-nur-feldnamen`, gemessen
// 2026-09-07). Alles oberhalb dieser Zeile prueft NAMEN: eingefrorene
// Envelope-Keys, eingefrorene Entry-Keys, dieselben Keys aus dem
// Interface-Rumpf, und vier Ablehnungen, die alle am Umschlag haengen
// (fremdes `kind`, fremde Version, fehlendes Array, kaputtes JSON).
//
// Ueber den INHALT des Arrays stand nichts — und `parseCameraList` sah ihn
// auch nicht an: es gab `data as CameraListExchange` zurueck. Der Cast war
// die ganze Zusicherung. `cameras: [null, 42, {}, { id: 5, x: "links" }]`
// kam als wohlgeformte `CameraListExchange` beim Aufrufer an, und der
// Aufrufer ist der Cable-Planner, der aus jedem Eintrag einen
// Equipment-Knoten baut: ohne `id` einen ohne Identitaet, mit `x: "links"`
// einen bei NaN.
//
// Die Faelle hier sind deshalb keine Typ-Uebungen. Jeder von ihnen ist eine
// Datei, die es geben kann — von Hand editiert, aus einem aelteren Stand
// gerettet, von einem fremden Werkzeug geschrieben.
// ───────────────────────────────────────────────────────────────────────────
describe('camera-list Wire-Contract (Bedeutung, nicht nur Namen)', () => {
  const mitKameras = (cameras: unknown) => JSON.stringify({ ...exchange, cameras });

  it('ein Eintrag muss ein Objekt sein', () => {
    for (const murks of [null, 42, 'CAM 1', [], true]) {
      expect(() => parseCameraList(mitKameras([murks])), String(murks)).toThrow(/Kamera #1/);
    }
  });

  it('id und label sind Pflicht und nicht leer', () => {
    expect(() => parseCameraList(mitKameras([{ ...entry, id: undefined }]))).toThrow(/id/);
    expect(() => parseCameraList(mitKameras([{ ...entry, id: '' }]))).toThrow(/id/);
    expect(() => parseCameraList(mitKameras([{ ...entry, id: '   ' }]))).toThrow(/id/);
    expect(() => parseCameraList(mitKameras([{ ...entry, id: 5 }]))).toThrow(/id/);
    expect(() => parseCameraList(mitKameras([{ ...entry, label: undefined }]))).toThrow(/label/);
  });

  it('x und y sind Zahlen, wenn sie dastehen', () => {
    for (const murks of ['links', null, NaN, Infinity, {}]) {
      expect(() => parseCameraList(mitKameras([{ ...entry, x: murks }])), String(murks)).toThrow(/x/);
    }
    // Aber sie DUERFEN fehlen — eine Kamera ohne Position ist erlaubt, sie
    // steht dann eben noch nirgends. Das ist die Gegenprobe: ohne sie waere
    // „x ist immer Pflicht" ebenfalls gruen.
    const ohnePosition = { id: 'vc9', label: 'CAM 9' };
    expect(parseCameraList(mitKameras([ohnePosition])).cameras[0]).toEqual(ohnePosition);
    // Und 0 ist eine Position, kein fehlender Wert.
    expect(parseCameraList(mitKameras([{ ...entry, x: 0, y: 0 }])).cameras[0].x).toBe(0);
  });

  it('die optionalen Textfelder sind Text, wenn sie dastehen', () => {
    expect(() => parseCameraList(mitKameras([{ ...entry, manufacturer: 7 }]))).toThrow(/manufacturer/);
    expect(() => parseCameraList(mitKameras([{ ...entry, deviceTypeId: {} }]))).toThrow(/deviceTypeId/);
    const ohne = { id: 'vc9', label: 'CAM 9' };
    expect(() => parseCameraList(mitKameras([ohne]))).not.toThrow();
  });

  it('der Umschlag traegt seine Herkunft — sonst weiss niemand, wer das geschrieben hat', () => {
    for (const feld of ['app', 'appVersion', 'exportedAt'] as const) {
      expect(() => parseCameraList(JSON.stringify({ ...exchange, [feld]: undefined })), feld)
        .toThrow(new RegExp(feld));
    }
  });

  it('die Fehlermeldung sagt, WELCHE Kamera es ist', () => {
    // Eine Liste mit 40 Kameras und der Meldung „ungueltig" ist keine Hilfe.
    expect(() => parseCameraList(mitKameras([entry, entry, { ...entry, id: '' }])))
      .toThrow(/Kamera #3/);
  });

  it('was der Exporter schreibt, nimmt der Parser an', () => {
    // Die Rundreise. Ohne sie koennte die neue Pruefung so streng sein, dass
    // sie die eigene Ausgabe ablehnt — und das faellt sonst erst beim Nutzer
    // auf, der exportiert und danach importiert.
    const placed = [
      { id: 'vc1', cameraId: 'cam-a', label: 'Kamera 1', x: 3.5, y: 7.25 },
      { id: 'vc2', cameraId: 'unbekannt', label: 'Kamera 2', x: 0, y: 0 },
    ] as unknown as VenueCamera[];
    const lib = {
      'cam-a': { manufacturer: 'Blackmagic Design', model: 'URSA Broadcast G2', deviceTypeId: 'dt-cam-0001' },
    } as unknown as Record<string, Camera>;
    const out = toCameraList(placed, (id) => lib[id], {
      appVersion: '1.2.3', exportedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(() => parseCameraList(JSON.stringify(out))).not.toThrow();
    expect(parseCameraList(JSON.stringify(out)).cameras).toHaveLength(2);
  });
});
