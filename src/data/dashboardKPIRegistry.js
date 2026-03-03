/**
 * Dashboard KPI & Chart Registry
 *
 * Maps stable IDs → default labels, icons, and sensitivity tiers for each domain dashboard.
 * When a tenant has no dashboard_configs row, dashboards render using these defaults.
 * When config exists, the `id` anchors which KPI/chart to render; labels come from config.
 *
 * Sensitivity tiers:
 *   operational  — visible to all users (ticket counts, audits, safety)
 *   managerial   — ratios, trends, comparisons (CA ratio, QoQ, OT, variances)
 *   financial    — dollar amounts, budget data (budget $, actual $, spend $)
 */

// ─── Tier System ────────────────────────────────────────────────────────────

export const TIER_LEVELS = { operational: 0, managerial: 1, financial: 2 };

/**
 * Returns true if a user at `userTier` can see a metric with `metricSensitivity`.
 * Higher tier users can see everything at or below their level.
 */
export function canSeeTier(userTier, metricSensitivity) {
  return (TIER_LEVELS[userTier] ?? 2) >= (TIER_LEVELS[metricSensitivity] ?? 0);
}

// ─── Home Dashboard Registry ──────────────────────────────────────────────────

export const HOME_REGISTRY = {
  heroMetrics: [
    { id: 'total_properties',    defaultLabel: 'Properties',           icon: 'HardHat',       format: 'number',  sensitivity: 'operational' },
    { id: 'open_tickets',        defaultLabel: 'Open Tickets',         icon: 'ClipboardList', format: 'number',  sensitivity: 'operational' },
    { id: 'completion_rate',     defaultLabel: 'Ticket Completion',    icon: 'CheckCircle',   format: 'percent', sensitivity: 'operational' },
    { id: 'labor_variance',      defaultLabel: 'Labor Variance',       icon: 'DollarSign',    format: 'percent', sensitivity: 'financial' },
  ],
  workspaceCards: [
    { module: 'operations' },
    { module: 'labor' },
    { module: 'quality' },
    { module: 'timekeeping' },
    { module: 'safety' },
  ],
  sections: {
    needsAttention: { visible: true, maxItems: 12 },
    agentActivity: { visible: true },
  },
};

/**
 * Merge tenant home config with HOME_REGISTRY defaults.
 * Returns { heroMetrics, workspaceCards, sections }.
 * When metricTier is provided, filters out hero metrics above the user's tier.
 */
export function resolveHomeConfig(config, metricTier) {
  const tierFilter = metricTier
    ? (item) => canSeeTier(metricTier, item.sensitivity || 'operational')
    : () => true;

  // No config — use registry defaults
  if (!config || !config.heroMetrics) {
    return {
      heroMetrics: HOME_REGISTRY.heroMetrics
        .filter(tierFilter)
        .map((m, i) => ({
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

  // Build a sensitivity lookup from registry
  const regSensitivity = {};
  for (const m of HOME_REGISTRY.heroMetrics) regSensitivity[m.id] = m.sensitivity || 'operational';

  const heroMetrics = HOME_REGISTRY.heroMetrics
    .filter(tierFilter)
    .map((regItem, i) => {
      const cfg = configMetricMap[regItem.id];
      return {
        id: regItem.id,
        label: cfg?.label ?? regItem.defaultLabel,
        icon: cfg?.icon ?? regItem.icon,
        module: cfg?.module ?? regItem.module,
        format: cfg?.format ?? regItem.format,
        sensitivity: regItem.sensitivity,
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
      { id: 'total_tickets',   defaultLabel: 'Total Tickets',   icon: 'ClipboardList', sensitivity: 'operational' },
      { id: 'completed',       defaultLabel: 'Completed',       icon: 'CheckCircle',   sensitivity: 'operational' },
      { id: 'completion_rate', defaultLabel: 'Completion Rate',  icon: 'TrendingUp',    sensitivity: 'operational' },
      { id: 'open_tickets',    defaultLabel: 'Open Tickets',    icon: 'Clock',          sensitivity: 'operational' },
    ],
    charts: [
      { id: 'tickets_by_site',     defaultLabel: 'Tickets by Site',      sensitivity: 'operational' },
      { id: 'monthly_trend',       defaultLabel: 'Monthly Trend',        sensitivity: 'operational' },
      { id: 'category_breakdown',  defaultLabel: 'Category Breakdown',   sensitivity: 'operational' },
    ],
  },

  labor: {
    kpis: [
      { id: 'budget',    defaultLabel: 'Budget',    icon: 'DollarSign',    sensitivity: 'financial' },
      { id: 'actual',    defaultLabel: 'Actual',    icon: 'DollarSign',    sensitivity: 'financial' },
      { id: 'variance',  defaultLabel: 'Variance',  icon: 'AlertTriangle', sensitivity: 'financial' },
      { id: 'ot_hours',  defaultLabel: 'OT Hours',  icon: 'Clock',         sensitivity: 'managerial' },
    ],
    charts: [
      { id: 'budget_vs_actual_by_site', defaultLabel: 'Budget vs Actual by Site', sensitivity: 'financial' },
      { id: 'variance_trend',           defaultLabel: 'Variance Trend (%)',       sensitivity: 'managerial' },
      { id: 'ot_spend_by_site',         defaultLabel: 'OT Spend by Site',         sensitivity: 'financial' },
    ],
  },

  quality: {
    kpis: [
      { id: 'total_audits',    defaultLabel: 'Total Audits',       icon: 'Search',       sensitivity: 'operational' },
      { id: 'corrective_actions', defaultLabel: 'Corrective Actions', icon: 'AlertCircle', sensitivity: 'operational' },
      { id: 'ca_to_audit_ratio',  defaultLabel: 'CA-to-Audit Ratio', icon: 'BarChart3',   sensitivity: 'managerial' },
      { id: 'qoq_change',      defaultLabel: 'QoQ Change',         icon: 'TrendingUp',   sensitivity: 'managerial' },
    ],
    charts: [
      { id: 'audits_by_quarter',       defaultLabel: 'Audits by Quarter',         sensitivity: 'operational' },
      { id: 'corrective_actions_trend', defaultLabel: 'Corrective Actions Trend', sensitivity: 'managerial' },
    ],
  },

  timekeeping: {
    kpis: [
      { id: 'punch_acceptance', defaultLabel: 'Punch Acceptance', icon: 'CheckCircle',   sensitivity: 'operational' },
      { id: 'incomplete',       defaultLabel: 'Incomplete',       icon: 'Clock',          sensitivity: 'operational' },
      { id: 'manual_edits',    defaultLabel: 'Manual Edits',     icon: 'Edit3',          sensitivity: 'managerial' },
      { id: 'exceptions',      defaultLabel: 'Exceptions',       icon: 'AlertTriangle',  sensitivity: 'operational' },
    ],
    charts: [
      { id: 'acceptance_rate_trend', defaultLabel: 'Acceptance Rate Trend',  sensitivity: 'operational' },
      { id: 'exceptions_by_site',    defaultLabel: 'Exceptions by Site',     sensitivity: 'managerial' },
      { id: 'punch_status_breakdown', defaultLabel: 'Punch Status Breakdown', sensitivity: 'operational' },
    ],
  },

  safety: {
    kpis: [
      { id: 'total_recordables', defaultLabel: 'Total Recordables', icon: 'ShieldAlert',   sensitivity: 'operational' },
      { id: 'avg_trir',          defaultLabel: 'Avg TRIR',          icon: 'Activity',       sensitivity: 'operational' },
      { id: 'good_saves',        defaultLabel: 'Good Saves',        icon: 'ThumbsUp',       sensitivity: 'operational' },
      { id: 'near_misses',       defaultLabel: 'Near Misses',       icon: 'AlertTriangle',  sensitivity: 'managerial' },
    ],
    charts: [
      { id: 'recordables_by_site_quarter', defaultLabel: 'Recordables by Site & Quarter', sensitivity: 'operational' },
      { id: 'trir_trend',                  defaultLabel: 'TRIR Trend',                    sensitivity: 'operational' },
      { id: 'good_saves_by_site',          defaultLabel: 'Good Saves by Site',            sensitivity: 'operational' },
    ],
  },
};

// ─── Metric Catalog (flattened view of all metrics) ──────────────────────────

export const METRIC_CATALOG = (() => {
  const catalog = [];

  // Home hero metrics
  for (const m of HOME_REGISTRY.heroMetrics) {
    catalog.push({
      id: m.id,
      domain: 'home',
      type: 'hero',
      sensitivity: m.sensitivity || 'operational',
      defaultLabel: m.defaultLabel,
      icon: m.icon,
    });
  }

  // Domain KPIs and charts
  for (const [domain, reg] of Object.entries(DOMAIN_KPI_REGISTRY)) {
    for (const kpi of reg.kpis) {
      catalog.push({
        id: kpi.id,
        domain,
        type: 'kpi',
        sensitivity: kpi.sensitivity || 'operational',
        defaultLabel: kpi.defaultLabel,
        icon: kpi.icon,
      });
    }
    for (const chart of reg.charts) {
      catalog.push({
        id: chart.id,
        domain,
        type: 'chart',
        sensitivity: chart.sensitivity || 'operational',
        defaultLabel: chart.defaultLabel,
      });
    }
  }

  return catalog;
})();

/**
 * Returns catalog entries filtered by metric tier.
 */
export function filterCatalogByTier(tier) {
  return METRIC_CATALOG.filter(m => canSeeTier(tier, m.sensitivity));
}

/**
 * Merge tenant config with registry defaults.
 * Returns { kpis, charts } where each item has: id, label, icon, visible, order, sensitivity.
 * If config is null/undefined, returns registry defaults with all visible.
 * When metricTier is provided, filters out items above the user's tier.
 */
export function resolveConfig(domain, config, metricTier) {
  const registry = DOMAIN_KPI_REGISTRY[domain];
  if (!registry) return { kpis: [], charts: [] };

  const tierFilter = metricTier
    ? (item) => canSeeTier(metricTier, item.sensitivity || 'operational')
    : () => true;

  // No config — use registry defaults
  if (!config || !config.kpis) {
    return {
      kpis: registry.kpis
        .filter(tierFilter)
        .map((k, i) => ({
          id: k.id,
          label: k.defaultLabel,
          icon: k.icon,
          sensitivity: k.sensitivity,
          visible: true,
          order: i,
        })),
      charts: registry.charts
        .filter(tierFilter)
        .map((c, i) => ({
          id: c.id,
          label: c.defaultLabel,
          sensitivity: c.sensitivity,
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

  const kpis = registry.kpis
    .filter(tierFilter)
    .map((regItem, i) => {
      const cfg = configKpiMap[regItem.id];
      const rawLabel = cfg?.label ?? regItem.defaultLabel;
      return {
        id: regItem.id,
        label: typeof rawLabel === 'string' ? rawLabel : String(rawLabel ?? regItem.defaultLabel),
        icon: cfg?.icon ?? regItem.icon,
        sensitivity: regItem.sensitivity,
        visible: cfg?.visible ?? true,
        order: cfg?.order ?? i,
      };
    });

  const charts = registry.charts
    .filter(tierFilter)
    .map((regItem, i) => {
      const cfg = configChartMap[regItem.id];
      const rawLabel = cfg?.label ?? regItem.defaultLabel;
      return {
        id: regItem.id,
        label: typeof rawLabel === 'string' ? rawLabel : String(rawLabel ?? regItem.defaultLabel),
        sensitivity: regItem.sensitivity,
        visible: cfg?.visible ?? true,
        order: cfg?.order ?? i,
      };
    });

  // Sort by order
  kpis.sort((a, b) => a.order - b.order);
  charts.sort((a, b) => a.order - b.order);

  return { kpis, charts };
}
