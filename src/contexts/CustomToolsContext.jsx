import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from './UserContext';
import { useTenantConfig } from './TenantConfigContext';
import { getFreshToken } from '../lib/supabase';

const CustomToolsContext = createContext(null);

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
const TENANT_ID = import.meta.env.VITE_TENANT_ID;

export function CustomToolsProvider({ children }) {
  const { realUser } = useUser();
  const { tenantHasModule } = useTenantConfig();
  const [customTools, setCustomTools] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const fetchTools = useCallback(async () => {
    if (!realUser || !TENANT_ID || !tenantHasModule('tools')) {
      setCustomTools([]);
      setLoaded(true);
      return;
    }

    try {
      const token = await getFreshToken();
      if (!token) return;

      const res = await fetch(`${BACKEND_URL}/api/custom-tools/${TENANT_ID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomTools(data);
      }
    } catch (err) {
      console.warn('[customTools] Failed to load:', err.message);
    }
    setLoaded(true);
  }, [realUser, tenantHasModule]);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const value = useMemo(
    () => ({ customTools, loaded, refetch: fetchTools }),
    [customTools, loaded, fetchTools],
  );

  return (
    <CustomToolsContext.Provider value={value}>
      {children}
    </CustomToolsContext.Provider>
  );
}

export function useCustomTools() {
  const ctx = useContext(CustomToolsContext);
  if (!ctx) throw new Error('useCustomTools must be used within CustomToolsProvider');
  return ctx;
}
