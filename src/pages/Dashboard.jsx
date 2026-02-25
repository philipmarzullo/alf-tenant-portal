import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bot, DollarSign, FileText, TrendingUp, Clock, HardHat } from 'lucide-react';
import MetricCard from '../components/shared/MetricCard';
import TaskCard from '../components/shared/TaskCard';
import AgentChatPanel from '../components/shared/AgentChatPanel';
import { DEPT_COLORS } from '../data/constants';
import { useUser } from '../contexts/UserContext';

// Data sources
import { contracts, getSalesMetrics, daysUntilExpiry } from '../data/mock/salesMocks';
import { arAging } from '../data/mock/financeMocks';
import { reorderAlerts } from '../data/mock/purchasingMocks';
import { benefitsEnrollments } from '../data/mock/benefitsEnrollments';
import { leaveCases } from '../data/mock/leaveCases';
import { payRateChanges } from '../data/mock/payRateChanges';
import { unionCalendar } from '../data/mock/unionCalendar';
import { vpSummary, getOpsSummaryMetrics } from '../data/mock/operationsMocks';

// --- Helpers ---

function parseDollar(str) {
  return Number(str.replace(/[$,]/g, ''));
}

function fmtDollar(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

// --- Computed data ---

function computeDashboard() {
  const salesMetrics = getSalesMetrics();
  const opsMetrics = getOpsSummaryMetrics();

  // AR total
  const arTotal = arAging.reduce((sum, row) => sum + parseDollar(row.total), 0);

  // AR clients with 60+ day balances
  const ar60Plus = arAging.filter(
    (row) => parseDollar(row.bucket60) + parseDollar(row.bucket90) + parseDollar(row.bucket91) > 0
  );

  // Expiring contracts (with days)
  const now = new Date();
  const in90 = new Date(now);
  in90.setDate(in90.getDate() + 90);
  const expiringContracts = contracts.filter((c) => {
    if (c.status === 'expired') return false;
    const end = new Date(c.contractEnd);
    return end >= now && end <= in90;
  });

  // In-renewal contracts
  const inRenewalContracts = contracts.filter((c) => c.status === 'inRenewal');

  // Contracts with high TBI pending (>$10K)
  const highTbiContracts = contracts.filter((c) => c.tbiPending > 10000 && c.status !== 'expired');

  // HR data
  const overdueLeaveCases = leaveCases.filter((c) => c.status === 'overdue');
  const urgentEnrollments = benefitsEnrollments.filter((e) => e.urgent);
  const openEnrollments = benefitsEnrollments.filter((e) => e.status === 'open' || e.status === 'waiting');
  const pendingVpChanges = payRateChanges.filter((p) => p.vpStatus === 'pendingVP');
  const nextUnionChange = unionCalendar.find((u) => u.status === 'upcoming');

  // Reorder alerts below 50% par
  const criticalReorders = reorderAlerts.filter((r) => r.currentStock / r.parLevel < 0.5);

  // Active contracts
  const activeContracts = contracts.filter((c) => c.status !== 'expired');

  // --- Build attention items ---
  const attentionItems = [];
  let taskId = 0;

  // Sales: expiring contracts
  for (const c of expiringContracts) {
    const days = daysUntilExpiry(c.contractEnd);
    attentionItems.push({
      id: ++taskId,
      priority: days < 30 ? 'high' : 'medium',
      dept: 'sales',
      description: `Contract expiring ${days}d — ${c.client}`,
      employee: c.site,
      dueDate: new Date(c.contractEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actionLabel: 'Review',
    });
  }

  // Sales: in renewal
  for (const c of inRenewalContracts) {
    attentionItems.push({
      id: ++taskId,
      priority: 'medium',
      dept: 'sales',
      description: `Contract in renewal — ${c.client}`,
      employee: c.site,
      dueDate: new Date(c.contractEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actionLabel: 'Review',
    });
  }

  // Sales: high TBI pending
  for (const c of highTbiContracts) {
    attentionItems.push({
      id: ++taskId,
      priority: 'medium',
      dept: 'sales',
      description: `TBI pending ${fmtDollar(c.tbiPending)} — ${c.client}`,
      employee: c.accountManager,
      dueDate: 'Open',
      actionLabel: 'View',
    });
  }

  // HR: overdue leave cases
  for (const c of overdueLeaveCases) {
    attentionItems.push({
      id: ++taskId,
      priority: 'high',
      dept: 'hr',
      description: `${c.type} certification overdue`,
      employee: c.employee,
      dueDate: 'OVERDUE',
      actionLabel: 'Follow Up',
    });
  }

  // HR: urgent benefit enrollments
  for (const e of urgentEnrollments) {
    attentionItems.push({
      id: ++taskId,
      priority: 'high',
      dept: 'hr',
      description: `Benefits enrollment closing — ${e.daysRemaining}d left`,
      employee: e.name,
      dueDate: `${e.daysRemaining}d remaining`,
      actionLabel: 'Review',
    });
  }

  // HR: stale VP approvals
  for (const p of pendingVpChanges) {
    attentionItems.push({
      id: ++taskId,
      priority: 'medium',
      dept: 'hr',
      description: 'Pay rate VP approval stale',
      employee: p.employee,
      dueDate: p.effectiveDate,
      actionLabel: 'Escalate',
    });
  }

  // HR: next union rate change
  if (nextUnionChange) {
    attentionItems.push({
      id: ++taskId,
      priority: 'medium',
      dept: 'hr',
      description: `Union rate change — ${nextUnionChange.union}`,
      employee: `${nextUnionChange.employeesAffected} employees`,
      dueDate: nextUnionChange.effectiveDate,
      actionLabel: 'Process',
    });
  }

  // Finance: AR 60+ days
  for (const row of ar60Plus) {
    const overdue = parseDollar(row.bucket60) + parseDollar(row.bucket90) + parseDollar(row.bucket91);
    attentionItems.push({
      id: ++taskId,
      priority: 'medium',
      dept: 'finance',
      description: `AR 60+ days — ${row.client}`,
      employee: fmtDollar(overdue),
      dueDate: `Last payment ${row.lastPayment}`,
      actionLabel: 'View',
    });
  }

  // Purchasing: critical reorder alerts
  for (const r of criticalReorders) {
    const pct = Math.round((r.currentStock / r.parLevel) * 100);
    attentionItems.push({
      id: ++taskId,
      priority: 'medium',
      dept: 'purchasing',
      description: `Reorder alert — ${r.item}`,
      employee: `${pct}% of par (${r.currentStock}/${r.parLevel})`,
      dueDate: r.leadTime,
      actionLabel: 'Order',
    });
  }

  // Ops: VPs with safety below 90%
  const lowSafetyVPs = vpSummary.filter((vp) => vp.revenueInspectedSafety < 90);
  for (const vp of lowSafetyVPs) {
    attentionItems.push({
      id: ++taskId,
      priority: 'medium',
      dept: 'ops',
      description: `Safety insp. rate ${vp.revenueInspectedSafety}% — ${vp.vp}`,
      employee: `${vp.jobCount} jobs`,
      dueDate: 'Below 90% target',
      actionLabel: 'Review',
    });
  }

  // Ops: VPs with incidents > 2
  const highIncidentVPs = vpSummary.filter((vp) => vp.incidents > 2);
  for (const vp of highIncidentVPs) {
    attentionItems.push({
      id: ++taskId,
      priority: 'high',
      dept: 'ops',
      description: `${vp.incidents} incidents — ${vp.vp}`,
      employee: `${vp.jobCount} jobs`,
      dueDate: 'Needs review',
      actionLabel: 'Investigate',
    });
  }

  // Sort: high first, then medium, then low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  attentionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Count total urgent items (high priority + medium)
  const needsAttentionCount = attentionItems.length;

  return {
    salesMetrics,
    opsMetrics,
    arTotal,
    attentionItems: attentionItems.slice(0, 12),
    needsAttentionCount,
    // Workspace KPI summaries
    workspaceKPIs: {
      hr: {
        stats: [
          `${openEnrollments.length} open enrollment${openEnrollments.length !== 1 ? 's' : ''}`,
          `${overdueLeaveCases.length} overdue leave case${overdueLeaveCases.length !== 1 ? 's' : ''}`,
          `${pendingVpChanges.length} pending VP approval${pendingVpChanges.length !== 1 ? 's' : ''}`,
          nextUnionChange ? `1 upcoming union change` : null,
        ].filter(Boolean),
      },
      finance: {
        stats: [
          `${fmtDollar(arTotal)} outstanding AR`,
          `${ar60Plus.length} client${ar60Plus.length !== 1 ? 's' : ''} 60+ days`,
        ],
      },
      purchasing: {
        stats: [
          `${reorderAlerts.length} reorder alert${reorderAlerts.length !== 1 ? 's' : ''}`,
          `${criticalReorders.length} below 50% par`,
        ],
      },
      sales: {
        stats: [
          `${activeContracts.length} active contracts`,
          `${expiringContracts.length} expiring ≤90d`,
          `${fmtDollar(salesMetrics.totalTbiPending)} TBI pending`,
          `${inRenewalContracts.length} in renewal`,
        ],
      },
      ops: {
        stats: [
          `${opsMetrics.totalJobs} total jobs`,
          `${opsMetrics.avgSafetyRate}% safety insp. rate`,
          `${opsMetrics.totalIncidents} total incidents`,
          `${opsMetrics.avgCloseDays}d avg close`,
        ],
      },
    },
  };
}

const ACTIVITY = [
  { id: 1, text: 'Operations Agent generated VP performance summary for Eric Wheeler', time: '10m ago', module: 'ops' },
  { id: 2, text: 'Sales Agent generated renewal brief for Related Companies', time: '30m ago', module: 'sales' },
  { id: 3, text: 'Admin Agent ran cross-department analysis', time: '1h ago', module: 'admin' },
  { id: 4, text: 'HR Agent drafted benefits reminder for 12 employees', time: '2h ago', module: 'hr' },
  { id: 5, text: 'Sales Agent flagged 4 contracts expiring within 90 days', time: '3h ago', module: 'sales' },
  { id: 6, text: 'Operations Agent flagged 2 VPs below safety inspection target', time: '4h ago', module: 'ops' },
  { id: 7, text: 'HR Agent flagged 32BJ pay increase — 847 employees affected', time: '4h ago', module: 'hr' },
  { id: 8, text: 'Finance Agent summarized Greenfield University account', time: '6h ago', module: 'finance' },
  { id: 9, text: 'Purchasing Agent ran reorder analysis for Floor Finish', time: 'Yesterday', module: 'purchasing' },
  { id: 10, text: 'QBU Builder generated Q4 2025 deck for Fordham University', time: 'Yesterday', module: 'qbu' },
];

const MODULE_LABELS = {
  hr: 'HR',
  finance: 'Finance',
  purchasing: 'Purchasing',
  sales: 'Sales',
  ops: 'Operations',
};

const MODULE_PATHS = {
  hr: '/hr',
  finance: '/finance',
  purchasing: '/purchasing',
  sales: '/sales',
  ops: '/ops',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const { hasModule, isAdmin } = useUser();
  const data = computeDashboard();

  // Filter everything by module access
  const allMetrics = [
    { label: 'Total Annual APC', value: fmtDollar(data.salesMetrics.totalApcAnnual), icon: DollarSign, module: 'sales' },
    { label: 'Total Job Count', value: String(data.opsMetrics.totalJobs), icon: HardHat, module: 'ops' },
    { label: 'Outstanding AR', value: fmtDollar(data.arTotal), icon: Clock, module: 'finance' },
    { label: 'Contracts Expiring (90d)', value: String(data.salesMetrics.expiringSoonCount), icon: FileText, color: data.salesMetrics.expiringSoonCount > 0 ? '#DC2626' : undefined, module: 'sales' },
  ];
  const metrics = allMetrics.filter((m) => hasModule(m.module));

  const visibleWorkspaces = Object.entries(data.workspaceKPIs).filter(([key]) => hasModule(key));
  const visibleAttention = data.attentionItems.filter((item) => hasModule(item.dept));
  const visibleActivity = ACTIVITY.filter((item) => hasModule(item.module));

  // Add Needs Attention card (count based on filtered items)
  if (visibleAttention.length > 0) {
    metrics.push({
      label: 'Needs Attention',
      value: String(visibleAttention.length),
      icon: AlertTriangle,
      color: '#DC2626',
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light text-dark-text">Dashboard</h1>
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

      {/* Hero Metric Cards */}
      {metrics.length > 0 && (
        <div className={`grid gap-4 mb-8`} style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 5)}, minmax(0, 1fr))` }}>
          {metrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      )}

      {/* Workspace KPI Grid */}
      {visibleWorkspaces.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
            Workspace Overview
          </h2>
          <div className={`grid gap-4 mb-8`} style={{ gridTemplateColumns: `repeat(${Math.min(visibleWorkspaces.length, 5)}, minmax(0, 1fr))` }}>
            {visibleWorkspaces.map(([key, mod]) => (
              <button
                key={key}
                onClick={() => navigate(MODULE_PATHS[key])}
                className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all"
                style={{ borderLeftWidth: 4, borderLeftColor: DEPT_COLORS[key] }}
              >
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: DEPT_COLORS[key] }}>
                  {MODULE_LABELS[key]}
                </div>
                {mod.stats.map((stat, i) => (
                  <div key={i} className="text-sm text-dark-text leading-relaxed">
                    {stat}
                  </div>
                ))}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Bottom section — Activity + Attention */}
      {(visibleActivity.length > 0 || visibleAttention.length > 0) && (
        <div className="grid grid-cols-5 gap-6">
          {/* Left column — Recent Agent Activity */}
          {visibleActivity.length > 0 && (
            <div className={visibleAttention.length > 0 ? 'col-span-3' : 'col-span-5'}>
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
          {visibleAttention.length > 0 && (
            <div className={visibleActivity.length > 0 ? 'col-span-2' : 'col-span-5'}>
              <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
                Needs Attention
              </h2>
              <div className="flex flex-col gap-2">
                {visibleAttention.slice(0, 6).map((task) => (
                  <TaskCard key={task.id} task={task} onAction={() => {}} />
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
          context="Cross-department executive insights — HR, Finance, Purchasing, Sales, and Operations"
        />
      )}
    </div>
  );
}
