import { useStore } from './store/useStore';
import Header from './components/Layout/Header';
import Sidebar from './components/Sidebar/Sidebar';
import Venue2D from './components/Venue2D/Venue2D';
import Venue3D from './components/Venue3D/Venue3D';
import CameraPreview from './components/Preview/CameraPreview';
import Calculator from './components/Sidebar/Calculator';
import TemplateSelector from './components/Templates/TemplateSelector';
import ExportPanel from './components/Export/ExportPanel';
import { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Layout, Model, TabNode, Actions, DockLocation } from 'flexlayout-react';
import type { IJsonModel } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';

const LAYOUT_STORAGE_KEY = 'multicam-layout';
const LAYOUT_VERSION_KEY = 'multicam-layout-version';
const CURRENT_LAYOUT_VERSION = 2;

/* ── FlexLayout model definition ── */
const defaultLayoutJson: IJsonModel = {
  global: {
    tabEnableClose: false,
    tabEnableRenderOnDemand: false, // keep 3D view alive
    splitterSize: 4,
    tabSetEnableMaximize: true,
  },
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'row',
        weight: 60,
        children: [
          {
            type: 'tabset',
            weight: 62,
            id: 'ts-left-2d',
            children: [
              { type: 'tab', name: '2D Plan', component: 'venue2d', id: 'tab-2d' },
            ],
          },
          {
            type: 'tabset',
            weight: 38,
            id: 'ts-left-3d',
            children: [
              { type: 'tab', name: '3D View', component: 'venue3d', id: 'tab-3d' },
            ],
          },
        ],
      },
      {
        type: 'row',
        weight: 40,
        children: [
          {
            type: 'tabset',
            weight: 60,
            id: 'ts-right-top',
            children: [
              { type: 'tab', name: 'Preview', component: 'preview', id: 'tab-preview' },
            ],
          },
          {
            type: 'tabset',
            weight: 40,
            id: 'ts-right-bottom',
            children: [
              { type: 'tab', name: 'Calculator', component: 'calculator', id: 'tab-calc' },
            ],
          },
        ],
      },
    ],
  },
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full text-gray-500">
      <div className="animate-pulse">Loading 3D View...</div>
    </div>
  );
}

/** Persist layout model across re-renders but not component remounts */
function useLayoutModel() {
  const [model] = useState(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      const savedVersion = Number(localStorage.getItem(LAYOUT_VERSION_KEY) ?? '0');
      if (saved && savedVersion === CURRENT_LAYOUT_VERSION) return Model.fromJson(JSON.parse(saved));
    } catch { /* ignore corrupt data */ }
    return Model.fromJson(defaultLayoutJson);
  });
  return model;
}

export default function App() {
  const { sidebarCollapsed, setSidebarCollapsed } = useStore();
  const [sidebarTab, setSidebarTab] = useState<'cameras' | 'templates'>('cameras');
  const model = useLayoutModel();
  const layoutRef = useRef<Layout>(null);

  // Save layout to localStorage on change
  const handleModelChange = useCallback(() => {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(model.toJson()));
      localStorage.setItem(LAYOUT_VERSION_KEY, String(CURRENT_LAYOUT_VERSION));
    } catch { /* quota exceeded etc */ }
  }, [model]);

  // ── Factory: renders panel content for each tab ──
  const factory = useCallback((node: TabNode) => {
    const component = node.getComponent();
    switch (component) {
      case 'venue2d':
        return <Venue2D />;
      case 'venue3d':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <div data-venue3d className="w-full h-full">
              <Venue3D />
            </div>
          </Suspense>
        );
      case 'preview':
        return <CameraPreview undocked={false} onUndock={() => {}} />;
      case 'calculator':
        return <Calculator />;
      default:
        return <div className="p-4 text-gray-500">Unknown panel: {component}</div>;
    }
  }, []);

  // Expose model to Header for tab selection
  useEffect(() => {
    (window as any).__flexModel = model;
    return () => { delete (window as any).__flexModel; };
  }, [model]);

  // ── Responsive: auto-collapse sidebar on small screens ──
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => { if (e.matches) setSidebarCollapsed(true); };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [setSidebarCollapsed]);

  return (
    <div className="h-screen flex flex-col bg-bc-dark text-gray-200">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar ── */}
        <div className={`border-r border-bc-border flex flex-col bg-bc-panel shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'}`}>
          {/* Sidebar tabs */}
          <div className="flex border-b border-bc-border min-w-[320px]">
            <button
              className={`flex-1 py-2 text-xs font-medium ${sidebarTab === 'cameras' ? 'text-bc-accent border-b-2 border-bc-accent' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={() => setSidebarTab('cameras')}
            >
              Cameras
            </button>
            <button
              className={`flex-1 py-2 text-xs font-medium ${sidebarTab === 'templates' ? 'text-bc-accent border-b-2 border-bc-accent' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={() => setSidebarTab('templates')}
            >
              Templates
            </button>
          </div>
          <div className="min-w-[320px] flex-1 overflow-hidden flex flex-col">
            {sidebarTab === 'cameras' ? <Sidebar /> : <TemplateSelector />}
          </div>
        </div>

        {/* Sidebar collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="shrink-0 w-5 flex items-center justify-center bg-bc-panel border-r border-bc-border hover:bg-bc-border text-gray-500 hover:text-white transition-colors"
          title={sidebarCollapsed ? 'Open sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
        </button>

        {/* ── Main docking area (FlexLayout) ── */}
        <div className="flex-1 overflow-hidden relative flexlayout-custom-theme">
          <Layout
            ref={layoutRef}
            model={model}
            factory={factory}
            onModelChange={handleModelChange}
            realtimeResize
          />
        </div>
      </div>

      <ExportPanel />
    </div>
  );
}
