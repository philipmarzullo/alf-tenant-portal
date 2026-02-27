import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getFreshToken } from '../lib/supabase';

const TENANT_ID = import.meta.env.VITE_TENANT_ID;
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const DashboardConfigContext = createContext(null);

export function DashboardConfigProvider({ children }) {
  const { session } = useAuth();
  const [configs, setConfigs] = useState({});    // { home: {...}, operations: {...}, ... }
  const [sources, setSources] = useState({});    // { home: 'user'|'tenant'|'default', ... }
  const [shares, setShares] = useState([]);      // dashboard_shares rows for current user
  const [loading, setLoading] = useState(true);

  // Load user-resolved configs + shares when authenticated
  const loadConfigs = useCallback(async () => {
    if (!TENANT_ID || !session) {
      setLoading(false);
      return;
    }

    try {
      const token = await getFreshToken();
      if (!token) return;

      // Fetch user-resolved configs + shares in parallel
      const [configRes, sharesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/user-config`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/shares`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (configRes.ok) {
        const json = await configRes.json();
        if (json.configs) setConfigs(json.configs);
        if (json.sources) setSources(json.sources);
      } else {
        console.warn('[DashboardConfig] Config fetch returned', configRes.status);
      }

      if (sharesRes.ok) {
        const json = await sharesRes.json();
        setShares(json.shares || []);
      }
    } catch (err) {
      console.warn('[DashboardConfig] Failed to load configs:', err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    loadConfigs().then(() => {
      if (cancelled) return;
    });

    return () => { cancelled = true; };
  }, [loadConfigs]);

  // Get config for a specific dashboard, or null if none exists
  const getConfig = useCallback((dashboardKey) => {
    return configs[dashboardKey] || null;
  }, [configs]);

  // Get source indicator for a dashboard
  const getSource = useCallback((dashboardKey) => {
    return sources[dashboardKey] || 'default';
  }, [sources]);

  // Save per-user config override
  const updateUserConfig = useCallback(async (dashboardKey, config) => {
    const token = await getFreshToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/user-config/${dashboardKey}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to save config');

    // Update local state
    setConfigs(prev => ({ ...prev, [dashboardKey]: json.config }));
    setSources(prev => ({ ...prev, [dashboardKey]: 'user' }));
    return json.config;
  }, []);

  // Delete per-user override — fall back to tenant/default
  const resetUserConfig = useCallback(async (dashboardKey) => {
    const token = await getFreshToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/user-config/${dashboardKey}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || 'Failed to reset config');
    }

    // Will be refreshed on next load
    setSources(prev => {
      const next = { ...prev };
      delete next[dashboardKey];
      return next;
    });
  }, []);

  // Save tenant-level config (admin action — used by DashboardSettings)
  const updateConfig = useCallback(async (dashboardKey, config) => {
    const token = await getFreshToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/config/${dashboardKey}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to save config');

    // If user has no override for this key, update the displayed config
    if (sources[dashboardKey] !== 'user') {
      setConfigs(prev => ({ ...prev, [dashboardKey]: json.config }));
      setSources(prev => ({ ...prev, [dashboardKey]: 'tenant' }));
    }
    return json.config;
  }, [sources]);

  // Force reload all configs from server
  const refreshConfigs = useCallback(async () => {
    await loadConfigs();
  }, [loadConfigs]);

  return (
    <DashboardConfigContext.Provider value={{
      configs,
      sources,
      shares,
      loading,
      getConfig,
      getSource,
      updateConfig,
      updateUserConfig,
      resetUserConfig,
      refreshConfigs,
    }}>
      {children}
    </DashboardConfigContext.Provider>
  );
}

export function useDashboardConfigContext() {
  const ctx = useContext(DashboardConfigContext);
  if (!ctx) throw new Error('useDashboardConfigContext must be used within DashboardConfigProvider');
  return ctx;
}
