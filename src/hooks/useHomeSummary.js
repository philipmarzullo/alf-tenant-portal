import { useState, useEffect, useCallback } from 'react';
import { getFreshToken } from '../lib/supabase';
import { useTenantId } from '../contexts/TenantIdContext';
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

/**
 * Fetches aggregated home dashboard data from all sf_* domains.
 * Returns { data, loading, error, refetch }.
 */
export default function useHomeSummary() {
  const { tenantId } = useTenantId();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      setError('Tenant ID not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getFreshToken();
      if (!token) throw new Error('Not authenticated');

      const url = `${BACKEND_URL}/api/dashboards/${tenantId}/home-summary`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);

      setData(json);
    } catch (err) {
      console.error('[useHomeSummary] error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
