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
