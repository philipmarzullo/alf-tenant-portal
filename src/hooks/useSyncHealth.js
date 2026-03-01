import { useState, useEffect } from 'react';
import { getFreshToken } from '../lib/supabase';
import { useTenantId } from '../contexts/TenantIdContext';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
const CACHE_KEY = 'sync_health';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

/**
 * Returns sync health status for the current tenant.
 * Cached in sessionStorage for 5 minutes.
 *
 * Returns: { status, credential_active, last_sync_at, connector_type, loading }
 * Status: 'no_source' | 'inactive' | 'stale' | 'healthy' | null (loading)
 */
export default function useSyncHealth() {
  const { tenantId } = useTenantId();
  const [health, setHealth] = useState(() => getCached());
  const [loading, setLoading] = useState(!getCached());

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    const cached = getCached();
    if (cached) {
      setHealth(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchHealth() {
      try {
        const token = await getFreshToken();
        const res = await fetch(`${BACKEND_URL}/api/sync/${tenantId}/health`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (!cancelled) {
          setHealth(data);
          setCache(data);
        }
      } catch (err) {
        console.error('[useSyncHealth]', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHealth();
    return () => { cancelled = true; };
  }, [tenantId]);

  return { ...health, loading };
}
