import { useState, useEffect, useCallback } from 'react';
import { getFreshToken } from '../lib/supabase';
import { useTenantId } from '../contexts/TenantIdContext';
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

/**
 * Fetches dashboard data for a given domain + filters.
 * Returns { data, loading, error, refetch }.
 */
export default function useDashboardData(domain, filters = {}) {
  const { tenantId } = useTenantId();
  const [data, setData] = useState(null);
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
      // Forward extra filter keys (itemType, inspectionType, ticketType, etc.)
      for (const [k, v] of Object.entries(filters)) {
        if (!['dateFrom', 'dateTo', 'jobIds'].includes(k) && v) params.set(k, v);
      }

      const qs = params.toString();
      const url = `${BACKEND_URL}/api/dashboards/${tenantId}/${domain}${qs ? `?${qs}` : ''}`;

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, domain, JSON.stringify(filters)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
