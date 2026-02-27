import { useState, useEffect, useCallback } from 'react';
import { getFreshToken } from '../lib/supabase';

const TENANT_ID = import.meta.env.VITE_TENANT_ID;
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

/**
 * Fetches dashboard data for a given domain + filters.
 * Returns { data, loading, error, refetch }.
 */
export default function useDashboardData(domain, filters = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!TENANT_ID || !domain) {
      setLoading(false);
      setError(!TENANT_ID ? 'Tenant ID not configured (VITE_TENANT_ID)' : 'Domain required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getFreshToken();
      if (!token) throw new Error('Not authenticated');

      const params = new URLSearchParams();
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.jobIds?.length) params.set('jobIds', filters.jobIds.join(','));

      const qs = params.toString();
      const url = `${BACKEND_URL}/api/dashboards/${TENANT_ID}/${domain}${qs ? `?${qs}` : ''}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);

      setData(json);
    } catch (err) {
      console.error(`[useDashboardData] ${domain} error:`, err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [domain, filters.dateFrom, filters.dateTo, filters.jobIds?.join(',')]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
