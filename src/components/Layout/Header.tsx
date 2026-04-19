import { useStore } from '../../store/useStore';
import { FiCamera, FiLayout, FiBox, FiMonitor, FiSliders } from 'react-icons/fi';
import type { ViewTab } from '../../types';

const tabs: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
  { id: '2d', label: '2D Plan', icon: <FiLayout size={16} /> },
  { id: '3d', label: '3D View', icon: <FiBox size={16} /> },
  { id: 'preview', label: 'Preview', icon: <FiMonitor size={16} /> },
  { id: 'calculator', label: 'Calculator', icon: <FiSliders size={16} /> },
];

export default function Header() {
  const { activeTab, setActiveTab, venue } = useStore();

  return (
    <header className="h-12 bg-bc-panel border-b border-bc-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2 text-white">
        <FiCamera size={20} className="text-bc-accent" />
        <span className="font-bold text-sm">MultiCam Planner</span>
        <span className="text-xs text-gray-500 ml-2">— {venue.name}</span>
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

      <div className="text-xs text-gray-500">v0.1.0</div>
    </header>
  );
}
