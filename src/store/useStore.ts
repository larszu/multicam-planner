import { create } from 'zustand';
import type { VenueCamera, Venue, ViewTab } from '../types';
import { CAMERAS, CAMERA_COLORS } from '../data/cameras';
import { LENSES } from '../data/lenses';
import { TEMPLATES } from '../data/templates';

interface AppState {
  // Venue
  venue: Venue;
  setVenue: (v: Venue) => void;

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
  loadTemplate: (templateId: string) => void;
  clearAll: () => void;
}

let nextId = 1;
function uid(): string {
  return `cam-${nextId++}`;
}

const defaultVenue: Venue = {
  name: 'New Venue',
  widthM: 20,
  heightM: 15,
  stages: [{ x: 7, y: 0.5, width: 6, height: 3, label: 'Stage' }],
};

export const useStore = create<AppState>((set, get) => ({
  venue: defaultVenue,
  setVenue: (v) => set({ venue: v }),

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
      rotation: -90,
      focalLength: lensDef.focalLengthMin,
      aperture: lensDef.maxApertureWide,
      focusDistance: venue.heightM * 0.5,
      color: CAMERA_COLORS[idx % CAMERA_COLORS.length],
      extenderActive: 1,
    };
    set({ cameras: [...cameras, newCam], selectedCameraId: newCam.id });
  },

  removeCamera: (id) =>
    set((s) => ({
      cameras: s.cameras.filter((c) => c.id !== id),
      selectedCameraId: s.selectedCameraId === id ? null : s.selectedCameraId,
    })),

  updateCamera: (id, updates) =>
    set((s) => ({
      cameras: s.cameras.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  moveCamera: (id, x, y) =>
    set((s) => ({
      cameras: s.cameras.map((c) => (c.id === id ? { ...c, x, y } : c)),
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
    set({ cameras: [...cameras, dup], selectedCameraId: dup.id });
  },

  activeTab: '2d',
  setActiveTab: (tab) => set({ activeTab: tab }),
  showAllFov: true,
  toggleShowAllFov: () => set((s) => ({ showAllFov: !s.showAllFov })),

  pixelsPerMeter: 30,
  setPixelsPerMeter: (ppm) => set({ pixelsPerMeter: ppm }),

  loadTemplate: (templateId) => {
    const tmpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;
    nextId = 1;
    const cams: VenueCamera[] = tmpl.cameras.map((c) => ({ ...c, id: uid() }));
    set({
      venue: { ...tmpl.venue },
      cameras: cams,
      selectedCameraId: cams[0]?.id ?? null,
    });
  },

  clearAll: () => {
    nextId = 1;
    set({ venue: defaultVenue, cameras: [], selectedCameraId: null });
  },
}));
