import { useStore, APP_VERSION } from '../../store/useStore';
import { FiCamera, FiBox, FiSliders, FiSave, FiUpload, FiDownload, FiChevronDown, FiX, FiCheck, FiMapPin, FiRepeat, FiEdit2 } from 'react-icons/fi';
import { toVenueExchange, parseVenueExchange } from '../../utils/venueExchange';
import { toCameraList } from '../../utils/cameraExport';
import { getCameraById } from '../../data/cameras';
import { makeAvPlan, parseAvPlan } from '../../utils/avplan';
import type { ProjectFile } from '../../types';
import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import type { ExportMode } from '../Export/ExportPanel';
import type { EditMode } from '../../types';
import { useTranslation, format } from '../../i18n';
import ZoomControl from './ZoomControl';
import { TABS, type TabDef } from './tabs';

// Die Uebersetzungsfunktion, wie sie `useTranslation` liefert.
type TFn = (key: string, en: string) => string;
import { buildShiftReport, printShiftReport } from '../../utils/shiftReport';
import { shiftReportFingerprint } from '../../utils/documentContent';
import { buildStamp } from '../../utils/documentStamp';


// Edit-mode slider options (issue #43). Each mode locks everything except its
// own category in the 2D plan; "All" honours each object's manual lock flag.
const getEditModes = (t: TFn): { id: EditMode; label: string; title: string }[] => [
  { id: 'all', label: t('header.editMode.all', 'All'), title: t('header.editMode.all.title', 'Edit everything (respects per-object locks)') },
  { id: 'floorplan', label: t('header.editMode.floorplan', 'Floor Plan'), title: t('header.editMode.floorplan.title', 'Edit only the floor plan & walls') },
  { id: 'stage', label: t('header.editMode.stage', 'Stage'), title: t('header.editMode.stage.title', 'Edit only stages') },
  { id: 'objects', label: t('header.editMode.objects', 'Objects'), title: t('header.editMode.objects.title', 'Edit only objects & persons') },
  { id: 'cameras', label: t('header.editMode.cameras', 'Cameras'), title: t('header.editMode.cameras.title', 'Edit only cameras') },
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
  /** Oeffnet den Lager-/Bestand-Dialog (projektuebergreifend). */
  onOpenInventory: () => void;
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
  onOpenInventory,
}: HeaderProps) {
  const { t } = useTranslation();
  // Die Reiter tragen ihren i18n-Schluessel in `tabs.ts`; hier wird er
  // eingeloest. Wer keinen hat, steht mit seinem Label fuer sich.
  const beschriftung = (tab: TabDef) => (tab.key ? t(tab.key, tab.label) : tab.label);
  const editModes = useMemo(() => getEditModes(t), [t]);
  const { venue, projectVersion, lastSavedVersion, saveProject, loadProject, editMode, setEditMode, avForeign, showForeign, toggleShowForeign } = useStore();
  const hasForeignLighting = !!(avForeign.lighting && Array.isArray((avForeign.lighting as { fixtures?: unknown }).fixtures) && (avForeign.lighting as { fixtures: unknown[] }).fixtures.length > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const venueInputRef = useRef<HTMLInputElement>(null);
  const avplanInputRef = useRef<HTMLInputElement>(null);
  const unsaved = projectVersion !== lastSavedVersion;
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exchangeMenuOpen, setExchangeMenuOpen] = useState(false);
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const exchangeMenuRef = useRef<HTMLDivElement>(null);
  const editMenuRef = useRef<HTMLDivElement>(null);
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

  // Close export menu on outside click
  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exportMenuOpen]);

  // Close exchange (Austausch) menu on outside click
  useEffect(() => {
    if (!exchangeMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (exchangeMenuRef.current && !exchangeMenuRef.current.contains(e.target as Node)) {
        setExchangeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exchangeMenuOpen]);

  // Close edit-mode menu on outside click
  useEffect(() => {
    if (!editMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (editMenuRef.current && !editMenuRef.current.contains(e.target as Node)) {
        setEditMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [editMenuOpen]);

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

  // Bedarf 50 — das Uebergabe-Blatt. Der Stempel kommt aus DERSELBEN
  // Ableitung wie der Bericht (`shiftReportFingerprint`), sonst stempelt er
  // etwas anderes, als gedruckt wird — die Regel von ADR-004.
  const handlePrintShift = useCallback(() => {
    setExportMenuOpen(false);
    const s = useStore.getState();
    const bericht = buildShiftReport(s.cameras);
    const stamp = buildStamp({
      project: s.venue.name,
      current: shiftReportFingerprint(bericht),
      now: new Date(),
    });
    printShiftReport(bericht, s.venue.name, stamp);
  }, []);

  const handleExport = useCallback((mode: ExportMode = 'current') => {
    setExportMenuOpen(false);
    window.dispatchEvent(new CustomEvent('multicam-export', { detail: { mode } }));
  }, []);

  // ── Venue-Austausch: exportiert den geteilten Raum (Floor-Plan, Waende,
  // Stage, Personen) als neutrale .venue.json, die auch Light-Planner liest.
  const handleExportVenue = useCallback(() => {
    const s = useStore.getState();
    const ex = toVenueExchange({
      venue: s.venue, persons: s.persons, walls: s.walls, backgroundPlan: s.backgroundPlan,
      appVersion: APP_VERSION, exportedAt: new Date().toISOString(),
      // ADR-005 — was MultiCam am eingelesenen Raum nicht modelliert, geht
      // unveraendert wieder mit hinaus.
      stageForeign: s.stageForeign,
      floorPlanForeign: s.floorPlanForeign,
      wallForeign: s.wallForeign,
      personForeign: s.personForeign,
    });
    const blob = new Blob([JSON.stringify(ex, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.venue.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.venue.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Exportiert die platzierten Kameras als camera-list fuer den Cable-Planner
  // (dort werden sie zu verkabelbaren Equipment-Nodes).
  const handleExportCameras = useCallback(() => {
    const s = useStore.getState();
    const ex = toCameraList(
      s.cameras,
      (id) => getCameraById(id, s.customCameras),
      { appVersion: APP_VERSION, exportedAt: new Date().toISOString() },
    );
    const blob = new Blob([JSON.stringify(ex, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.venue.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.cameras.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── Gesamtprojekt (.avplan): verlustfrei. MultiCam bearbeitet den cameras-
  // Slot nativ und reicht lighting/cabling 1:1 durch.
  const handleExportAvplan = useCallback(() => {
    const s = useStore.getState();
    const now = new Date().toISOString();
    const cameraDoc: ProjectFile = {
      formatVersion: 1, appVersion: APP_VERSION, projectVersion: s.projectVersion,
      savedAt: now, venue: s.venue, cameras: s.cameras, persons: s.persons,
      walls: s.walls ?? [], backgroundPlan: s.backgroundPlan,
    };
    const venue = toVenueExchange({
      venue: s.venue, persons: s.persons, walls: s.walls, backgroundPlan: s.backgroundPlan,
      appVersion: APP_VERSION, exportedAt: now,
      stageForeign: s.stageForeign,
      floorPlanForeign: s.floorPlanForeign,
      wallForeign: s.wallForeign,
      personForeign: s.personForeign,
    }).venue;
    const avplan = makeAvPlan({
      app: 'multicam-planner', appVersion: APP_VERSION, exportedAt: now, venue,
      domains: {
        // Fremde Slots zuerst: so kann ein gleichnamiger fremder Slot nie den
        // eigenen ueberschreiben.
        ...(s.avForeign.unknownDomains ?? {}),
        cameras: cameraDoc,
        lighting: s.avForeign.lighting,
        cabling: s.avForeign.cabling,
      },
    });
    const blob = new Blob([JSON.stringify(avplan, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.venue.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.avplan`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportAvplan = useCallback(() => {
    avplanInputRef.current?.click();
  }, []);

  const handleAvplanFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        useStore.getState().importAvPlan(parseAvPlan(await file.text()));
      } catch (err) {
        alert(format(t('header.import.avplanFailed', '.avplan import failed: {msg}'), { msg: err instanceof Error ? err.message : String(err) }));
      }
    }
    if (avplanInputRef.current) avplanInputRef.current.value = '';
  }, [t]);

  const handleImportVenue = useCallback(() => {
    venueInputRef.current?.click();
  }, []);

  const handleVenueFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const ex = parseVenueExchange(await file.text());
        useStore.getState().importVenueExchange(ex);
      } catch (err) {
        alert(format(t('header.import.venueFailed', 'Venue import failed: {msg}'), { msg: err instanceof Error ? err.message : String(err) }));
      }
    }
    if (venueInputRef.current) venueInputRef.current.value = '';
  }, [t]);

  return (
    <header className="bc-topbar justify-between">
      <div className="flex items-center gap-2 text-white min-w-0 shrink-0">
        <FiCamera size={20} className="text-bc-accent shrink-0" />
        <span className="font-bold text-sm hidden sm:inline">MultiCam Planner</span>
        <span className="text-xs text-gray-500 ml-2 hidden lg:inline">— {venue.name}</span>
        {/* Minimal unsaved-changes indicator (no project-version counter). */}
        {unsaved && (
          <span
            className="text-xs ml-2 px-1.5 py-0.5 rounded shrink-0 bg-bc-yellow/20 text-bc-yellow"
            title={t('header.unsaved.title', 'There are unsaved changes — use Save to write a .mcplan file')}
          >
            {t('header.unsaved', '● unsaved')}
          </span>
        )}
      </div>

      <nav className="flex gap-2 min-w-0 flex-1 justify-center items-center">
        {TABS.map((tab) => (
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
            title={layoutMode === 'grid' ? format(t('header.tab.dragTitle', 'Drag {label} into the grid'), { label: beschriftung(tab) }) : format(t('header.tab.focusTitle', '{label} in focus view'), { label: beschriftung(tab) })}
          >
            <tab.Icon size={16} />
            <span className="hidden sm:inline">{beschriftung(tab)}</span>
          </button>
        ))}
        {/* Inline-Padding an den Segment-Buttons: das globale '* { padding: 0 }'
            sticht sonst die p-*-Utilities aus und die Labels kleben aneinander. */}
        <div className="hidden md:flex items-center gap-0.5 rounded-lg border border-bc-border bg-bc-dark ml-2" style={{ padding: '2px' }}>
          <button
            type="button"
            onClick={() => onSetLayoutMode('focus')}
            style={{ padding: '6px 12px' }}
            className={`rounded-md text-xs font-medium transition-colors ${layoutMode === 'focus' ? 'bg-bc-accent text-bc-accent-text' : 'text-gray-400 hover:text-white'}`}
            title={t('header.layout.focus.title', 'Show a single focused panel')}
          >
            {t('header.layout.focus', 'Focus')}
          </button>
          <button
            type="button"
            onClick={() => onSetLayoutMode('grid')}
            style={{ padding: '6px 12px' }}
            className={`rounded-md text-xs font-medium transition-colors ${layoutMode === 'grid' ? 'bg-bc-accent text-bc-accent-text' : 'text-gray-400 hover:text-white'}`}
            title={t('header.layout.grid.title', 'Show the grid workspace')}
          >
            {t('header.layout.grid', 'Grid')}
          </button>
        </div>
        {/* Edit-mode — als kompaktes Dropdown statt 5 Inline-Buttons (spart Platz
            in der Kopfzeile). Sperrt beim Bearbeiten alles ausser der Kategorie (#43). */}
        <div className="relative hidden lg:block" ref={editMenuRef}>
          <button
            type="button"
            onClick={() => setEditMenuOpen((o) => !o)}
            style={{ padding: '6px 10px' }}
            className={`flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors border ${
              editMode !== 'all' ? 'border-bc-yellow/60 bg-bc-yellow/15 text-bc-yellow' : 'border-bc-border bg-bc-dark text-gray-300 hover:text-white'
            }`}
            title={t('header.editModeSlider.title', 'Edit mode — lock everything except the selected category')}
          >
            <FiEdit2 size={13} />
            <span>{editModes.find((m) => m.id === editMode)?.label ?? t('header.editMode.all', 'All')}</span>
            <FiChevronDown size={12} />
          </button>
          {editMenuOpen && (
            <div className="absolute left-0 top-full mt-2 min-w-[190px] rounded-lg border border-bc-border bg-bc-panel shadow-2xl overflow-hidden z-30">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 border-b border-bc-border">Bearbeiten-Modus</div>
              {editModes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setEditMode(m.id); setEditMenuOpen(false); }}
                  style={{ padding: '8px 12px' }}
                  className={`flex w-full items-center gap-2 text-left text-xs transition-colors ${
                    editMode === m.id ? 'bg-bc-yellow/15 text-bc-yellow' : 'text-gray-200 hover:bg-bc-border hover:text-white'
                  }`}
                  title={m.title}
                >
                  {editMode === m.id ? <FiCheck size={13} /> : <span className="w-[13px]" />}
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative" ref={presetMenuRef}>
          <button
            type="button"
            onClick={() => setPresetMenuOpen((open) => !open)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-gray-400 hover:text-white hover:bg-bc-border transition-colors"
            title={t('header.presets.title', 'Layout presets')}
          >
            <span>{t('header.presets', 'Presets')}</span>
            <FiChevronDown size={12} />
          </button>
          {presetMenuOpen && (
            <div className="absolute right-0 top-full mt-2 min-w-[220px] rounded-lg border border-bc-border bg-bc-panel shadow-2xl overflow-hidden z-30">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 border-b border-bc-border">{t('header.presets.builtIn', 'Built-in')}</div>
              <button
                type="button"
                onClick={() => { onApplyPreset('focus'); setPresetMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${layoutMode === 'focus' ? 'text-bc-accent' : 'text-gray-300 hover:text-white hover:bg-bc-border'}`}
              >{t('header.presets.focus', 'Focus')}</button>
              <button
                type="button"
                onClick={() => { onApplyPreset('grid'); setPresetMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${layoutMode === 'grid' ? 'text-bc-accent' : 'text-gray-300 hover:text-white hover:bg-bc-border'}`}
              >{t('header.presets.defaultGrid', 'Default Grid')}</button>
              {layoutPresetOptions.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 border-t border-b border-bc-border">{t('header.presets.saved', 'Saved')}</div>
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
                        title={format(t('header.presets.deleteTitle', 'Delete preset "{label}"'), { label: preset.label })}
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
                    ><FiSave size={12} /> {t('header.presets.saveCurrent', 'Save current grid as preset…')}</button>
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
                        placeholder={t('header.presets.namePlaceholder', 'Preset name…')}
                        className="flex-1 bg-bc-dark border border-bc-border rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-bc-accent"
                      />
                      <button
                        type="submit"
                        disabled={!savePresetName.trim()}
                        className="p-1 rounded text-gray-400 hover:text-bc-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={t('header.presets.save', 'Save preset')}
                      ><FiCheck size={14} /></button>
                      <button
                        type="button"
                        onClick={() => { setShowSaveInput(false); setSavePresetName(''); }}
                        className="p-1 rounded text-gray-400 hover:text-red-400 transition-colors"
                        title={t('header.presets.cancel', 'Cancel')}
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
        <button onClick={saveProject} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-white hover:bg-bc-border transition-colors" title={t('header.save.title', 'Save project (.mcplan)')}>
          <FiSave size={14} />
          <span className="hidden sm:inline">{t('header.save', 'Save')}</span>
        </button>
        <button onClick={handleLoad} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-white hover:bg-bc-border transition-colors" title={t('header.open.title', 'Open project file')}>
          <FiUpload size={14} />
          <span className="hidden sm:inline">{t('header.open', 'Open')}</span>
        </button>
        <button onClick={onOpenInventory} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-white hover:bg-bc-border transition-colors" title={t('header.inventory.title', 'Inventory / stock — cross-project equipment stock (QR/barcode, cases, shared across apps)')}>
          <FiBox size={14} />
          <span className="hidden md:inline">{t('header.inventory', 'Inventory')}</span>
        </button>
        {/* Austausch mit anderen Apps — frueher 5 einzelne Buttons (.avplan/Venue/Cable),
            jetzt gebuendelt in einem Menue, damit die Kopfzeile nicht ueberlaeuft. */}
        <div className="relative" ref={exchangeMenuRef}>
          <button
            onClick={() => setExchangeMenuOpen((o) => !o)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-white hover:bg-bc-border transition-colors"
            title={t('header.exchange.title', 'Import / export with other apps (.avplan, Venue, Cable)')}
          >
            <FiRepeat size={14} />
            <span className="hidden md:inline">{t('header.exchange', 'Exchange')}</span>
            <FiChevronDown size={12} />
          </button>
          {exchangeMenuOpen && (
            <div className="absolute right-0 top-full mt-2 min-w-[260px] rounded-lg border border-bc-border bg-bc-panel shadow-2xl overflow-hidden z-30">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 border-b border-bc-border">{t('header.exchange.avplanSection', 'Full project (.avplan)')}</div>
              <button type="button" onClick={() => { setExchangeMenuOpen(false); handleExportAvplan(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-bc-border hover:text-white transition-colors">
                <FiBox size={13} /> {t('header.avplanExport', 'Full project')} <span className="ml-auto text-gray-500">↑</span>
              </button>
              <button type="button" onClick={() => { setExchangeMenuOpen(false); handleImportAvplan(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-bc-border hover:text-white transition-colors border-t border-bc-border">
                <FiBox size={13} /> {t('header.avplanImport', 'Combined project')} <span className="ml-auto text-gray-500">↓</span>
              </button>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 border-t border-b border-bc-border">{t('header.exchange.venueSection', 'Venue (.venue.json)')}</div>
              <button type="button" onClick={() => { setExchangeMenuOpen(false); handleExportVenue(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-bc-border hover:text-white transition-colors">
                <FiMapPin size={13} /> {t('header.venueExport', 'Venue')} <span className="ml-auto text-gray-500">↑</span>
              </button>
              <button type="button" onClick={() => { setExchangeMenuOpen(false); handleImportVenue(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-bc-border hover:text-white transition-colors border-t border-bc-border">
                <FiMapPin size={13} /> {t('header.venueImport', 'Venue')} <span className="ml-auto text-gray-500">↓</span>
              </button>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-500 border-t border-b border-bc-border">{t('header.exchange.cableSection', 'Cable Planner')}</div>
              <button type="button" onClick={() => { setExchangeMenuOpen(false); handleExportCameras(); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-bc-border hover:text-white transition-colors">
                <FiCamera size={13} /> {t('header.camerasExport', 'Cameras → Cable-Planner')}
              </button>
              {hasForeignLighting && (
                <button type="button" onClick={() => { setExchangeMenuOpen(false); toggleShowForeign(); }} className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors border-t border-bc-border ${showForeign ? 'text-bc-yellow' : 'text-gray-200 hover:bg-bc-border hover:text-white'}`}>
                  <FiSliders size={13} /> {showForeign ? t('header.foreignLamps.hide', 'Hide foreign lamps') : t('header.foreignLamps.show', 'Show foreign lamps')}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setExportMenuOpen((o) => !o)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-bc-accent hover:text-white hover:bg-bc-accent/20 transition-colors"
            title={t('header.export.title', 'Export views as PNG')}
          >
            <FiDownload size={14} />
            <span className="hidden sm:inline">{t('header.export', 'Export')}</span>
            <FiChevronDown size={12} />
          </button>
          {exportMenuOpen && (
            <div className="absolute right-0 top-full mt-2 min-w-[260px] rounded-lg border border-bc-border bg-bc-panel shadow-2xl overflow-hidden z-30">
              <button
                type="button"
                onClick={() => handleExport('current')}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-bc-border hover:text-white transition-colors"
              >
                <div className="font-medium">{t('header.export.current', 'Current camera')}</div>
                <div className="text-[10px] text-gray-500">{t('header.export.current.desc', 'Selected camera at current focal length')}</div>
              </button>
              <button
                type="button"
                onClick={() => handleExport('all')}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-bc-border hover:text-white transition-colors border-t border-bc-border"
              >
                <div className="font-medium">{t('header.export.all', 'All cameras')}</div>
                <div className="text-[10px] text-gray-500">{t('header.export.all.desc', 'One PNG per camera at its current focal length')}</div>
              </button>
              <button
                type="button"
                onClick={() => handleExport('widetele')}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-bc-border hover:text-white transition-colors border-t border-bc-border"
              >
                <div className="font-medium">{t('header.export.widetele', 'Current — wide + tele')}</div>
                <div className="text-[10px] text-gray-500">{t('header.export.widetele.desc', 'Selected camera at lens min and max focal length')}</div>
              </button>
              <button
                type="button"
                onClick={() => handleExport('all-widetele')}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-bc-border hover:text-white transition-colors border-t border-bc-border"
              >
                <div className="font-medium">{t('header.export.allWidetele', 'All — wide + tele')}</div>
                <div className="text-[10px] text-gray-500">{t('header.export.allWidetele.desc', 'Two PNGs per camera (lens min and max)')}</div>
              </button>
              {/* Bedarf 50 — die Schicht-Uebergabe. Sie steht hier und nicht
                  bei den Kamerakarten, weil sie kein Bild ist: ein Blatt ueber
                  ALLE Positionen, das jemand ausdruckt und weiterreicht. */}
              <button
                type="button"
                onClick={handlePrintShift}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-bc-border hover:text-white transition-colors border-t border-bc-border"
              >
                <div className="font-medium">{t('header.export.shift', 'Print shift handover')}</div>
                <div className="text-[10px] text-gray-500">
                  {t('header.export.shift.desc', 'Paint, panel, faults and findings per position')}
                </div>
              </button>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept=".mcplan,.json" className="hidden" onChange={handleFileChange} />
        <input ref={venueInputRef} type="file" accept=".venue.json,.json" className="hidden" onChange={handleVenueFileChange} />
        <input ref={avplanInputRef} type="file" accept=".avplan,.json" className="hidden" onChange={handleAvplanFileChange} />
        <ZoomControl />
        <span className="text-xs text-gray-500 hidden lg:inline">v{APP_VERSION}</span>
      </div>
    </header>
  );
}
