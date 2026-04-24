import { useStore, APP_VERSION } from '../../store/useStore';
import { FiCamera, FiLayout, FiBox, FiMonitor, FiSliders, FiSave, FiUpload, FiDownload, FiChevronDown, FiX, FiCheck } from 'react-icons/fi';
import { useRef, useCallback, useState, useEffect } from 'react';

const tabs: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'tab-2d', label: '2D Plan', icon: <FiLayout size={16} /> },
  { id: 'tab-3d', label: '3D View', icon: <FiBox size={16} /> },
  { id: 'tab-preview', label: 'Preview', icon: <FiMonitor size={16} /> },
  { id: 'tab-calc', label: 'Calculator', icon: <FiSliders size={16} /> },
];

type HeaderProps = {
  onSelectTab: (tabId: string) => void;
  onSetLayoutMode: (mode: 'focus' | 'grid') => void;
  onApplyPreset: (presetId: string) => void;
  onSaveLayoutPreset: (name: string) => void;
  onDeleteLayoutPreset: (presetId: string) => void;
  onDragNewPanel: (tabId: string, event: DragEvent) => void;
  layoutPresetOptions: { id: string; label: string }[];
  layoutMode: 'focus' | 'grid' | 'custom';
};

export default function Header({
  onSelectTab,
  onSetLayoutMode,
  onApplyPreset,
  onSaveLayoutPreset,
  onDeleteLayoutPreset,
  onDragNewPanel,
  layoutPresetOptions,
  layoutMode,
}: HeaderProps) {
  const { venue, projectVersion, lastSavedVersion, saveProject, loadProject, appMode, setAppMode } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unsaved = projectVersion !== lastSavedVersion;
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);

  // Close preset menu on outside click
  useEffect(() => {
    if (!presetMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (presetMenuRef.current && !presetMenuRef.current.contains(e.target as Node)) {
        setPresetMenuOpen(false);
        setShowSaveInput(false);
        setSavePresetName('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [presetMenuOpen]);

  // Auto-focus the save input when shown
  useEffect(() => {
    if (showSaveInput) saveInputRef.current?.focus();
  }, [showSaveInput]);

  const handleSavePresetSubmit = useCallback(() => {
    if (!savePresetName.trim()) return;
    onSaveLayoutPreset(savePresetName.trim());
    setSavePresetName('');
    setShowSaveInput(false);
    setPresetMenuOpen(false);
  }, [onSaveLayoutPreset, savePresetName]);

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

  const handleExportAll = useCallback(async () => {
    window.dispatchEvent(new CustomEvent('multicam-export-all'));
  }, []);

  return (
    <header className="h-14 bg-bc-panel border-b border-bc-border flex items-center justify-between px-2 sm:px-4 shrink-0 gap-3">
      <div className="flex items-center gap-2 text-white min-w-0 shrink-0">
        <FiCamera size={20} className="text-bc-accent shrink-0" />
        <span className="font-bold text-sm hidden sm:inline">MultiCam Planner</span>
        <span className="text-xs text-gray-500 ml-2 hidden lg:inline">— {venue.name}</span>
        <span className={`text-xs ml-2 px-1.5 py-0.5 rounded shrink-0 ${unsaved ? 'bg-bc-yellow/20 text-bc-yellow' : 'bg-bc-green/20 text-bc-green'}`}>
          v{projectVersion}{unsaved ? ' •' : ''}
        </span>
        <div className="hidden md:flex items-center rounded-lg border border-bc-border bg-bc-dark p-0.5 ml-3">
          <button
            type="button"
            onClick={() => setAppMode('camera')}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${appMode === 'camera' ? 'bg-bc-accent text-white' : 'text-gray-400 hover:text-white'}`}
            title="Multicam-Modus"
          >
            📷 <span className="hidden lg:inline">Multicam</span>
          </button>
          <button
            type="button"
            onClick={() => setAppMode('lighting')}
            className={`px-2 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${appMode === 'lighting' ? 'bg-bc-accent text-white' : 'text-gray-400 hover:text-white'}`}
            title="Licht-Modus"
          >
            💡 <span className="hidden lg:inline">Licht</span>
          </button>
        </div>
      </div>

      <nav className="flex gap-2 min-w-0 flex-1 justify-center items-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            draggable={layoutMode === 'grid'}
            onDragStart={(e) => {
              onDragNewPanel(tab.id, e.nativeEvent);
            }}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-gray-300 hover:text-white hover:bg-bc-border border border-transparent hover:border-bc-border ${
              layoutMode === 'grid' ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
            title={layoutMode === 'grid' ? `Drag ${tab.label} into the grid` : `${tab.label} in focus view`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
        <div className="hidden md:flex items-center rounded-lg border border-bc-border bg-bc-dark p-0.5 ml-2">
          <button
            type="button"
            onClick={() => onSetLayoutMode('focus')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${layoutMode === 'focus' ? 'bg-bc-accent text-white' : 'text-gray-400 hover:text-white'}`}
            title="Show a single focused panel"
          >
            Focus
          </button>
          <button
            type="button"
            onClick={() => onSetLayoutMode('grid')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${layoutMode === 'grid' ? 'bg-bc-accent text-white' : 'text-gray-400 hover:text-white'}`}
            title="Show the grid workspace"
          >
            Grid
          </button>
        </div>
        <div className="relative" ref={presetMenuRef}>
          <button
            type="button"
            onClick={() => setPresetMenuOpen((open) => !open)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-gray-400 hover:text-white hover:bg-bc-border transition-colors"
            title="Layout presets"
          >
            <span>Presets</span>
            <FiChevronDown size={12} />
          </button>
          {presetMenuOpen && (
            <div className="absolute right-0 top-full mt-2 min-w-[220px] rounded-lg border border-bc-border bg-bc-panel shadow-2xl overflow-hidden z-30">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 border-b border-bc-border">Built-in</div>
              <button
                type="button"
                onClick={() => { onApplyPreset('focus'); setPresetMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${layoutMode === 'focus' ? 'text-bc-accent' : 'text-gray-300 hover:text-white hover:bg-bc-border'}`}
              >Focus</button>
              <button
                type="button"
                onClick={() => { onApplyPreset('grid'); setPresetMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${layoutMode === 'grid' ? 'text-bc-accent' : 'text-gray-300 hover:text-white hover:bg-bc-border'}`}
              >Default Grid</button>
              {layoutPresetOptions.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 border-t border-b border-bc-border">Saved</div>
                  {layoutPresetOptions.map((preset) => (
                    <div key={preset.id} className="flex items-center group">
                      <button
                        type="button"
                        onClick={() => { onApplyPreset(preset.id); setPresetMenuOpen(false); }}
                        className="flex-1 text-left px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-bc-border transition-colors"
                      >{preset.label}</button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDeleteLayoutPreset(preset.id); }}
                        className="px-2 py-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        title={`Delete preset "${preset.label}"`}
                      ><FiX size={12} /></button>
                    </div>
                  ))}
                </>
              )}
              {layoutMode === 'grid' && (
                <div className="border-t border-bc-border">
                  {!showSaveInput ? (
                    <button
                      type="button"
                      onClick={() => setShowSaveInput(true)}
                      className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-bc-border transition-colors flex items-center gap-1.5"
                    ><FiSave size={12} /> Save current grid as preset…</button>
                  ) : (
                    <form
                      className="flex items-center gap-1 px-2 py-1.5"
                      onSubmit={(e) => { e.preventDefault(); handleSavePresetSubmit(); }}
                    >
                      <input
                        ref={saveInputRef}
                        type="text"
                        value={savePresetName}
                        onChange={(e) => setSavePresetName(e.target.value)}
                        placeholder="Preset name…"
                        className="flex-1 bg-bc-dark border border-bc-border rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-bc-accent"
                      />
                      <button
                        type="submit"
                        disabled={!savePresetName.trim()}
                        className="p-1 rounded text-gray-400 hover:text-bc-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Save preset"
                      ><FiCheck size={14} /></button>
                      <button
                        type="button"
                        onClick={() => { setShowSaveInput(false); setSavePresetName(''); }}
                        className="p-1 rounded text-gray-400 hover:text-red-400 transition-colors"
                        title="Cancel"
                      ><FiX size={14} /></button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button onClick={saveProject} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-white hover:bg-bc-border transition-colors" title="Save project (.mcplan)">
          <FiSave size={14} />
          <span className="hidden sm:inline">Save</span>
        </button>
        <button onClick={handleLoad} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-white hover:bg-bc-border transition-colors" title="Open project file">
          <FiUpload size={14} />
          <span className="hidden sm:inline">Open</span>
        </button>
        <button onClick={handleExport} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-bc-accent hover:text-white hover:bg-bc-accent/20 transition-colors" title="Export selected camera as PNG">
          <FiDownload size={14} />
          <span className="hidden sm:inline">Export</span>
        </button>
        <button onClick={handleExportAll} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-bc-green hover:text-white hover:bg-bc-green/20 transition-colors" title="Export alle Kameras als PNG">
          <FiDownload size={14} />
          <span className="hidden sm:inline">Alle</span>
        </button>
        <input ref={fileInputRef} type="file" accept=".mcplan,.json" className="hidden" onChange={handleFileChange} />
        <span className="text-xs text-gray-500 hidden lg:inline">v{APP_VERSION}</span>
      </div>
    </header>
  );
}
