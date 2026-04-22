import { create } from 'zustand';
import type { VenueCamera, Venue, ViewTab, ReferencePerson, BackgroundPlan, Stage, ProjectFile, VenueTemplate, StageObjectType, Lens, Wall } from '../types';
import type { PlacedFixture, FixtureGroup, Fixture, AppMode } from '../types/lighting';
import { CAMERAS, CAMERA_COLORS } from '../data/cameras';
import { LENSES } from '../data/lenses';
import { TEMPLATES } from '../data/templates';
import { getFixtureById } from '../data/fixtures';

export const APP_VERSION = '0.2.0';

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
  updatePerson: (id: string, updates: Partial<ReferencePerson>) => void;

  // Custom lenses
  customLenses: Lens[];
  addCustomLens: (lens: Omit<Lens, 'id' | 'isCustom'>) => string;
  removeCustomLens: (id: string) => void;

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

  // ── Lighting module ──
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  placedFixtures: PlacedFixture[];
  customFixtures: Fixture[];
  fixtureGroups: FixtureGroup[];
  selectedFixtureId: string | null;
  fixtureToPlace: Fixture | null;
  heatMapEnabled: boolean;
  heatMapTargetLux: number;
  heatMapScale: number;
  selectFixture: (id: string | null) => void;
  setFixtureToPlace: (f: Fixture | null) => void;
  addPlacedFixture: (fixtureId: string, x: number, y: number) => string;
  removePlacedFixture: (id: string) => void;
  updatePlacedFixture: (id: string, updates: Partial<PlacedFixture>) => void;
  movePlacedFixture: (id: string, x: number, y: number) => void;
  movePlacedFixtureAim: (id: string, aimX: number, aimY: number) => void;
  duplicatePlacedFixture: (id: string) => void;
  addCustomFixture: (f: Omit<Fixture, 'id' | 'isCustom'>) => string;
  removeCustomFixture: (id: string) => void;
  toggleHeatMap: () => void;
  setHeatMapTargetLux: (lux: number) => void;
  setHeatMapScale: (scale: number) => void;

  // View
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  showAllFov: boolean;
  toggleShowAllFov: () => void;
  drag3DLocked: boolean;
  toggleDrag3DLocked: () => void;

  // Layout UI
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;

  // Scale & grid
  pixelsPerMeter: number;
  setPixelsPerMeter: (ppm: number) => void;

  // Templates
  customTemplates: VenueTemplate[];
  loadTemplate: (templateId: string) => void;
  saveAsTemplate: (name: string, category: VenueTemplate['category']) => void;
  updateTemplate: (id: string, updates: Partial<Pick<VenueTemplate, 'name' | 'category'>>) => void;
  overwriteTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;
  clearAll: () => void;

  // Project versioning
  projectVersion: number;
  lastSavedVersion: number;
  hasUnsavedChanges: () => boolean;
  bumpVersion: () => void;
  saveProject: () => void;
  loadProject: (file: File) => Promise<void>;
}

let nextId = 1;
function uid(prefix = 'cam'): string {
  return `${prefix}-${nextId++}`;
}

const CUSTOM_TEMPLATES_KEY = 'multicam-custom-templates';
function loadCustomTemplates(): VenueTemplate[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveCustomTemplates(templates: VenueTemplate[]) {
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
}

const CUSTOM_LENSES_KEY = 'multicam-custom-lenses';
function loadCustomLenses(): Lens[] {
  try {
    const raw = localStorage.getItem(CUSTOM_LENSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveCustomLensesStorage(lenses: Lens[]) {
  localStorage.setItem(CUSTOM_LENSES_KEY, JSON.stringify(lenses));
}

const FAVORITE_CAMERAS_KEY = 'multicam-favorite-cameras';
const FAVORITE_LENSES_KEY = 'multicam-favorite-lenses';

function loadFavoriteIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function saveFavoriteIds(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids));
}

let stageId = 1;
function stageUid(): string {
  return `stage-${stageId++}`;
}

let personId = 1;
function personUid(): string {
  return `person-${personId++}`;
}

let fixtureNextId = 1;
function fixtureUid(): string {
  return `fixture-${Date.now().toString(36)}-${fixtureNextId++}`;
}

const CUSTOM_FIXTURES_KEY = 'multicam-custom-fixtures';
function loadCustomFixtures(): Fixture[] {
  try {
    const raw = localStorage.getItem(CUSTOM_FIXTURES_KEY);
    return raw ? (JSON.parse(raw) as Fixture[]) : [];
  } catch { return []; }
}
function saveCustomFixtures(fixtures: Fixture[]) {
  try { localStorage.setItem(CUSTOM_FIXTURES_KEY, JSON.stringify(fixtures)); } catch { /* ignore */ }
}

// Object type presets: { height, width, defaultLabel, defaultColor }
export const OBJECT_PRESETS: Record<string, { height: number; width: number; label: string; color: string }> = {
  'person':          { height: 1.8, width: 0.5, label: 'Person',       color: '#22c55e' },
  'person-guitar':   { height: 1.8, width: 0.8, label: 'Guitarist',    color: '#f97316' },
  'sitting-person':  { height: 1.3, width: 0.6, label: 'Seated',       color: '#38bdf8' },
  'drums':           { height: 1.2, width: 1.5, label: 'Drums',        color: '#ef4444' },
  'keys':            { height: 1.0, width: 1.5, label: 'Keys',         color: '#8b5cf6' },
  'mic-stand':       { height: 1.6, width: 0.3, label: 'Mic Stand',    color: '#9ca3af' },
  'chair':           { height: 0.9, width: 0.5, label: 'Chair',        color: '#a16207' },
  'table':           { height: 0.75, width: 1.2, label: 'Table',       color: '#a16207' },
  'lectern':         { height: 1.2, width: 0.7, label: 'Lectern',      color: '#7c3aed' },
  'schneetiger':     { height: 1.1, width: 1.8, label: 'Schneetiger',  color: '#e0f2fe' },
  'custom':          { height: 1.0, width: 0.5, label: 'Object',       color: '#f59e0b' },
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
    const { venue } = get();
    const newStage: Stage = {
      id: stageUid(),
      x: partial?.x ?? venue.widthM / 2 - 3,
      y: partial?.y ?? 0.5,
      width: partial?.width ?? 6,
      height: partial?.height ?? 3,
      label: partial?.label ?? `Stage ${venue.stages.length + 1}`,
    };
    set((s) => ({ venue: { ...venue, stages: [...venue.stages, newStage] }, projectVersion: s.projectVersion + 1 }));
  },

  removeStage: (id) => {
    const { venue } = get();
    set((s) => ({ venue: { ...venue, stages: venue.stages.filter((st) => st.id !== id) }, projectVersion: s.projectVersion + 1 }));
  },

  updateStage: (id, updates) => {
    const { venue } = get();
    set((s) => ({
      venue: {
        ...venue,
        stages: venue.stages.map((st) => (st.id === id ? { ...st, ...updates } : st)),
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
    const { venue, persons } = get();
    const preset = OBJECT_PRESETS['person'];
    const newPerson: ReferencePerson = {
      id: personUid(),
      x: x ?? venue.widthM / 2,
      y: y ?? venue.heightM / 2,
      height: 1.8,
      width: 0.5,
      label: `Person ${persons.length + 1}`,
      objectType: 'person',
      color: preset.color,
    };
    set((s) => ({ persons: [...s.persons, newPerson], projectVersion: s.projectVersion + 1 }));
  },

  addStageObject: (objectType, x, y) => {
    const { venue, persons } = get();
    const preset = OBJECT_PRESETS[objectType] ?? OBJECT_PRESETS['custom'];
    const count = persons.filter((p) => p.objectType === objectType).length;
    const newObj: ReferencePerson = {
      id: personUid(),
      x: x ?? venue.widthM / 2,
      y: y ?? venue.heightM / 2,
      height: preset.height,
      width: preset.width,
      label: `${preset.label} ${count + 1}`,
      objectType,
      color: preset.color,
    };
    set((s) => ({ persons: [...s.persons, newObj], projectVersion: s.projectVersion + 1 }));
  },

  removePerson: (id) => set((s) => ({ persons: s.persons.filter((p) => p.id !== id), projectVersion: s.projectVersion + 1 })),

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
    const prev = cameras[(idx - 1 + cameras.length) % cameras.length];
    set({ selectedCameraId: prev.id });
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
    const cam = cameraId ? CAMERAS.find((c) => c.id === cameraId) : CAMERAS[0];
    const camDef = cam ?? CAMERAS[0];
    const allLenses = [...LENSES, ...get().customLenses];
    const lens = lensId
      ? allLenses.find((l) => l.id === lensId)
      : allLenses.find((l) => l.mount === camDef.mount) ?? allLenses[0];
    const lensDef = lens ?? allLenses[0];
    const { venue, cameras } = get();
    const idx = cameras.length;
    const newCam: VenueCamera = {
      id: uid(),
      label: `CAM ${idx + 1}`,
      cameraId: camDef.id,
      lensId: lensDef.id,
      x: venue.widthM / 2,
      y: venue.heightM * 0.75,
      z: 1.5,
      pan: -90,
      tilt: 0,
      focalLength: lensDef.focalLengthMin,
      aperture: lensDef.maxApertureWide,
      focusDistance: venue.heightM * 0.5,
      color: CAMERA_COLORS[idx % CAMERA_COLORS.length],
      extenderActive: 1,
      useSpeedbooster: false,
      mountType: 'tripod',
    };
    set((s) => ({ cameras: [...s.cameras, newCam], selectedCameraId: newCam.id, projectVersion: s.projectVersion + 1 }));
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
    const { cameras } = get();
    const src = cameras.find((c) => c.id === id);
    if (!src) return;
    const idx = cameras.length;
    const dup: VenueCamera = {
      ...src,
      id: uid(),
      label: `CAM ${idx + 1}`,
      x: src.x + 1,
      y: src.y + 1,
      color: CAMERA_COLORS[idx % CAMERA_COLORS.length],
    };
    set((s) => ({ cameras: [...s.cameras, dup], selectedCameraId: dup.id, projectVersion: s.projectVersion + 1 }));
  },

  // ── Walls ──
  walls: [],
  addWall: (wall) => {
    const { venue } = get();
    const w: Wall = {
      id: uid('wall'),
      x1: wall?.x1 ?? 0,
      y1: wall?.y1 ?? venue.heightM / 2,
      x2: wall?.x2 ?? venue.widthM,
      y2: wall?.y2 ?? venue.heightM / 2,
      height: wall?.height ?? 3,
      label: wall?.label ?? 'Wall',
    };
    set((s) => ({ walls: [...s.walls, w], projectVersion: s.projectVersion + 1 }));
  },
  removeWall: (id) => set((s) => ({ walls: s.walls.filter((w) => w.id !== id), projectVersion: s.projectVersion + 1 })),
  updateWall: (id, updates) => set((s) => ({ walls: s.walls.map((w) => (w.id === id ? { ...w, ...updates } : w)), projectVersion: s.projectVersion + 1 })),

  activeTab: '2d',
  setActiveTab: (tab) => set({ activeTab: tab }),
  showAllFov: true,
  toggleShowAllFov: () => set((s) => ({ showAllFov: !s.showAllFov })),
  drag3DLocked: false,
  toggleDrag3DLocked: () => set((s) => ({ drag3DLocked: !s.drag3DLocked })),

  sidebarCollapsed: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  pixelsPerMeter: 30,
  setPixelsPerMeter: (ppm) => set({ pixelsPerMeter: ppm }),

  customTemplates: loadCustomTemplates(),

  loadTemplate: (templateId) => {
    const all = [...TEMPLATES, ...get().customTemplates];
    const tmpl = all.find((t) => t.id === templateId);
    if (!tmpl) return;
    nextId = 1;
    const cams: VenueCamera[] = tmpl.cameras.map((c) => ({ ...c, id: uid(), useSpeedbooster: c.useSpeedbooster ?? false }));
    set({
      venue: { ...tmpl.venue },
      cameras: cams,
      selectedCameraId: cams[0]?.id ?? null,
      persons: [],
      backgroundPlan: null,
    });
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

  updateTemplate: (id, updates) => {
    const { customTemplates } = get();
    const updated = customTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t));
    saveCustomTemplates(updated);
    set({ customTemplates: updated });
  },

  overwriteTemplate: (id) => {
    const { venue, cameras, customTemplates } = get();
    const updated = customTemplates.map((t) =>
      t.id === id ? { ...t, venue: { ...venue }, cameras: cameras.map(({ id: _id, ...rest }) => rest) } : t,
    );
    saveCustomTemplates(updated);
    set({ customTemplates: updated });
  },

  deleteTemplate: (id) => {
    const { customTemplates } = get();
    const updated = customTemplates.filter((t) => t.id !== id);
    saveCustomTemplates(updated);
    set({ customTemplates: updated });
  },

  clearAll: () => {
    nextId = 1;
    stageId = 1;
    personId = 1;
    fixtureNextId = 1;
    set({
      venue: defaultVenue,
      cameras: [],
      selectedCameraId: null,
      persons: [],
      walls: [],
      backgroundPlan: null,
      placedFixtures: [],
      fixtureGroups: [],
      selectedFixtureId: null,
      fixtureToPlace: null,
      projectVersion: 1,
      lastSavedVersion: 0,
    });
  },

  // ── Lighting module ──
  appMode: 'camera',
  setAppMode: (mode) => set({ appMode: mode }),
  placedFixtures: [],
  customFixtures: loadCustomFixtures(),
  fixtureGroups: [],
  selectedFixtureId: null,
  fixtureToPlace: null,
  heatMapEnabled: false,
  heatMapTargetLux: 300,
  heatMapScale: 1000,
  selectFixture: (id) => set({ selectedFixtureId: id }),
  setFixtureToPlace: (f) => set({ fixtureToPlace: f }),
  addPlacedFixture: (fixtureId, x, y) => {
    const { customFixtures } = get();
    const def = getFixtureById(fixtureId, customFixtures);
    if (!def) return '';
    const id = fixtureUid();
    const pf: PlacedFixture = {
      id,
      fixtureId,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      z: 5,
      aimX: Math.round(x * 10) / 10,
      aimY: Math.round(y * 10) / 10,
      bodyRotation: 0,
      dimming: 100,
      currentColorTemp: def.colorTemp || undefined,
    };
    set((s) => ({
      placedFixtures: [...s.placedFixtures, pf],
      selectedFixtureId: id,
      projectVersion: s.projectVersion + 1,
    }));
    return id;
  },
  removePlacedFixture: (id) => set((s) => ({
    placedFixtures: s.placedFixtures.filter((f) => f.id !== id),
    fixtureGroups: s.fixtureGroups
      .map((g) => ({ ...g, fixtureIds: g.fixtureIds.filter((fid) => fid !== id) }))
      .filter((g) => g.fixtureIds.length > 0),
    selectedFixtureId: s.selectedFixtureId === id ? null : s.selectedFixtureId,
    projectVersion: s.projectVersion + 1,
  })),
  updatePlacedFixture: (id, updates) => set((s) => ({
    placedFixtures: s.placedFixtures.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    projectVersion: s.projectVersion + 1,
  })),
  movePlacedFixture: (id, x, y) => set((s) => ({
    placedFixtures: s.placedFixtures.map((f) => {
      if (f.id !== id) return f;
      const dx = x - f.x;
      const dy = y - f.y;
      return { ...f, x, y, aimX: f.aimX + dx, aimY: f.aimY + dy };
    }),
    projectVersion: s.projectVersion + 1,
  })),
  movePlacedFixtureAim: (id, aimX, aimY) => set((s) => ({
    placedFixtures: s.placedFixtures.map((f) => (f.id === id ? { ...f, aimX, aimY } : f)),
    projectVersion: s.projectVersion + 1,
  })),
  duplicatePlacedFixture: (id) => {
    const { placedFixtures } = get();
    const src = placedFixtures.find((f) => f.id === id);
    if (!src) return;
    const nid = fixtureUid();
    const copy: PlacedFixture = { ...src, id: nid, x: src.x + 0.5, y: src.y + 0.5, aimX: src.aimX + 0.5, aimY: src.aimY + 0.5 };
    set((s) => ({
      placedFixtures: [...s.placedFixtures, copy],
      selectedFixtureId: nid,
      projectVersion: s.projectVersion + 1,
    }));
  },
  addCustomFixture: (f) => {
    const id = `custom-fixture-${Date.now()}`;
    const fixture: Fixture = { ...f, id, isCustom: true };
    set((s) => {
      const next = [...s.customFixtures, fixture];
      saveCustomFixtures(next);
      return { customFixtures: next, projectVersion: s.projectVersion + 1 };
    });
    return id;
  },
  removeCustomFixture: (id) => set((s) => {
    const next = s.customFixtures.filter((f) => f.id !== id);
    saveCustomFixtures(next);
    return { customFixtures: next, projectVersion: s.projectVersion + 1 };
  }),
  toggleHeatMap: () => set((s) => ({ heatMapEnabled: !s.heatMapEnabled })),
  setHeatMapTargetLux: (lux) => set({ heatMapTargetLux: Math.max(0, lux) }),
  setHeatMapScale: (scale) => set({ heatMapScale: Math.max(100, scale) }),


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
      placedFixtures: s.placedFixtures,
      customFixtures: s.customFixtures,
      fixtureGroups: s.fixtureGroups,
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
    if (project.formatVersion !== 1) {
      alert('Unsupported project file format.');
      return;
    }
    nextId = 1;
    stageId = 1;
    personId = 1;
    // Re-assign IDs to avoid conflicts
    const cameras = project.cameras.map((c) => ({ ...c, id: uid(), useSpeedbooster: c.useSpeedbooster ?? false, mountType: (c as any).mountType ?? 'tripod' }));
    // Migrate old single-scale background plans to scaleX/scaleY
    let bgPlan = project.backgroundPlan;
    if (bgPlan && 'scale' in bgPlan && !('scaleX' in bgPlan)) {
      const s = (bgPlan as any).scale as number;
      const { ...rest } = bgPlan as any;
      delete rest.scale;
      bgPlan = { ...rest, scaleX: s, scaleY: s } as BackgroundPlan;
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
      placedFixtures: project.placedFixtures ?? [],
      customFixtures: project.customFixtures ?? get().customFixtures,
      fixtureGroups: project.fixtureGroups ?? [],
      selectedFixtureId: null,
      fixtureToPlace: null,
      projectVersion: project.projectVersion,
      lastSavedVersion: project.projectVersion,
    });
  },
}));
