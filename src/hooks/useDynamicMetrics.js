import { useState, useEffect, useCallback } from 'react';
import { getFreshToken } from '../lib/supabase';
import { useTenantId } from '../contexts/TenantIdContext';
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

/**
 * Fetches dynamic metric definitions + computed values for a domain.
 * When the backend returns isDynamic=true, the response contains metric
 * definitions with their computed values — no client-side aggregation needed.
 *
 * Returns { data, isDynamic, loading, error, refetch }.
 */
export default function useDynamicMetrics(domain, filters = {}) {
  const { tenantId } = useTenantId();
  const [data, setData] = useState(null);
  const [isDynamic, setIsDynamic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!tenantId || !domain) {
      setLoading(false);
      setError(!tenantId ? 'Tenant ID not available' : 'Domain required');
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
      const url = `${BACKEND_URL}/api/dashboards/${tenantId}/${domain}${qs ? `?${qs}` : ''}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);

      setData(json);
      setIsDynamic(!!json.isDynamic);
    } catch (err) {
      console.error(`[useDynamicMetrics] ${domain} error:`, err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, domain, filters.dateFrom, filters.dateTo, filters.jobIds?.join(',')]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isDynamic, loading, error, refetch: fetchData };
}
