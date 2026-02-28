import { useMemo, useCallback, createContext, useContext, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Settings2, Share2, Bot } from 'lucide-react';
import { useTenantConfig } from '../../contexts/TenantConfigContext';
import { useDashboardConfigContext } from '../../contexts/DashboardConfigContext';
import { useUser } from '../../contexts/UserContext';
import { useRBAC } from '../../contexts/RBACContext';
import { MODULE_REGISTRY } from '../../data/moduleRegistry';
import AgentChatPanel from '../../components/shared/AgentChatPanel';
import ShareDashboardModal from '../../components/dashboards/ShareDashboardModal';
import SyncHealthBanner from '../../components/dashboards/SyncHealthBanner';
import useHomeSummary from '../../hooks/useHomeSummary';

const ALL_TABS = MODULE_REGISTRY.dashboards.pages.map((p) => ({
  key: p.key,
  label: p.label,
  path: p.path,
}));

// Domain key from path
const DOMAIN_BY_PATH = {
  '/dashboards': 'operations',
  '/dashboards/labor': 'labor',
  '/dashboards/quality': 'quality',
  '/dashboards/timekeeping': 'timekeeping',
  '/dashboards/safety': 'safety',
};

// Context to pass customize state down to domain dashboards
const DashboardCustomizeContext = createContext({ isLayoutCustomizing: false, setIsLayoutCustomizing: () => {} });
export function useDashboardCustomizeContext() {
  return useContext(DashboardCustomizeContext);
}

export default function DashboardsLayout() {
  const { getEnabledPages, tenantHasModule } = useTenantConfig();
  const { shares } = useDashboardConfigContext();
  const { isAdmin } = useUser();
  const { metricTier, allowedDomains } = useRBAC();
  const { data: summary } = useHomeSummary();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalKey, setShareModalKey] = useState('operations');
  const [shareModalLabel, setShareModalLabel] = useState('Operations');
  const [analyticsChatOpen, setAnalyticsChatOpen] = useState(false);

  // Track current path for share button
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboards';
  const currentDomain = DOMAIN_BY_PATH[currentPath] || 'operations';

  // Build data context for analytics agent
  const analyticsContext = useCallback(() => {
    if (!summary) return '';

    const parts = [`Current dashboard tab: ${currentDomain}`, '', 'Dashboard Data Summary:'];

    const hero = summary.hero;
    if (hero && typeof hero === 'object') {
      parts.push('\nOverall Metrics:');
      Object.entries(hero).forEach(([key, val]) => {
        if (val != null) parts.push(`  ${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`);
      });
    }

    const domains = summary.domains || {};
    Object.entries(domains).forEach(([domain, data]) => {
      if (allowedDomains.length && !allowedDomains.includes(domain)) return;
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
    parts.push(`Accessible domains: ${allowedDomains.length ? allowedDomains.join(', ') : 'all'}`);

    return parts.join('\n');
  }, [summary, currentDomain, metricTier, allowedDomains]);

  const tabs = useMemo(() => {
    const enabledKeys = getEnabledPages('dashboards');
    let filteredTabs = enabledKeys ? ALL_TABS.filter((t) => enabledKeys.includes(t.key)) : ALL_TABS;

    // Add shared tabs for non-admin users
    if (!isAdmin && shares.length > 0) {
      const sharedKeys = new Set(shares.map(s => s.dashboard_key));
      const existingKeys = new Set(filteredTabs.map(t => t.key));
      const sharedTabs = ALL_TABS.filter(t => sharedKeys.has(t.key) && !existingKeys.has(t.key));
      filteredTabs = [...filteredTabs, ...sharedTabs];
    }

    return filteredTabs;
  }, [getEnabledPages, shares, isAdmin]);

  function openShareModal() {
    const tab = ALL_TABS.find(t => t.key === currentDomain);
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

        {/* Tab nav */}
        <div className="flex items-center gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/dashboards'}
              className={({ isActive }) =>
                `px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  isActive
                    ? 'text-aa-blue border-aa-blue'
                    : 'text-secondary-text border-transparent hover:text-dark-text hover:border-gray-300'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        <SyncHealthBanner />
        <Outlet />

        {/* Share Modal */}
        <ShareDashboardModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          dashboardKey={shareModalKey}
          dashboardLabel={shareModalLabel}
        />

        {/* Analytics Agent Chat Panel */}
        {tenantHasModule('analytics') && (
          <AgentChatPanel
            open={analyticsChatOpen}
            onClose={() => setAnalyticsChatOpen(false)}
            agentKey="analytics"
            agentName="Analytics Agent"
            context={`Operational data analysis — viewing ${currentDomain} dashboard`}
            systemPromptSuffix={analyticsContext()}
          />
        )}
      </div>
    </DashboardCustomizeContext.Provider>
  );
}
