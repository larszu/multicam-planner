import { create } from 'zustand';
import type { VenueCamera, Venue, ViewTab, ReferencePerson, BackgroundPlan, Stage, ProjectFile, VenueTemplate } from '../types';
import { CAMERAS, CAMERA_COLORS } from '../data/cameras';
import { LENSES } from '../data/lenses';
import { TEMPLATES } from '../data/templates';

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

  // Reference persons
  persons: ReferencePerson[];
  addPerson: (x?: number, y?: number) => void;
  removePerson: (id: string) => void;
  updatePerson: (id: string, updates: Partial<ReferencePerson>) => void;

  // Cameras placed in venue
  cameras: VenueCamera[];
  selectedCameraId: string | null;
  selectCamera: (id: string | null) => void;
  addCamera: (cameraId?: string, lensId?: string) => void;
  removeCamera: (id: string) => void;
  updateCamera: (id: string, updates: Partial<VenueCamera>) => void;
  moveCamera: (id: string, x: number, y: number) => void;
  duplicateCamera: (id: string) => void;

  // View
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  showAllFov: boolean;
  toggleShowAllFov: () => void;

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

let stageId = 1;
function stageUid(): string {
  return `stage-${stageId++}`;
}

let personId = 1;
function personUid(): string {
  return `person-${personId++}`;
}

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
    const newPerson: ReferencePerson = {
      id: personUid(),
      x: x ?? venue.widthM / 2,
      y: y ?? venue.heightM / 2,
      height: 1.8,
      label: `Person ${persons.length + 1}`,
    };
    set((s) => ({ persons: [...s.persons, newPerson], projectVersion: s.projectVersion + 1 }));
  },

  removePerson: (id) => set((s) => ({ persons: s.persons.filter((p) => p.id !== id), projectVersion: s.projectVersion + 1 })),

  updatePerson: (id, updates) =>
    set((s) => ({
      persons: s.persons.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      projectVersion: s.projectVersion + 1,
    })),

  // ── Cameras ──
  cameras: [],
  selectedCameraId: null,
  selectCamera: (id) => set({ selectedCameraId: id }),

  addCamera: (cameraId, lensId) => {
    const cam = cameraId ? CAMERAS.find((c) => c.id === cameraId) : CAMERAS[0];
    const camDef = cam ?? CAMERAS[0];
    const lens = lensId
      ? LENSES.find((l) => l.id === lensId)
      : LENSES.find((l) => l.mount === camDef.mount) ?? LENSES[0];
    const lensDef = lens ?? LENSES[0];
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

  activeTab: '2d',
  setActiveTab: (tab) => set({ activeTab: tab }),
  showAllFov: true,
  toggleShowAllFov: () => set((s) => ({ showAllFov: !s.showAllFov })),

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
    set({ venue: defaultVenue, cameras: [], selectedCameraId: null, persons: [], backgroundPlan: null, projectVersion: 1, lastSavedVersion: 0 });
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
    if (project.formatVersion !== 1) {
      alert('Unsupported project file format.');
      return;
    }
    nextId = 1;
    stageId = 1;
    personId = 1;
    // Re-assign IDs to avoid conflicts
    const cameras = project.cameras.map((c) => ({ ...c, id: uid(), useSpeedbooster: c.useSpeedbooster ?? false }));
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
      persons: project.persons,
      backgroundPlan: bgPlan,
      selectedCameraId: cameras[0]?.id ?? null,
      projectVersion: project.projectVersion,
      lastSavedVersion: project.projectVersion,
    });
  },
}));
