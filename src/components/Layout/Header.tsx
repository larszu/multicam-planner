import { useStore, APP_VERSION } from '../../store/useStore';
import { FiCamera, FiLayout, FiBox, FiMonitor, FiSliders, FiSave, FiUpload, FiDownload, FiRefreshCw } from 'react-icons/fi';
import { useRef, useCallback } from 'react';
import { Model, Actions } from 'flexlayout-react';

const tabs: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'tab-2d', label: '2D Plan', icon: <FiLayout size={16} /> },
  { id: 'tab-3d', label: '3D View', icon: <FiBox size={16} /> },
  { id: 'tab-preview', label: 'Preview', icon: <FiMonitor size={16} /> },
  { id: 'tab-calc', label: 'Calculator', icon: <FiSliders size={16} /> },
];

function selectFlexTab(tabId: string) {
  const model = (window as any).__flexModel as Model | undefined;
  if (!model) return;
  try {
    model.doAction(Actions.selectTab(tabId));
  } catch { /* tab may not exist */ }
}

function resetLayout() {
  localStorage.removeItem('multicam-layout');
  localStorage.removeItem('multicam-layout-version');
  window.location.reload();
}

export default function Header() {
  const { venue, projectVersion, lastSavedVersion, saveProject, loadProject } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unsaved = projectVersion !== lastSavedVersion;

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadProject(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [loadProject]);

  const handleExport = useCallback(async () => {
    // Dispatch custom event that the ExportPanel will listen to
    window.dispatchEvent(new CustomEvent('multicam-export'));
  }, []);

  return (
    <header className="h-12 bg-bc-panel border-b border-bc-border flex items-center justify-between px-2 sm:px-4 shrink-0">
      <div className="flex items-center gap-2 text-white min-w-0">
        <FiCamera size={20} className="text-bc-accent shrink-0" />
        <span className="font-bold text-sm hidden sm:inline">MultiCam Planner</span>
        <span className="text-xs text-gray-500 ml-2 hidden lg:inline">— {venue.name}</span>
        <span className={`text-xs ml-2 px-1.5 py-0.5 rounded shrink-0 ${unsaved ? 'bg-bc-yellow/20 text-bc-yellow' : 'bg-bc-green/20 text-bc-green'}`}>
          v{projectVersion}{unsaved ? ' •' : ''}
        </span>
      </div>

      <nav className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => selectFlexTab(tab.id)}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded text-xs font-medium transition-colors text-gray-400 hover:text-white hover:bg-bc-border"
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
        <button
          onClick={resetLayout}
          className="flex items-center gap-1 px-2 py-1.5 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-bc-border transition-colors"
          title="Reset panel layout to default"
        >
          <FiRefreshCw size={12} />
        </button>
      </nav>

      <div className="flex items-center gap-1 sm:gap-2">
        <button onClick={saveProject} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-bc-border transition-colors" title="Save project (.mcplan)">
          <FiSave size={14} />
          <span className="hidden sm:inline">Save</span>
        </button>
        <button onClick={handleLoad} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-bc-border transition-colors" title="Open project file">
          <FiUpload size={14} />
          <span className="hidden sm:inline">Open</span>
        </button>
        <button onClick={handleExport} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-bc-accent hover:text-white hover:bg-bc-accent/20 transition-colors" title="Export all views as PNG">
          <FiDownload size={14} />
          <span className="hidden sm:inline">Export</span>
        </button>
        <input ref={fileInputRef} type="file" accept=".mcplan,.json" className="hidden" onChange={handleFileChange} />
        <span className="text-xs text-gray-500 hidden lg:inline">v{APP_VERSION}</span>
      </div>
    </header>
  );
}
