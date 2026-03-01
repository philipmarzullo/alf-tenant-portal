import { useState } from 'react';
import { ArrowRight, ArrowLeft, Plus, X } from 'lucide-react';
import { getDefaultDifferentiators } from '../../data/onboardingDefaults';

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C84B0A]/20 focus:border-[#C84B0A] bg-white text-dark-text';

export default function DifferentiatorsStep({ data, onChange, onNext, onBack }) {
  const selected = data.differentiators || [];
  const defaults = getDefaultDifferentiators(data.industry);
  const [showCustom, setShowCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  const isSelected = (key) => selected.some(d => d.key === key);

  function toggleDefault(diff) {
    if (isSelected(diff.key)) {
      onChange('differentiators', selected.filter(d => d.key !== diff.key));
    } else {
      onChange('differentiators', [...selected, { ...diff, isCustom: false }]);
    }
  }

  function updateDiff(key, field, value) {
    onChange('differentiators', selected.map(d =>
      d.key === key ? { ...d, [field]: value } : d
    ));
  }

  function addCustom() {
    if (!customLabel.trim()) return;
    const key = `custom_${Date.now()}`;
    onChange('differentiators', [...selected, {
      key,
      label: customLabel.trim(),
      description: customDesc.trim(),
      isCustom: true,
    }]);
    setCustomLabel('');
    setCustomDesc('');
    setShowCustom(false);
  }

  function removeCustom(key) {
    onChange('differentiators', selected.filter(d => d.key !== key));
  }

  return (
    <div>
      <h2 className="text-xl font-light text-dark-text mb-1">Differentiators</h2>
      <p className="text-sm text-secondary-text mb-8">
        What makes your company different? Select the ones that apply, or add your own.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {defaults.map(diff => {
          const active = isSelected(diff.key);
          return (
            <button
              key={diff.key}
              onClick={() => toggleDefault(diff)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                active
                  ? 'border-[#C84B0A] bg-[#C84B0A]/5'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="text-sm font-medium text-dark-text">{diff.label}</div>
              <div className="text-xs text-secondary-text mt-0.5">{diff.description}</div>
            </button>
          );
        })}
      </div>

      {/* Selected differentiators with editable details */}
      {selected.length > 0 && (
        <div className="space-y-3 mb-6">
          <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider">
            Selected ({selected.length})
          </h3>
          {selected.map(diff => (
            <div key={diff.key} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <input
                  type="text"
                  value={diff.label}
                  onChange={(e) => updateDiff(diff.key, 'label', e.target.value)}
                  className="text-sm font-medium text-dark-text border-none focus:outline-none bg-transparent flex-1"
                />
                {diff.isCustom && (
                  <button
                    onClick={() => removeCustom(diff.key)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <textarea
                value={diff.description}
                onChange={(e) => updateDiff(diff.key, 'description', e.target.value)}
                placeholder="Describe this differentiator..."
                rows={2}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add custom */}
      {showCustom ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 space-y-3">
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Differentiator name..."
            autoFocus
            className={inputClass}
          />
          <textarea
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            placeholder="Description..."
            rows={2}
            className={inputClass}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={addCustom}
              disabled={!customLabel.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#C84B0A] rounded-lg hover:bg-[#C84B0A]/90 disabled:opacity-50 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setShowCustom(false); setCustomLabel(''); setCustomDesc(''); }}
              className="px-3 py-2 text-sm text-secondary-text hover:text-dark-text transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCustom(true)}
          className="inline-flex items-center gap-1.5 text-sm text-[#C84B0A] hover:text-[#C84B0A]/80 transition-colors mb-6"
        >
          <Plus size={14} />
          Add Custom Differentiator
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
