import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getFreshToken } from '../lib/supabase';

const TENANT_ID = import.meta.env.VITE_TENANT_ID;
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const DashboardConfigContext = createContext(null);

export function DashboardConfigProvider({ children }) {
  const { session } = useAuth();
  const [configs, setConfigs] = useState({});  // { operations: {...}, labor: {...}, ... }
  const [loading, setLoading] = useState(true);

  // Load all dashboard configs when authenticated
  useEffect(() => {
    if (!TENANT_ID || !session) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const token = await getFreshToken();
        if (!token || cancelled) return;

        const res = await fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/config`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.warn('[DashboardConfig] Config fetch returned', res.status);
          return;
        }

        const json = await res.json();
        if (!cancelled && json.configs) {
          setConfigs(json.configs);
        }
      } catch (err) {
        console.warn('[DashboardConfig] Failed to load configs:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [session]);

  // Get config for a specific dashboard, or null if none exists
  const getConfig = useCallback((dashboardKey) => {
    return configs[dashboardKey] || null;
  }, [configs]);

  // Save config for a specific dashboard (admin action)
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

    // Update local state
    setConfigs(prev => ({ ...prev, [dashboardKey]: json.config }));
    return json.config;
  }, []);

  return (
    <DashboardConfigContext.Provider value={{ configs, loading, getConfig, updateConfig }}>
      {children}
    </DashboardConfigContext.Provider>
  );
}

export function useDashboardConfigContext() {
  const ctx = useContext(DashboardConfigContext);
  if (!ctx) throw new Error('useDashboardConfigContext must be used within DashboardConfigProvider');
  return ctx;
}
