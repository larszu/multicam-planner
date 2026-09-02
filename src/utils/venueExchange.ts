// ───────────────────────────────────────────────────────────────────────────
// Venue-Austauschformat (`venue-exchange` v1)
//
// Domaenen-neutrales Format fuer den Raum/das Venue (Floor-Plan, Waende,
// Stage-Objekte, Personen, Venue-Masse) — der Teil, den MultiCam-, Light- und
// (perspektivisch) Cable-Planner gemeinsam haben. So kann man ein Venue in der
// einen App exportieren und in der anderen importieren, um z. B. im selben Raum
// Kameras UND Licht zu planen.
//
// Das Schema ist in jeder App identisch gehalten (siehe light-planner
// src/core/venueExchange.ts). Reine Daten, keine DOM-/Store-Abhaengigkeit →
// headless testbar.
// ───────────────────────────────────────────────────────────────────────────
import type { Venue, ReferencePerson, Wall, BackgroundPlan, StageObjectType } from '../types';

export const VENUE_EXCHANGE_KIND = 'venue-exchange' as const;
export const VENUE_EXCHANGE_VERSION = 1 as const;

export interface VenueExchangePerson {
  id: string; x: number; y: number; height: number; label: string;
  width?: number; objectType?: string; pose?: 'standing' | 'sitting'; facing?: number; color?: string;
}
export interface VenueExchangeWall {
  id: string; x1: number; y1: number; x2: number; y2: number; height: number;
  label?: string; cx?: number; cy?: number; reflectance?: number; color?: string;
}
export interface VenueExchangeStageObject {
  id: string; x: number; y: number; width: number; height: number;
  depth?: number; height2?: number; rotation?: number; points?: { x: number; y: number }[]; label?: string;
}
export interface VenueExchangeFloorPlan {
  src: string; name?: string; naturalWidth: number; naturalHeight: number;
  // Kanonisch: reale Masse (light-Form). MultiCams scaleX/scaleY werden hieraus abgeleitet.
  widthMeters: number; heightMeters: number;
  offsetX: number; offsetY: number; opacity: number;
  locked?: boolean; kind?: 'image' | 'pdf'; pageCount?: number; pageIndex?: number;
}
export interface VenueExchange {
  kind: typeof VENUE_EXCHANGE_KIND;
  formatVersion: typeof VENUE_EXCHANGE_VERSION;
  app: string;
  appVersion: string;
  exportedAt: string;
  venue: {
    name: string;
    widthM?: number;
    heightM?: number;
    persons: VenueExchangePerson[];
    walls: VenueExchangeWall[];
    stageObjects: VenueExchangeStageObject[];
    floorPlan?: VenueExchangeFloorPlan;
  };
}

/**
 * ADR-005 — Buehnen-Felder, die MultiCam nicht modelliert, je Buehnen-Id
 * aufgehoben.
 *
 * MultiCams Buehne ist eine flache 2D-Zone: sie hat Breite und Plan-Tiefe,
 * aber keine Podest-Hoehe, keine Drehung und keinen Polygon-Umriss. Das
 * Austauschformat kennt alle drei. Bisher schrieb der Export deshalb fuer
 * JEDE Buehne `height: 0` — und das ist nicht dasselbe wie „weiss ich nicht":
 * ein 0,6 m hohes Podest aus dem Light-Planner kam nach einem
 * MultiCam-Round-Trip als flacher Boden zurueck.
 *
 * `height` ist im Austauschtyp Pflicht, kann also nicht weggelassen werden —
 * eine Aenderung daran waere eine Aenderung am eingefrorenen Draht-Vertrag.
 * Stattdessen hebt MultiCam auf, was es nicht versteht, und gibt es beim
 * Export unveraendert zurueck. Fuer eine MultiCam-eigene Buehne gibt es
 * nichts Aufgehobenes, und `height: 0` bleibt — dort ist es zutreffend und
 * keine Erfindung.
 */
export interface ForeignStageFields {
  height?: number;
  height2?: number;
  rotation?: number;
  points?: { x: number; y: number }[];
}

/**
 * ADR-005 — Gebaeudeplan-Felder, die MultiCam nicht modelliert.
 *
 * MultiCams `BackgroundPlan` ist eine Bitmap mit Massstab und Versatz: kein
 * Name, kein Sperr-Flag, keine Seitenzahl, keine Angabe, ob die Quelle ein PDF
 * war. Der Export schrieb deshalb unbedingt `kind: 'image'`.
 *
 * Fuer einen in MultiCam hochgeladenen Plan ist das wahr. Fuer einen aus dem
 * Light-Planner uebernommenen PDF-Grundriss nicht: aus Seite 3 von 5 eines
 * gesperrten `EG_Grundriss.pdf` wurde ein namenloses, entsperrtes Bild ohne
 * Seitenbezug. Dieselbe Sorte Schaden wie bei der Podest-Hoehe — ein falscher
 * Wert, kein fehlender.
 */
export interface ForeignFloorPlanFields {
  name?: string;
  locked?: boolean;
  kind?: 'image' | 'pdf';
  pageCount?: number;
  pageIndex?: number;
}

export interface MultiCamVenueInput {
  venue: Venue;
  persons: ReferencePerson[];
  walls: Wall[];
  backgroundPlan: BackgroundPlan | null;
  appVersion: string;
  exportedAt: string;
  /** Siehe ForeignStageFields. Fehlt es, verhaelt sich der Export wie bisher. */
  stageForeign?: Record<string, ForeignStageFields>;
  /** Siehe ForeignFloorPlanFields. Fehlt es, bleibt es bei `kind: 'image'`. */
  floorPlanForeign?: ForeignFloorPlanFields;
}

function bgToFloorPlan(
  bg: BackgroundPlan,
  foreign: ForeignFloorPlanFields = {},
): VenueExchangeFloorPlan {
  return {
    src: bg.dataUrl,
    naturalWidth: bg.widthPx,
    naturalHeight: bg.heightPx,
    // MultiCam speichert Meter pro Pixel → reale Masse = scale * Pixelmasse.
    widthMeters: bg.scaleX * bg.widthPx,
    heightMeters: bg.scaleY * bg.heightPx,
    offsetX: bg.offsetX,
    offsetY: bg.offsetY,
    opacity: bg.opacity,
    // ADR-005 — `kind: 'image'` gilt nur, solange nichts anderes bekannt ist.
    // Ein uebernommener PDF-Grundriss behaelt seine Herkunft und seine Seite.
    kind: foreign.kind ?? 'image',
    ...(foreign.name !== undefined ? { name: foreign.name } : {}),
    ...(foreign.locked !== undefined ? { locked: foreign.locked } : {}),
    ...(foreign.pageCount !== undefined ? { pageCount: foreign.pageCount } : {}),
    ...(foreign.pageIndex !== undefined ? { pageIndex: foreign.pageIndex } : {}),
  };
}

/** MultiCam-Venue → neutrales Austauschformat. */
export function toVenueExchange(input: MultiCamVenueInput): VenueExchange {
  const { venue, persons, walls, backgroundPlan } = input;
  const foreign = input.stageForeign ?? {};
  return {
    kind: VENUE_EXCHANGE_KIND,
    formatVersion: VENUE_EXCHANGE_VERSION,
    app: 'multicam-planner',
    appVersion: input.appVersion,
    exportedAt: input.exportedAt,
    venue: {
      name: venue.name,
      widthM: venue.widthM,
      heightM: venue.heightM,
      persons: persons.map((p) => ({
        id: p.id, x: p.x, y: p.y, height: p.height, label: p.label,
        width: p.width, objectType: p.objectType, color: p.color,
      })),
      walls: walls.map((w) => ({
        id: w.id, x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, height: w.height, label: w.label,
      })),
      // MultiCam-Stage ist eine flache 2D-Zone (width × height-in-Plan); die
      // Plan-Tiefe wandert ins `depth`-Feld. Die Podest-Hoehe bleibt 0, wenn
      // die Buehne hier entstanden ist — und kommt zurueck, wenn sie
      // eingelesen wurde (siehe ForeignStageFields).
      stageObjects: venue.stages.map((s) => {
        const f = foreign[s.id];
        return {
          id: s.id, x: s.x, y: s.y, width: s.width, depth: s.height, label: s.label,
          height: f?.height ?? 0,
          ...(f?.height2 !== undefined ? { height2: f.height2 } : {}),
          ...(f?.rotation !== undefined ? { rotation: f.rotation } : {}),
          ...(f?.points !== undefined ? { points: f.points } : {}),
        };
      }),
      floorPlan: backgroundPlan
        ? bgToFloorPlan(backgroundPlan, input.floorPlanForeign)
        : undefined,
    },
  };
}

export interface MultiCamVenueResult {
  venue: Venue;
  persons: ReferencePerson[];
  walls: Wall[];
  backgroundPlan: BackgroundPlan | null;
  /** Siehe ForeignStageFields. Nur Buehnen mit wirklich fremden Werten. */
  stageForeign: Record<string, ForeignStageFields>;
  /** Siehe ForeignFloorPlanFields. Leer, wenn die Datei nichts davon trug. */
  floorPlanForeign: ForeignFloorPlanFields;
}

function floorPlanToBg(fp: VenueExchangeFloorPlan): BackgroundPlan {
  return {
    dataUrl: fp.src,
    // Reale Masse → Meter pro Pixel (Inverse von bgToFloorPlan).
    scaleX: fp.naturalWidth ? fp.widthMeters / fp.naturalWidth : 1,
    scaleY: fp.naturalHeight ? fp.heightMeters / fp.naturalHeight : 1,
    offsetX: fp.offsetX,
    offsetY: fp.offsetY,
    opacity: fp.opacity,
    widthPx: fp.naturalWidth,
    heightPx: fp.naturalHeight,
  };
}

/** Neutrales Austauschformat → MultiCam-Venue (Kamera-Layer bleibt unberuehrt). */
export function fromVenueExchange(ex: VenueExchange): MultiCamVenueResult {
  const v = ex.venue;
  return {
    venue: {
      name: v.name || 'Venue',
      widthM: v.widthM ?? 20,
      heightM: v.heightM ?? 12,
      stages: (v.stageObjects ?? []).map((s) => ({
        id: s.id, x: s.x, y: s.y, width: s.width,
        height: s.depth ?? s.height ?? 1, label: s.label ?? '',
      })),
    },
    persons: (v.persons ?? []).map((p) => ({
      id: p.id, x: p.x, y: p.y, height: p.height, width: p.width ?? 0.5,
      label: p.label, objectType: (p.objectType as StageObjectType) ?? 'person', color: p.color,
    })),
    walls: (v.walls ?? []).map((w) => ({
      id: w.id, x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, height: w.height, label: w.label ?? '',
    })),
    backgroundPlan: v.floorPlan ? floorPlanToBg(v.floorPlan) : null,
    stageForeign: collectStageForeign(v.stageObjects ?? []),
    floorPlanForeign: collectFloorPlanForeign(v.floorPlan),
  };
}

/** Hebt auf, was MultiCams BackgroundPlan nicht kennt. `kind: 'image'` wird
 *  NICHT aufgehoben: das ist der Wert, den der Export ohnehin schreibt, und
 *  ihn zu speichern hiesse zu behaupten, eine fremde App habe ihn gesetzt. */
function collectFloorPlanForeign(
  fp: VenueExchangeFloorPlan | undefined,
): ForeignFloorPlanFields {
  if (!fp) return {};
  return {
    ...(fp.name !== undefined ? { name: fp.name } : {}),
    ...(fp.locked !== undefined ? { locked: fp.locked } : {}),
    ...(fp.kind !== undefined && fp.kind !== 'image' ? { kind: fp.kind } : {}),
    ...(fp.pageCount !== undefined ? { pageCount: fp.pageCount } : {}),
    ...(fp.pageIndex !== undefined ? { pageIndex: fp.pageIndex } : {}),
  };
}

/** Hebt je Buehne auf, was MultiCam nicht modelliert. Eine Buehne ohne solche
 *  Werte bekommt keinen Eintrag — ein leeres Objekt je Buehne waere Ballast
 *  und wuerde behaupten, es habe etwas zu bewahren gegeben. Eine Hoehe von 0
 *  ist ebenfalls nichts zu bewahren: das ist genau der Wert, den der Export
 *  ohnehin schreibt. */
function collectStageForeign(
  objs: VenueExchangeStageObject[],
): Record<string, ForeignStageFields> {
  const out: Record<string, ForeignStageFields> = {};
  for (const s of objs) {
    const f: ForeignStageFields = {};
    if (typeof s.height === 'number' && s.height !== 0) f.height = s.height;
    if (s.height2 !== undefined) f.height2 = s.height2;
    if (s.rotation !== undefined) f.rotation = s.rotation;
    if (s.points !== undefined) f.points = s.points;
    if (Object.keys(f).length > 0) out[s.id] = f;
  }
  return out;
}

/** Parst + validiert eine Austauschdatei. Wirft bei falschem Format. */
export function parseVenueExchange(text: string): VenueExchange {
  const data = JSON.parse(text) as Partial<VenueExchange>;
  if (!data || data.kind !== VENUE_EXCHANGE_KIND) {
    throw new Error('Keine gueltige Venue-Austauschdatei (kind != venue-exchange).');
  }
  if (data.formatVersion !== VENUE_EXCHANGE_VERSION) {
    throw new Error(`Nicht unterstuetzte Venue-Austausch-Version: ${data.formatVersion}`);
  }
  if (!data.venue) throw new Error('Venue-Austauschdatei ohne venue-Block.');
  return data as VenueExchange;
}
