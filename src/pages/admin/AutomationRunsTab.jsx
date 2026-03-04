import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, ChevronDown, Play, Pause, CheckCircle, XCircle,
  AlertTriangle, Clock, GitBranch, Ban, Eye,
} from 'lucide-react';
import { getFreshToken } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const RUN_STATUS = {
  pending:   { label: 'Pending',   className: 'bg-gray-50 text-gray-600',   icon: Clock },
  running:   { label: 'Running',   className: 'bg-blue-50 text-blue-700',   icon: Play },
  paused:    { label: 'Awaiting',  className: 'bg-amber-50 text-amber-700', icon: Pause },
  completed: { label: 'Completed', className: 'bg-green-50 text-green-700', icon: CheckCircle },
  failed:    { label: 'Failed',    className: 'bg-red-50 text-red-600',     icon: AlertTriangle },
  cancelled: { label: 'Cancelled', className: 'bg-gray-50 text-gray-500',   icon: Ban },
};

const STAGE_STATUS = {
  pending:        { label: 'Pending',  className: 'bg-gray-100 text-gray-500' },
  running:        { label: 'Running',  className: 'bg-blue-100 text-blue-700' },
  awaiting_human: { label: 'Awaiting', className: 'bg-amber-100 text-amber-700' },
  completed:      { label: 'Done',     className: 'bg-green-100 text-green-700' },
  failed:         { label: 'Failed',   className: 'bg-red-100 text-red-600' },
  skipped:        { label: 'Skipped',  className: 'bg-gray-100 text-gray-400' },
};

const FILTER_OPTIONS = [
  { value: '', label: 'All Runs' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Awaiting' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatRelativeTime(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const absDiff = Math.abs(now - d);
  const minutes = Math.round(absDiff / 60000);
  const hours = Math.round(absDiff / 3600000);
  const days = Math.round(absDiff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function currentStageLabel(run) {
  if (run.status === 'completed') return 'All stages complete';
  if (run.status === 'cancelled' || run.status === 'failed') return null;
  if (run.current_stage_number != null) return `Stage ${run.current_stage_number}`;
  return null;
}

export default function AutomationRunsTab() {
  const { tenantId } = useTenantId();
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [cancelling, setCancelling] = useState(null);

  const loadRuns = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const token = await getFreshToken();
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(
        `${BACKEND_URL}/api/workflow-runs/${tenantId}/runs?${params}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
      }
    } catch (err) {
      console.error('[runs-tab] Load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, statusFilter]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  async function handleCancel(runId) {
    setCancelling(runId);
    try {
      const token = await getFreshToken();
      await fetch(
        `${BACKEND_URL}/api/workflow-runs/${tenantId}/runs/${runId}/cancel`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      await loadRuns();
    } catch (err) {
      console.error('[runs-tab] Cancel error:', err.message);
    } finally {
      setCancelling(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
        >
          {FILTER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="text-xs text-secondary-text">
          {runs.length} run{runs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Empty state */}
      {runs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <GitBranch size={32} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-sm font-medium text-dark-text mb-1">No workflow runs</h3>
          <p className="text-xs text-secondary-text">
            {statusFilter
              ? 'No runs match this filter. Try a different status.'
              : 'Workflow runs will appear here when schedules or conditions trigger them.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map(run => {
            const status = RUN_STATUS[run.status] || RUN_STATUS.pending;
            const StatusIcon = status.icon;
            const wf = run.workflow_definitions;
            const isExpanded = expandedId === run.id;
            const isActive = run.status === 'running' || run.status === 'paused' || run.status === 'pending';
            const stageLabel = currentStageLabel(run);

            return (
              <div
                key={run.id}
                className={`bg-white rounded-lg border transition-colors ${
                  isExpanded ? 'border-aa-blue/30 shadow-sm' : 'border-gray-200'
                }`}
              >
                {/* Collapsed header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : run.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <GitBranch
                        size={16}
                        className={isActive ? 'text-aa-blue' : 'text-gray-400'}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-dark-text truncate">
                          {wf?.name || 'Unknown Workflow'}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-secondary-text">
                          {run.created_at && (
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {formatRelativeTime(run.created_at)}
                            </span>
                          )}
                          {stageLabel && (
                            <span>{stageLabel}</span>
                          )}
                          {wf?.department && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                              {wf.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${status.className}`}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-secondary-text transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    {/* Meta info */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-secondary-text">Submitted by</span>
                        <div className="font-medium text-dark-text mt-0.5">
                          {run.submitter?.name || 'System'}
                        </div>
                      </div>
                      <div>
                        <span className="text-secondary-text">Trigger</span>
                        <div className="font-medium text-dark-text mt-0.5">
                          {run.workflow_triggers?.trigger_type === 'schedule'
                            ? 'Scheduled'
                            : run.workflow_triggers?.trigger_type === 'event'
                              ? 'Condition'
                              : 'Manual'}
                        </div>
                      </div>
                      {run.started_at && (
                        <div>
                          <span className="text-secondary-text">Started</span>
                          <div className="font-medium text-dark-text mt-0.5">
                            {new Date(run.started_at).toLocaleString()}
                          </div>
                        </div>
                      )}
                      {run.completed_at && (
                        <div>
                          <span className="text-secondary-text">Completed</span>
                          <div className="font-medium text-dark-text mt-0.5">
                            {new Date(run.completed_at).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Stage runs summary — if current_stage data is embedded */}
                    {run.total_stages > 0 && (
                      <div>
                        <div className="text-xs text-secondary-text mb-1.5">
                          Stages ({run.completed_stages || 0}/{run.total_stages})
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: run.total_stages }, (_, i) => {
                            const stageNum = i + 1;
                            let color = 'bg-gray-200'; // pending
                            if (stageNum < (run.current_stage_number || 0)) color = 'bg-green-400';
                            else if (stageNum === run.current_stage_number && run.status === 'running') color = 'bg-blue-400 animate-pulse';
                            else if (stageNum === run.current_stage_number && run.status === 'paused') color = 'bg-amber-400';
                            else if (run.status === 'completed') color = 'bg-green-400';
                            else if (run.status === 'failed' && stageNum === run.current_stage_number) color = 'bg-red-400';
                            return (
                              <div
                                key={stageNum}
                                className={`h-1.5 flex-1 rounded-full ${color}`}
                                title={`Stage ${stageNum}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    {run.error_message && (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700">
                        {run.error_message}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => navigate(`/portal/admin/automation/runs/${run.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-50 text-dark-text hover:bg-gray-100 transition-colors"
                      >
                        <Eye size={12} />
                        View Details
                      </button>
                      {isActive && (
                        <button
                          onClick={() => handleCancel(run.id)}
                          disabled={cancelling === run.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {cancelling === run.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <XCircle size={12} />
                          }
                          Cancel Run
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
