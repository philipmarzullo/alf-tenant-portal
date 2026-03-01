import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from './UserContext';
import { supabase } from '../lib/supabase';

const TenantConfigContext = createContext(null);

export function TenantConfigProvider({ children }) {
  const { realUser } = useUser();
  const [moduleConfig, setModuleConfig] = useState(null);
  const [tenantPlan, setTenantPlan] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Fetch tenant's module_config once we know the user's tenant_id
  useEffect(() => {
    if (!realUser?.tenant_id || !supabase) {
      setModuleConfig(null);
      setConfigLoading(false);
      return;
    }

    let cancelled = false;
    setConfigLoading(true);

    supabase
      .from('alf_tenants')
      .select('module_config, plan')
      .eq('id', realUser.tenant_id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Failed to fetch tenant config:', error);
          setModuleConfig(null);
          setTenantPlan(null);
        } else {
          setModuleConfig(data?.module_config || null);
          setTenantPlan(data?.plan || null);
        }
        setConfigLoading(false);
      });

    return () => { cancelled = true; };
  }, [realUser?.tenant_id]);

  // Is the module present in tenant config at all?
  const tenantHasModule = useCallback(
    (moduleKey) => {
      // If no config loaded yet, allow everything (backwards compat)
      if (!moduleConfig) return true;
      return moduleKey in moduleConfig;
    },
    [moduleConfig],
  );

  // Is a specific page enabled for this module?
  const hasPage = useCallback(
    (moduleKey, pageKey) => {
      if (!moduleConfig) return true; // backwards compat
      const mod = moduleConfig[moduleKey];
      if (!mod) return false;
      return mod.pages?.includes(pageKey) ?? false;
    },
    [moduleConfig],
  );

  // Is a specific agent action enabled for this module?
  const hasAction = useCallback(
    (moduleKey, actionKey) => {
      if (!moduleConfig) return true; // backwards compat
      const mod = moduleConfig[moduleKey];
      if (!mod) return false;
      return mod.actions?.includes(actionKey) ?? false;
    },
    [moduleConfig],
  );

  // Returns the array of enabled page keys for a module
  const getEnabledPages = useCallback(
    (moduleKey) => {
      if (!moduleConfig) return null; // null = show all (backwards compat)
      const mod = moduleConfig[moduleKey];
      if (!mod) return [];
      return mod.pages || [];
    },
    [moduleConfig],
  );

  // Returns the array of enabled action keys for a module
  const getEnabledActions = useCallback(
    (moduleKey) => {
      if (!moduleConfig) return null;
      const mod = moduleConfig[moduleKey];
      if (!mod) return [];
      return mod.actions || [];
    },
    [moduleConfig],
  );

  const value = useMemo(
    () => ({
      moduleConfig,
      tenantPlan,
      configLoading,
      tenantHasModule,
      hasPage,
      hasAction,
      getEnabledPages,
      getEnabledActions,
    }),
    [moduleConfig, tenantPlan, configLoading, tenantHasModule, hasPage, hasAction, getEnabledPages, getEnabledActions],
  );

  return (
    <TenantConfigContext.Provider value={value}>
      {children}
    </TenantConfigContext.Provider>
  );
}

export function useTenantConfig() {
  const ctx = useContext(TenantConfigContext);
  if (!ctx) throw new Error('useTenantConfig must be used within TenantConfigProvider');
  return ctx;
}
