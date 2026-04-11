import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Bot, DollarSign, TrendingUp, Clock, HardHat,
  ClipboardList, Shield, CheckCircle, Loader2, ArrowRight,
  Cpu, Zap, BarChart3, Database, Lock, FileText,
} from 'lucide-react';
import MetricCard from '../components/shared/MetricCard';
import TaskCard from '../components/shared/TaskCard';
import AgentChatPanel from '../components/shared/AgentChatPanel';
import DashboardEmptyState from '../components/dashboards/DashboardEmptyState';
import SyncHealthBanner from '../components/dashboards/SyncHealthBanner';
import OnboardingBanner from '../components/shared/OnboardingBanner';
import CapabilityHint from '../components/shared/CapabilityHint';
import { useUser } from '../contexts/UserContext';
import { useBranding } from '../contexts/BrandingContext';
import { useRBAC } from '../contexts/RBACContext';
import { useTenantConfig } from '../contexts/TenantConfigContext';
import useTierAccess from '../hooks/useTierAccess';
import { useTenantPortal } from '../contexts/TenantPortalContext';
import useHomeSummary from '../hooks/useHomeSummary';
import useOpsIntelligence from '../hooks/useOpsIntelligence';
import { HEALTH_THRESHOLDS, computeHealth } from '../data/healthThresholds';
import { MODULE_DEFINITIONS, TOOL_MODULE_KEYS } from '../data/users';

// Map icon string identifiers from DB to lucide components for domain cards
const DOMAIN_ICON_MAP = {
  'clipboard-list': ClipboardList,
  'dollar-sign': DollarSign,
  'shield': Shield,
  'clock': Clock,
  'alert-triangle': AlertTriangle,
  'hard-hat': HardHat,
  ClipboardList, DollarSign, Shield, Clock, AlertTriangle, HardHat,
};

// KPI selection per domain per tier — the single most important number
const DOMAIN_KPI_BY_TIER = {
  operations: {
    operational:  { key: 'avgInspectionScore', label: 'Avg Inspection Score', format: 'percent' },
    managerial:   { key: 'avgInspectionScore', label: 'Avg Inspection Score', format: 'percent' },
    financial:    { key: 'avgInspectionScore', label: 'Avg Inspection Score', format: 'percent' },
  },
  labor: {
    operational:  { key: 'overtimePct', label: 'Overtime %', format: 'percent' },
    managerial:   { key: 'overtimePct', label: 'Overtime %', format: 'percent' },
    financial:    { key: 'laborVariance', label: 'Budget Variance', format: 'signedPercent' },
  },
  quality: {
    operational:  { key: 'openDeficiencies', label: 'Open Deficiencies', format: 'number' },
    managerial:   { key: 'openDeficiencies', label: 'Open Deficiencies', format: 'number' },
    financial:    { key: 'openDeficiencies', label: 'Open Deficiencies', format: 'number' },
  },
  safety: {
    operational:  { key: 'openClaims', label: 'Open Claims', format: 'number' },
    managerial:   { key: 'openClaims', label: 'Open Claims', format: 'number' },
    financial:    { key: 'totalIncurred', label: 'Total Incurred', format: 'number' },
  },
};

// Workspace module keys — used to detect tool-only users
const WORKSPACE_KEYS = new Set(
  MODULE_DEFINITIONS.filter(m => m.group === 'WORKSPACES').map(m => m.key)
);

// Info for tool cards shown to tool-only users
const TOOL_INFO = {
  qbu: {
    label: 'Business Review Builder',
    description: 'Build data-driven business reviews (quarterly, bi-annual, annual)',
    icon: BarChart3,
    color: '#3B82F6',
    path: '/portal/tools/qbu',
  },
  salesDeck: {
    label: 'Proposal Builder',
    description: 'Create professional sales proposals and presentations',
    icon: FileText,
    color: '#8B5CF6',
    path: '/portal/tools/sales-deck',
  },
  'sop-builder': {
    label: 'SOP Builder',
    description: 'Create, upload, and manage Standard Operating Procedures',
    icon: ClipboardList,
    color: '#059669',
    path: '/portal/tools/sop-builder',
  },
};

const STATUS_STYLES = {
  green:  { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  yellow: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  red:    { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

function formatKPIValue(value, format) {
  if (value == null) return '--';
  switch (format) {
    case 'percent': return `${value}%`;
    case 'signedPercent': return `${value > 0 ? '+' : ''}${value}%`;
    case 'decimal': return String(value);
    case 'number': return Number(value).toLocaleString();
    default: return String(value);
  }
}

function formatHealthValue(value, format) {
  if (value == null) return '--';
  if (format === 'percent') return `${value}%`;
  return String(value);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [analyticsChatOpen, setAnalyticsChatOpen] = useState(false);
  const { isAdmin, currentUser } = useUser();
  const { tenantHasModule } = useTenantConfig();
  const brand = useBranding();
  const { metricTier, rbacLoading, canSeeDomain } = useRBAC();
  const { data: summary, loading, error } = useHomeSummary();
  const { data: opsIntel, loading: opsLoading } = useOpsIntelligence();
  const { dashboardDomains, getDomainPath } = useTenantPortal();
  const { hasFeature, nextTierLabel } = useTierAccess();

  // Build domain lookup maps from dynamic config
  const domainOrder = useMemo(() => dashboardDomains.map(d => d.domain_key), [dashboardDomains]);
  const domainColors = useMemo(() => {
    const map = {};
    dashboardDomains.forEach(d => { map[d.domain_key] = d.color || '#4B5563'; });
    return map;
  }, [dashboardDomains]);
  const domainLabels = useMemo(() => {
    const map = {};
    dashboardDomains.forEach(d => { map[d.domain_key] = d.name; });
    return map;
  }, [dashboardDomains]);
  const domainIcons = useMemo(() => {
    const map = {};
    dashboardDomains.forEach(d => { map[d.domain_key] = DOMAIN_ICON_MAP[d.icon] || ClipboardList; });
    return map;
  }, [dashboardDomains]);

  const pageTitle = brand.companyName ? `${brand.companyName} Command Center` : 'Command Center';

  // Build data context for analytics agent
  const analyticsContext = useCallback(() => {
    if (!summary) return '';
    const { metricTier: tier, allowedDomains: domains } = { metricTier, allowedDomains: Object.keys(summary.domains || {}) };
    const parts = ['Current view: Command Center', '', 'Dashboard Data Summary:'];
    const hero = summary.hero;
    if (hero && typeof hero === 'object') {
      parts.push('\nOverall Metrics:');
      Object.entries(hero).forEach(([key, val]) => {
        if (val != null) parts.push(`  ${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`);
      });
    }
    const doms = summary.domains || {};
    Object.entries(doms).forEach(([domain, data]) => {
      if (!canSeeDomain(domain)) return;
      parts.push(`\n${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain:`);
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([k, v]) => {
          if (v != null) parts.push(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
        });
      }
    });
    if (summary.attentionItems?.length) {
      parts.push('\nAttention Items:');
      summary.attentionItems.forEach((item) => {
        parts.push(`  - [${item.severity || 'info'}] ${item.title}: ${item.detail || ''}`);
      });
    }
    parts.push(`\nUser's metric access tier: ${metricTier}`);
    return parts.join('\n');
  }, [summary, metricTier, canSeeDomain]);

  // --- Loading / Error ---
  if (loading || rbacLoading) {
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

  // Tool-only users: no workspace modules, only tool modules
  const isToolOnlyUser = currentUser && !isAdmin &&
    !currentUser.modules?.some(m => WORKSPACE_KEYS.has(m));

  if (isToolOnlyUser) {
    const userTools = (currentUser.modules || [])
      .filter(m => TOOL_MODULE_KEYS.has(m))
      .map(m => TOOL_INFO[m])
      .filter(Boolean);

    return (
      <div>
        <OnboardingBanner />
        <div className="mb-6">
          <h1 className="text-2xl font-light text-dark-text">{pageTitle}</h1>
          {currentUser.name && (
            <p className="text-sm text-secondary-text mt-1">
              Welcome, {currentUser.name.split(' ')[0]}
            </p>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
            Your Tools
          </h2>
          {userTools.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {userTools.map(tool => (
                <button
                  key={tool.path}
                  onClick={() => navigate(tool.path)}
                  className="text-left group"
                >
                  <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: `${tool.color}10` }}>
                        <tool.icon size={24} style={{ color: tool.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-medium text-dark-text mb-1">{tool.label}</div>
                        <div className="text-sm text-secondary-text">{tool.description}</div>
                        <div className="mt-3 flex items-center gap-1 text-xs text-secondary-text group-hover:text-aa-blue transition-colors">
                          Open tool <ArrowRight size={12} />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-sm text-secondary-text">
                No tools have been assigned to your account yet. Contact your administrator for access.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const hero = summary?.hero || {};
  const domains = summary?.domains || {};
  const hasData = summary?.hasData;

  const attentionItems = (summary?.attentionItems || []).map(item => ({
    ...item,
    employee: item.detail || '',
    dueDate: 'Active',
    dept: item.dept,
  }));

  if (!hasData) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-light text-dark-text">{pageTitle}</h1>
        </div>
        <DashboardEmptyState domain="home" />
      </div>
    );
  }

  // === SECTION 1: Company KPIs ===
  const isDynamic = !!summary?.isDynamic;

  const kpiCards = isDynamic
    ? // Dynamic path: render hero metrics from tenant_metrics config
      (summary.heroMetrics || []).map(m => {
        const Icon = DOMAIN_ICON_MAP[m.icon] || domainIcons[m.domain] || ClipboardList;
        return {
          domain: m.domain || 'operations',
          label: m.label,
          value: formatKPIValue(m.value, m.format === 'percent' ? 'percent' : m.format === 'currency' ? 'number' : 'number'),
          icon: Icon,
          color: m.color || domainColors[m.domain] || '#4B5563',
        };
      })
    : // Legacy path: hardcoded domain KPIs
      domainOrder
        .filter(d => canSeeDomain(d))
        .map(d => {
          const kpiConfig = DOMAIN_KPI_BY_TIER[d]?.[metricTier] || DOMAIN_KPI_BY_TIER[d]?.operational;
          const value = hero[kpiConfig.key];
          const Icon = domainIcons[d] || ClipboardList;
          return {
            domain: d,
            label: `${domainLabels[d] || d}: ${kpiConfig.label}`,
            value: formatKPIValue(value, kpiConfig.format),
            icon: Icon,
            color: domainColors[d] || '#4B5563',
          };
        });

  // === SECTION 2: Department Health ===
  // Dynamic tenants skip hardcoded health — thresholds are handled via attention items
  const healthCards = isDynamic
    ? []
    : domainOrder
        .filter(d => canSeeDomain(d))
        .map(d => {
          const health = computeHealth(d, hero);
          return { domain: d, ...health };
        });

  // === SECTION 3: Operational Intelligence ===
  const totalDomains = domainOrder.length;
  const domainsWithData = domainOrder.filter(d => domains[d]?.hasData).length;
  const dataCoverage = totalDomains > 0 ? Math.round((domainsWithData / totalDomains) * 100) : 0;

  return (
    <div>
      <OnboardingBanner />
      <SyncHealthBanner />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-light text-dark-text">{pageTitle}</h1>
        <div className="flex items-center gap-2">
          {hasFeature('agentChat') ? (
            <>
              {isAdmin && tenantHasModule('analytics') && (
                <button
                  onClick={() => setAnalyticsChatOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
                >
                  <Bot size={16} />
                  Ask Analytics Agent
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setChatOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
                >
                  <Bot size={16} />
                  Ask Admin Agent
                </button>
              )}
            </>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 text-sm text-secondary-text bg-gray-50 border border-gray-200 rounded-lg">
              <Lock size={14} />
              <span>AI Agents available on {nextTierLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Section 1: Company KPIs ─── */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
          Company KPIs
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {kpiCards.map(card => (
            <button
              key={card.domain}
              onClick={() => navigate(getDomainPath(card.domain))}
              className="text-left group"
            >
              <div className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-secondary-text mb-1">{card.label}</div>
                    <div className="text-3xl font-semibold text-dark-text">{card.value}</div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${card.color}10` }}>
                    <card.icon size={20} style={{ color: card.color }} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-secondary-text group-hover:text-aa-blue transition-colors">
                  View dashboard <ArrowRight size={12} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Section 2: Department Health (legacy only) ─── */}
      {healthCards.length > 0 && <div className="mb-8">
        <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
          Department Health
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {healthCards.map(card => {
            const style = STATUS_STYLES[card.status];
            return (
              <button
                key={card.domain}
                onClick={() => navigate(getDomainPath(card.domain))}
                className="text-left"
              >
                <div className={`bg-white rounded-lg border p-4 hover:shadow-sm transition-all ${style.border}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-8 rounded-full" style={{ backgroundColor: domainColors[card.domain] || '#4B5563' }} />
                    <span className="text-sm font-medium text-dark-text">{domainLabels[card.domain] || card.domain}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                    <span className={`text-sm font-semibold ${style.text}`}>{card.label}</span>
                  </div>
                  <div className="text-xs text-secondary-text">
                    {card.metric}: {formatHealthValue(card.value, card.format)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>}

      {/* ─── Section 3: Operational Intelligence ─── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider">
            Operational Intelligence
          </h2>
          <CapabilityHint
            capability="can_send_email"
            message="Connect email to let agents deliver work directly."
          />
        </div>
        {!hasFeature('agentChat') ? (
          <div className="grid gap-4 grid-cols-1">
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-purple-50 rounded-full">
                  <Cpu size={24} className="text-purple-400" />
                </div>
              </div>
              <h3 className="text-base font-medium text-dark-text mb-1">Unlock Operational Intelligence</h3>
              <p className="text-sm text-secondary-text mb-4">
                AI agents, deployed skills, and automation tracking are available on {nextTierLabel} and above.
              </p>
              <a
                href="mailto:support@alfpro.ai?subject=Upgrade inquiry"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
              >
                Learn about upgrading
              </a>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-secondary-text mb-1">AI Agents</div>
                  <div className="text-3xl font-semibold text-dark-text">
                    {opsLoading ? '--' : (opsIntel?.activeAgents ?? 0)}
                  </div>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Cpu size={20} className="text-purple-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-secondary-text">
                {opsLoading ? '...' : `${opsIntel?.activeAgents ?? 0} of ${opsIntel?.totalAgents ?? 0} active`}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-secondary-text mb-1">Skills Deployed</div>
                  <div className="text-3xl font-semibold text-dark-text">
                    {opsLoading ? '--' : (opsIntel?.deployedSkills ?? 0)}
                  </div>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <BarChart3 size={20} className="text-blue-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-secondary-text">
                {opsLoading ? '...' : `${opsIntel?.deployedSkills ?? 0} of ${opsIntel?.totalSkills ?? 0} completed`}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-secondary-text mb-1">Automations</div>
                  <div className="text-3xl font-semibold text-dark-text">
                    {opsLoading ? '--' : `${opsIntel?.automationsCompleted ?? 0}`}
                  </div>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Zap size={20} className="text-amber-600" />
                </div>
              </div>
              {hasFeature('automation') ? (
                <div className="mt-2 text-xs text-secondary-text">
                  {opsLoading ? '...' : `${opsIntel?.automationsCompleted ?? 0} of ${opsIntel?.automationsTotal ?? 0} completed`}
                </div>
              ) : (
                <div className="mt-2 text-xs text-secondary-text">
                  <Lock size={10} className="inline mr-1" />
                  Available on Galaxy
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-secondary-text mb-1">Data Coverage</div>
                  <div className="text-3xl font-semibold text-dark-text">{dataCoverage}%</div>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Database size={20} className="text-green-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-secondary-text">
                {domainsWithData} of {totalDomains} departments reporting
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Needs Attention (compact bottom section) ─── */}
      {attentionItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
            Needs Attention
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {attentionItems.slice(0, 6).map((task) => (
              <TaskCard key={task.id} task={task} onAction={() => navigate(getDomainPath(task.dept) || '/portal/dashboards')} />
            ))}
          </div>
          {attentionItems.length > 6 && (
            <div className="mt-2 text-xs text-secondary-text text-center">
              +{attentionItems.length - 6} more items
            </div>
          )}
        </div>
      )}

      {/* Admin Agent Chat Panel */}
      {hasFeature('agentChat') && isAdmin && (
        <AgentChatPanel
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          agentKey="admin"
          agentName="Admin Agent"
          context="Cross-department executive insights — Operations, Labor, Quality, Timekeeping, and Safety"
        />
      )}

      {/* Analytics Agent Chat Panel */}
      {hasFeature('agentChat') && tenantHasModule('analytics') && (
        <AgentChatPanel
          open={analyticsChatOpen}
          onClose={() => setAnalyticsChatOpen(false)}
          agentKey="analytics"
          agentName="Analytics Agent"
          context="Operational data analysis — Command Center overview"
          systemPromptSuffix={analyticsContext()}
        />
      )}
    </div>
  );
}
