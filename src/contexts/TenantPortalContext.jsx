import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TOOL_REGISTRY } from '../data/toolRegistry';
import { MODULE_REGISTRY } from '../data/moduleRegistry';
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
};

/**
 * Maps a department_key from tenant_workspaces to the route path used in App.jsx.
 * Most map to /{department_key} but ops is an exception.
 */
const WORKSPACE_PATH_OVERRIDES = {
  operations: '/portal/ops',
};

/**
 * Build hardcoded workspace fallbacks from MODULE_REGISTRY.
 */
function buildWorkspaceFallbacks() {
  const workspacePages = MODULE_REGISTRY.hr ? ['hr', 'finance', 'purchasing', 'sales', 'ops'] : [];
  return workspacePages.map((key, i) => ({
    department_key: key,
    name: MODULE_REGISTRY[key]?.label || key,
    icon: MODULE_REGISTRY[key]?.icon || 'ClipboardList',
    description: MODULE_REGISTRY[key]?.description || '',
    sort_order: i,
    is_active: true,
    _fallback: true,
  }));
}

/**
 * Build hardcoded tool fallbacks from TOOL_REGISTRY.
 */
function buildToolFallbacks() {
  return Object.values(TOOL_REGISTRY).map((t, i) => ({
    tool_key: t.key,
    name: t.label,
    description: t.description || '',
    icon: t.icon || 'Wrench',
    agent_key: t.agentKey,
    action_key: t.actionKey,
    intake_schema: t.intakeSchema || null,
    output_format: t.outputFormat || 'document',
    sort_order: i,
    is_active: true,
    _fallback: true,
  }));
}

/**
 * Default domain metadata for fallback rendering (colors + icons).
 */
const DOMAIN_DEFAULTS = {
  operations: { color: '#4B5563', icon: 'clipboard-list' },
  labor: { color: '#009ADE', icon: 'dollar-sign' },
  quality: { color: '#7C3AED', icon: 'shield' },
  timekeeping: { color: '#0D9488', icon: 'clock' },
  safety: { color: '#DC2626', icon: 'alert-triangle' },
};

/**
 * Build hardcoded dashboard domain fallbacks from MODULE_REGISTRY.
 */
function buildDomainFallbacks() {
  const pages = MODULE_REGISTRY.dashboards?.pages || [];
  return pages.map((p, i) => ({
    domain_key: p.key,
    name: p.label,
    description: '',
    color: DOMAIN_DEFAULTS[p.key]?.color || '#4B5563',
    icon: DOMAIN_DEFAULTS[p.key]?.icon || 'clipboard-list',
    sort_order: i,
    is_active: true,
    _fallback: true,
  }));
}

export function TenantPortalProvider({ children }) {
  const { tenantId } = useTenantId();
  const [workspaces, setWorkspaces] = useState([]);
  const [tools, setTools] = useState([]);
  const [dashboardDomains, setDashboardDomains] = useState([]);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !tenantId) {
      // No DB available — use hardcoded fallbacks
      setWorkspaces(buildWorkspaceFallbacks());
      setTools(buildToolFallbacks());
      setDashboardDomains(buildDomainFallbacks());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchAll() {
      const [wsRes, toolsRes, domainsRes, profileRes] = await Promise.all([
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
      ]);

      if (cancelled) return;

      // Use DB data if available, otherwise fall back to hardcoded
      setWorkspaces(
        wsRes.data?.length ? wsRes.data : buildWorkspaceFallbacks()
      );
      setTools(
        toolsRes.data?.length ? toolsRes.data : buildToolFallbacks()
      );
      setDashboardDomains(
        domainsRes.data?.length ? domainsRes.data : buildDomainFallbacks()
      );
      setCompanyProfile(profileRes.data || null);
      setLoading(false);
    }

    fetchAll().catch((err) => {
      if (cancelled) return;
      console.error('Failed to fetch tenant portal data:', err);
      // Degrade to fallbacks
      setWorkspaces(buildWorkspaceFallbacks());
      setTools(buildToolFallbacks());
      setDashboardDomains(buildDomainFallbacks());
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

  /** Re-fetch all portal data (workspaces, tools, domains, profile) from DB */
  const refreshAll = useCallback(async () => {
    if (!supabase || !tenantId) return;
    setLoading(true);
    try {
      const [wsRes, toolsRes, domainsRes, profileRes] = await Promise.all([
        supabase.from('tenant_workspaces').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('sort_order'),
        supabase.from('tenant_tools').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('sort_order'),
        supabase.from('tenant_dashboard_domains').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('sort_order'),
        supabase.from('tenant_company_profiles').select('*').eq('tenant_id', tenantId).single(),
      ]);
      setWorkspaces(wsRes.data?.length ? wsRes.data : buildWorkspaceFallbacks());
      setTools(toolsRes.data?.length ? toolsRes.data : buildToolFallbacks());
      setDashboardDomains(domainsRes.data?.length ? domainsRes.data : buildDomainFallbacks());
      setCompanyProfile(profileRes.data || null);
    } catch (err) {
      console.error('Failed to refresh tenant portal data:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const profileStatus = companyProfile?.status || null;

  /** Get the route path for a dashboard domain by domain_key */
  const getDomainPath = useCallback(
    (domainKey) => {
      const first = dashboardDomains[0];
      return first && first.domain_key === domainKey ? '/portal/dashboards' : `/portal/dashboards/${domainKey}`;
    },
    [dashboardDomains],
  );

  const value = useMemo(
    () => ({
      workspaces,
      tools,
      dashboardDomains,
      companyProfile,
      profileStatus,
      loading,
      refreshAll,
      getToolByKey,
      getDomainByKey,
      getWorkspacePath,
      getToolPath,
      getDomainPath,
    }),
    [workspaces, tools, dashboardDomains, companyProfile, profileStatus, loading, refreshAll, getToolByKey, getDomainByKey, getWorkspacePath, getToolPath, getDomainPath],
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
