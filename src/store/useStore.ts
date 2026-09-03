import { create } from 'zustand';
import type { VenueCamera, Venue, ViewTab, EditMode, ReferencePerson, BackgroundPlan, Stage, ProjectFile, VenueTemplate, StageObjectType, Lens, Wall, Camera, Shot, Shotlist, RigTake } from '../types';
import { CAMERAS, CAMERA_COLORS } from '../data/cameras';
import { LENSES, pickInitialMountAndLens } from '../data/lenses';
import { TEMPLATES } from '../data/templates';
import { loadJSON, saveJSON, saveJSONSafe } from '../utils/storage';
import { dedupeIds, maxIdSuffix } from '../utils/idRepair';
import {
  fromVenueExchange,
  mergeOwnVenueDims,
  type VenueExchange,
  type ForeignStageFields,
  type ForeignFloorPlanFields,
  type ForeignWallFields,
  type ForeignPersonFields,
  mergeOwnWallFields,
  mergeOwnPersonFields,
} from '../utils/venueExchange';
import type { AvPlan } from '../utils/avplan';

// Injected by Vite from package.json. In a release build that came through
// the GitHub Actions workflow this matches the git release tag exactly,
// because the workflow runs `npm version <tag>` before invoking the build.
export const APP_VERSION = __APP_VERSION__;

/**
 * ADR-005 — Die Nutzlast des nativen Speicherns, als pure Funktion.
 *
 * Herausgezogen, weil genau sie den Verlust verursacht hat und vorher nicht
 * pruefbar war: der bestehende Format-Test baut den Re-Export von Hand aus
 * `loaded.domains` und konnte deshalb nie bemerken, dass die App die
 * Fremd-Domaenen zwischen Speichern und Laden verliert. Was zugesichert wird,
 * muss aufrufbar sein, ohne einen Download auszuloesen.
 */
export function buildProjectFile(s: {
  projectVersion: number;
  venue: Venue;
  cameras: VenueCamera[];
  persons: ReferencePerson[];
  walls: Wall[];
  backgroundPlan: BackgroundPlan | null;
  avForeign: { lighting?: unknown; cabling?: unknown };
  stageForeign: Record<string, ForeignStageFields>;
  floorPlanForeign: ForeignFloorPlanFields;
  wallForeign: Record<string, ForeignWallFields>;
  personForeign: Record<string, ForeignPersonFields>;
}): ProjectFile {
  return {
    formatVersion: 1,
    appVersion: APP_VERSION,
    projectVersion: s.projectVersion,
    savedAt: new Date().toISOString(),
    venue: s.venue,
    cameras: s.cameras,
    persons: s.persons,
    walls: s.walls ?? [],
    backgroundPlan: s.backgroundPlan,
    // ADR-005 — Fremd-Domaenen gehoeren in die Datei. Nur schreiben, wenn
    // welche da sind: ein leeres Feld in jeder Datei waere Ballast.
    ...(s.avForeign.lighting !== undefined || s.avForeign.cabling !== undefined
      ? { avForeign: s.avForeign }
      : {}),
    // ADR-005 — dito fuer die Buehnen-Felder, die MultiCam nicht modelliert.
    ...(Object.keys(s.stageForeign ?? {}).length > 0
      ? { stageForeign: s.stageForeign }
      : {}),
    // ADR-005 — dito fuer die Gebaeudeplan-Felder.
    ...(Object.keys(s.floorPlanForeign ?? {}).length > 0
      ? { floorPlanForeign: s.floorPlanForeign }
      : {}),
    ...(Object.keys(s.wallForeign ?? {}).length > 0
      ? { wallForeign: s.wallForeign }
      : {}),
    ...(Object.keys(s.personForeign ?? {}).length > 0
      ? { personForeign: s.personForeign }
      : {}),
  };
}

interface AppState {
  // Venue
  venue: Venue;
  setVenue: (v: Venue) => void;

  // Stages
  addStage: (stage?: Partial<Stage>) => void;
  removeStage: (id: string) => void;
  updateStage: (id: string, updates: Partial<Stage>) => void;

  // Background plan
  backgroundPlan: BackgroundPlan | null;
  setBackgroundPlan: (plan: BackgroundPlan | null) => void;

  // Reference persons / stage objects
  persons: ReferencePerson[];
  addPerson: (x?: number, y?: number) => void;
  addStageObject: (objectType: StageObjectType, x?: number, y?: number) => void;
  removePerson: (id: string) => void;
  duplicatePerson: (id: string) => void;
  updatePerson: (id: string, updates: Partial<ReferencePerson>) => void;

  // Custom lenses
  customLenses: Lens[];
  addCustomLens: (lens: Omit<Lens, 'id' | 'isCustom'>) => string;
  removeCustomLens: (id: string) => void;

  // Custom cameras
  customCameras: Camera[];
  addCustomCamera: (camera: Omit<Camera, 'id'>) => string;
  updateCustomCamera: (id: string, updates: Partial<Omit<Camera, 'id'>>) => void;
  removeCustomCamera: (id: string) => void;

  // Cameras placed in venue
  cameras: VenueCamera[];
  favoriteCameraIds: string[];
  favoriteLensIds: string[];
  selectedCameraId: string | null;
  selectCamera: (id: string | null) => void;
  selectNextCamera: () => void;
  selectPrevCamera: () => void;
  toggleFavoriteCameraId: (id: string) => void;
  toggleFavoriteLensId: (id: string) => void;
  addCamera: (cameraId?: string, lensId?: string) => void;
  removeCamera: (id: string) => void;
  updateCamera: (id: string, updates: Partial<VenueCamera>) => void;
  moveCamera: (id: string, x: number, y: number) => void;
  duplicateCamera: (id: string) => void;

  // Walls
  walls: Wall[];
  addWall: (wall?: Partial<Wall>) => void;
  removeWall: (id: string) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  /** When true, wall endpoints magnet to nearby endpoints while drawing/dragging (issue #40). */
  wallSnap: boolean;
  setWallSnap: (v: boolean) => void;

  // View
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  showAllFov: boolean;
  toggleShowAllFov: () => void;
  /** Read-only Anzeige der fremden .avplan-Lampen im 2D-Venue. */
  showForeign: boolean;
  toggleShowForeign: () => void;

  // Edit mode — restricts editing to one category at a time (issue #43)
  editMode: EditMode;
  setEditMode: (mode: EditMode) => void;

  // Layout UI
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;

  // Scale & grid
  pixelsPerMeter: number;
  setPixelsPerMeter: (ppm: number) => void;

  // Templates
  customTemplates: VenueTemplate[];
  hiddenTemplateIds: string[];
  loadTemplate: (templateId: string) => void;
  saveAsTemplate: (name: string, category: VenueTemplate['category']) => void;
  updateTemplate: (id: string, updates: Partial<Pick<VenueTemplate, 'name' | 'category'>>) => void;
  overwriteTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;
  restoreBuiltInTemplates: () => void;
  clearAll: () => void;

  // ── Shotlist / Storyboard (#62 Punkt 5) ──
  shotlists: Shotlist[];
  activeShotlistId: string | null;
  /** Zuletzt angefahrener Shot — treibt die Markierung im Panel. */
  currentShotId: string | null;
  /** true, wenn die letzte Persistierung an der localStorage-Quota scheiterte. */
  shotlistStorageFull: boolean;
  addShotlist: (name?: string) => string;
  removeShotlist: (id: string) => void;
  renameShotlist: (id: string, name: string) => void;
  setActiveShotlist: (id: string | null) => void;
  /** Haengt einen Shot ans Ende der Liste und liefert dessen id. */
  addShot: (shotlistId: string, shot: Omit<Shot, 'id'>) => string;
  updateShot: (shotlistId: string, shotId: string, updates: Partial<Omit<Shot, 'id'>>) => void;
  removeShot: (shotlistId: string, shotId: string) => void;
  /** Verschiebt einen Shot per Index (Drag-Reihenfolge im Panel). */
  moveShot: (shotlistId: string, from: number, to: number) => void;
  setCurrentShotId: (id: string | null) => void;

  // ── Aufgezeichnete Rig-Fahrten (Takes) ──
  rigTakes: RigTake[];
  /** true, wenn der letzte Take nicht in den localStorage gepasst hat. */
  takeStorageFull: boolean;
  addRigTake: (take: Omit<RigTake, 'id'>) => string;
  removeRigTake: (id: string) => void;
  renameRigTake: (id: string, name: string) => void;

  // Project versioning
  projectVersion: number;
  lastSavedVersion: number;
  hasUnsavedChanges: () => boolean;
  bumpVersion: () => void;
  saveProject: () => void;
  loadProject: (file: File) => Promise<void>;
  /** Wendet ein bereits geparstes ProjectFile auf den Store an (Kern von loadProject). */
  applyProjectFile: (project: ProjectFile) => void;
  /** Importiert ein neutrales Venue-Austauschdokument (ersetzt den geteilten
   *  Venue-Teil: Masse/Waende/Stage/Personen/Floor-Plan). Kameras bleiben. */
  importVenueExchange: (ex: VenueExchange) => void;
  /** Fremde .avplan-Domaenen (lighting/cabling), die MultiCam nicht bearbeitet,
   *  aber beim Export 1:1 wieder mitgibt — damit nichts verloren geht. */
  avForeign: { lighting?: unknown; cabling?: unknown };
  stageForeign: Record<string, ForeignStageFields>;
  floorPlanForeign: ForeignFloorPlanFields;
  wallForeign: Record<string, ForeignWallFields>;
  personForeign: Record<string, ForeignPersonFields>;
  /** ADR-005 — Anzahl der beim letzten Laden reparierten doppelten Ids,
   *  `null` wenn nichts zu reparieren war. Nicht persistiert: das
   *  beschreibt einen Ladevorgang, nicht das Projekt. */
  lastIdRepair: number | null;
  dismissIdRepair: () => void;
  /** Importiert ein .avplan-Gesamtprojekt: laedt den cameras-Slot nativ,
   *  ueberlagert den geteilten Raum und bewahrt lighting/cabling verlustfrei. */
  importAvPlan: (avplan: AvPlan) => void;
}

let nextId = 1;
function uid(prefix = 'cam'): string {
  return `${prefix}-${nextId++}`;
}

const CUSTOM_TEMPLATES_KEY = 'multicam-custom-templates';
function loadCustomTemplates(): VenueTemplate[] {
  return loadJSON<VenueTemplate[]>(CUSTOM_TEMPLATES_KEY, []);
}
function saveCustomTemplates(templates: VenueTemplate[]) {
  saveJSON(CUSTOM_TEMPLATES_KEY, templates);
}

const HIDDEN_TEMPLATES_KEY = 'multicam-hidden-templates';
function loadHiddenTemplateIds(): string[] {
  const parsed = loadJSON<string[]>(HIDDEN_TEMPLATES_KEY, []);
  return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
}
function saveHiddenTemplateIds(ids: string[]) {
  saveJSON(HIDDEN_TEMPLATES_KEY, ids);
}

const CUSTOM_LENSES_KEY = 'multicam-custom-lenses';
function loadCustomLenses(): Lens[] {
  return loadJSON<Lens[]>(CUSTOM_LENSES_KEY, []);
}
function saveCustomLensesStorage(lenses: Lens[]) {
  saveJSON(CUSTOM_LENSES_KEY, lenses);
}

const CUSTOM_CAMERAS_KEY = 'multicam-custom-cameras';
function loadCustomCameras(): Camera[] {
  return loadJSON<Camera[]>(CUSTOM_CAMERAS_KEY, []);
}
function saveCustomCamerasStorage(cameras: Camera[]) {
  saveJSON(CUSTOM_CAMERAS_KEY, cameras);
}

// ── Shotlisten (#62 Punkt 5) ──
const SHOTLISTS_KEY = 'multicam-shotlists';

/**
 * Id fuer persistierte Entitaeten. `Date.now()` allein reicht nicht: beim
 * schnellen Aufnehmen mehrerer Shots (oder beim Duplizieren) faellt mehr als
 * eine Id in dieselbe Millisekunde. Der Zaehler + Zufallssuffix macht sie
 * eindeutig, auch ueber Sessions hinweg (anders als der reine `uid`-Zaehler,
 * der nach einem Neustart wieder bei 1 beginnt und persistierte Ids treffen
 * wuerde).
 */
let persistentIdCounter = 0;
function persistentId(prefix: string): string {
  persistentIdCounter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${persistentIdCounter}-${rand}`;
}

function loadShotlists(): Shotlist[] {
  const parsed = loadJSON<Shotlist[]>(SHOTLISTS_KEY, []);
  if (!Array.isArray(parsed)) return [];
  // Defensiv: nur strukturell brauchbare Eintraege durchlassen, damit ein
  // halb geschriebener/handgepfuschter Storage das Panel nicht crasht.
  return parsed.filter(
    (l): l is Shotlist =>
      !!l && typeof l.id === 'string' && typeof l.name === 'string' && Array.isArray(l.shots),
  );
}

/** Einmalig beim Modul-Laden gelesen — der Store-Initializer nutzt denselben
 *  Stand fuer `shotlists` und `activeShotlistId`. */
const INITIAL_SHOTLISTS: Shotlist[] = loadShotlists();

const RIG_TAKES_KEY = 'multicam-rig-takes';

function loadRigTakes(): RigTake[] {
  const parsed = loadJSON<RigTake[]>(RIG_TAKES_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (t): t is RigTake =>
      !!t && typeof t.id === 'string' && typeof t.cameraId === 'string' && Array.isArray(t.samples),
  );
}

const INITIAL_RIG_TAKES: RigTake[] = loadRigTakes();

const FAVORITE_CAMERAS_KEY = 'multicam-favorite-cameras';
const FAVORITE_LENSES_KEY = 'multicam-favorite-lenses';

function loadFavoriteIds(key: string): string[] {
  const parsed = loadJSON<string[]>(key, []);
  return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
}

function saveFavoriteIds(key: string, ids: string[]) {
  saveJSON(key, ids);
}

let stageId = 1;
function stageUid(): string {
  return `stage-${stageId++}`;
}

let personId = 1;
function personUid(): string {
  return `person-${personId++}`;
}

// Object type presets: { height, width, defaultLabel }
// Per-object defaults shared with the renderers in Venue2D / Venue3D / Preview.
// `color` is the accent fall-back when ReferencePerson.color is unset.
export const OBJECT_PRESETS: Record<string, { height: number; width: number; label: string; color: string }> = {
  'person':          { height: 1.8,  width: 0.5,  label: 'Person',     color: '#22c55e' },
  'person-guitar':   { height: 1.8,  width: 0.8,  label: 'Guitarist',  color: '#f97316' },
  'sitting-person':  { height: 1.3,  width: 0.6,  label: 'Seated',     color: '#38bdf8' },
  'drums':           { height: 1.2,  width: 1.5,  label: 'Drums',      color: '#ef4444' },
  'keys':            { height: 1.0,  width: 1.5,  label: 'Keys',       color: '#8b5cf6' },
  'mic-stand':       { height: 1.6,  width: 0.3,  label: 'Mic Stand',  color: '#9ca3af' },
  'chair':           { height: 0.9,  width: 0.5,  label: 'Chair',      color: '#a16207' },
  'table':           { height: 0.75, width: 1.2,  label: 'Table',      color: '#a16207' },
  'lectern':         { height: 1.2,  width: 0.7,  label: 'Lectern',    color: '#7c3aed' },
  'schneetiger':     { height: 1.1,  width: 1.8,  label: 'Schneetiger', color: '#e0f2fe' },
  'custom':          { height: 1.0,  width: 0.5,  label: 'Object',     color: '#f59e0b' },
};

const defaultVenue: Venue = {
  name: 'New Venue',
  widthM: 20,
  heightM: 15,
  stages: [{ id: 'stage-0', x: 7, y: 0.5, width: 6, height: 3, label: 'Stage' }],
};

export const useStore = create<AppState>((set, get) => ({
  venue: defaultVenue,
  setVenue: (v) => set((s) => ({ venue: v, projectVersion: s.projectVersion + 1 })),

  // ── Stages ──
  addStage: (partial) => {
    set((s) => {
      const newStage: Stage = {
        id: stageUid(),
        x: partial?.x ?? s.venue.widthM / 2 - 3,
        y: partial?.y ?? 0.5,
        width: partial?.width ?? 6,
        height: partial?.height ?? 3,
        label: partial?.label ?? `Stage ${s.venue.stages.length + 1}`,
      };
      return {
        venue: { ...s.venue, stages: [...s.venue.stages, newStage] },
        projectVersion: s.projectVersion + 1,
      };
    });
  },

  removeStage: (id) => {
    set((s) => ({
      venue: { ...s.venue, stages: s.venue.stages.filter((st) => st.id !== id) },
      projectVersion: s.projectVersion + 1,
    }));
  },

  updateStage: (id, updates) => {
    set((s) => ({
      venue: {
        ...s.venue,
        stages: s.venue.stages.map((st) => (st.id === id ? { ...st, ...updates } : st)),
      },
      projectVersion: s.projectVersion + 1,
    }));
  },

  // ── Background plan ──
  backgroundPlan: null,
  setBackgroundPlan: (plan) => set((s) => ({ backgroundPlan: plan, projectVersion: s.projectVersion + 1 })),

  // ── Reference persons ──
  persons: [],

  addPerson: (x, y) => {
    set((s) => {
      const newPerson: ReferencePerson = {
        id: personUid(),
        x: x ?? s.venue.widthM / 2,
        y: y ?? s.venue.heightM / 2,
        height: 1.8,
        width: 0.5,
        label: `Person ${s.persons.length + 1}`,
        objectType: 'person',
      };
      return { persons: [...s.persons, newPerson], projectVersion: s.projectVersion + 1 };
    });
  },

  addStageObject: (objectType, x, y) => {
    set((s) => {
      const preset = OBJECT_PRESETS[objectType] ?? OBJECT_PRESETS['custom'];
      const count = s.persons.filter((p) => p.objectType === objectType).length;
      const newObj: ReferencePerson = {
        id: personUid(),
        x: x ?? s.venue.widthM / 2,
        y: y ?? s.venue.heightM / 2,
        height: preset.height,
        width: preset.width,
        label: `${preset.label} ${count + 1}`,
        objectType,
      };
      return { persons: [...s.persons, newObj], projectVersion: s.projectVersion + 1 };
    });
  },

  removePerson: (id) => set((s) => ({ persons: s.persons.filter((p) => p.id !== id), projectVersion: s.projectVersion + 1 })),

  duplicatePerson: (id) =>
    set((s) => {
      const src = s.persons.find((p) => p.id === id);
      if (!src) return s;
      const dup: ReferencePerson = {
        ...src,
        id: personUid(),
        label: `${src.label} copy`,
        x: Math.min(s.venue.widthM, src.x + 0.5),
        y: Math.min(s.venue.heightM, src.y + 0.5),
        locked: false,
      };
      return { persons: [...s.persons, dup], projectVersion: s.projectVersion + 1 };
    }),

  updatePerson: (id, updates) =>
    set((s) => ({
      persons: s.persons.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      projectVersion: s.projectVersion + 1,
    })),

  // ── Custom Lenses ──
  customLenses: loadCustomLenses(),

  addCustomLens: (lens) => {
    const id = `custom-lens-${Date.now()}`;
    const full: Lens = { ...lens, id, isCustom: true };
    set((s) => {
      const updated = [...s.customLenses, full];
      saveCustomLensesStorage(updated);
      return { customLenses: updated, projectVersion: s.projectVersion + 1 };
    });
    return id;
  },

  removeCustomLens: (id) => {
    set((s) => {
      const updated = s.customLenses.filter((l) => l.id !== id);
      saveCustomLensesStorage(updated);
      return { customLenses: updated, projectVersion: s.projectVersion + 1 };
    });
  },

  // ── Custom Cameras ──
  customCameras: loadCustomCameras(),

  addCustomCamera: (camera) => {
    const id = `custom-cam-${Date.now()}`;
    const full: Camera = { ...camera, id };
    set((s) => {
      const updated = [...s.customCameras, full];
      saveCustomCamerasStorage(updated);
      return { customCameras: updated, projectVersion: s.projectVersion + 1 };
    });
    return id;
  },

  updateCustomCamera: (id, updates) => {
    set((s) => {
      const exists = s.customCameras.some((c) => c.id === id);
      if (exists) {
        const updated = s.customCameras.map((c) => (c.id === id ? { ...c, ...updates } : c));
        saveCustomCamerasStorage(updated);
        return { customCameras: updated, projectVersion: s.projectVersion + 1 };
      }
      // Editing a built-in camera for the first time — create a custom shadow
      // with the same id so getCameraById (which prefers customCameras) returns
      // the modified version from now on. Removing the shadow restores the
      // original built-in.
      const builtin = CAMERAS.find((c) => c.id === id);
      if (!builtin) return s;
      const shadow: Camera = { ...builtin, ...updates };
      const updated = [...s.customCameras, shadow];
      saveCustomCamerasStorage(updated);
      return { customCameras: updated, projectVersion: s.projectVersion + 1 };
    });
  },

  removeCustomCamera: (id) => {
    set((s) => {
      const updated = s.customCameras.filter((c) => c.id !== id);
      saveCustomCamerasStorage(updated);
      return { customCameras: updated, projectVersion: s.projectVersion + 1 };
    });
  },

  // ── Cameras ──
  cameras: [],
  favoriteCameraIds: loadFavoriteIds(FAVORITE_CAMERAS_KEY),
  favoriteLensIds: loadFavoriteIds(FAVORITE_LENSES_KEY),
  selectedCameraId: null,
  selectCamera: (id) => set({ selectedCameraId: id }),

  selectNextCamera: () => {
    const { cameras, selectedCameraId } = get();
    if (cameras.length === 0) return;
    const idx = cameras.findIndex((c) => c.id === selectedCameraId);
    const next = cameras[(idx + 1) % cameras.length];
    set({ selectedCameraId: next.id });
  },

  selectPrevCamera: () => {
    const { cameras, selectedCameraId } = get();
    if (cameras.length === 0) return;
    const idx = cameras.findIndex((c) => c.id === selectedCameraId);
    // When no camera is selected (idx === -1), wrap around to the last camera so
    // "previous" feels like stepping backwards from the start of the list.
    const prevIdx = idx < 0 ? cameras.length - 1 : (idx - 1 + cameras.length) % cameras.length;
    set({ selectedCameraId: cameras[prevIdx].id });
  },

  toggleFavoriteCameraId: (id) => {
    set((s) => {
      const favoriteCameraIds = s.favoriteCameraIds.includes(id)
        ? s.favoriteCameraIds.filter((favoriteId) => favoriteId !== id)
        : [...s.favoriteCameraIds, id];
      saveFavoriteIds(FAVORITE_CAMERAS_KEY, favoriteCameraIds);
      return { favoriteCameraIds };
    });
  },

  toggleFavoriteLensId: (id) => {
    set((s) => {
      const favoriteLensIds = s.favoriteLensIds.includes(id)
        ? s.favoriteLensIds.filter((favoriteId) => favoriteId !== id)
        : [...s.favoriteLensIds, id];
      saveFavoriteIds(FAVORITE_LENSES_KEY, favoriteLensIds);
      return { favoriteLensIds };
    });
  },

  addCamera: (cameraId, lensId) => {
    set((s) => {
      const cam = cameraId ? CAMERAS.find((c) => c.id === cameraId) : CAMERAS[0];
      const camDef = cam ?? CAMERAS[0];
      const allLenses = [...LENSES, ...s.customLenses];
      // If a specific lens was requested, honour it. Otherwise pick a default
      // mount + lens combination that's actually usable (e.g. PMW-F5 has zero
      // FZ-native lenses, so we default to PL instead of dropping the user
      // into an empty dropdown).
      let activeMount = camDef.mount;
      let lensDef = lensId ? allLenses.find((l) => l.id === lensId) : undefined;
      if (!lensDef) {
        const pick = pickInitialMountAndLens(camDef.mount, camDef.adaptedMounts, s.customLenses);
        activeMount = pick.mount;
        lensDef = pick.lens ?? allLenses[0];
      }
      const idx = s.cameras.length;
      const newCam: VenueCamera = {
        id: uid(),
        label: `CAM ${idx + 1}`,
        cameraId: camDef.id,
        lensId: lensDef.id,
        x: s.venue.widthM / 2,
        y: s.venue.heightM * 0.75,
        z: 1.5,
        pan: -90,
        tilt: 0,
        focalLength: lensDef.focalLengthMin,
        aperture: lensDef.maxApertureWide,
        focusDistance: s.venue.heightM * 0.5,
        color: CAMERA_COLORS[idx % CAMERA_COLORS.length],
        extenderActive: 1,
        useSpeedbooster: false,
        sensorModeIndex: camDef.sensorModes && camDef.sensorModes.length > 0 ? 0 : undefined,
        activeMount,
        mountType: 'tripod',
      };
      return { cameras: [...s.cameras, newCam], selectedCameraId: newCam.id, projectVersion: s.projectVersion + 1 };
    });
  },

  removeCamera: (id) =>
    set((s) => ({
      cameras: s.cameras.filter((c) => c.id !== id),
      selectedCameraId: s.selectedCameraId === id ? null : s.selectedCameraId,
      projectVersion: s.projectVersion + 1,
    })),

  updateCamera: (id, updates) =>
    set((s) => ({
      cameras: s.cameras.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      projectVersion: s.projectVersion + 1,
    })),

  moveCamera: (id, x, y) =>
    set((s) => ({
      cameras: s.cameras.map((c) => (c.id === id ? { ...c, x, y } : c)),
      projectVersion: s.projectVersion + 1,
    })),

  duplicateCamera: (id) => {
    set((s) => {
      const src = s.cameras.find((c) => c.id === id);
      if (!src) return s;
      const idx = s.cameras.length;
      const dup: VenueCamera = {
        ...src,
        id: uid(),
        label: `CAM ${idx + 1}`,
        x: src.x + 1,
        y: src.y + 1,
        color: CAMERA_COLORS[idx % CAMERA_COLORS.length],
      };
      return { cameras: [...s.cameras, dup], selectedCameraId: dup.id, projectVersion: s.projectVersion + 1 };
    });
  },

  // ── Walls ──
  walls: [],
  addWall: (wall) => {
    set((s) => {
      const w: Wall = {
        id: uid('wall'),
        x1: wall?.x1 ?? 0,
        y1: wall?.y1 ?? s.venue.heightM / 2,
        x2: wall?.x2 ?? s.venue.widthM,
        y2: wall?.y2 ?? s.venue.heightM / 2,
        height: wall?.height ?? 3,
        label: wall?.label ?? `Wall ${s.walls.length + 1}`,
      };
      return { walls: [...s.walls, w], projectVersion: s.projectVersion + 1 };
    });
  },
  removeWall: (id) => set((s) => ({ walls: s.walls.filter((w) => w.id !== id), projectVersion: s.projectVersion + 1 })),
  updateWall: (id, updates) => set((s) => ({ walls: s.walls.map((w) => (w.id === id ? { ...w, ...updates } : w)), projectVersion: s.projectVersion + 1 })),
  wallSnap: true,
  setWallSnap: (v) => set({ wallSnap: v }),

  activeTab: '2d',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // ── Shotlist / Storyboard (#62 Punkt 5) ──
  shotlists: INITIAL_SHOTLISTS,
  activeShotlistId: INITIAL_SHOTLISTS[0]?.id ?? null,
  currentShotId: null,
  shotlistStorageFull: false,

  addShotlist: (name) => {
    const id = persistentId('shotlist');
    const list: Shotlist = { id, name: name?.trim() || 'Shotlist', shots: [] };
    set((s) => {
      const shotlists = [...s.shotlists, list];
      return { shotlists, activeShotlistId: id, shotlistStorageFull: !saveJSONSafe(SHOTLISTS_KEY, shotlists) };
    });
    return id;
  },

  removeShotlist: (id) =>
    set((s) => {
      const shotlists = s.shotlists.filter((l) => l.id !== id);
      return {
        shotlists,
        activeShotlistId: s.activeShotlistId === id ? (shotlists[0]?.id ?? null) : s.activeShotlistId,
        currentShotId: s.activeShotlistId === id ? null : s.currentShotId,
        shotlistStorageFull: !saveJSONSafe(SHOTLISTS_KEY, shotlists),
      };
    }),

  renameShotlist: (id, name) =>
    set((s) => {
      const shotlists = s.shotlists.map((l) => (l.id === id ? { ...l, name } : l));
      return { shotlists, shotlistStorageFull: !saveJSONSafe(SHOTLISTS_KEY, shotlists) };
    }),

  setActiveShotlist: (id) => set({ activeShotlistId: id, currentShotId: null }),

  addShot: (shotlistId, shot) => {
    const id = persistentId('shot');
    set((s) => {
      const shotlists = s.shotlists.map((l) =>
        l.id === shotlistId ? { ...l, shots: [...l.shots, { ...shot, id }] } : l,
      );
      return { shotlists, currentShotId: id, shotlistStorageFull: !saveJSONSafe(SHOTLISTS_KEY, shotlists) };
    });
    return id;
  },

  updateShot: (shotlistId, shotId, updates) =>
    set((s) => {
      const shotlists = s.shotlists.map((l) =>
        l.id === shotlistId
          ? { ...l, shots: l.shots.map((sh) => (sh.id === shotId ? { ...sh, ...updates } : sh)) }
          : l,
      );
      return { shotlists, shotlistStorageFull: !saveJSONSafe(SHOTLISTS_KEY, shotlists) };
    }),

  removeShot: (shotlistId, shotId) =>
    set((s) => {
      const shotlists = s.shotlists.map((l) =>
        l.id === shotlistId ? { ...l, shots: l.shots.filter((sh) => sh.id !== shotId) } : l,
      );
      return {
        shotlists,
        currentShotId: s.currentShotId === shotId ? null : s.currentShotId,
        shotlistStorageFull: !saveJSONSafe(SHOTLISTS_KEY, shotlists),
      };
    }),

  moveShot: (shotlistId, from, to) =>
    set((s) => {
      const shotlists = s.shotlists.map((l) => {
        if (l.id !== shotlistId) return l;
        // Out-of-range-Indizes ignorieren statt undefined einzuschleusen —
        // ein Drop ausserhalb der Liste darf die Sequenz nicht zerstoeren.
        if (from < 0 || from >= l.shots.length || to < 0 || to >= l.shots.length || from === to) return l;
        const shots = [...l.shots];
        const [moved] = shots.splice(from, 1);
        shots.splice(to, 0, moved);
        return { ...l, shots };
      });
      return { shotlists, shotlistStorageFull: !saveJSONSafe(SHOTLISTS_KEY, shotlists) };
    }),

  rigTakes: INITIAL_RIG_TAKES,
  takeStorageFull: false,

  addRigTake: (take) => {
    const id = persistentId('take');
    set((s) => {
      const rigTakes = [...s.rigTakes, { ...take, id }];
      return { rigTakes, takeStorageFull: !saveJSONSafe(RIG_TAKES_KEY, rigTakes) };
    });
    return id;
  },

  removeRigTake: (id) =>
    set((s) => {
      const rigTakes = s.rigTakes.filter((t) => t.id !== id);
      return { rigTakes, takeStorageFull: !saveJSONSafe(RIG_TAKES_KEY, rigTakes) };
    }),

  renameRigTake: (id, name) =>
    set((s) => {
      const rigTakes = s.rigTakes.map((t) => (t.id === id ? { ...t, name } : t));
      return { rigTakes, takeStorageFull: !saveJSONSafe(RIG_TAKES_KEY, rigTakes) };
    }),

  setCurrentShotId: (id) => set({ currentShotId: id }),
  editMode: 'all',
  setEditMode: (mode) => set({ editMode: mode }),
  showAllFov: true,
  toggleShowAllFov: () => set((s) => ({ showAllFov: !s.showAllFov })),
  showForeign: true,
  toggleShowForeign: () => set((s) => ({ showForeign: !s.showForeign })),

  sidebarCollapsed: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  pixelsPerMeter: 30,
  setPixelsPerMeter: (ppm) => set({ pixelsPerMeter: ppm }),

  customTemplates: loadCustomTemplates(),
  hiddenTemplateIds: loadHiddenTemplateIds(),

  loadTemplate: (templateId) => {
    // Custom shadow takes precedence over the built-in original so an "edited"
    // built-in loads the edited venue/cameras.
    const { customTemplates } = get();
    const tmpl = customTemplates.find((t) => t.id === templateId)
      ?? TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;
    nextId = 1;
    stageId = 1;
    personId = 1;
    const cams: VenueCamera[] = tmpl.cameras.map((c) => ({ ...c, id: uid(), useSpeedbooster: c.useSpeedbooster ?? false }));
    set((s) => ({
      venue: { ...tmpl.venue },
      cameras: cams,
      selectedCameraId: cams[0]?.id ?? null,
      persons: [],
      walls: [],
      backgroundPlan: null,
      projectVersion: s.projectVersion + 1,
    }));
  },

  saveAsTemplate: (name, category) => {
    const { venue, cameras, customTemplates } = get();
    const tmpl: VenueTemplate = {
      id: `custom-${Date.now()}`,
      name,
      category,
      venue: { ...venue },
      cameras: cameras.map(({ id, ...rest }) => rest),
    };
    const updated = [...customTemplates, tmpl];
    saveCustomTemplates(updated);
    set({ customTemplates: updated });
  },

  // ── Templates: built-in vs custom ──
  // Built-in templates live in src/data/templates.ts (read-only at runtime).
  // To let the user delete/rename/overwrite them as if they were editable, we
  // shadow them: a customTemplates entry with the same id replaces the built-in
  // in the dedup'd list, and a hiddenTemplateIds entry hides a built-in entirely
  // (used when the user deletes one that was never shadowed).
  updateTemplate: (id, updates) => {
    const { customTemplates } = get();
    if (customTemplates.some((t) => t.id === id)) {
      const updated = customTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t));
      saveCustomTemplates(updated);
      set({ customTemplates: updated });
      return;
    }
    // Editing a built-in for the first time — create a custom shadow with the
    // same id so future lookups (loadTemplate, overwriteTemplate, deleteTemplate)
    // find it in customTemplates.
    const original = TEMPLATES.find((t) => t.id === id);
    if (!original) return;
    const shadow: VenueTemplate = { ...original, ...updates };
    const updated = [...customTemplates, shadow];
    saveCustomTemplates(updated);
    set({ customTemplates: updated });
  },

  overwriteTemplate: (id) => {
    const { venue, cameras, customTemplates } = get();
    const camerasStripped = cameras.map(({ id: _id, ...rest }) => rest);
    if (customTemplates.some((t) => t.id === id)) {
      const updated = customTemplates.map((t) =>
        t.id === id ? { ...t, venue: { ...venue }, cameras: camerasStripped } : t,
      );
      saveCustomTemplates(updated);
      set({ customTemplates: updated });
      return;
    }
    // Overwriting a built-in for the first time — create a custom shadow.
    const original = TEMPLATES.find((t) => t.id === id);
    if (!original) return;
    const shadow: VenueTemplate = {
      ...original,
      venue: { ...venue },
      cameras: camerasStripped,
    };
    const updated = [...customTemplates, shadow];
    saveCustomTemplates(updated);
    set({ customTemplates: updated });
  },

  deleteTemplate: (id) => {
    const { customTemplates, hiddenTemplateIds } = get();
    const wasCustom = customTemplates.some((t) => t.id === id);
    const updated = customTemplates.filter((t) => t.id !== id);
    if (wasCustom) saveCustomTemplates(updated);

    const isStillBuiltIn = TEMPLATES.some((t) => t.id === id);
    // If the underlying id is also a built-in, hide it so it doesn't pop back
    // into the list when the custom shadow is removed.
    if (isStillBuiltIn && !hiddenTemplateIds.includes(id)) {
      const nextHidden = [...hiddenTemplateIds, id];
      saveHiddenTemplateIds(nextHidden);
      set({ customTemplates: updated, hiddenTemplateIds: nextHidden });
    } else {
      set({ customTemplates: updated });
    }
  },

  restoreBuiltInTemplates: () => {
    saveHiddenTemplateIds([]);
    set({ hiddenTemplateIds: [] });
  },

  clearAll: () => {
    nextId = 1;
    stageId = 1;
    personId = 1;
    set({ venue: defaultVenue, cameras: [], selectedCameraId: null, persons: [], walls: [], backgroundPlan: null, projectVersion: 1, lastSavedVersion: 0 });
  },

  // ── Project versioning ──
  projectVersion: 1,
  lastSavedVersion: 0,
  hasUnsavedChanges: () => {
    const s = get();
    return s.projectVersion !== s.lastSavedVersion;
  },
  bumpVersion: () => set((s) => ({ projectVersion: s.projectVersion + 1 })),

  saveProject: () => {
    const project = buildProjectFile(get());
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.venue.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_v${project.projectVersion}.mcplan`;
    a.click();
    URL.revokeObjectURL(url);
    set({ lastSavedVersion: project.projectVersion });
  },

  loadProject: async (file: File) => {
    const text = await file.text();
    const project: ProjectFile = JSON.parse(text);
    get().applyProjectFile(project);
  },

  applyProjectFile: (project: ProjectFile) => {
    if (project.formatVersion !== 1) {
      alert('Unsupported project file format.');
      return;
    }
    // Ids der Datei BEHALTEN (#72). Frueher wurden Kamera-Ids neu vergeben und
    // die Zaehler auf 1 gesetzt, waehrend Personen/Buehnen/Waende ihre alten Ids
    // behielten — der naechste "Hinzufuegen"-Klick vergab dann eine Id, die es
    // schon gab, und beide Objekte hingen am selben Datensatz. Ausserdem
    // verlieren neu vergebene Kamera-Ids die Zuordnung von Shots, Takes und
    // Presets. Stattdessen: Dubletten innerhalb der Datei reparieren und die
    // Zaehler hinter die hoechste vergebene Nummer setzen.
    const loadedPersons = project.persons.map((p) => ({
      ...p,
      objectType: p.objectType ?? 'person',
      width: p.width ?? 0.5,
    }));
    const loadedWalls = project.walls ?? [];
    const loadedStages = project.venue?.stages ?? [];

    // Zaehler zuerst hochsetzen, damit die Reparatur unten garantiert freie
    // Nummern zieht. `nextId` bedient Kameras UND Waende.
    nextId = maxIdSuffix([
      ...project.cameras.map((c) => c.id),
      ...loadedWalls.map((w) => w.id),
    ]) + 1;
    personId = maxIdSuffix(loadedPersons.map((p) => p.id)) + 1;
    stageId = maxIdSuffix(loadedStages.map((st) => st.id)) + 1;

    const camerasFixed = dedupeIds(
      project.cameras.map((c) => ({
        ...c,
        useSpeedbooster: c.useSpeedbooster ?? false,
        mountType: c.mountType ?? 'tripod',
      })),
      () => uid(),
    );
    const personsFixed = dedupeIds(loadedPersons, personUid);
    const wallsFixed = dedupeIds(loadedWalls, () => uid('wall'));
    const stagesFixed = dedupeIds(loadedStages, stageUid);
    const cameras = camerasFixed.items;

    let bgPlan = project.backgroundPlan;
    if (bgPlan && 'scale' in bgPlan && !('scaleX' in bgPlan)) {
      const legacy = bgPlan as BackgroundPlan & { scale?: number };
      const s = legacy.scale ?? 1;
      const { scale: _, ...rest } = legacy;
      bgPlan = { ...rest, scaleX: s, scaleY: s };
    }
    set({
      venue: { ...project.venue, stages: stagesFixed.items },
      cameras,
      persons: personsFixed.items,
      backgroundPlan: bgPlan,
      selectedCameraId: cameras[0]?.id ?? null,
      walls: wallsFixed.items,
      projectVersion: project.projectVersion,
      lastSavedVersion: project.projectVersion,
      // ADR-005 — was die Datei an fremden Domaenen mitbringt, kommt zurueck in
      // den Store, damit der naechste .avplan-Export es wieder mitgibt. Eine
      // Datei ohne sie setzt zurueck: sonst leckten die Domaenen des zuletzt
      // geoeffneten Projekts in das naechste.
      avForeign: project.avForeign ?? {},
      // Wie avForeign: eine Datei ohne das Feld setzt zurueck, sonst leckten
      // die Buehnen-Hoehen des zuletzt geoeffneten Projekts ins naechste.
      stageForeign: project.stageForeign ?? {},
      floorPlanForeign: project.floorPlanForeign ?? {},
      wallForeign: project.wallForeign ?? {},
      personForeign: project.personForeign ?? {},
      // ADR-005, Regel 3 — die Reparatur wird gesagt.
      //
      // `dedupeIds` vergibt fuer jede doppelte Id eine frische. Das ist richtig
      // (siehe idRepair), aber nicht folgenlos: der Modulkopf dort haelt fest,
      // dass Shots, Takes und Presets an `VenueCamera.id` haengen und der
      // Fokus-Lock an `ReferencePerson.id`. Bekommt die ZWEITE Kamera einer
      // doppelten Id eine neue, zeigen deren Shots ab jetzt auf die erste.
      //
      // `DedupeResult.repaired` zaehlt genau das — und wurde bisher von keiner
      // Zeile ausserhalb der Tests gelesen. Der Zaehler war da, die Meldung
      // fehlte. Als Kanal, nicht als Dialog: ein Store kennt kein `alert`
      // (das gibt es im Test- und Server-Kontext nicht) und keine Sprache.
      lastIdRepair:
        camerasFixed.repaired + personsFixed.repaired +
          wallsFixed.repaired + stagesFixed.repaired || null,
    });

  },

  importVenueExchange: (ex) => {
    // ADR-005, Regel 2 — die Projektion ist fuer Existenz und Geometrie
    // kanonisch, traegt aber MultiCams Wand-Muster nicht. Ohne die
    // Zusammenfuehrung loeschte jeder Venue-Import sie.
    const r = mergeOwnVenueDims(
      mergeOwnPersonFields(
        mergeOwnWallFields(fromVenueExchange(ex), { walls: get().walls }),
        { persons: get().persons },
      ),
      { widthM: get().venue.widthM, heightM: get().venue.heightM },
    );
    // Wie beim Laden eines Plans (#72): der Austausch bringt fremde Ids mit,
    // die Zaehler muessen dahinter stehen, sonst kollidiert das naechste neue
    // Objekt mit einem importierten.
    nextId = Math.max(nextId, maxIdSuffix(r.walls.map((w) => w.id)) + 1);
    personId = Math.max(personId, maxIdSuffix(r.persons.map((p) => p.id)) + 1);
    stageId = Math.max(stageId, maxIdSuffix((r.venue.stages ?? []).map((st) => st.id)) + 1);
    set((s) => ({
      venue: r.venue,
      persons: r.persons,
      walls: r.walls,
      backgroundPlan: r.backgroundPlan,
      stageForeign: r.stageForeign,
      floorPlanForeign: r.floorPlanForeign,
      wallForeign: r.wallForeign,
      personForeign: r.personForeign,
      projectVersion: s.projectVersion + 1,
    }));
  },

  avForeign: {},
  stageForeign: {},
  floorPlanForeign: {},
  wallForeign: {},
  personForeign: {},
  lastIdRepair: null,
  dismissIdRepair: () => set({ lastIdRepair: null }),
  importAvPlan: (avplan) => {
    const cameras = avplan.domains.cameras as ProjectFile | undefined;
    if (cameras) get().applyProjectFile(cameras);
    // Geteilten Raum kanonisch aus der .avplan ueberlagern.
    get().importVenueExchange({
      kind: 'venue-exchange', formatVersion: 1, app: avplan.app,
      appVersion: avplan.appVersion, exportedAt: avplan.exportedAt, venue: avplan.venue,
    });
    set({ avForeign: { lighting: avplan.domains.lighting, cabling: avplan.domains.cabling } });
  },
}));
