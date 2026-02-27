import { RotateCcw, X, Save, Loader2 } from 'lucide-react';

const SOURCE_LABELS = {
  user: 'Your Layout',
  tenant: 'Company Default',
  default: 'System Default',
};

const SOURCE_COLORS = {
  user: 'bg-aa-blue/10 text-aa-blue',
  tenant: 'bg-amber-50 text-amber-700',
  default: 'bg-gray-100 text-secondary-text',
};

export default function CustomizeToolbar({
  onSave,
  onCancel,
  onReset,
  saving = false,
  isDirty = false,
  source = 'default',
}) {
  return (
    <div className="sticky top-0 z-40 bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-2.5 mb-6 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-aa-blue animate-pulse" />
          <span className="text-sm font-medium text-dark-text">Customizing</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_COLORS[source]}`}>
          {SOURCE_LABELS[source]}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary-text border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          title="Reset to company defaults"
        >
          <RotateCcw size={12} />
          Reset
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary-text border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <X size={12} />
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving || !isDirty}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
