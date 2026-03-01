import { Link } from 'react-router-dom';
import { AlertTriangle, Cable, Clock } from 'lucide-react';
import useSyncHealth from '../../hooks/useSyncHealth';
import { useUser } from '../../contexts/UserContext';

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'less than an hour ago';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * Displays a contextual banner when sync health is degraded.
 * Shows nothing when healthy or loading.
 */
export default function SyncHealthBanner() {
  const { status, last_sync_at, loading } = useSyncHealth();
  const { isSuperAdmin } = useUser();

  if (loading || !status || status === 'healthy') return null;

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
