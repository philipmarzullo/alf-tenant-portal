/**
 * Dashboard KPI & Chart Registry
 *
 * Maps stable IDs → default labels and icons for each domain dashboard.
 * When a tenant has no dashboard_configs row, dashboards render using these defaults.
 * When config exists, the `id` anchors which KPI/chart to render; labels come from config.
 */

// ─── Home Dashboard Registry ──────────────────────────────────────────────────

export const HOME_REGISTRY = {
  heroMetrics: [
    { id: 'total_apc',           defaultLabel: 'Total Annual APC',       icon: 'DollarSign',    module: 'sales',   format: 'currency' },
    { id: 'total_jobs',          defaultLabel: 'Total Job Count',        icon: 'HardHat',       module: 'ops',     format: 'number' },
    { id: 'outstanding_ar',      defaultLabel: 'Outstanding AR',         icon: 'Clock',         module: 'finance', format: 'currency' },
    { id: 'contracts_expiring',  defaultLabel: 'Contracts Expiring (90d)', icon: 'FileText',    module: 'sales',   format: 'number' },
  ],
  workspaceCards: [
    { module: 'hr' },
    { module: 'finance' },
    { module: 'purchasing' },
    { module: 'sales' },
    { module: 'ops' },
  ],
  sections: {
    needsAttention: { visible: true, maxItems: 12 },
    agentActivity: { visible: true },
  },
};

/**
 * Merge tenant home config with HOME_REGISTRY defaults.
 * Returns { heroMetrics, workspaceCards, sections }.
 */
export function resolveHomeConfig(config) {
  // No config — use registry defaults
  if (!config || !config.heroMetrics) {
    return {
      heroMetrics: HOME_REGISTRY.heroMetrics.map((m, i) => ({
        ...m,
        label: m.defaultLabel,
        visible: true,
        order: i,
      })),
      workspaceCards: HOME_REGISTRY.workspaceCards.map((w, i) => ({
        ...w,
        visible: true,
        order: i,
      })),
      sections: { ...HOME_REGISTRY.sections },
    };
  }

  // Merge hero metrics
  const configMetricMap = {};
  for (const m of config.heroMetrics || []) configMetricMap[m.id] = m;

  const heroMetrics = HOME_REGISTRY.heroMetrics.map((regItem, i) => {
    const cfg = configMetricMap[regItem.id];
    return {
      id: regItem.id,
      label: cfg?.label ?? regItem.defaultLabel,
      icon: cfg?.icon ?? regItem.icon,
      module: cfg?.module ?? regItem.module,
      format: cfg?.format ?? regItem.format,
      visible: cfg?.visible ?? true,
      order: cfg?.order ?? i,
    };
  });
  heroMetrics.sort((a, b) => a.order - b.order);

  // Merge workspace cards
  const configCardMap = {};
  for (const c of config.workspaceCards || []) configCardMap[c.module] = c;

  const workspaceCards = HOME_REGISTRY.workspaceCards.map((regItem, i) => {
    const cfg = configCardMap[regItem.module];
    return {
      module: regItem.module,
      visible: cfg?.visible ?? true,
      order: cfg?.order ?? i,
    };
  });
  workspaceCards.sort((a, b) => a.order - b.order);

  // Merge sections
  const sections = {
    needsAttention: {
      visible: config.sections?.needsAttention?.visible ?? true,
      maxItems: config.sections?.needsAttention?.maxItems ?? 12,
    },
    agentActivity: {
      visible: config.sections?.agentActivity?.visible ?? true,
    },
  };

  return { heroMetrics, workspaceCards, sections };
}

// ─── Domain Dashboard Registries ─────────────────────────────────────────────

// Icon names reference lucide-react exports — resolved at render time
export const DOMAIN_KPI_REGISTRY = {
  operations: {
    kpis: [
      { id: 'total_tickets',   defaultLabel: 'Total Tickets',   icon: 'ClipboardList' },
      { id: 'completed',       defaultLabel: 'Completed',       icon: 'CheckCircle' },
      { id: 'completion_rate', defaultLabel: 'Completion Rate',  icon: 'TrendingUp' },
      { id: 'open_tickets',    defaultLabel: 'Open Tickets',    icon: 'Clock' },
    ],
    charts: [
      { id: 'tickets_by_site',     defaultLabel: 'Tickets by Site' },
      { id: 'monthly_trend',       defaultLabel: 'Monthly Trend' },
      { id: 'category_breakdown',  defaultLabel: 'Category Breakdown' },
    ],
  },

  labor: {
    kpis: [
      { id: 'budget',    defaultLabel: 'Budget',    icon: 'DollarSign' },
      { id: 'actual',    defaultLabel: 'Actual',    icon: 'DollarSign' },
      { id: 'variance',  defaultLabel: 'Variance',  icon: 'AlertTriangle' },
      { id: 'ot_hours',  defaultLabel: 'OT Hours',  icon: 'Clock' },
    ],
    charts: [
      { id: 'budget_vs_actual_by_site', defaultLabel: 'Budget vs Actual by Site' },
      { id: 'variance_trend',           defaultLabel: 'Variance Trend (%)' },
      { id: 'ot_spend_by_site',         defaultLabel: 'OT Spend by Site' },
    ],
  },

  quality: {
    kpis: [
      { id: 'total_audits',    defaultLabel: 'Total Audits',       icon: 'Search' },
      { id: 'corrective_actions', defaultLabel: 'Corrective Actions', icon: 'AlertCircle' },
      { id: 'ca_to_audit_ratio',  defaultLabel: 'CA-to-Audit Ratio', icon: 'BarChart3' },
      { id: 'qoq_change',      defaultLabel: 'QoQ Change',         icon: 'TrendingUp' },
    ],
    charts: [
      { id: 'audits_by_quarter',       defaultLabel: 'Audits by Quarter' },
      { id: 'corrective_actions_trend', defaultLabel: 'Corrective Actions Trend' },
    ],
  },

  timekeeping: {
    kpis: [
      { id: 'punch_acceptance', defaultLabel: 'Punch Acceptance', icon: 'CheckCircle' },
      { id: 'incomplete',       defaultLabel: 'Incomplete',       icon: 'Clock' },
      { id: 'manual_edits',    defaultLabel: 'Manual Edits',     icon: 'Edit3' },
      { id: 'exceptions',      defaultLabel: 'Exceptions',       icon: 'AlertTriangle' },
    ],
    charts: [
      { id: 'acceptance_rate_trend', defaultLabel: 'Acceptance Rate Trend' },
      { id: 'exceptions_by_site',    defaultLabel: 'Exceptions by Site' },
      { id: 'punch_status_breakdown', defaultLabel: 'Punch Status Breakdown' },
    ],
  },

  safety: {
    kpis: [
      { id: 'total_recordables', defaultLabel: 'Total Recordables', icon: 'ShieldAlert' },
      { id: 'avg_trir',          defaultLabel: 'Avg TRIR',          icon: 'Activity' },
      { id: 'good_saves',        defaultLabel: 'Good Saves',        icon: 'ThumbsUp' },
      { id: 'near_misses',       defaultLabel: 'Near Misses',       icon: 'AlertTriangle' },
    ],
    charts: [
      { id: 'recordables_by_site_quarter', defaultLabel: 'Recordables by Site & Quarter' },
      { id: 'trir_trend',                  defaultLabel: 'TRIR Trend' },
      { id: 'good_saves_by_site',          defaultLabel: 'Good Saves by Site' },
    ],
  },
};

/**
 * Merge tenant config with registry defaults.
 * Returns { kpis, charts } where each item has: id, label, icon, visible, order.
 * If config is null/undefined, returns registry defaults with all visible.
 */
export function resolveConfig(domain, config) {
  const registry = DOMAIN_KPI_REGISTRY[domain];
  if (!registry) return { kpis: [], charts: [] };

  // No config — use registry defaults
  if (!config || !config.kpis) {
    return {
      kpis: registry.kpis.map((k, i) => ({
        id: k.id,
        label: k.defaultLabel,
        icon: k.icon,
        visible: true,
        order: i,
      })),
      charts: registry.charts.map((c, i) => ({
        id: c.id,
        label: c.defaultLabel,
        visible: true,
        order: i,
      })),
    };
  }

  // Config exists — merge with registry (config wins for label/visible/order)
  const configKpiMap = {};
  for (const k of config.kpis || []) configKpiMap[k.id] = k;

  const configChartMap = {};
  for (const c of config.charts || []) configChartMap[c.id] = c;

  const kpis = registry.kpis.map((regItem, i) => {
    const cfg = configKpiMap[regItem.id];
    return {
      id: regItem.id,
      label: cfg?.label ?? regItem.defaultLabel,
      icon: cfg?.icon ?? regItem.icon,
      visible: cfg?.visible ?? true,
      order: cfg?.order ?? i,
    };
  });

  const charts = registry.charts.map((regItem, i) => {
    const cfg = configChartMap[regItem.id];
    return {
      id: regItem.id,
      label: cfg?.label ?? regItem.defaultLabel,
      visible: cfg?.visible ?? true,
      order: cfg?.order ?? i,
    };
  });

  // Sort by order
  kpis.sort((a, b) => a.order - b.order);
  charts.sort((a, b) => a.order - b.order);

  return { kpis, charts };
}
