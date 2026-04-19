import { useStore, APP_VERSION } from '../../store/useStore';
import { FiCamera, FiLayout, FiBox, FiMonitor, FiSliders, FiSave, FiUpload, FiDownload } from 'react-icons/fi';
import type { ViewTab } from '../../types';
import { useRef, useCallback } from 'react';

const tabs: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
  { id: '2d', label: '2D Plan', icon: <FiLayout size={16} /> },
  { id: '3d', label: '3D View', icon: <FiBox size={16} /> },
  { id: 'preview', label: 'Preview', icon: <FiMonitor size={16} /> },
  { id: 'calculator', label: 'Calculator', icon: <FiSliders size={16} /> },
];

export default function Header() {
  const { activeTab, setActiveTab, venue, projectVersion, lastSavedVersion, saveProject, loadProject } = useStore();
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
    <header className="h-12 bg-bc-panel border-b border-bc-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2 text-white">
        <FiCamera size={20} className="text-bc-accent" />
        <span className="font-bold text-sm">MultiCam Planner</span>
        <span className="text-xs text-gray-500 ml-2">— {venue.name}</span>
        <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${unsaved ? 'bg-bc-yellow/20 text-bc-yellow' : 'bg-bc-green/20 text-bc-green'}`}>
          v{projectVersion}{unsaved ? ' •' : ''}
        </span>
      </div>

      <nav className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-bc-accent text-white'
                : 'text-gray-400 hover:text-white hover:bg-bc-border'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <button onClick={saveProject} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-bc-border transition-colors" title="Save project (.mcplan)">
          <FiSave size={14} />
          Save
        </button>
        <button onClick={handleLoad} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-bc-border transition-colors" title="Open project file">
          <FiUpload size={14} />
          Open
        </button>
        <button onClick={handleExport} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-bc-accent hover:text-white hover:bg-bc-accent/20 transition-colors" title="Export all views as PNG">
          <FiDownload size={14} />
          Export
        </button>
        <input ref={fileInputRef} type="file" accept=".mcplan,.json" className="hidden" onChange={handleFileChange} />
        <span className="text-xs text-gray-500">v{APP_VERSION}</span>
      </div>
    </header>
  );
}
