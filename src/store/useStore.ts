import { create } from 'zustand';
import type { VenueCamera, Venue, ViewTab, EditMode, ReferencePerson, BackgroundPlan, Stage, ProjectFile, VenueTemplate, StageObjectType, Lens, Wall, Camera } from '../types';
import { CAMERAS, CAMERA_COLORS } from '../data/cameras';
import { LENSES, pickInitialMountAndLens } from '../data/lenses';
import { TEMPLATES } from '../data/templates';
import { loadJSON, saveJSON } from '../utils/storage';
import { fromVenueExchange, type VenueExchange } from '../utils/venueExchange';
import type { AvPlan } from '../utils/avplan';

// Injected by Vite from package.json. In a release build that came through
// the GitHub Actions workflow this matches the git release tag exactly,
// because the workflow runs `npm version <tag>` before invoking the build.
export const APP_VERSION = __APP_VERSION__;

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
    const s = get();
    const project: ProjectFile = {
      formatVersion: 1,
      appVersion: APP_VERSION,
      projectVersion: s.projectVersion,
      savedAt: new Date().toISOString(),
      venue: s.venue,
      cameras: s.cameras,
      persons: s.persons,
      walls: s.walls ?? [],
      backgroundPlan: s.backgroundPlan,
    };
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.venue.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_v${s.projectVersion}.mcplan`;
    a.click();
    URL.revokeObjectURL(url);
    set({ lastSavedVersion: s.projectVersion });
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
    nextId = 1;
    stageId = 1;
    personId = 1;
    // Re-assign IDs to avoid conflicts. mountType is preserved (re-added in
     // this version) and defaults to 'tripod' for older project files that
    // never had it.
    const cameras = project.cameras.map((c) => ({
      ...c,
      id: uid(),
      useSpeedbooster: c.useSpeedbooster ?? false,
      mountType: c.mountType ?? 'tripod',
    }));
    let bgPlan = project.backgroundPlan;
    if (bgPlan && 'scale' in bgPlan && !('scaleX' in bgPlan)) {
      const legacy = bgPlan as BackgroundPlan & { scale?: number };
      const s = legacy.scale ?? 1;
      const { scale: _, ...rest } = legacy;
      bgPlan = { ...rest, scaleX: s, scaleY: s };
    }
    set({
      venue: project.venue,
      cameras,
      persons: project.persons.map((p) => ({
        ...p,
        objectType: p.objectType ?? 'person',
        width: p.width ?? 0.5,
      })),
      backgroundPlan: bgPlan,
      selectedCameraId: cameras[0]?.id ?? null,
      walls: project.walls ?? [],
      projectVersion: project.projectVersion,
      lastSavedVersion: project.projectVersion,
    });
  },

  importVenueExchange: (ex) => {
    const r = fromVenueExchange(ex);
    set((s) => ({
      venue: r.venue,
      persons: r.persons,
      walls: r.walls,
      backgroundPlan: r.backgroundPlan,
      projectVersion: s.projectVersion + 1,
    }));
  },

  avForeign: {},
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
