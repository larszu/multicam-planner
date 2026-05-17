import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { TEMPLATES } from '../../data/templates';
import { FiTrash2, FiSave, FiCopy, FiChevronDown, FiRotateCcw } from 'react-icons/fi';
import type { VenueTemplate } from '../../types';

const CATEGORIES: { value: VenueTemplate['category']; label: string }[] = [
  { value: 'sport', label: 'Sport' },
  { value: 'concert', label: 'Concert' },
  { value: 'church', label: 'Church' },
  { value: 'conference', label: 'Conference' },
  { value: 'custom', label: 'Custom' },
];

export default function TemplateSelector() {
  const {
    loadTemplate,
    customTemplates,
    hiddenTemplateIds,
    saveAsTemplate,
    deleteTemplate,
    updateTemplate,
    overwriteTemplate,
    restoreBuiltInTemplates,
  } = useStore();
  const [showSave, setShowSave] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<VenueTemplate['category']>('custom');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<VenueTemplate['category']>('custom');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Merge built-ins with custom templates. Custom shadows built-ins with the
  // same id (so an edited built-in shows the user's version). Hidden built-ins
  // (deleted by the user without ever being edited) drop out completely.
  const customIds = new Set(customTemplates.map((t) => t.id));
  const builtInVisible = TEMPLATES.filter(
    (t) => !hiddenTemplateIds.includes(t.id) && !customIds.has(t.id),
  );
  const allTemplates = [...builtInVisible, ...customTemplates];

  const isCustomEntry = (id: string) => customIds.has(id);
  const isBuiltInShadow = (id: string) => customIds.has(id) && TEMPLATES.some((t) => t.id === id);
  const isPureBuiltIn = (id: string) => !customIds.has(id) && TEMPLATES.some((t) => t.id === id);

  // Always show all configured categories so empty ones can still receive new
  // templates via the inline save form.
  const categories = CATEGORIES.map((c) => c.value).filter((cat) => allTemplates.some((t) => t.category === cat));
  const hiddenCount = hiddenTemplateIds.length;

  const handleSave = () => {
    if (!newName.trim()) return;
    saveAsTemplate(newName.trim(), newCategory);
    setNewName('');
    setShowSave(false);
  };

  const handleEdit = (t: VenueTemplate) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditCategory(t.category);
  };

  const handleEditSave = () => {
    if (!editingId || !editName.trim()) return;
    updateTemplate(editingId, { name: editName.trim(), category: editCategory });
    setEditingId(null);
  };

  const handleLoad = (id: string) => {
    if (confirm('Load this template? Current project will be replaced.')) {
      loadTemplate(id);
    }
  };

  return (
    <div className="p-3 flex flex-col h-full overflow-y-auto">
      {/* Save current as template button */}
      <button
        onClick={() => setShowSave(!showSave)}
        className="w-full mb-3 px-3 py-2 rounded text-sm font-medium bg-bc-accent/20 border border-bc-accent text-bc-accent hover:bg-bc-accent/30 transition-colors flex items-center gap-2 justify-center"
      >
        <FiSave size={14} />
        Save Current as Template
      </button>

      {/* Save form */}
      {showSave && (
        <div className="mb-3 p-3 rounded bg-bc-dark border border-bc-border space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Template name…"
            className="w-full px-2 py-1.5 text-sm rounded bg-bc-panel border border-bc-border text-gray-200 focus:border-bc-accent outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <div className="flex gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as VenueTemplate['category'])}
              className="flex-1 px-2 py-1.5 text-sm rounded bg-bc-panel border border-bc-border text-gray-200 outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={!newName.trim()}
              className="px-3 py-1.5 text-sm rounded bg-bc-accent text-white font-medium disabled:opacity-40 hover:bg-bc-accent/80"
            >
              Save
            </button>
            <button
              onClick={() => setShowSave(false)}
              className="px-3 py-1.5 text-sm rounded bg-bc-dark border border-bc-border text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white">Venue Templates</h3>
        {hiddenCount > 0 && (
          <button
            onClick={() => {
              if (confirm(`Restore ${hiddenCount} hidden built-in template(s)?`)) restoreBuiltInTemplates();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-gray-400 hover:text-bc-accent hover:bg-bc-accent/10"
            title="Bring back built-in templates you previously deleted"
          >
            <FiRotateCcw size={11} /> Restore {hiddenCount} hidden
          </button>
        )}
      </div>

      {categories.map((cat) => (
        <div key={cat} className="mb-3">
          <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-1">{cat}</h4>
          <div className="space-y-1">
            {allTemplates.filter((t) => t.category === cat).map((t) => (
              <div key={t.id}>
                {editingId === t.id ? (
                  /* ── Inline edit form ── */
                  <div className="p-2 rounded bg-bc-dark border border-bc-accent space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded bg-bc-panel border border-bc-border text-gray-200 focus:border-bc-accent outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                      autoFocus
                    />
                    <div className="flex gap-2 items-center">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as VenueTemplate['category'])}
                        className="flex-1 px-2 py-1 text-xs rounded bg-bc-panel border border-bc-border text-gray-200 outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <button onClick={handleEditSave} className="px-2 py-1 text-xs rounded bg-bc-accent text-white">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs rounded text-gray-400 hover:text-gray-200">Cancel</button>
                    </div>
                  </div>
                ) : (
                  /* ── Template card ── */
                  <div className="group w-full text-left px-3 py-2 rounded text-sm text-gray-200 bg-bc-dark border border-bc-border hover:border-bc-accent/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => handleLoad(t.id)}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-gray-500">
                          {t.cameras.length} cameras · {t.venue.widthM}×{t.venue.heightM}m
                          {isPureBuiltIn(t.id) && <span className="ml-1 text-gray-600">(built-in)</span>}
                          {isBuiltInShadow(t.id) && <span className="ml-1 text-bc-yellow">(modified)</span>}
                          {isCustomEntry(t.id) && !isBuiltInShadow(t.id) && <span className="ml-1 text-bc-accent">(custom)</span>}
                        </div>
                      </button>
                      {/* Actions for ALL templates — built-ins get shadowed on
                          first edit/overwrite, hidden on delete. */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                        <button
                          onClick={() => overwriteTemplate(t.id)}
                          title="Overwrite with current project"
                          className="p-1 rounded text-gray-500 hover:text-bc-accent hover:bg-bc-accent/10"
                        >
                          <FiCopy size={13} />
                        </button>
                        <button
                          onClick={() => handleEdit(t)}
                          title="Edit name / category"
                          className="p-1 rounded text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10"
                        >
                          <FiChevronDown size={13} />
                        </button>
                        {confirmDeleteId === t.id ? (
                          <button
                            onClick={() => { deleteTemplate(t.id); setConfirmDeleteId(null); }}
                            className="px-2 py-0.5 text-xs rounded bg-red-600 text-white"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(t.id)}
                            title={isPureBuiltIn(t.id) ? 'Hide built-in template (can be restored)' : 'Delete template'}
                            className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
