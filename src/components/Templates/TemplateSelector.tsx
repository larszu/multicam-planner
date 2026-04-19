import { useStore } from '../../store/useStore';
import { TEMPLATES } from '../../data/templates';

export default function TemplateSelector() {
  const { loadTemplate } = useStore();
  const categories = [...new Set(TEMPLATES.map((t) => t.category))];

  return (
    <div className="p-3">
      <h3 className="text-sm font-semibold text-white mb-2">Venue Templates</h3>
      {categories.map((cat) => (
        <div key={cat} className="mb-3">
          <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-1">{cat}</h4>
          <div className="space-y-1">
            {TEMPLATES.filter((t) => t.category === cat).map((t) => (
              <button
                key={t.id}
                onClick={() => loadTemplate(t.id)}
                className="w-full text-left px-3 py-2 rounded text-sm text-gray-200 bg-bc-dark border border-bc-border hover:border-bc-accent hover:bg-bc-accent/10 transition-colors"
              >
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-gray-500">{t.cameras.length} cameras</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
