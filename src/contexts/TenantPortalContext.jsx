import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useTenantId } from './TenantIdContext';

const TenantPortalContext = createContext(null);

/**
 * Maps a tool_key from the DB to the route path used in App.jsx.
 * Some tools have legacy paths that differ from their tool_key.
 */
const TOOL_PATH_OVERRIDES = {
  qbu: '/portal/tools/qbu',
  proposal: '/portal/tools/sales-deck',
  'transition-plan': '/portal/tools/transition-plan',
  'incident-report': '/portal/tools/incident-report',
  'training-plan': '/portal/tools/training-plan',
  budget: '/portal/tools/budget',
  'rfp-response': '/portal/tools/rfp-response',
};

/**
 * Maps a department_key from tenant_workspaces to the route path used in App.jsx.
 * Most map to /{department_key} but ops is an exception.
 */
const WORKSPACE_PATH_OVERRIDES = {
  operations: '/portal/ops',
};

export function TenantPortalProvider({ children }) {
  const { tenantId } = useTenantId();
  const [workspaces, setWorkspaces] = useState([]);
  const [tools, setTools] = useState([]);
  const [dashboardDomains, setDashboardDomains] = useState([]);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [navSections, setNavSections] = useState([]);
  const [moduleRegistry, setModuleRegistry] = useState([]);
  const [agents, setAgents] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !tenantId) {
      setWorkspaces([]);
      setTools([]);
      setDashboardDomains([]);
      setNavSections([]);
      setModuleRegistry([]);
      setAgents([]);
      setConnections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    async function fetchAll() {
      const [wsRes, toolsRes, domainsRes, profileRes, navRes, moduleRes, agentsRes, connRes] = await Promise.all([
        supabase
          .from('tenant_workspaces')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('tenant_tools')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('tenant_dashboard_domains')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('tenant_company_profiles')
          .select('*')
          .eq('tenant_id', tenantId)
          .single(),
        supabase
          .from('tenant_nav_sections')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('tenant_module_registry')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('tenant_agents')
          .select('id, agent_key, name, workspace_id, is_active, knowledge_scopes, source')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .is('deleted_at', null),
        supabase
          .from('tenant_connections')
          .select('*')
          .eq('tenant_id', tenantId),
      ]);

      if (cancelled) return;

      setWorkspaces(wsRes.data || []);
      setTools(toolsRes.data || []);
      setDashboardDomains(domainsRes.data || []);
      setCompanyProfile(profileRes.data || null);
      setNavSections(navRes.data || []);
      setModuleRegistry(moduleRes.data || []);
      setAgents(agentsRes.data || []);
      setConnections(connRes.data || []);
      setLoading(false);
    }

    fetchAll().catch((err) => {
      if (cancelled) return;
      console.error('Failed to fetch tenant portal data:', err);
      setWorkspaces([]);
      setTools([]);
      setDashboardDomains([]);
      setNavSections([]);
      setModuleRegistry([]);
      setAgents([]);
      setConnections([]);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [tenantId]);

  /** Get a tool config by its tool_key */
  const getToolByKey = useCallback(
    (toolKey) => tools.find((t) => t.tool_key === toolKey) || null,
    [tools],
  );

  /** Get a dashboard domain by its domain_key */
  const getDomainByKey = useCallback(
    (domainKey) => dashboardDomains.find((d) => d.domain_key === domainKey) || null,
    [dashboardDomains],
  );

  /** Get the route path for a workspace by department_key */
  const getWorkspacePath = useCallback(
    (departmentKey) => WORKSPACE_PATH_OVERRIDES[departmentKey] || `/portal/${departmentKey}`,
    [],
  );

  /** Get the route path for a tool by tool_key */
  const getToolPath = useCallback(
    (toolKey) => TOOL_PATH_OVERRIDES[toolKey] || `/portal/tools/${toolKey}`,
    [],
  );

  /** Re-fetch all portal data from DB */
  const refreshAll = useCallback(async () => {
    if (!supabase || !tenantId) return;
    setLoading(true);
    try {
      const [wsRes, toolsRes, domainsRes, profileRes, navRes, moduleRes, agentsRes, connRes] = await Promise.all([
        supabase.from('tenant_workspaces').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('sort_order'),
        supabase.from('tenant_tools').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('sort_order'),
        supabase.from('tenant_dashboard_domains').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('sort_order'),
        supabase.from('tenant_company_profiles').select('*').eq('tenant_id', tenantId).single(),
        supabase.from('tenant_nav_sections').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('sort_order'),
        supabase.from('tenant_module_registry').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('sort_order'),
        supabase.from('tenant_agents').select('id, agent_key, name, workspace_id, is_active, knowledge_scopes').eq('tenant_id', tenantId).eq('is_active', true),
        supabase.from('tenant_connections').select('*').eq('tenant_id', tenantId),
      ]);
      setWorkspaces(wsRes.data || []);
      setTools(toolsRes.data || []);
      setDashboardDomains(domainsRes.data || []);
      setCompanyProfile(profileRes.data || null);
      setNavSections(navRes.data || []);
      setModuleRegistry(moduleRes.data || []);
      setAgents(agentsRes.data || []);
      setConnections(connRes.data || []);
    } catch (err) {
      console.error('Failed to refresh tenant portal data:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const profileStatus = companyProfile?.profile_status || null;

  /** Get the route path for a dashboard domain by domain_key */
  const getDomainPath = useCallback(
    (domainKey) => {
      const first = dashboardDomains[0];
      return first && first.domain_key === domainKey ? '/portal/dashboards' : `/portal/dashboards/${domainKey}`;
    },
    [dashboardDomains],
  );

  /**
   * Get workspace color by department_key, with neutral gray fallback.
   */
  const getWorkspaceColor = useCallback(
    (deptKey) => {
      const ws = workspaces.find(w => w.department_key === deptKey);
      return ws?.color || '#6B7280';
    },
    [workspaces],
  );

  const connectionTier = useMemo(() => {
    const active = connections.filter(c => c.status === 'connected');
    const hasEmail = active.some(c => c.connection_type === 'email');
    if (!hasEmail) return 0;
    const hasData = active.some(c => ['erp', 'inspection', 'crm'].includes(c.connection_type));
    return hasData ? 2 : 1;
  }, [connections]);

  const hasCapability = useCallback(
    (flag) => connections.some(c => c.status === 'connected' && c.capabilities?.includes(flag)),
    [connections],
  );

  const value = useMemo(
    () => ({
      workspaces,
      tools,
      dashboardDomains,
      companyProfile,
      profileStatus,
      navSections,
      moduleRegistry,
      agents,
      connections,
      connectionTier,
      hasCapability,
      loading,
      refreshAll,
      getToolByKey,
      getDomainByKey,
      getWorkspacePath,
      getToolPath,
      getDomainPath,
      getWorkspaceColor,
    }),
    [workspaces, tools, dashboardDomains, companyProfile, profileStatus, navSections, moduleRegistry, agents, connections, connectionTier, hasCapability, loading, refreshAll, getToolByKey, getDomainByKey, getWorkspacePath, getToolPath, getDomainPath, getWorkspaceColor],
  );

  return (
    <TenantPortalContext.Provider value={value}>
      {children}
    </TenantPortalContext.Provider>
  );
}

export function useTenantPortal() {
  const ctx = useContext(TenantPortalContext);
  if (!ctx) throw new Error('useTenantPortal must be used within TenantPortalProvider');
  return ctx;
}
