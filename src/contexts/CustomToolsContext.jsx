import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from './UserContext';
import { useTenantConfig } from './TenantConfigContext';
import { getFreshToken } from '../lib/supabase';
import { useTenantId } from './TenantIdContext';

const CustomToolsContext = createContext(null);

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

export function CustomToolsProvider({ children }) {
  const { realUser } = useUser();
  const { tenantHasModule } = useTenantConfig();
  const { tenantId } = useTenantId();
  const [customTools, setCustomTools] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const fetchTools = useCallback(async () => {
    if (!realUser || !tenantId || !tenantHasModule('tools')) {
      setCustomTools([]);
      setLoaded(true);
      return;
    }

    try {
      const token = await getFreshToken();
      if (!token) return;

      const res = await fetch(`${BACKEND_URL}/api/custom-tools/${tenantId}`, {
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
  }, [realUser, tenantHasModule, tenantId]);

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
