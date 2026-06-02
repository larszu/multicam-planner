export interface ExportRegistry {
  capture2DExport: (() => HTMLCanvasElement | null) | null;
  capturePreviewCanvas: (() => HTMLCanvasElement | null) | null;
  prepareForExport: (() => Promise<{ restore: () => void } | null>) | null;
  framing3D: {
    save: () => FramingState;
    apply: (s: FramingState) => void;
    fitVenue: (w: number, h: number) => void;
  } | null;
}

export interface FramingState {
  pos: [number, number, number];
  yaw: number;
  pitch: number;
}

const registry: ExportRegistry = {
  capture2DExport: null,
  capturePreviewCanvas: null,
  prepareForExport: null,
  framing3D: null,
};

export function getExportRegistry(): ExportRegistry {
  return registry;
}
