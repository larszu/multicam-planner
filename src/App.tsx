import { useStore } from './store/useStore';
import Header from './components/Layout/Header';
import StartupAssistant from './components/Layout/StartupAssistant';
import Sidebar from './components/Sidebar/Sidebar';
import Venue2D from './components/Venue2D/Venue2D';
import Venue3D from './components/Venue3D/Venue3D';
import CameraPreview from './components/Preview/CameraPreview';
import Calculator from './components/Sidebar/Calculator';
import TemplateSelector from './components/Templates/TemplateSelector';
import ExportPanel from './components/Export/ExportPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { getExportRegistry } from './store/exportRegistry';
import { loadJSON, saveJSON } from './utils/storage';
import { Suspense, useState, useRef, useCallback, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight, FiMaximize2, FiMinimize2, FiMinus, FiX, FiBox } from 'react-icons/fi';
import { InventoryDialog } from './inventory/InventoryDialog';
import { Layout, Model, TabNode, Actions } from 'flexlayout-react';
import type { IJsonModel, ITabSetRenderValues, TabSetNode, BorderNode, ILayoutApi } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';

const LAYOUT_STORAGE_KEY = 'multicam-layout';
const LAYOUT_VERSION_KEY = 'multicam-layout-version';
const LAYOUT_PRESETS_KEY = 'multicam-layout-presets';
const CURRENT_LAYOUT_VERSION = 4;

type LayoutMode = 'focus' | 'grid' | 'custom';
type LayoutPresetOption = { id: string; label: string };

function getSelectedIndexForTab(tabId: string) {
  switch (tabId) {
    case 'tab-3d':
      return 1;
    case 'tab-preview':
      return 2;
    case 'tab-calc':
      return 3;
    case 'tab-2d':
    default:
      return 0;
  }
}

function createFocusLayoutJson(selectedTabId = 'tab-2d'): IJsonModel {
  return {
    global: {
      tabEnableClose: false,
      tabEnableRenderOnDemand: false,
      tabSetEnableMaximize: false,
    },
    layout: {
      type: 'row',
      weight: 100,
      children: [
        {
          type: 'tabset',
          id: 'ts-main',
          selected: getSelectedIndexForTab(selectedTabId),
          weight: 100,
          children: [
            { type: 'tab', name: '2D Plan', component: 'venue2d', id: 'tab-2d' },
            { type: 'tab', name: '3D View', component: 'venue3d', id: 'tab-3d' },
            { type: 'tab', name: 'Preview', component: 'preview', id: 'tab-preview' },
            { type: 'tab', name: 'Calculator', component: 'calculator', id: 'tab-calc' },
          ],
        },
      ],
    },
  };
}

function createGridLayoutJson(): IJsonModel {
  return {
    global: {
      tabEnableClose: false,
      tabEnableRenderOnDemand: false,
      tabSetEnableMaximize: false,
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
              selected: 0,
              children: [
                { type: 'tab', name: '2D Plan', component: 'venue2d', id: 'tab-2d' },
              ],
            },
            {
              type: 'tabset',
              weight: 38,
              id: 'ts-left-3d',
              selected: 0,
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
              selected: 0,
              children: [
                { type: 'tab', name: 'Preview', component: 'preview', id: 'tab-preview' },
              ],
            },
            {
              type: 'tabset',
              weight: 40,
              id: 'ts-right-bottom',
              selected: 0,
              children: [
                { type: 'tab', name: 'Calculator', component: 'calculator', id: 'tab-calc' },
              ],
            },
          ],
        },
      ],
    },
  };
}

function loadUserLayoutPresets(): Record<string, IJsonModel> {
  return loadJSON<Record<string, IJsonModel>>(LAYOUT_PRESETS_KEY, {});
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full text-gray-500">
      <div className="animate-pulse">Loading 3D View...</div>
    </div>
  );
}

/** Persist layout model across re-renders but not component remounts */
function useLayoutModel() {
  return useState(() => {
    try {
      const savedVersion = Number(localStorage.getItem(LAYOUT_VERSION_KEY) ?? '0');
      if (savedVersion === CURRENT_LAYOUT_VERSION) {
        const saved = loadJSON<IJsonModel | null>(LAYOUT_STORAGE_KEY, null);
        if (saved) return Model.fromJson(saved);
      }
    } catch { /* ignore corrupt data */ }
    return Model.fromJson(createFocusLayoutJson());
  });
}

export default function App() {
  const { sidebarCollapsed, setSidebarCollapsed } = useStore();
  const [sidebarTab, setSidebarTab] = useState<'cameras' | 'templates'>('cameras');
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [model, setModel] = useLayoutModel();
  const [layoutEpoch, setLayoutEpoch] = useState(0);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('focus');
  const [focusTabId, setFocusTabId] = useState('tab-2d');
  const [userLayoutPresets, setUserLayoutPresets] = useState<Record<string, IJsonModel>>(() => loadUserLayoutPresets());
  const layoutRef = useRef<ILayoutApi>(null);

  const persistLayout = useCallback((nextModel: Model) => {
    saveJSON(LAYOUT_STORAGE_KEY, nextModel.toJson());
    saveJSON(LAYOUT_VERSION_KEY, CURRENT_LAYOUT_VERSION);
  }, []);

  const applyLayoutJson = useCallback((json: IJsonModel) => {
    const nextModel = Model.fromJson(json);
    setModel(nextModel);
    persistLayout(nextModel);
    setLayoutEpoch((current) => current + 1);
  }, [persistLayout]);

  // Save layout to localStorage on change
  const handleModelChange = useCallback(() => {
    persistLayout(model);
  }, [model, persistLayout]);

  const handleSelectTab = useCallback((tabId: string) => {
    setFocusTabId(tabId);
    setLayoutMode('focus');
    applyLayoutJson(createFocusLayoutJson(tabId));
  }, [applyLayoutJson]);

  const handleSetLayoutMode = useCallback((nextMode: 'focus' | 'grid') => {
    if (nextMode === 'focus') {
      setLayoutMode('focus');
      applyLayoutJson(createFocusLayoutJson(focusTabId));
      return;
    }

    setLayoutMode('grid');
    applyLayoutJson(createGridLayoutJson());
  }, [applyLayoutJson, focusTabId]);

  const handleApplyPreset = useCallback((presetId: string) => {
    if (presetId === 'focus') {
      setLayoutMode('focus');
      applyLayoutJson(createFocusLayoutJson(focusTabId));
      return;
    }
    if (presetId === 'grid') {
      setLayoutMode('grid');
      applyLayoutJson(createGridLayoutJson());
      return;
    }
    const userPreset = userLayoutPresets[presetId];
    if (userPreset) {
      setLayoutMode('custom');
      applyLayoutJson(userPreset);
    }
  }, [applyLayoutJson, focusTabId, userLayoutPresets]);

  const handleSaveLayoutPreset = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const nextPresets = {
      ...userLayoutPresets,
      [trimmedName]: model.toJson(),
    };

    setUserLayoutPresets(nextPresets);
    saveJSON(LAYOUT_PRESETS_KEY, nextPresets);
  }, [model, userLayoutPresets]);

  const handleDeleteLayoutPreset = useCallback((presetId: string) => {
    const nextPresets = { ...userLayoutPresets };
    delete nextPresets[presetId];
    setUserLayoutPresets(nextPresets);
    saveJSON(LAYOUT_PRESETS_KEY, nextPresets);
  }, [userLayoutPresets]);


  const handleMinimizeToFocus = useCallback((tabId: string) => {
    setFocusTabId(tabId);
    setLayoutMode('focus');
    applyLayoutJson(createFocusLayoutJson(tabId));
  }, [applyLayoutJson]);

  const TAB_CONFIGS: Record<string, { component: string; name: string }> = {
    'tab-2d': { component: 'venue2d', name: '2D Plan' },
    'tab-3d': { component: 'venue3d', name: '3D View' },
    'tab-preview': { component: 'preview', name: 'Preview' },
    'tab-calc': { component: 'calculator', name: 'Calculator' },
  };

  const handleDragNewPanel = useCallback((tabId: string, event: DragEvent) => {
    const config = TAB_CONFIGS[tabId];
    if (!config || !layoutRef.current) return;
    // Check if tab already exists in the model – if so, just select it
    try {
      const existing = model.getNodeById(tabId);
      if (existing) {
        model.doAction(Actions.selectTab(tabId));
        return;
      }
    } catch { /* node not found, proceed with drag */ }
    layoutRef.current.addTabWithDragAndDrop(event, {
      component: config.component,
      name: config.name,
      id: tabId,
    });
  }, [model]);

  const handleRenderTabSet = useCallback((node: TabSetNode | BorderNode, renderValues: ITabSetRenderValues) => {
    if (node.getType() !== 'tabset') return;
    if (layoutMode !== 'grid') return;

    const tabSetNode = node as TabSetNode;
    const selectedNode = tabSetNode.getSelectedNode();
    const isMaximized = tabSetNode.isMaximized();

    const selectedTab = selectedNode && selectedNode.getType() === 'tab' ? selectedNode as TabNode : null;

    renderValues.leading = selectedTab
      ? <div className="panel-title-label">{selectedTab.getName()}</div>
      : null;

    if (selectedTab) {
      renderValues.stickyButtons.push(
        <button
          key={`${tabSetNode.getId()}-minimize`}
          type="button"
          className="panel-toolbar-button"
          title="Minimize this panel into focus view"
          onClick={(event) => {
            event.stopPropagation();
            handleMinimizeToFocus(selectedTab.getId());
          }}
        >
          <FiMinus size={13} />
        </button>,
      );
    }

    renderValues.stickyButtons.push(
      <button
        key={`${tabSetNode.getId()}-maximize`}
        type="button"
        className="panel-toolbar-button"
        title={isMaximized ? 'Restore panel' : 'Fullscreen panel'}
        onClick={(event) => {
          event.stopPropagation();
          model.doAction(Actions.maximizeToggle(tabSetNode.getId()));
        }}
      >
        {isMaximized ? <FiMinimize2 size={13} /> : <FiMaximize2 size={13} />}
      </button>,
    );

    if (selectedNode && selectedNode.getType() === 'tab') {
      renderValues.stickyButtons.push(
        <button
          key={`${tabSetNode.getId()}-close`}
          type="button"
          className="panel-toolbar-button panel-toolbar-button-danger"
          title="Close current panel"
          onClick={(event) => {
            event.stopPropagation();
            model.doAction(Actions.deleteTab(selectedNode.getId()));
          }}
        >
          <FiX size={13} />
        </button>,
      );
    }
  }, [handleMinimizeToFocus, layoutMode, model]);

  const layoutPresetOptions: LayoutPresetOption[] = Object.keys(userLayoutPresets)
    .sort((left, right) => left.localeCompare(right))
    .map((presetName) => ({
      id: presetName,
      label: presetName,
    }));

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

  // ── Responsive: auto-collapse sidebar on small screens ──
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => { if (e.matches) setSidebarCollapsed(true); };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [setSidebarCollapsed]);

  useEffect(() => {
    const registry = getExportRegistry();
    registry.prepareForExport = async () => {
      const previousMode = layoutMode;
      const previousFocusTab = focusTabId;
      const previousModelJson = model.toJson();
      if (previousMode !== 'grid') {
        applyLayoutJson(createGridLayoutJson());
        setLayoutMode('grid');
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => {
            setTimeout(resolve, 700);
          }));
        });
      }
      return {
        restore: () => {
          if (previousMode === 'focus') {
            setLayoutMode('focus');
            setFocusTabId(previousFocusTab);
            applyLayoutJson(createFocusLayoutJson(previousFocusTab));
          } else if (previousMode === 'custom') {
            setLayoutMode('custom');
            applyLayoutJson(previousModelJson);
          }
        },
      };
    };
    return () => { registry.prepareForExport = null; };
  }, [applyLayoutJson, focusTabId, layoutMode, model]);

  return (
    <ErrorBoundary>
    <div className="h-screen flex flex-col bg-bc-dark text-gray-200">
      <Header
        onSelectTab={handleSelectTab}
        onSetLayoutMode={handleSetLayoutMode}
        onApplyPreset={handleApplyPreset}
        onSaveLayoutPreset={handleSaveLayoutPreset}
        onDeleteLayoutPreset={handleDeleteLayoutPreset}
        onDragNewPanel={handleDragNewPanel}
        layoutPresetOptions={layoutPresetOptions}
        layoutMode={layoutMode}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar ── */}
        <div className={`border-r border-bc-border flex flex-col bg-bc-panel shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'}`}>
          {/* Sidebar tabs */}
          <div className="flex border-b border-bc-border min-w-[320px]">
            <button
              className={`flex-1 py-2 text-xs font-medium ${sidebarTab === 'cameras' ? 'text-bc-accent border-b-2 border-bc-accent' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={() => setSidebarTab('cameras')}
            >
              Settings
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
        <div className={`flex-1 overflow-hidden relative flexlayout-custom-theme layout-mode-${layoutMode}`}>
          <Layout
            key={layoutEpoch}
            ref={layoutRef}
            model={model}
            factory={factory}
            onModelChange={handleModelChange}
            onRenderTabSet={handleRenderTabSet}
            realtimeResize
          />
        </div>
      </div>

      <ExportPanel />
      <StartupAssistant />

      {/* Lager / Bestand — projektübergreifend, App-kompatibel via avplan-inventory */}
      <button
        type="button"
        onClick={() => setInventoryOpen(true)}
        title="Lager / Bestand"
        className="fixed bottom-4 left-4 z-[150] flex items-center gap-1.5 rounded-full border border-bc-border bg-bc-panel px-3 py-2 text-sm text-gray-200 shadow-lg hover:bg-bc-border"
      >
        <FiBox size={16} /> Lager
      </button>
      <InventoryDialog open={inventoryOpen} onClose={() => setInventoryOpen(false)} />
    </div>
    </ErrorBoundary>
  );
}
