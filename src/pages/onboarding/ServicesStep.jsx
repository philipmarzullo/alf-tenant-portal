import { useState } from 'react';
import { ArrowRight, ArrowLeft, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C84B0A]/20 focus:border-[#C84B0A] bg-white text-dark-text';

export default function ServicesStep({ data, onChange, onNext, onBack }) {
  const categories = data.serviceCategories || [];
  const [expandedCats, setExpandedCats] = useState(() => new Set(categories.map((_, i) => i)));
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [addingServiceTo, setAddingServiceTo] = useState(null);
  const [newServiceName, setNewServiceName] = useState('');

  function toggleExpand(idx) {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function updateCategory(idx, field, value) {
    const updated = categories.map((cat, i) =>
      i === idx ? { ...cat, [field]: value } : cat
    );
    onChange('serviceCategories', updated);
  }

  function removeCategory(idx) {
    onChange('serviceCategories', categories.filter((_, i) => i !== idx));
  }

  function toggleService(catIdx, service) {
    const cat = categories[catIdx];
    const has = cat.services.includes(service);
    const updatedServices = has
      ? cat.services.filter(s => s !== service)
      : [...cat.services, service];
    updateCategory(catIdx, 'services', updatedServices);
  }

  function addService(catIdx) {
    if (!newServiceName.trim()) return;
    const cat = categories[catIdx];
    if (cat.services.includes(newServiceName.trim())) return;
    updateCategory(catIdx, 'services', [...cat.services, newServiceName.trim()]);
    setNewServiceName('');
    setAddingServiceTo(null);
  }

  function removeService(catIdx, service) {
    const cat = categories[catIdx];
    updateCategory(catIdx, 'services', cat.services.filter(s => s !== service));
  }

  function addCategory() {
    if (!newCategoryName.trim()) return;
    onChange('serviceCategories', [...categories, { category: newCategoryName.trim(), services: [] }]);
    setExpandedCats(prev => new Set([...prev, categories.length]));
    setNewCategoryName('');
    setShowAddCategory(false);
  }

  return (
    <div>
      <h2 className="text-xl font-light text-dark-text mb-1">Services</h2>
      <p className="text-sm text-secondary-text mb-8">
        What services does your company provide? Organize them by category.
      </p>

      <div className="space-y-3 mb-6">
        {categories.map((cat, catIdx) => {
          const isExpanded = expandedCats.has(catIdx);
          return (
            <div key={catIdx} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleExpand(catIdx)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown size={14} className="text-secondary-text" /> : <ChevronRight size={14} className="text-secondary-text" />}
                  <span className="text-sm font-medium text-dark-text">{cat.category}</span>
                  <span className="text-xs text-secondary-text">({cat.services.length})</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeCategory(catIdx); }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                  {/* Category name edit */}
                  <div className="mb-3">
                    <input
                      type="text"
                      value={cat.category}
                      onChange={(e) => updateCategory(catIdx, 'category', e.target.value)}
                      className="text-sm border-none focus:outline-none bg-transparent text-dark-text font-medium"
                      placeholder="Category name"
                    />
                  </div>

                  {/* Services list */}
                  <div className="space-y-1.5 mb-3">
                    {cat.services.map(service => (
                      <div key={service} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                        <span className="text-sm text-dark-text">{service}</span>
                        <button
                          onClick={() => removeService(catIdx, service)}
                          className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add service */}
                  {addingServiceTo === catIdx ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addService(catIdx)}
                        placeholder="Service name..."
                        autoFocus
                        className={`flex-1 ${inputClass}`}
                      />
                      <button
                        onClick={() => addService(catIdx)}
                        disabled={!newServiceName.trim()}
                        className="px-3 py-2 text-xs font-medium text-white bg-[#C84B0A] rounded-lg hover:bg-[#C84B0A]/90 disabled:opacity-50"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setAddingServiceTo(null); setNewServiceName(''); }}
                        className="px-2 py-2 text-xs text-secondary-text hover:text-dark-text"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingServiceTo(catIdx)}
                      className="inline-flex items-center gap-1 text-xs text-[#C84B0A] hover:text-[#C84B0A]/80 transition-colors"
                    >
                      <Plus size={12} />
                      Add Service
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add category */}
      {showAddCategory ? (
        <div className="flex items-center gap-2 mb-6">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            placeholder="Category name..."
            autoFocus
            className={`flex-1 ${inputClass}`}
          />
          <button
            onClick={addCategory}
            disabled={!newCategoryName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#C84B0A] rounded-lg hover:bg-[#C84B0A]/90 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }}
            className="px-3 py-2 text-sm text-secondary-text hover:text-dark-text transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddCategory(true)}
          className="inline-flex items-center gap-1.5 text-sm text-[#C84B0A] hover:text-[#C84B0A]/80 transition-colors mb-6"
        >
          <Plus size={14} />
          Add Category
        </button>
      )}

      <div className="flex items-center justify-between mt-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-secondary-text hover:text-dark-text transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C84B0A] text-white text-sm font-medium rounded-lg hover:bg-[#C84B0A]/90 transition-colors"
        >
          Next
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
