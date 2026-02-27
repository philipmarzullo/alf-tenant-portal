import { useState, useEffect, useCallback } from 'react';
import { BarChart3, GripVertical, Eye, EyeOff, RotateCcw, Save, Loader2, Check } from 'lucide-react';
import { useDashboardConfigContext } from '../../contexts/DashboardConfigContext';
import { DOMAIN_KPI_REGISTRY, HOME_REGISTRY, resolveConfig, resolveHomeConfig } from '../../data/dashboardKPIRegistry';

const TABS = [
  { key: 'home', label: 'Home' },
  { key: 'operations', label: 'Operations' },
  { key: 'labor', label: 'Labor' },
  { key: 'quality', label: 'Quality' },
  { key: 'timekeeping', label: 'Timekeeping' },
  { key: 'safety', label: 'Safety' },
];

export default function DashboardSettings() {
  const { getConfig, updateConfig } = useDashboardConfigContext();
  const [activeTab, setActiveTab] = useState('home');
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Load draft from config whenever tab changes
  useEffect(() => {
    const config = getConfig(activeTab);
    if (activeTab === 'home') {
      const resolved = resolveHomeConfig(config);
      setDraft({
        heroMetrics: resolved.heroMetrics,
        workspaceCards: resolved.workspaceCards,
        sections: resolved.sections,
      });
    } else {
      const resolved = resolveConfig(activeTab, config);
      setDraft({ kpis: resolved.kpis, charts: resolved.charts });
    }
    setSaved(false);
    setError(null);
  }, [activeTab, getConfig]);

  const handleSave = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // Build config payload (strip computed fields, keep id/label/visible/order)
      let config;
      if (activeTab === 'home') {
        config = {
          version: 1,
          heroMetrics: draft.heroMetrics.map((m, i) => ({
            id: m.id,
            label: m.label,
            icon: m.icon,
            module: m.module,
            format: m.format,
            visible: m.visible,
            order: i,
          })),
          workspaceCards: draft.workspaceCards.map((c, i) => ({
            module: c.module,
            visible: c.visible,
            order: i,
          })),
          sections: draft.sections,
        };
      } else {
        config = {
          version: 1,
          kpis: draft.kpis.map((k, i) => ({
            id: k.id,
            label: k.label,
            icon: k.icon,
            visible: k.visible,
            order: i,
          })),
          charts: draft.charts.map((c, i) => ({
            id: c.id,
            label: c.label,
            visible: c.visible,
            order: i,
          })),
        };
      }

      await updateConfig(activeTab, config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [activeTab, draft, updateConfig]);

  const handleReset = useCallback(() => {
    if (activeTab === 'home') {
      const resolved = resolveHomeConfig(null);
      setDraft({
        heroMetrics: resolved.heroMetrics,
        workspaceCards: resolved.workspaceCards,
        sections: resolved.sections,
      });
    } else {
      const resolved = resolveConfig(activeTab, null);
      setDraft({ kpis: resolved.kpis, charts: resolved.charts });
    }
    setSaved(false);
  }, [activeTab]);

  if (!draft) return null;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-light text-dark-text mb-1">Dashboard Defaults</h1>
          <p className="text-sm text-secondary-text">Set the default dashboard layout for all users. Individual users can override with their own customization.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-secondary-text border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={14} />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
            {saving ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-dark-text shadow-sm'
                : 'text-secondary-text hover:text-dark-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'home' ? (
        <HomeTabContent draft={draft} setDraft={setDraft} />
      ) : (
        <DomainTabContent draft={draft} setDraft={setDraft} />
      )}
    </div>
  );
}

// ─── Domain Dashboard Tab Content ────────────────────────────────────────────

function DomainTabContent({ draft, setDraft }) {
  return (
    <div className="space-y-6">
      <ConfigSection
        title="KPI Cards"
        items={draft.kpis}
        onReorder={(items) => setDraft(prev => ({ ...prev, kpis: items }))}
        onToggle={(id) => setDraft(prev => ({
          ...prev,
          kpis: prev.kpis.map(k => k.id === id ? { ...k, visible: !k.visible } : k),
        }))}
        onRename={(id, label) => setDraft(prev => ({
          ...prev,
          kpis: prev.kpis.map(k => k.id === id ? { ...k, label } : k),
        }))}
      />
      <ConfigSection
        title="Charts"
        items={draft.charts}
        onReorder={(items) => setDraft(prev => ({ ...prev, charts: items }))}
        onToggle={(id) => setDraft(prev => ({
          ...prev,
          charts: prev.charts.map(c => c.id === id ? { ...c, visible: !c.visible } : c),
        }))}
        onRename={(id, label) => setDraft(prev => ({
          ...prev,
          charts: prev.charts.map(c => c.id === id ? { ...c, label } : c),
        }))}
      />
    </div>
  );
}

// ─── Home Dashboard Tab Content ──────────────────────────────────────────────

const MODULE_LABELS = { hr: 'HR', finance: 'Finance', purchasing: 'Purchasing', sales: 'Sales', ops: 'Operations' };

function HomeTabContent({ draft, setDraft }) {
  return (
    <div className="space-y-6">
      <ConfigSection
        title="Hero Metrics"
        items={draft.heroMetrics}
        onReorder={(items) => setDraft(prev => ({ ...prev, heroMetrics: items }))}
        onToggle={(id) => setDraft(prev => ({
          ...prev,
          heroMetrics: prev.heroMetrics.map(m => m.id === id ? { ...m, visible: !m.visible } : m),
        }))}
        onRename={(id, label) => setDraft(prev => ({
          ...prev,
          heroMetrics: prev.heroMetrics.map(m => m.id === id ? { ...m, label } : m),
        }))}
      />

      {/* Workspace Cards */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-dark-text mb-4">Workspace Cards</h3>
        <div className="space-y-2">
          {draft.workspaceCards.map((card) => (
            <div key={card.module} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
              <GripVertical size={16} className="text-gray-300 cursor-grab" />
              <span className="text-sm text-dark-text flex-1">{MODULE_LABELS[card.module] || card.module}</span>
              <button
                onClick={() => setDraft(prev => ({
                  ...prev,
                  workspaceCards: prev.workspaceCards.map(c =>
                    c.module === card.module ? { ...c, visible: !c.visible } : c
                  ),
                }))}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                title={card.visible ? 'Hide' : 'Show'}
              >
                {card.visible !== false ? (
                  <Eye size={16} className="text-gray-500" />
                ) : (
                  <EyeOff size={16} className="text-gray-300" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Section Toggles */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-dark-text mb-4">Sections</h3>
        <div className="space-y-3">
          <ToggleRow
            label="Needs Attention"
            checked={draft.sections.needsAttention?.visible !== false}
            onChange={(v) => setDraft(prev => ({
              ...prev,
              sections: { ...prev.sections, needsAttention: { ...prev.sections.needsAttention, visible: v } },
            }))}
          />
          <ToggleRow
            label="Agent Activity"
            checked={draft.sections.agentActivity?.visible !== false}
            onChange={(v) => setDraft(prev => ({
              ...prev,
              sections: { ...prev.sections, agentActivity: { ...prev.sections.agentActivity, visible: v } },
            }))}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function ConfigSection({ title, items, onReorder, onToggle, onRename }) {
  const [dragIdx, setDragIdx] = useState(null);

  const handleDragStart = (idx) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;

    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    onReorder(reordered);
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-dark-text mb-4">{title}</h3>
      <div className="space-y-2">
        {items.map((item, idx) => {
          const id = item.id || item.module;
          return (
            <div
              key={id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                dragIdx === idx ? 'bg-aa-blue/5 border border-aa-blue/20' : 'bg-gray-50'
              }`}
            >
              <GripVertical size={16} className="text-gray-300 cursor-grab shrink-0" />
              <input
                type="text"
                value={item.label}
                onChange={(e) => onRename(id, e.target.value)}
                className="flex-1 text-sm text-dark-text bg-transparent border-none outline-none focus:ring-0 p-0"
              />
              <button
                onClick={() => onToggle(id)}
                className="p-1 rounded hover:bg-gray-200 transition-colors shrink-0"
                title={item.visible !== false ? 'Hide' : 'Show'}
              >
                {item.visible !== false ? (
                  <Eye size={16} className="text-gray-500" />
                ) : (
                  <EyeOff size={16} className="text-gray-300" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-dark-text">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-aa-blue' : 'bg-gray-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
