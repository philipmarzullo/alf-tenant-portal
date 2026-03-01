import { createContext, useContext, useState, useCallback } from 'react';

const TenantIdContext = createContext(null);

const envTenantId = import.meta.env.VITE_TENANT_ID || null;

export function TenantIdProvider({ children }) {
  const [tenantId, setTenantIdState] = useState(envTenantId);

  const setTenantId = useCallback((id) => {
    // If env var is set, it's the permanent override — ignore dynamic updates
    if (envTenantId) return;
    setTenantIdState(id);
  }, []);

  return (
    <TenantIdContext.Provider value={{ tenantId, setTenantId, isEnvOverride: !!envTenantId }}>
      {children}
    </TenantIdContext.Provider>
  );
}

export function useTenantId() {
  const ctx = useContext(TenantIdContext);
  if (!ctx) throw new Error('useTenantId must be used within TenantIdProvider');
  return ctx;
}
