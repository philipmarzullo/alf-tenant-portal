import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Bot, DollarSign, TrendingUp, Clock, HardHat, Settings2,
  ClipboardList, Shield, CheckCircle, Loader2,
} from 'lucide-react';
import MetricCard from '../components/shared/MetricCard';
import TaskCard from '../components/shared/TaskCard';
import AgentChatPanel from '../components/shared/AgentChatPanel';
import SortableGrid from '../components/dashboards/SortableGrid';
import DraggableWidget from '../components/dashboards/DraggableWidget';
import CustomizeToolbar from '../components/dashboards/CustomizeToolbar';
import DashboardEmptyState from '../components/dashboards/DashboardEmptyState';
import { useUser } from '../contexts/UserContext';
import { useBranding } from '../contexts/BrandingContext';
import { useHomeConfig } from '../hooks/useDashboardConfig';
import useCustomizeMode from '../hooks/useCustomizeMode';
import useHomeSummary from '../hooks/useHomeSummary';
import { resolveHomeConfig } from '../data/dashboardKPIRegistry';

// --- Icon map for config-driven rendering ---
const ICON_MAP = { DollarSign, HardHat, Clock, ClipboardList, TrendingUp, AlertTriangle, Shield, CheckCircle };

// --- Helpers ---

function fmtDollar(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

// Domain → display colors + labels for workspace cards and attention badges
const DOMAIN_COLORS = {
  operations: '#4B5563',
  labor: '#009ADE',
  quality: '#7C3AED',
  timekeeping: '#0D9488',
  safety: '#DC2626',
};

const DOMAIN_LABELS = {
  operations: 'Operations',
  labor: 'Labor',
  quality: 'Quality',
  timekeeping: 'Timekeeping',
  safety: 'Safety',
};

const DOMAIN_PATHS = {
  operations: '/dashboards',
  labor: '/dashboards/labor',
  quality: '/dashboards/quality',
  timekeeping: '/dashboards/timekeeping',
  safety: '/dashboards/safety',
};

const ACTIVITY = [
  { id: 1, text: 'Operations Agent generated VP performance summary', time: '10m ago', module: 'ops' },
  { id: 2, text: 'Sales Agent generated contract renewal brief', time: '30m ago', module: 'sales' },
  { id: 3, text: 'Admin Agent ran cross-department analysis', time: '1h ago', module: 'admin' },
  { id: 4, text: 'HR Agent drafted benefits reminder for 12 employees', time: '2h ago', module: 'hr' },
  { id: 5, text: 'Sales Agent flagged 4 contracts expiring within 90 days', time: '3h ago', module: 'sales' },
  { id: 6, text: 'Operations Agent flagged 2 VPs below safety inspection target', time: '4h ago', module: 'ops' },
  { id: 7, text: 'HR Agent flagged union pay increase — 847 employees affected', time: '4h ago', module: 'hr' },
  { id: 8, text: 'Finance Agent summarized client account', time: '6h ago', module: 'finance' },
  { id: 9, text: 'Purchasing Agent ran reorder analysis for Floor Finish', time: 'Yesterday', module: 'purchasing' },
  { id: 10, text: 'QBU Builder generated quarterly business update deck', time: 'Yesterday', module: 'qbu' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const { hasModule, isAdmin } = useUser();
  const brand = useBranding();
  const { heroMetrics: heroConfig, workspaceCards, sections } = useHomeConfig();
  const { data: summary, loading, error } = useHomeSummary();

  const {
    isCustomizing,
    enterCustomize,
    exitCustomize,
    draft,
    updateDraft,
    saveDraft,
    resetToDefaults,
    isDirty,
    saving,
    source,
  } = useCustomizeMode('home');

  // Resolve config from draft when customizing, otherwise use live config
  const activeHeroConfig = isCustomizing && draft
    ? resolveHomeConfig(draft).heroMetrics
    : heroConfig;
  const activeWorkspaceCards = isCustomizing && draft
    ? resolveHomeConfig(draft).workspaceCards
    : workspaceCards;
  const activeSections = isCustomizing && draft
    ? resolveHomeConfig(draft).sections
    : sections;

  // Page title — use company name from branding
  const pageTitle = brand.companyName || 'Company Overview';

  // --- Loading / Error / Empty ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  const hero = summary?.hero || {};
  const domains = summary?.domains || {};
  const attentionItems = (summary?.attentionItems || []).map(item => ({
    ...item,
    // Map fields for TaskCard component
    employee: item.detail || '',
    dueDate: 'Active',
    dept: item.dept,
  }));
  const hasData = summary?.hasData;

  // Hero metric value map — driven by real sf_* data
  const heroValues = {
    total_properties:   { value: String(hero.totalProperties || 0), icon: HardHat },
    open_tickets:       { value: String(hero.openTickets || 0), icon: ClipboardList, color: (hero.openTickets || 0) > 0 ? undefined : '#16A34A' },
    completion_rate:    { value: `${hero.completionRate || 0}%`, icon: CheckCircle },
    labor_variance:     { value: `${(hero.laborVariance || 0) > 0 ? '+' : ''}${hero.laborVariance || 0}%`, icon: DollarSign, color: (hero.laborVariance || 0) > 5 ? '#DC2626' : undefined },
  };

  // Build hero metrics — show all (including hidden dimmed) when customizing
  const allHeroMetrics = activeHeroConfig
    .filter(m => (!m.module || hasModule(m.module)) && heroValues[m.id])
    .map(m => ({
      id: m.id,
      label: m.label,
      value: heroValues[m.id].value,
      icon: ICON_MAP[m.icon] || heroValues[m.id].icon,
      color: heroValues[m.id].color,
      module: m.module,
      visible: m.visible !== false,
    }));

  const visibleMetrics = isCustomizing
    ? allHeroMetrics
    : allHeroMetrics.filter(m => m.visible);

  // Build domain-based workspace cards directly from sf_* data
  const domainOrder = ['operations', 'labor', 'quality', 'timekeeping', 'safety'];
  const allWorkspaces = domainOrder
    .filter(d => domains[d]?.hasData)
    .map(d => ({
      module: d,
      kpis: domains[d],
      visible: true,
    }));

  const visibleWorkspaces = isCustomizing
    ? allWorkspaces
    : allWorkspaces.filter(c => c.visible);

  // Attention items
  const maxAttention = activeSections.needsAttention?.maxItems ?? 12;
  const visibleAttention = attentionItems.slice(0, maxAttention);
  const visibleActivity = ACTIVITY.filter((item) => hasModule(item.module));

  // Add Needs Attention card (count based on filtered items) — only in normal mode
  const displayMetrics = [...visibleMetrics];
  if (!isCustomizing && visibleAttention.length > 0) {
    displayMetrics.push({
      id: '_attention',
      label: 'Needs Attention',
      value: String(visibleAttention.length),
      icon: AlertTriangle,
      color: '#DC2626',
      visible: true,
    });
  }

  const showAttention = activeSections.needsAttention?.visible !== false && visibleAttention.length > 0;
  const showActivity = activeSections.agentActivity?.visible !== false && visibleActivity.length > 0;

  // ─── Draft helpers ──────────────────────────────────────────────────────────

  function reorderHeroMetrics(newIdOrder) {
    updateDraft(prev => {
      const config = prev || {};
      const currentMetrics = resolveHomeConfig(config).heroMetrics;
      const metricMap = {};
      for (const m of currentMetrics) metricMap[m.id] = m;
      return {
        ...config,
        heroMetrics: newIdOrder.map((id, i) => ({
          ...metricMap[id],
          order: i,
        })),
      };
    });
  }

  function toggleHeroMetric(id) {
    updateDraft(prev => {
      const config = prev || {};
      const currentMetrics = resolveHomeConfig(config).heroMetrics;
      return {
        ...config,
        heroMetrics: currentMetrics.map(m =>
          m.id === id ? { ...m, visible: m.visible === false ? true : false } : m
        ),
      };
    });
  }

  function renameHeroMetric(id, label) {
    updateDraft(prev => {
      const config = prev || {};
      const currentMetrics = resolveHomeConfig(config).heroMetrics;
      return {
        ...config,
        heroMetrics: currentMetrics.map(m =>
          m.id === id ? { ...m, label } : m
        ),
      };
    });
  }

  function reorderWorkspaceCards(newModuleOrder) {
    updateDraft(prev => {
      const config = prev || {};
      const currentCards = resolveHomeConfig(config).workspaceCards;
      const cardMap = {};
      for (const c of currentCards) cardMap[c.module] = c;
      return {
        ...config,
        workspaceCards: newModuleOrder.map((mod, i) => ({
          ...cardMap[mod],
          order: i,
        })),
      };
    });
  }

  function toggleWorkspaceCard(module) {
    updateDraft(prev => {
      const config = prev || {};
      const currentCards = resolveHomeConfig(config).workspaceCards;
      return {
        ...config,
        workspaceCards: currentCards.map(c =>
          c.module === module ? { ...c, visible: c.visible === false ? true : false } : c
        ),
      };
    });
  }

  function toggleSection(sectionKey) {
    updateDraft(prev => {
      const config = prev || {};
      const currentSections = resolveHomeConfig(config).sections;
      return {
        ...config,
        sections: {
          ...currentSections,
          [sectionKey]: {
            ...currentSections[sectionKey],
            visible: currentSections[sectionKey]?.visible === false ? true : false,
          },
        },
      };
    });
  }

  if (!hasData && !isCustomizing) {
    return (
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
          <h1 className="text-2xl font-light text-dark-text">{pageTitle}</h1>
        </div>
        <DashboardEmptyState domain="home" />
      </div>
    );
  }

  return (
    <div>
      {/* Customize Toolbar */}
      {isCustomizing && (
        <CustomizeToolbar
          onSave={saveDraft}
          onCancel={exitCustomize}
          onReset={resetToDefaults}
          saving={saving}
          isDirty={isDirty}
          source={source}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-light text-dark-text">{pageTitle}</h1>
        <div className="flex items-center gap-2">
          {isAdmin && !isCustomizing && (
            <button
              onClick={enterCustomize}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-secondary-text bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings2 size={16} />
              Customize
            </button>
          )}
          {isAdmin && !isCustomizing && (
            <button
              onClick={() => setChatOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
            >
              <Bot size={16} />
              Ask Admin Agent
            </button>
          )}
        </div>
      </div>

      {/* Hero Metric Cards */}
      {displayMetrics.length > 0 && (
        <SortableGrid
          items={allHeroMetrics.map(m => m.id)}
          onReorder={reorderHeroMetrics}
          disabled={!isCustomizing}
        >
          <div className="grid gap-4 mb-8 responsive-metric-grid" style={{ gridTemplateColumns: `repeat(${Math.min(displayMetrics.length, 5)}, minmax(0, 1fr))` }}>
            {displayMetrics.map((m) => (
              <DraggableWidget
                key={m.id}
                id={m.id}
                isCustomizing={isCustomizing && m.id !== '_attention'}
                visible={m.visible}
                label={m.label}
                onToggleVisible={m.id !== '_attention' ? () => toggleHeroMetric(m.id) : undefined}
                onRenameLabel={m.id !== '_attention' ? (label) => renameHeroMetric(m.id, label) : undefined}
              >
                <MetricCard label={m.label} value={m.value} icon={m.icon} color={m.color} />
              </DraggableWidget>
            ))}
          </div>
        </SortableGrid>
      )}

      {/* Domain Overview Cards */}
      {visibleWorkspaces.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
            Portfolio Overview
          </h2>
          <SortableGrid
            items={allWorkspaces.map(c => c.module)}
            onReorder={reorderWorkspaceCards}
            disabled={!isCustomizing}
          >
            <div className="grid gap-4 mb-8 responsive-metric-grid" style={{ gridTemplateColumns: `repeat(${Math.min(visibleWorkspaces.length, 5)}, minmax(0, 1fr))` }}>
              {visibleWorkspaces.map((ws) => (
                <DraggableWidget
                  key={ws.module}
                  id={ws.module}
                  isCustomizing={isCustomizing}
                  visible={ws.visible}
                  onToggleVisible={() => toggleWorkspaceCard(ws.module)}
                >
                  <button
                    onClick={() => !isCustomizing && navigate(DOMAIN_PATHS[ws.module])}
                    className="w-full bg-white rounded-lg border border-gray-200 p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all"
                    style={{ borderLeftWidth: 4, borderLeftColor: DOMAIN_COLORS[ws.module] }}
                    disabled={isCustomizing}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: DOMAIN_COLORS[ws.module] }}>
                      {DOMAIN_LABELS[ws.module]}
                    </div>
                    {ws.kpis.stats.map((stat, i) => (
                      <div key={i} className="text-sm text-dark-text leading-relaxed">
                        {stat}
                      </div>
                    ))}
                  </button>
                </DraggableWidget>
              ))}
            </div>
          </SortableGrid>
        </>
      )}

      {/* Section toggles (customize mode) */}
      {isCustomizing && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-3">Section Visibility</h3>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-dark-text cursor-pointer">
              <input
                type="checkbox"
                checked={activeSections.needsAttention?.visible !== false}
                onChange={() => toggleSection('needsAttention')}
                className="rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
              />
              Needs Attention
            </label>
            <label className="flex items-center gap-2 text-sm text-dark-text cursor-pointer">
              <input
                type="checkbox"
                checked={activeSections.agentActivity?.visible !== false}
                onChange={() => toggleSection('agentActivity')}
                className="rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
              />
              Agent Activity
            </label>
          </div>
        </div>
      )}

      {/* Bottom section — Activity + Attention */}
      {(showActivity || showAttention) && !isCustomizing && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Left column — Recent Agent Activity */}
          {showActivity && (
            <div className={showAttention ? 'md:col-span-3' : 'md:col-span-5'}>
              <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
                Recent Agent Activity
              </h2>
              <div className="bg-white rounded-lg border border-gray-200">
                {visibleActivity.map((item, i) => (
                  <div key={item.id} className={`flex items-start gap-3 px-4 py-3 ${i < visibleActivity.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="p-1.5 bg-aa-blue/10 rounded shrink-0 mt-0.5">
                      <Bot size={14} className="text-aa-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-dark-text leading-snug">{item.text}</div>
                      <div className="text-xs text-secondary-text mt-1">{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Right column — Needs Attention (compact) */}
          {showAttention && (
            <div className={showActivity ? 'md:col-span-2' : 'md:col-span-5'}>
              <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
                Needs Attention
              </h2>
              <div className="flex flex-col gap-2">
                {visibleAttention.slice(0, 6).map((task) => (
                  <TaskCard key={task.id} task={task} onAction={() => navigate(DOMAIN_PATHS[task.dept] || '/dashboards')} />
                ))}
              </div>
              {visibleAttention.length > 6 && (
                <div className="mt-2 text-xs text-secondary-text text-center">
                  +{visibleAttention.length - 6} more items
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Admin Agent Chat Panel */}
      {isAdmin && (
        <AgentChatPanel
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          agentKey="admin"
          agentName="Admin Agent"
          context="Cross-department executive insights — Operations, Labor, Quality, Timekeeping, and Safety"
        />
      )}
    </div>
  );
}
