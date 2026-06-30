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

export interface MultiCamVenueInput {
  venue: Venue;
  persons: ReferencePerson[];
  walls: Wall[];
  backgroundPlan: BackgroundPlan | null;
  appVersion: string;
  exportedAt: string;
}

function bgToFloorPlan(bg: BackgroundPlan): VenueExchangeFloorPlan {
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
    kind: 'image',
  };
}

/** MultiCam-Venue → neutrales Austauschformat. */
export function toVenueExchange(input: MultiCamVenueInput): VenueExchange {
  const { venue, persons, walls, backgroundPlan } = input;
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
      // Plan-Tiefe wandert ins `depth`-Feld, die Podest-Hoehe ist hier 0.
      stageObjects: venue.stages.map((s) => ({
        id: s.id, x: s.x, y: s.y, width: s.width, depth: s.height, height: 0, label: s.label,
      })),
      floorPlan: backgroundPlan ? bgToFloorPlan(backgroundPlan) : undefined,
    },
  };
}

export interface MultiCamVenueResult {
  venue: Venue;
  persons: ReferencePerson[];
  walls: Wall[];
  backgroundPlan: BackgroundPlan | null;
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
  };
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
