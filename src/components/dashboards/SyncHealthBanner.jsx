import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Cable, Clock, Loader2 } from 'lucide-react';
import useSyncHealth from '../../hooks/useSyncHealth';
import { useUser } from '../../contexts/UserContext';
import { useTenantId } from '../../contexts/TenantIdContext';
import { getFreshToken } from '../../lib/supabase';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

// Any mounted hook / component can listen for this event and refetch its
// data. The banner dispatches it when a background sync transitions from
// running → complete so dashboards on screen update without a page reload.
export const SYNC_REFRESHED_EVENT = 'sync:refreshed';

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'less than an hour ago';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * Displays a contextual banner when sync health is degraded, and auto-fires
 * a background sync when stale so dashboards self-heal without a manual
 * "refresh data" click. Shows nothing when healthy and not refreshing.
 */
export default function SyncHealthBanner() {
  const [refreshing, setRefreshing] = useState(false);
  const { status, last_sync_at, loading, refetch } = useSyncHealth({ poll: refreshing });
  const { isSuperAdmin } = useUser();
  const { tenantId } = useTenantId();

  // Remember the last_sync_at we saw when the refresh started so we can
  // detect when the background run has finished (timestamp advances).
  const refreshStartRef = useRef(null);
  const firedRef = useRef(false);

  // Kick off a background sync the first time we observe a stale state.
  useEffect(() => {
    if (!tenantId || loading || firedRef.current) return;
    if (status !== 'stale') return;

    firedRef.current = true;
    (async () => {
      try {
        const token = await getFreshToken();
        const res = await fetch(`${BACKEND_URL}/api/sync/${tenantId}/run-if-stale`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({}),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.started || data.reason === 'already_running') {
          refreshStartRef.current = last_sync_at || null;
          setRefreshing(true);
        }
      } catch (err) {
        console.error('[SyncHealthBanner] run-if-stale failed:', err.message);
      }
    })();
  }, [tenantId, status, loading, last_sync_at]);

  // While polling, watch for a newer last_sync_at than what we saw when
  // the refresh kicked off. When we see a new value, the background run is
  // done — stop polling and signal dashboards to refetch.
  useEffect(() => {
    if (!refreshing) return;
    const started = refreshStartRef.current;
    const advanced = last_sync_at && last_sync_at !== started;
    if (advanced) {
      setRefreshing(false);
      firedRef.current = false;
      refreshStartRef.current = null;
      try {
        window.dispatchEvent(new CustomEvent(SYNC_REFRESHED_EVENT, { detail: { tenantId, last_sync_at } }));
      } catch { /* SSR / non-browser env */ }
      // Ensure the banner reflects the latest health right away.
      refetch?.();
    }
  }, [refreshing, last_sync_at, tenantId, refetch]);

  if (loading || !status) return null;

  // "Refreshing…" takes precedence over every other visual state because
  // the user needs to know something is happening on their behalf.
  if (refreshing) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-800 text-sm mb-4">
        <Loader2 size={16} className="mt-0.5 shrink-0 text-blue-500 animate-spin" />
        <span>Refreshing dashboard data from your source. This usually takes less than a minute.</span>
      </div>
    );
  }

  if (status === 'healthy') return null;

  const configs = {
    no_source: {
      icon: Cable,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      iconColor: 'text-blue-500',
      message: isSuperAdmin
        ? <>Connect a data source in <Link to="/portal/admin/connections" className="underline font-medium">Settings &rarr; Connections</Link> to see live data.</>
        : 'Connect a data source in Settings \u2192 Connections to see live data.',
    },
    inactive: {
      icon: AlertTriangle,
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      iconColor: 'text-amber-500',
      message: isSuperAdmin
        ? <>Your data source connection is inactive. <Link to="/portal/admin/connections" className="underline font-medium">Reactivate it</Link> to resume syncing. Dashboard data may be outdated.</>
        : 'Your data source connection is inactive. Dashboard data may be outdated. Contact your administrator.',
    },
    stale: {
      icon: Clock,
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      iconColor: 'text-amber-500',
      message: `Data last synced ${last_sync_at ? relativeTime(last_sync_at) : 'unknown'}. Your data may not reflect recent changes.`,
    },
  };

  const cfg = configs[status];
  if (!cfg) return null;

  const Icon = cfg.icon;

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm mb-4 ${cfg.color}`}>
      <Icon size={16} className={`mt-0.5 shrink-0 ${cfg.iconColor}`} />
      <span>{cfg.message}</span>
    </div>
  );
}
