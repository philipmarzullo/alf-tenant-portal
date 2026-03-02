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

  // Module-on / module-off — the only permission check needed.
  // If a module is present in module_config, all its pages and actions are available.
  const tenantHasModule = useCallback(
    (moduleKey) => {
      if (!moduleConfig) return true; // backwards compat
      return moduleKey in moduleConfig;
    },
    [moduleConfig],
  );

  const value = useMemo(
    () => ({
      moduleConfig,
      tenantPlan,
      configLoading,
      tenantHasModule,
    }),
    [moduleConfig, tenantPlan, configLoading, tenantHasModule],
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
