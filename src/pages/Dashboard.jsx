import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Bot, DollarSign, TrendingUp, Clock, HardHat,
  ClipboardList, Shield, CheckCircle, Loader2, ArrowRight,
  Cpu, Zap, BarChart3, Database,
} from 'lucide-react';
import MetricCard from '../components/shared/MetricCard';
import TaskCard from '../components/shared/TaskCard';
import AgentChatPanel from '../components/shared/AgentChatPanel';
import DashboardEmptyState from '../components/dashboards/DashboardEmptyState';
import SyncHealthBanner from '../components/dashboards/SyncHealthBanner';
import { useUser } from '../contexts/UserContext';
import { useBranding } from '../contexts/BrandingContext';
import { useRBAC } from '../contexts/RBACContext';
import { useTenantConfig } from '../contexts/TenantConfigContext';
import useHomeSummary from '../hooks/useHomeSummary';
import useOpsIntelligence from '../hooks/useOpsIntelligence';
import { HEALTH_THRESHOLDS, computeHealth } from '../data/healthThresholds';

// Domain → display colors + labels
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

const DOMAIN_ICONS = {
  operations: ClipboardList,
  labor: DollarSign,
  quality: Shield,
  timekeeping: Clock,
  safety: AlertTriangle,
};

// KPI selection per domain per tier — the single most important number
const DOMAIN_KPI_BY_TIER = {
  operations: {
    operational:  { key: 'completionRate', label: 'Completion Rate', format: 'percent' },
    managerial:   { key: 'completionRate', label: 'Completion Rate', format: 'percent' },
    financial:    { key: 'completionRate', label: 'Completion Rate', format: 'percent' },
  },
  labor: {
    operational:  { key: 'totalOtHours', label: 'OT Hours', format: 'number' },
    managerial:   { key: 'totalOtHours', label: 'OT Hours', format: 'number' },
    financial:    { key: 'laborVariance', label: 'Budget Variance', format: 'signedPercent' },
  },
  quality: {
    operational:  { key: 'totalAudits', label: 'Total Audits', format: 'number' },
    managerial:   { key: 'caRatio', label: 'CA Ratio', format: 'percent' },
    financial:    { key: 'caRatio', label: 'CA Ratio', format: 'percent' },
  },
  timekeeping: {
    operational:  { key: 'acceptanceRate', label: 'Acceptance Rate', format: 'percent' },
    managerial:   { key: 'acceptanceRate', label: 'Acceptance Rate', format: 'percent' },
    financial:    { key: 'acceptanceRate', label: 'Acceptance Rate', format: 'percent' },
  },
  safety: {
    operational:  { key: 'recordableIncidents', label: 'Recordable Incidents', format: 'number' },
    managerial:   { key: 'avgTrir', label: 'Avg TRIR', format: 'decimal' },
    financial:    { key: 'avgTrir', label: 'Avg TRIR', format: 'decimal' },
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
  const { isAdmin } = useUser();
  const { tenantHasModule } = useTenantConfig();
  const brand = useBranding();
  const { metricTier, rbacLoading, canSeeDomain } = useRBAC();
  const { data: summary, loading, error } = useHomeSummary();
  const { data: opsIntel, loading: opsLoading } = useOpsIntelligence();

  const pageTitle = brand.companyName ? `${brand.companyName} Command Center` : 'Command Center';

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
  const domainOrder = ['operations', 'labor', 'quality', 'timekeeping', 'safety'];
  const kpiCards = domainOrder
    .filter(d => canSeeDomain(d))
    .map(d => {
      const kpiConfig = DOMAIN_KPI_BY_TIER[d]?.[metricTier] || DOMAIN_KPI_BY_TIER[d]?.operational;
      const value = hero[kpiConfig.key];
      const Icon = DOMAIN_ICONS[d];
      return {
        domain: d,
        label: `${DOMAIN_LABELS[d]}: ${kpiConfig.label}`,
        value: formatKPIValue(value, kpiConfig.format),
        icon: Icon,
        color: DOMAIN_COLORS[d],
      };
    });

  // === SECTION 2: Department Health ===
  const healthCards = domainOrder
    .filter(d => canSeeDomain(d))
    .map(d => {
      const health = computeHealth(d, hero);
      return { domain: d, ...health };
    });

  // === SECTION 3: Operational Intelligence ===
  const domainsWithData = domainOrder.filter(d => domains[d]?.hasData).length;
  const dataCoverage = Math.round((domainsWithData / 5) * 100);

  return (
    <div>
      <SyncHealthBanner />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
        <h1 className="text-2xl font-light text-dark-text">{pageTitle}</h1>
        <div className="flex items-center gap-2">
          {tenantHasModule('analytics') && (
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
              onClick={() => navigate(DOMAIN_PATHS[card.domain])}
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

      {/* ─── Section 2: Department Health ─── */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
          Department Health
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {healthCards.map(card => {
            const style = STATUS_STYLES[card.status];
            return (
              <button
                key={card.domain}
                onClick={() => navigate(DOMAIN_PATHS[card.domain])}
                className="text-left"
              >
                <div className={`bg-white rounded-lg border p-4 hover:shadow-sm transition-all ${style.border}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-8 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[card.domain] }} />
                    <span className="text-sm font-medium text-dark-text">{DOMAIN_LABELS[card.domain]}</span>
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
      </div>

      {/* ─── Section 3: Operational Intelligence ─── */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
          Operational Intelligence
        </h2>
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
            <div className="mt-2 text-xs text-secondary-text">
              {opsLoading ? '...' : `${opsIntel?.automationsCompleted ?? 0} of ${opsIntel?.automationsTotal ?? 0} completed`}
            </div>
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
              {domainsWithData} of 5 departments reporting
            </div>
          </div>
        </div>
      </div>

      {/* ─── Needs Attention (compact bottom section) ─── */}
      {attentionItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
            Needs Attention
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {attentionItems.slice(0, 6).map((task) => (
              <TaskCard key={task.id} task={task} onAction={() => navigate(DOMAIN_PATHS[task.dept] || '/dashboards')} />
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
      {isAdmin && (
        <AgentChatPanel
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          agentKey="admin"
          agentName="Admin Agent"
          context="Cross-department executive insights — Operations, Labor, Quality, Timekeeping, and Safety"
        />
      )}

      {/* Analytics Agent Chat Panel */}
      {tenantHasModule('analytics') && (
        <AgentChatPanel
          open={analyticsChatOpen}
          onClose={() => setAnalyticsChatOpen(false)}
          agentKey="analytics"
          agentName="Analytics Agent"
          context="Operational data analysis — Operations, Labor, Quality, Timekeeping, and Safety metrics"
        />
      )}
    </div>
  );
}
