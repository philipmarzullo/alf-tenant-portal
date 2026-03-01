import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle, Clock, XCircle, ChevronDown, Zap } from 'lucide-react';
import { getFreshToken } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const PRIORITY_BADGE = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-amber-100 text-amber-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
};

const STATUS_BADGE = {
  open: { label: 'Open', bg: 'bg-amber-50 text-amber-700', icon: Clock },
  in_progress: { label: 'In Progress', bg: 'bg-blue-50 text-blue-700', icon: Loader2 },
  completed: { label: 'Completed', bg: 'bg-green-50 text-green-700', icon: CheckCircle },
  dismissed: { label: 'Dismissed', bg: 'bg-gray-100 text-gray-500', icon: XCircle },
};

const STATUS_TRANSITIONS = {
  open: ['in_progress', 'dismissed'],
  in_progress: ['completed', 'open'],
  completed: ['open'],
  dismissed: ['open'],
};

/**
 * Compact action items section for workspace overview pages.
 *
 * @param {string[]} departments - Department keys to filter by (e.g. ['labor', 'timekeeping'])
 * @param {number} limit - Max items to show (default 5)
 * @param {string} title - Section title (default "Recent Action Items")
 */
export default function WorkspaceActionItems({ departments = [], limit = 5, title = 'Recent Action Items' }) {
  const { tenantId } = useTenantId();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const loadActions = useCallback(async () => {
    if (!tenantId || !departments.length) {
      setLoading(false);
      return;
    }

    try {
      const token = await getFreshToken();
      if (!token) return;

      const params = new URLSearchParams({
        departments: departments.join(','),
        status: 'open,in_progress',
        limit: String(limit),
      });

      const res = await fetch(
        `${BACKEND_URL}/api/dashboards/${tenantId}/action-plans?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setActions(json.actions || []);
    } catch (err) {
      console.error('[WorkspaceActionItems] Load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, departments.join(','), limit]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  async function handleStatusChange(actionId, newStatus) {
    setUpdatingId(actionId);
    try {
      const token = await getFreshToken();
      if (!token) return;

      const res = await fetch(
        `${BACKEND_URL}/api/dashboards/${tenantId}/action-plans/${actionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }

      setActions((prev) =>
        prev.map((a) => (a.id === actionId ? { ...a, status: newStatus } : a))
          .filter((a) => ['open', 'in_progress'].includes(a.status))
      );
    } catch (err) {
      console.error('[WorkspaceActionItems] Status update error:', err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center">
        <Loader2 size={18} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  if (actions.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-3">
        {title}
      </h2>
      <div className="space-y-2">
        {actions.map((action) => {
          const statusInfo = STATUS_BADGE[action.status] || STATUS_BADGE.open;
          const StatusIcon = statusInfo.icon;
          const transitions = STATUS_TRANSITIONS[action.status] || [];

          return (
            <div key={action.id} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-medium text-dark-text">{action.title}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_BADGE[action.priority] || PRIORITY_BADGE.medium}`}>
                      {action.priority}
                    </span>
                  </div>
                  <p className="text-xs text-secondary-text line-clamp-2">{action.description}</p>
                  {action.site_name && (
                    <span className="text-[10px] text-secondary-text mt-1 inline-block">
                      {action.site_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.bg}`}>
                    <StatusIcon size={10} />
                    {statusInfo.label}
                  </span>

                  {transitions.length > 0 && (
                    <div className="relative group">
                      <button className="p-0.5 text-secondary-text hover:text-dark-text transition-colors">
                        <ChevronDown size={12} />
                      </button>
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[120px] hidden group-hover:block z-10">
                        {transitions.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(action.id, s)}
                            disabled={updatingId === action.id}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
                          >
                            {STATUS_BADGE[s]?.label || s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
