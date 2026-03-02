import { useState, useEffect, useCallback } from 'react';
import { Loader2, Zap, CheckCircle, Clock, AlertTriangle, XCircle, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import { getFreshToken } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';
import { useUser } from '../../contexts/UserContext';
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

export default function ActionPlansPage() {
  const { tenantId } = useTenantId();
  const { isAdmin } = useUser();
  const canGenerate = isAdmin;

  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const loadActions = useCallback(async () => {
    try {
      const token = await getFreshToken();
      if (!token) return;

      const res = await fetch(`${BACKEND_URL}/api/dashboards/${tenantId}/action-plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      setActions(json.actions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setSummary(null);

    try {
      const token = await getFreshToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${BACKEND_URL}/api/dashboards/${tenantId}/action-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dateFrom: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          dateTo: new Date().toISOString().slice(0, 10),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);

      setSummary(json.summary);
      await loadActions();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleStatusChange(actionId, newStatus) {
    setUpdatingId(actionId);
    try {
      const token = await getFreshToken();
      if (!token) return;

      const res = await fetch(`${BACKEND_URL}/api/dashboards/${tenantId}/action-plans/${actionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setActions((prev) =>
        prev.map((a) => (a.id === actionId ? { ...a, status: newStatus } : a))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const openCount = actions.filter((a) => a.status === 'open').length;
  const inProgressCount = actions.filter((a) => a.status === 'in_progress').length;
  const completedCount = actions.filter((a) => a.status === 'completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-secondary-text">
            AI-generated action items from dashboard analysis. {actions.length} total items.
          </p>
        </div>
        {canGenerate && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-aa-blue/90 disabled:opacity-50 transition-colors"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {generating ? 'Generating...' : 'Generate Action Plan'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">Analysis Summary</h3>
          <p className="text-sm text-blue-800">{summary}</p>
        </div>
      )}

      {/* Summary counters */}
      {actions.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">{openCount} Open</span>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">{inProgressCount} In Progress</span>
          <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium">{completedCount} Completed</span>
        </div>
      )}

      {/* Action Cards */}
      {actions.length === 0 ? (
        <div className="text-center py-16 text-secondary-text">
          <Zap size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No action plans yet. Generate one from dashboard data.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((action) => {
            const statusInfo = STATUS_BADGE[action.status] || STATUS_BADGE.open;
            const StatusIcon = statusInfo.icon;
            const transitions = STATUS_TRANSITIONS[action.status] || [];

            return (
              <div key={action.id} className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="text-sm font-semibold text-dark-text">{action.title}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[action.priority] || PRIORITY_BADGE.medium}`}>
                        {action.priority}
                      </span>
                      {action.site_name && (
                        <span className="text-xs text-secondary-text">{action.site_name}</span>
                      )}
                    </div>
                    <p className="text-sm text-secondary-text leading-relaxed">{action.description}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {action.department && (
                        <span className="text-xs text-secondary-text bg-gray-50 px-2 py-0.5 rounded">
                          {action.department}
                        </span>
                      )}
                      {action.metric_snapshot?.suggested_owner_role && (
                        <span className="text-xs text-aa-blue bg-aa-blue/5 px-2 py-0.5 rounded">
                          Owner: {action.metric_snapshot.suggested_owner_role}
                        </span>
                      )}
                      {action.metric_snapshot && Object.keys(action.metric_snapshot).filter(k => k !== 'suggested_owner_role').length > 0 && (
                        <button
                          onClick={() => setExpandedId(expandedId === action.id ? null : action.id)}
                          className="inline-flex items-center gap-1 text-xs text-secondary-text hover:text-dark-text transition-colors"
                        >
                          <BarChart3 size={11} />
                          {expandedId === action.id ? 'Hide' : 'View'} metrics
                          {expandedId === action.id ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </button>
                      )}
                    </div>
                    {expandedId === action.id && action.metric_snapshot && (
                      <div className="mt-3 bg-gray-50 rounded-lg p-3 text-xs text-secondary-text space-y-1">
                        {Object.entries(action.metric_snapshot)
                          .filter(([k]) => k !== 'suggested_owner_role')
                          .map(([key, val]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-dark-text font-medium">{key.replace(/_/g, ' ')}</span>
                              <span>{typeof val === 'number' ? val.toLocaleString() : String(val)}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bg}`}>
                      <StatusIcon size={12} />
                      {statusInfo.label}
                    </span>

                    {transitions.length > 0 && (
                      <div className="relative group">
                        <button className="p-1 text-secondary-text hover:text-dark-text transition-colors">
                          <ChevronDown size={14} />
                        </button>
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[140px] hidden group-hover:block z-10">
                          {transitions.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(action.id, s)}
                              disabled={updatingId === action.id}
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
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
      )}
    </div>
  );
}
