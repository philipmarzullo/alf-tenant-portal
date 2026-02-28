import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useUser } from './UserContext';
import { getFreshToken } from '../lib/supabase';
import { canSeeTier as canSeeTierFn } from '../data/dashboardKPIRegistry';

const TENANT_ID = import.meta.env.VITE_TENANT_ID;
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const RBACContext = createContext(null);

/**
 * Provides metric tier, allowed domains, and tier-check helper for the current user.
 * Loads from GET /api/dashboards/:tenantId/metric-catalog on auth.
 *
 * Admins get implicit { metricTier: 'financial', allowedDomains: all }.
 */
export function RBACProvider({ children }) {
  const { session } = useAuth();
  const { realUser, isAdmin } = useUser();
  const [metricTier, setMetricTier] = useState('financial');
  const [allowedDomains, setAllowedDomains] = useState(['operations', 'labor', 'quality', 'timekeeping', 'safety']);
  const [templateName, setTemplateName] = useState(null);
  const [defaultHeroMetrics, setDefaultHeroMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCatalog = useCallback(async () => {
    if (!TENANT_ID || !session) {
      setLoading(false);
      return;
    }

    try {
      const token = await getFreshToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/metric-catalog`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.warn('[RBACContext] Failed to fetch metric catalog:', res.status);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setMetricTier(data.metricTier || 'financial');
      setAllowedDomains(data.allowedDomains || ['operations', 'labor', 'quality', 'timekeeping', 'safety']);
      setTemplateName(data.templateName || null);
      setDefaultHeroMetrics(data.defaultHeroMetrics || null);
    } catch (err) {
      console.error('[RBACContext] Error fetching catalog:', err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (realUser) fetchCatalog();
  }, [realUser, fetchCatalog]);

  const canSeeTier = useCallback(
    (sensitivity) => canSeeTierFn(metricTier, sensitivity),
    [metricTier]
  );

  const canSeeDomain = useCallback(
    (domain) => allowedDomains.includes(domain),
    [allowedDomains]
  );

  return (
    <RBACContext.Provider value={{
      metricTier,
      allowedDomains,
      templateName,
      defaultHeroMetrics,
      canSeeTier,
      canSeeDomain,
      rbacLoading: loading,
      refreshRBAC: fetchCatalog,
    }}>
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC() {
  const ctx = useContext(RBACContext);
  if (!ctx) throw new Error('useRBAC must be used within RBACProvider');
  return ctx;
}
