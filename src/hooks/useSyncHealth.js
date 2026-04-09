import { useState, useEffect, useCallback, useRef } from 'react';
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

function clearCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

/**
 * Returns sync health status for the current tenant.
 * Cached in sessionStorage for 5 minutes.
 *
 * Options:
 *   poll — when true, refetches every 10 seconds (used by SyncHealthBanner
 *          while a background sync is running so it can see the fresh
 *          last_sync_at timestamp land).
 *
 * Returns: { status, credential_active, last_sync_at, connector_type, loading, refetch }
 * Status: 'no_source' | 'inactive' | 'stale' | 'healthy' | null (loading)
 */
export default function useSyncHealth({ poll = false } = {}) {
  const { tenantId } = useTenantId();
  const [health, setHealth] = useState(() => getCached());
  const [loading, setLoading] = useState(!getCached());
  const cancelRef = useRef(false);

  const fetchHealth = useCallback(async ({ useCache = true } = {}) => {
    if (!tenantId) {
      setLoading(false);
      return null;
    }
    if (useCache) {
      const cached = getCached();
      if (cached) {
        setHealth(cached);
        setLoading(false);
        return cached;
      }
    }
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
      if (cancelRef.current) return null;
      setHealth(data);
      setCache(data);
      return data;
    } catch (err) {
      console.error('[useSyncHealth]', err.message);
      return null;
    } finally {
      if (!cancelRef.current) setLoading(false);
    }
  }, [tenantId]);

  // Refetch bypasses the cache — used after a background sync completes.
  const refetch = useCallback(() => {
    clearCache();
    return fetchHealth({ useCache: false });
  }, [fetchHealth]);

  // Initial fetch
  useEffect(() => {
    cancelRef.current = false;
    fetchHealth();
    return () => { cancelRef.current = true; };
  }, [fetchHealth]);

  // Polling mode — used by SyncHealthBanner while a background sync is
  // running so it can see last_sync_at update without waiting for a manual
  // refresh. Disabled by default to keep the home page quiet.
  useEffect(() => {
    if (!poll || !tenantId) return undefined;
    const id = setInterval(() => {
      clearCache();
      fetchHealth({ useCache: false });
    }, 10_000);
    return () => clearInterval(id);
  }, [poll, tenantId, fetchHealth]);

  return { ...health, loading, refetch };
}
