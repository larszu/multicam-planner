import { useStore } from './store/useStore';
import Header from './components/Layout/Header';
import Sidebar from './components/Sidebar/Sidebar';
import Venue2D from './components/Venue2D/Venue2D';
import Venue3D from './components/Venue3D/Venue3D';
import CameraPreview from './components/Preview/CameraPreview';
import Calculator from './components/Sidebar/Calculator';
import TemplateSelector from './components/Templates/TemplateSelector';
import ExportPanel from './components/Export/ExportPanel';
import { Suspense, useState } from 'react';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full text-gray-500">
      <div className="animate-pulse">Loading 3D View...</div>
    </div>
  );
}

export default function App() {
  const { activeTab } = useStore();
  const [sidebarTab, setSidebarTab] = useState<'cameras' | 'templates'>('cameras');

  return (
    <div className="h-screen flex flex-col bg-bc-dark text-gray-200">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-80 border-r border-bc-border flex flex-col bg-bc-panel shrink-0">
          {/* Sidebar tabs */}
          <div className="flex border-b border-bc-border">
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
          {sidebarTab === 'cameras' ? <Sidebar /> : <TemplateSelector />}
        </div>

        {/* Main content area — all tabs always mounted, hidden via CSS so export can capture */}
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
          <div className={`absolute inset-0 p-4 ${activeTab === 'preview' ? '' : 'pointer-events-none invisible'}`}>
            <CameraPreview />
          </div>
          <div className={`absolute inset-0 p-4 overflow-auto ${activeTab === 'calculator' ? '' : 'pointer-events-none invisible'}`}>
            <Calculator />
          </div>
        </div>
      </div>
      <ExportPanel />
    </div>
  );
}
