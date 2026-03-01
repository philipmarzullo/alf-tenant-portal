import { useState } from 'react';
import { ArrowRight, ArrowLeft, Plus, X } from 'lucide-react';
import { getDefaultDepartments, ICON_OPTIONS } from '../../data/onboardingDefaults';

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C84B0A]/20 focus:border-[#C84B0A] bg-white text-dark-text';

export default function DepartmentsStep({ data, onChange, onNext, onBack }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  const departments = data.departments || [];
  const defaults = getDefaultDepartments(data.industry);

  // Check if a default department is selected
  const isSelected = (key) => departments.some(d => d.key === key);

  function toggleDefault(dept) {
    if (isSelected(dept.key)) {
      onChange('departments', departments.filter(d => d.key !== dept.key));
    } else {
      onChange('departments', [...departments, { ...dept }]);
    }
  }

  function updateDepartment(key, field, value) {
    onChange('departments', departments.map(d =>
      d.key === key ? { ...d, [field]: value } : d
    ));
  }

  function addCustom() {
    if (!customName.trim()) return;
    const key = customName.trim().toLowerCase().replace(/\s+/g, '_');
    if (departments.some(d => d.key === key)) return;
    onChange('departments', [...departments, {
      key,
      name: customName.trim(),
      description: '',
      icon: 'clipboard-list',
      isCustom: true,
    }]);
    setCustomName('');
    setShowCustom(false);
  }

  function removeCustom(key) {
    onChange('departments', departments.filter(d => d.key !== key));
  }

  return (
    <div>
      <h2 className="text-xl font-light text-dark-text mb-1">Departments</h2>
      <p className="text-sm text-secondary-text mb-8">
        Which departments does your company have? Select the ones that apply.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {defaults.map(dept => {
          const selected = isSelected(dept.key);
          return (
            <button
              key={dept.key}
              onClick={() => toggleDefault(dept)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                selected
                  ? 'border-[#C84B0A] bg-[#C84B0A]/5'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="text-sm font-medium text-dark-text">{dept.name}</div>
              <div className="text-xs text-secondary-text mt-0.5">{dept.description}</div>
            </button>
          );
        })}
      </div>

      {/* Selected departments with editable details */}
      {departments.length > 0 && (
        <div className="space-y-3 mb-6">
          <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider">
            Selected Departments ({departments.length})
          </h3>
          {departments.map(dept => (
            <div key={dept.key} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  value={dept.name}
                  onChange={(e) => updateDepartment(dept.key, 'name', e.target.value)}
                  className="text-sm font-medium text-dark-text border-none focus:outline-none bg-transparent"
                />
                {dept.isCustom && (
                  <button
                    onClick={() => removeCustom(dept.key)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-secondary-text mb-1 block">Description</label>
                  <input
                    type="text"
                    value={dept.description}
                    onChange={(e) => updateDepartment(dept.key, 'description', e.target.value)}
                    placeholder="Brief description..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs text-secondary-text mb-1 block">Icon</label>
                  <select
                    value={dept.icon}
                    onChange={(e) => updateDepartment(dept.key, 'icon', e.target.value)}
                    className={inputClass}
                  >
                    {ICON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add custom department */}
      {showCustom ? (
        <div className="flex items-center gap-2 mb-6">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="Department name..."
            autoFocus
            className={`flex-1 ${inputClass}`}
          />
          <button
            onClick={addCustom}
            disabled={!customName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#C84B0A] rounded-lg hover:bg-[#C84B0A]/90 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => { setShowCustom(false); setCustomName(''); }}
            className="px-3 py-2 text-sm text-secondary-text hover:text-dark-text transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCustom(true)}
          className="inline-flex items-center gap-1.5 text-sm text-[#C84B0A] hover:text-[#C84B0A]/80 transition-colors mb-6"
        >
          <Plus size={14} />
          Add Custom Department
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
