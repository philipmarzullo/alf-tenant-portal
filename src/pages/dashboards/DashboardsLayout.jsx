import { useMemo, useCallback, createContext, useContext, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Share2, Bot } from 'lucide-react';
import { useTenantConfig } from '../../contexts/TenantConfigContext';
import { useDashboardConfigContext } from '../../contexts/DashboardConfigContext';
import { useUser } from '../../contexts/UserContext';
import { useRBAC } from '../../contexts/RBACContext';
import { useTenantPortal } from '../../contexts/TenantPortalContext';
import { DashboardDataProvider, useDashboardDataContext } from '../../contexts/DashboardDataContext';
import AgentChatPanel from '../../components/shared/AgentChatPanel';
import ShareDashboardModal from '../../components/dashboards/ShareDashboardModal';
import SyncHealthBanner from '../../components/dashboards/SyncHealthBanner';

// Domain-specific Snowflake query recipes — injected into the analytics agent context
// so it knows the exact views, columns, and SQL patterns for each dashboard.
const DOMAIN_QUERY_RECIPES = {
  turnover: `Use FACT_EMPLOYEE_WORKFORCE_DAILY for turnover analysis.
Key columns: DATE_KEY, EMPLOYEE_KEY, PRIMARY_JOB_KEY, IS_ACTIVE_FLAG, IS_TERMINATION_INCLUDED_IN_TURNOVER_FLAG.
Join DIM_DATE d ON d.DATE_KEY = w.DATE_KEY for dates. Join DIM_JOB j ON j.JOB_KEY = w.PRIMARY_JOB_KEY for job info.

Monthly turnover:
SELECT TO_CHAR(d.CALENDAR_DATE, 'YYYY-MM') AS month,
  COUNT(DISTINCT CASE WHEN w.IS_TERMINATION_INCLUDED_IN_TURNOVER_FLAG = 1 THEN w.EMPLOYEE_KEY END) AS termed,
  COUNT(DISTINCT CASE WHEN w.IS_ACTIVE_FLAG = 1 THEN w.EMPLOYEE_KEY END) AS active_employees
FROM FACT_EMPLOYEE_WORKFORCE_DAILY w
JOIN DIM_DATE d ON d.DATE_KEY = w.DATE_KEY
WHERE d.CALENDAR_DATE >= '2025-01-01'
GROUP BY TO_CHAR(d.CALENDAR_DATE, 'YYYY-MM') ORDER BY month

Turnover by job:
SELECT j.JOB_NUMBER, j.JOB_NAME,
  COUNT(DISTINCT CASE WHEN w.IS_TERMINATION_INCLUDED_IN_TURNOVER_FLAG = 1 THEN w.EMPLOYEE_KEY END) AS termed,
  COUNT(DISTINCT CASE WHEN w.IS_ACTIVE_FLAG = 1 THEN w.EMPLOYEE_KEY END) AS active
FROM FACT_EMPLOYEE_WORKFORCE_DAILY w
JOIN DIM_DATE d ON d.DATE_KEY = w.DATE_KEY
JOIN DIM_JOB j ON j.JOB_KEY = w.PRIMARY_JOB_KEY
WHERE d.CALENDAR_DATE >= '2025-01-01'
GROUP BY j.JOB_NUMBER, j.JOB_NAME ORDER BY termed DESC

For employee-level term details, use FACT_EMPLOYEE_STATUS_HISTORY (has PRIMARY_JOB_KEY, EMPLOYEE_KEY, DATE_KEY).
For employee names/departments, join DIM_EMPLOYEE e ON e.EMPLOYEE_KEY = w.EMPLOYEE_KEY.
DIM_EMPLOYEE columns: EMPLOYEE_FIRST_NAME, EMPLOYEE_LAST_NAME, EMPLOYEE_JOB_TITLE, EMPLOYEE_DEPARTMENT_NAME, EMPLOYEE_PRIMARY_JOB_NUMBER.`,

  inspections: `Use FACT_CHECKPOINT (inspection headers) and FACT_CHECKPOINT_LINEITEM (individual items).
Key FACT_CHECKPOINT columns: CHECKPOINT_ID, JOB_KEY, CHECKPOINT_PERFORMED_DATE_KEY, CHECKPOINT_TEMPLATE_DESCRIPTION.
Key LINEITEM columns: CHECKPOINT_ID, JOB_KEY, CHECKPOINT_PERFORMED_DATE_KEY, CHECKPOINT_AREA_LABEL, CHECKPOINT_ITEM_LABEL, IS_CHECKPOINT_ITEM_DEFICIENT_FLAG, IS_CHECKPOINT_ITEM_DEFICIENCY_OPEN_FLAG, IS_CHECKPOINT_ITEM_DEFICIENCY_CLOSED_FLAG, CHECKPOINT_ITEM_DEFICIENCY_DETAIL_TEXT, CHECKPOINT_ITEM_TYPE_LABEL.
Join DIM_DATE d ON d.DATE_KEY = li.CHECKPOINT_PERFORMED_DATE_KEY. Join DIM_JOB j ON j.JOB_KEY = li.JOB_KEY.

Deficiency trend:
SELECT DATE_TRUNC('month', d.CALENDAR_DATE) AS period, COUNT(*) AS total_items,
  SUM(CASE WHEN li.IS_CHECKPOINT_ITEM_DEFICIENT_FLAG = 1 THEN 1 ELSE 0 END) AS deficient
FROM FACT_CHECKPOINT_LINEITEM li
JOIN DIM_DATE d ON d.DATE_KEY = li.CHECKPOINT_PERFORMED_DATE_KEY
WHERE d.CALENDAR_DATE >= '2025-01-01'
GROUP BY period ORDER BY period

Deficiency by area:
SELECT li.CHECKPOINT_AREA_LABEL AS area, COUNT(*) AS total,
  SUM(CASE WHEN li.IS_CHECKPOINT_ITEM_DEFICIENT_FLAG = 1 THEN 1 ELSE 0 END) AS deficient
FROM FACT_CHECKPOINT_LINEITEM li
JOIN DIM_DATE d ON d.DATE_KEY = li.CHECKPOINT_PERFORMED_DATE_KEY
WHERE d.CALENDAR_DATE >= '2025-01-01'
GROUP BY area HAVING deficient > 0 ORDER BY deficient DESC

Job detail:
SELECT j.JOB_NUMBER, j.JOB_NAME, COUNT(*) AS total_items,
  SUM(CASE WHEN li.IS_CHECKPOINT_ITEM_DEFICIENT_FLAG = 1 THEN 1 ELSE 0 END) AS deficient
FROM FACT_CHECKPOINT_LINEITEM li
JOIN DIM_DATE d ON d.DATE_KEY = li.CHECKPOINT_PERFORMED_DATE_KEY
JOIN DIM_JOB j ON j.JOB_KEY = li.JOB_KEY
WHERE d.CALENDAR_DATE >= '2025-01-01'
GROUP BY j.JOB_NUMBER, j.JOB_NAME ORDER BY deficient DESC

VP/Manager filter columns: j.JOB_TIER_08_CURRENT_VALUE_LABEL (VP), j.JOB_TIER_03_CURRENT_VALUE_LABEL (Manager).
Inspection types: fc.CHECKPOINT_TEMPLATE_DESCRIPTION (e.g. contains 'Safety' or 'Commercial').`,

  'action-items': `Use FACT_CHECKPOINT_LINEITEM filtered to deficient items.
Key columns: CHECKPOINT_ID, CHECKPOINT_ITEM_LABEL, CHECKPOINT_PERFORMED_DATE_KEY, IS_CHECKPOINT_ITEM_DEFICIENT_FLAG, IS_CHECKPOINT_ITEM_DEFICIENCY_OPEN_FLAG, IS_CHECKPOINT_ITEM_DEFICIENCY_CLOSED_FLAG, CHECKPOINT_ITEM_DEFICIENCY_DETAIL_TEXT, CHECKPOINT_ITEM_TYPE_LABEL, CHECKPOINT_SECTION_LABEL.
Join DIM_DATE d ON d.DATE_KEY = li.CHECKPOINT_PERFORMED_DATE_KEY. Join DIM_JOB j ON j.JOB_KEY = li.JOB_KEY.

Action items list:
SELECT li.CHECKPOINT_ID, li.CHECKPOINT_ITEM_LABEL AS description, d.CALENDAR_DATE AS comment_date,
  CASE WHEN li.IS_CHECKPOINT_ITEM_DEFICIENCY_OPEN_FLAG = 1 THEN 'Open' ELSE 'Closed' END AS status,
  li.CHECKPOINT_ITEM_DEFICIENCY_DETAIL_TEXT AS comment, j.JOB_NUMBER, j.JOB_NAME
FROM FACT_CHECKPOINT_LINEITEM li
JOIN DIM_DATE d ON d.DATE_KEY = li.CHECKPOINT_PERFORMED_DATE_KEY
JOIN DIM_JOB j ON j.JOB_KEY = li.JOB_KEY
WHERE li.IS_CHECKPOINT_ITEM_DEFICIENT_FLAG = 1 AND d.CALENDAR_DATE >= '2025-01-01'
ORDER BY d.CALENDAR_DATE DESC`,

  'work-tickets': `Use FACT_WORK_SCHEDULE_TICKET for work ticket data.
Key columns: WORK_TICKET_NUMBER, JOB_KEY, WORK_TICKET_SCHEDULED_DATE_KEY, WORK_TICKET_COMPLETED_DATE_KEY, WORK_SCHEDULE_TYPE_LABEL, WORK_TICKET_COMPLETION_NOTES, IS_WORK_TICKET_COMPLETED_FLAG.
Join DIM_DATE ds ON ds.DATE_KEY = t.WORK_TICKET_SCHEDULED_DATE_KEY (scheduled date).
LEFT JOIN DIM_DATE dc ON dc.DATE_KEY = t.WORK_TICKET_COMPLETED_DATE_KEY (completion date).
Join DIM_JOB j ON j.JOB_KEY = t.JOB_KEY. LEFT JOIN DIM_WORK_SCHEDULE_TASK tk ON tk.WORK_SCHEDULE_TASK_KEY = t.WORK_SCHEDULE_TASK_KEY.

Work tickets summary:
SELECT t.WORK_SCHEDULE_TYPE_LABEL AS type, t.IS_WORK_TICKET_COMPLETED_FLAG AS completed,
  COUNT(*) AS cnt
FROM FACT_WORK_SCHEDULE_TICKET t
JOIN DIM_DATE ds ON ds.DATE_KEY = t.WORK_TICKET_SCHEDULED_DATE_KEY
WHERE ds.CALENDAR_DATE >= '2025-01-01'
GROUP BY type, completed ORDER BY cnt DESC

DIM_JOB address columns: JOB_ADDRESS_LINE_1, JOB_CITY, JOB_STATE_CODE.`,

  'work-tickets-qbu': `Use FACT_WORK_SCHEDULE_TICKET for work ticket data.
Key columns: WORK_TICKET_NUMBER, JOB_KEY, WORK_TICKET_SCHEDULED_DATE_KEY, WORK_TICKET_COMPLETED_DATE_KEY, WORK_SCHEDULE_TYPE_LABEL, WORK_TICKET_COMPLETION_NOTES, IS_WORK_TICKET_COMPLETED_FLAG.
Join DIM_DATE ds ON ds.DATE_KEY = t.WORK_TICKET_SCHEDULED_DATE_KEY (scheduled date).
LEFT JOIN DIM_DATE dc ON dc.DATE_KEY = t.WORK_TICKET_COMPLETED_DATE_KEY (completion date).
Join DIM_JOB j ON j.JOB_KEY = t.JOB_KEY. LEFT JOIN DIM_WORK_SCHEDULE_TASK tk ON tk.WORK_SCHEDULE_TASK_KEY = t.WORK_SCHEDULE_TASK_KEY.

Work tickets summary:
SELECT t.WORK_SCHEDULE_TYPE_LABEL AS type, t.IS_WORK_TICKET_COMPLETED_FLAG AS completed,
  COUNT(*) AS cnt
FROM FACT_WORK_SCHEDULE_TICKET t
JOIN DIM_DATE ds ON ds.DATE_KEY = t.WORK_TICKET_SCHEDULED_DATE_KEY
WHERE ds.CALENDAR_DATE >= '2025-01-01'
GROUP BY type, completed ORDER BY cnt DESC

DIM_JOB address columns: JOB_ADDRESS_LINE_1, JOB_CITY, JOB_STATE_CODE.`,

  'ops-kpi-qms': `Use DIM_JOB + FACT_CHECKPOINT + FACT_CHECKPOINT_LINEITEM for ops KPIs.
DIM_JOB columns: JOB_KEY, JOB_NUMBER, JOB_NAME, JOB_TIER_08_CURRENT_VALUE_LABEL (VP), JOB_TIER_03_CURRENT_VALUE_LABEL (Manager), IS_JOB_ACTIVE_FLAG.

VP summary with inspection counts:
SELECT j.JOB_TIER_08_CURRENT_VALUE_LABEL AS VP, COUNT(DISTINCT j.JOB_KEY) AS job_count,
  COUNT(DISTINCT CASE WHEN fc.CHECKPOINT_TEMPLATE_DESCRIPTION LIKE '%Safety%' THEN fc.CHECKPOINT_ID END) AS safety_inspections,
  COUNT(DISTINCT CASE WHEN fc.CHECKPOINT_TEMPLATE_DESCRIPTION LIKE '%Commercial%' THEN fc.CHECKPOINT_ID END) AS commercial_inspections
FROM DIM_JOB j
LEFT JOIN FACT_CHECKPOINT fc ON fc.JOB_KEY = j.JOB_KEY
LEFT JOIN DIM_DATE d ON d.DATE_KEY = fc.CHECKPOINT_PERFORMED_DATE_KEY
WHERE j.IS_JOB_ACTIVE_FLAG = 1 AND (d.CALENDAR_DATE >= '2025-01-01' OR d.CALENDAR_DATE IS NULL)
GROUP BY VP ORDER BY VP

Deficiency closure speed:
SELECT j.JOB_TIER_08_CURRENT_VALUE_LABEL AS VP,
  AVG(CASE WHEN li.IS_CHECKPOINT_ITEM_DEFICIENCY_CLOSED_FLAG = 1 AND li.CHECKPOINT_DEFICIENT_ITEM_CLOSED_TIMESTAMP IS NOT NULL
    THEN DATEDIFF('day', d.CALENDAR_DATE, li.CHECKPOINT_DEFICIENT_ITEM_CLOSED_TIMESTAMP) END) AS avg_close_days
FROM DIM_JOB j
JOIN FACT_CHECKPOINT_LINEITEM li ON li.JOB_KEY = j.JOB_KEY
JOIN DIM_DATE d ON d.DATE_KEY = li.CHECKPOINT_PERFORMED_DATE_KEY
WHERE li.IS_CHECKPOINT_ITEM_DEFICIENT_FLAG = 1 AND j.IS_JOB_ACTIVE_FLAG = 1
GROUP BY VP ORDER BY avg_close_days DESC

Key column: CHECKPOINT_DEFICIENT_ITEM_CLOSED_TIMESTAMP (actual timestamp, not a DATE_KEY — no DIM_DATE join needed for this one).`,
};

// Context to pass customize state down to domain dashboards
const DashboardCustomizeContext = createContext({ isLayoutCustomizing: false, setIsLayoutCustomizing: () => {} });
export function useDashboardCustomizeContext() {
  return useContext(DashboardCustomizeContext);
}

export default function DashboardsLayout() {
  const { tenantHasModule } = useTenantConfig();
  const { shares } = useDashboardConfigContext();
  const { isAdmin } = useUser();
  const { metricTier, allowedDomains } = useRBAC();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalKey, setShareModalKey] = useState('operations');
  const [shareModalLabel, setShareModalLabel] = useState('Operations');
  const [analyticsChatOpen, setAnalyticsChatOpen] = useState(false);

  // Dynamic dashboard domains from tenant config
  const { dashboardDomains, getDomainPath } = useTenantPortal();

  const allTabs = useMemo(() =>
    dashboardDomains.map((d) => ({
      key: d.domain_key,
      label: typeof d.name === 'string' ? d.name : String(d.name || d.domain_key),
      path: getDomainPath(d.domain_key),
    })),
    [dashboardDomains, getDomainPath]
  );

  const domainByPath = useMemo(() => {
    const map = {};
    dashboardDomains.forEach((d) => {
      map[getDomainPath(d.domain_key)] = d.domain_key;
    });
    return map;
  }, [dashboardDomains, getDomainPath]);

  // Track current path for share button
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/portal/dashboards';
  const currentDomain = domainByPath[currentPath] || dashboardDomains[0]?.domain_key || 'operations';

  // Build data context for analytics agent from active dashboard data
  const buildAnalyticsContext = useCallback((dashboardState) => {
    const { activeDomain, data, filters } = dashboardState || {};
    const domain = activeDomain || currentDomain;

    const parts = [`Current dashboard: ${domain}`];

    if (filters && typeof filters === 'object') {
      const activeFilters = Object.entries(filters)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      if (activeFilters) parts.push(`Active filters: ${activeFilters}`);
    }

    if (data && typeof data === 'object') {
      // KPIs
      if (data.kpis && typeof data.kpis === 'object') {
        parts.push('\nKPIs currently displayed:');
        Object.entries(data.kpis).forEach(([k, v]) => {
          if (v != null) parts.push(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
        });
      }

      // Highlights (pre-summarized by each dashboard)
      if (Array.isArray(data.highlights)) {
        parts.push('\nKey highlights:');
        data.highlights.forEach(h => parts.push(`  - ${h}`));
      }

      // Sections (tables/charts summarized by each dashboard)
      if (data.sections && typeof data.sections === 'object') {
        Object.entries(data.sections).forEach(([name, rows]) => {
          if (!Array.isArray(rows) || rows.length === 0) return;
          parts.push(`\n${name} (top ${Math.min(rows.length, 10)}):`);
          rows.slice(0, 10).forEach(r => {
            parts.push(`  ${typeof r === 'string' ? r : JSON.stringify(r)}`);
          });
        });
      }
    }

    // Inject domain-specific query recipes
    const recipes = DOMAIN_QUERY_RECIPES[domain];
    if (recipes) {
      parts.push(`\n## Query Recipes for ${domain} dashboard`);
      parts.push(recipes);
    }

    parts.push(`\nUser metric tier: ${metricTier}`);
    parts.push(`Accessible domains: ${allowedDomains.length ? allowedDomains.join(', ') : 'all'}`);

    return parts.join('\n');
  }, [currentDomain, metricTier, allowedDomains]);

  const tabs = useMemo(() => {
    // Admins see all tabs; non-admins filtered by allowedDomains from RBAC
    let filteredTabs = isAdmin
      ? [...allTabs]
      : allTabs.filter(t => allowedDomains.includes(t.key));

    // Shared dashboards can add extras for non-admins
    if (!isAdmin && shares.length > 0) {
      const sharedKeys = new Set(shares.map(s => s.dashboard_key));
      const existingKeys = new Set(filteredTabs.map(t => t.key));
      const sharedTabs = allTabs.filter(t => sharedKeys.has(t.key) && !existingKeys.has(t.key));
      filteredTabs = [...filteredTabs, ...sharedTabs];
    }

    return filteredTabs;
  }, [shares, isAdmin, allTabs, allowedDomains]);

  // Redirect if user lands on /portal/dashboards but default domain (first tab) isn't allowed
  const location = useLocation();
  const isDefaultRoute = location.pathname === '/portal/dashboards' || location.pathname === '/portal/dashboards/';
  const defaultDomainKey = dashboardDomains[0]?.domain_key;
  const needsRedirect = !isAdmin && isDefaultRoute && tabs.length > 0 && defaultDomainKey && !allowedDomains.includes(defaultDomainKey);

  if (needsRedirect) {
    return <Navigate to={tabs[0].path} replace />;
  }

  function openShareModal() {
    const tab = allTabs.find(t => t.key === currentDomain);
    setShareModalKey(currentDomain);
    setShareModalLabel(tab?.label || currentDomain);
    setShareModalOpen(true);
  }

  return (
    <DashboardCustomizeContext.Provider value={{}}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-light text-dark-text">Dashboards</h1>
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
                onClick={openShareModal}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-secondary-text bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Share2 size={16} />
                Share
              </button>
            )}
          </div>
        </div>

        <SyncHealthBanner />
        <DashboardDataProvider>
          <Outlet />

          {/* Analytics Agent Chat Panel — inside provider so it reads dashboard data */}
          {tenantHasModule('analytics') && (
            <AnalyticsChatBridge
              open={analyticsChatOpen}
              onClose={() => setAnalyticsChatOpen(false)}
              currentDomain={currentDomain}
              buildContext={buildAnalyticsContext}
            />
          )}
        </DashboardDataProvider>

        {/* Share Modal */}
        <ShareDashboardModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          dashboardKey={shareModalKey}
          dashboardLabel={shareModalLabel}
        />
      </div>
    </DashboardCustomizeContext.Provider>
  );
}

/** Reads DashboardDataContext and passes built context string to AgentChatPanel */
function AnalyticsChatBridge({ open, onClose, currentDomain, buildContext }) {
  const dashboardState = useDashboardDataContext();
  const suffix = buildContext(dashboardState);

  return (
    <AgentChatPanel
      open={open}
      onClose={onClose}
      agentKey="analytics"
      agentName="Analytics Agent"
      context={`Operational data analysis — viewing ${dashboardState.activeDomain || currentDomain} dashboard`}
      systemPromptSuffix={suffix}
    />
  );
}
