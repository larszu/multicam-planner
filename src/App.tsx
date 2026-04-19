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

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full text-gray-500">
      <div className="animate-pulse">Loading 3D View...</div>
    </div>
  );
}

export default function App() {
  const { activeTab, sidebarCollapsed, setSidebarCollapsed } = useStore();
  const [sidebarTab, setSidebarTab] = useState<'cameras' | 'templates'>('cameras');

  // ── Floating preview window state ──
  const [previewUndocked, setPreviewUndocked] = useState(false);
  const [previewPos, setPreviewPos] = useState({ x: 100, y: 80 });
  const [previewSize, setPreviewSize] = useState({ w: 560, h: 480 });
  const [isDraggingWin, setIsDraggingWin] = useState(false);
  const [isResizingWin, setIsResizingWin] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Titlebar drag
  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingWin(true);
    dragOffset.current = { x: e.clientX - previewPos.x, y: e.clientY - previewPos.y };
  }, [previewPos]);

  // Resize handle drag
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingWin(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: previewSize.w, h: previewSize.h };
  }, [previewSize]);

  useEffect(() => {
    if (!isDraggingWin && !isResizingWin) return;
    const onMove = (e: MouseEvent) => {
      if (isDraggingWin) {
        setPreviewPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      }
      if (isResizingWin) {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        setPreviewSize({ w: Math.max(340, resizeStart.current.w + dx), h: Math.max(260, resizeStart.current.h + dy) });
      }
    };
    const onUp = () => { setIsDraggingWin(false); setIsResizingWin(false); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDraggingWin, isResizingWin]);

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

        {/* ── Main content area ── */}
        <div className="flex-1 overflow-hidden relative">
          <div className={`absolute inset-0 ${activeTab === '2d' ? '' : 'pointer-events-none invisible'}`}>
            <Venue2D />
          </div>
          <div className={`absolute inset-0 ${activeTab === '3d' ? '' : 'pointer-events-none invisible'}`}>
            <Suspense fallback={<LoadingFallback />}>
              <div data-venue3d className="w-full h-full">
                <Venue3D />
              </div>
            </Suspense>
          </div>
          {/* Preview: inline or undocked floating */}
          {!previewUndocked && (
            <div className={`absolute inset-0 p-4 ${activeTab === 'preview' ? '' : 'pointer-events-none invisible'}`}>
              <CameraPreview undocked={false} onUndock={() => setPreviewUndocked(true)} />
            </div>
          )}
          <div className={`absolute inset-0 p-4 overflow-auto ${activeTab === 'calculator' ? '' : 'pointer-events-none invisible'}`}>
            <Calculator />
          </div>
        </div>
      </div>

      {/* ── Floating preview window (undocked) ── */}
      {previewUndocked && (
        <div
          className="fixed z-50 flex flex-col bg-bc-dark border border-bc-border rounded-lg shadow-2xl overflow-hidden"
          style={{ left: previewPos.x, top: previewPos.y, width: previewSize.w, height: previewSize.h }}
        >
          {/* Titlebar */}
          <div
            className="h-8 bg-bc-panel border-b border-bc-border flex items-center justify-between px-2 shrink-0 select-none"
            style={{ cursor: isDraggingWin ? 'grabbing' : 'grab' }}
            onMouseDown={onTitleMouseDown}
          >
            <span className="text-xs text-gray-400 font-medium">Camera Preview</span>
            <button
              onClick={() => setPreviewUndocked(false)}
              className="text-gray-500 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-bc-border"
              title="Dock back"
            >
              ✕
            </button>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-auto p-2">
            <CameraPreview undocked onUndock={() => setPreviewUndocked(false)} />
          </div>
          {/* Resize handle */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={onResizeMouseDown}
          >
            <svg viewBox="0 0 16 16" className="w-full h-full text-gray-600"><path d="M14 14L14 8M14 14L8 14" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
          </div>
        </div>
      )}

      <ExportPanel />
    </div>
  );
}
