import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2, ArrowLeft, CheckCircle, Clock, AlertTriangle,
  XCircle, Ban, Play, Pause, GitBranch, Bot, User, UserPlus,
  ChevronDown,
} from 'lucide-react';
import { supabase, getFreshToken } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';
import { useUser } from '../../contexts/UserContext';
import SimpleMarkdown from '../../components/shared/SimpleMarkdown';

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
  pending:        { label: 'Pending',  color: 'bg-gray-300',   textColor: 'text-gray-500' },
  running:        { label: 'Running',  color: 'bg-blue-500',   textColor: 'text-blue-700' },
  awaiting_human: { label: 'Awaiting', color: 'bg-amber-500',  textColor: 'text-amber-700' },
  completed:      { label: 'Done',     color: 'bg-green-500',  textColor: 'text-green-700' },
  failed:         { label: 'Failed',   color: 'bg-red-500',    textColor: 'text-red-600' },
  skipped:        { label: 'Skipped',  color: 'bg-gray-300',   textColor: 'text-gray-400' },
};

const CLASSIFICATION_BADGE = {
  automated: { label: 'Automated', className: 'bg-blue-50 text-blue-700' },
  hybrid:    { label: 'Hybrid',    className: 'bg-purple-50 text-purple-700' },
  manual:    { label: 'Manual',    className: 'bg-gray-100 text-gray-700' },
};

export default function WorkflowRunDetailPage() {
  const { runId } = useParams();
  const { tenantId } = useTenantId();
  const { isAdmin } = useUser();
  const navigate = useNavigate();

  const [run, setRun] = useState(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [expandedStage, setExpandedStage] = useState(null);

  // Reassign state
  const [reassigningStageId, setReassigningStageId] = useState(null);
  const [reassignUserId, setReassignUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [reassigning, setReassigning] = useState(false);

  // Reject state
  const [rejectingStageId, setRejectingStageId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const loadRun = useCallback(async () => {
    if (!tenantId || !runId) return;
    setLoading(true);
    setError(null);

    try {
      const token = await getFreshToken();
      const res = await fetch(
        `${BACKEND_URL}/api/workflow-runs/${tenantId}/runs/${runId}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (!res.ok) {
        setError('Failed to load workflow run');
        return;
      }

      const data = await res.json();
      setRun(data.run);
      setStages(data.stages || []);

      // Auto-expand the active/awaiting stage
      const activeStage = data.stages?.find(
        s => s.status === 'awaiting_human' || s.status === 'running'
      );
      if (activeStage) setExpandedStage(activeStage.id);
    } catch (err) {
      console.error('[run-detail] Load error:', err.message);
      setError('Failed to load workflow run');
    } finally {
      setLoading(false);
    }
  }, [tenantId, runId]);

  useEffect(() => { loadRun(); }, [loadRun]);

  // Load users for reassign dropdown
  useEffect(() => {
    if (!reassigningStageId || !tenantId) return;
    supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('name')
      .then(({ data }) => setUsers(data || []));
  }, [reassigningStageId, tenantId]);

  async function handleCancel() {
    setCancelling(true);
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
      await loadRun();
    } catch (err) {
      console.error('[run-detail] Cancel error:', err.message);
    } finally {
      setCancelling(false);
    }
  }

  async function handleReassign(stageRunId) {
    if (!reassignUserId) return;
    setReassigning(true);
    try {
      const token = await getFreshToken();
      await fetch(
        `${BACKEND_URL}/api/workflow-runs/${tenantId}/runs/${runId}/stages/${stageRunId}/reassign`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ user_id: reassignUserId }),
        }
      );
      setReassigningStageId(null);
      setReassignUserId('');
      await loadRun();
    } catch (err) {
      console.error('[run-detail] Reassign error:', err.message);
    } finally {
      setReassigning(false);
    }
  }

  async function handleReject(stageRunId) {
    setRejecting(true);
    try {
      const token = await getFreshToken();
      await fetch(
        `${BACKEND_URL}/api/workflow-runs/${tenantId}/runs/${runId}/stages/${stageRunId}/reject`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ reason: rejectReason }),
        }
      );
      setRejectingStageId(null);
      setRejectReason('');
      await loadRun();
    } catch (err) {
      console.error('[run-detail] Reject error:', err.message);
    } finally {
      setRejecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertTriangle size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-sm text-secondary-text">{error || 'Run not found'}</p>
        <button
          onClick={() => navigate('/portal/admin/automation?tab=runs')}
          className="mt-4 text-sm text-aa-blue hover:underline"
        >
          Back to Workflow Runs
        </button>
      </div>
    );
  }

  const wf = run.workflow_definitions;
  const runStatus = RUN_STATUS[run.status] || RUN_STATUS.pending;
  const RunStatusIcon = runStatus.icon;
  const isActive = run.status === 'running' || run.status === 'paused' || run.status === 'pending';

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back link */}
      <button
        onClick={() => navigate('/portal/admin/automation?tab=runs')}
        className="flex items-center gap-1.5 text-sm text-secondary-text hover:text-dark-text transition-colors"
      >
        <ArrowLeft size={14} />
        Automation
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch size={20} className="text-aa-blue" />
            <h1 className="text-xl font-semibold text-dark-text">
              {wf?.name || 'Workflow Run'}
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-secondary-text">
            {run.submitter?.name && (
              <span>Submitted by {run.submitter.name}</span>
            )}
            {run.created_at && (
              <span>{new Date(run.created_at).toLocaleString()}</span>
            )}
            {wf?.department && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                {wf.department}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${runStatus.className}`}>
            <RunStatusIcon size={12} />
            {runStatus.label}
          </span>
          {isActive && isAdmin && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancelling
                ? <Loader2 size={12} className="animate-spin" />
                : <XCircle size={12} />
              }
              Cancel Run
            </button>
          )}
        </div>
      </div>

      {/* Completion timestamps */}
      {(run.started_at || run.completed_at) && (
        <div className="flex items-center gap-6 text-xs text-secondary-text">
          {run.started_at && <span>Started: {new Date(run.started_at).toLocaleString()}</span>}
          {run.completed_at && <span>Completed: {new Date(run.completed_at).toLocaleString()}</span>}
        </div>
      )}

      {/* Stage timeline */}
      <div>
        <h2 className="text-sm font-semibold text-dark-text mb-3">Stages</h2>

        {stages.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-sm text-secondary-text">No stage data available</p>
          </div>
        ) : (
          <div className="space-y-0">
            {stages.map((stage, idx) => {
              const stageInfo = stage.workflow_stages || {};
              const ss = STAGE_STATUS[stage.status] || STAGE_STATUS.pending;
              const classification = CLASSIFICATION_BADGE[stageInfo.classification] || CLASSIFICATION_BADGE.automated;
              const isLast = idx === stages.length - 1;
              const isStageExpanded = expandedStage === stage.id;
              const isAwaiting = stage.status === 'awaiting_human';

              return (
                <div key={stage.id}>
                  <button
                    onClick={() => setExpandedStage(isStageExpanded ? null : stage.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start gap-3 py-3">
                      {/* Stage number circle + connector */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${ss.color}`}>
                          {stage.status === 'completed'
                            ? <CheckCircle size={14} />
                            : stage.status === 'failed'
                              ? <XCircle size={14} />
                              : stageInfo.stage_number || idx + 1
                          }
                        </div>
                        {!isLast && (
                          <div className={`w-0.5 h-6 mt-1 ${
                            stage.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>

                      {/* Stage content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-dark-text">
                            {stageInfo.name || `Stage ${stageInfo.stage_number || idx + 1}`}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${classification.className}`}>
                            {classification.label}
                          </span>
                          <span className={`text-[10px] font-medium ${ss.textColor}`}>
                            {ss.label}
                          </span>
                          <ChevronDown
                            size={12}
                            className={`text-secondary-text transition-transform ml-auto ${isStageExpanded ? 'rotate-180' : ''}`}
                          />
                        </div>

                        {/* Assignee preview */}
                        {stage.assignee?.name && !isStageExpanded && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-secondary-text">
                            <User size={10} />
                            {stage.assignee.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded stage detail */}
                  {isStageExpanded && (
                    <div className="ml-10 mb-4 bg-gray-50 rounded-lg p-4 space-y-3">
                      {/* Stage metadata */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {stage.assignee?.name && (
                          <div>
                            <span className="text-secondary-text">Assigned to</span>
                            <div className="font-medium text-dark-text mt-0.5 flex items-center gap-1">
                              <User size={10} />
                              {stage.assignee.name}
                            </div>
                          </div>
                        )}
                        {stageInfo.agent_key && (
                          <div>
                            <span className="text-secondary-text">Agent</span>
                            <div className="font-medium text-dark-text mt-0.5 flex items-center gap-1">
                              <Bot size={10} />
                              {stageInfo.agent_key}
                            </div>
                          </div>
                        )}
                        {stage.started_at && (
                          <div>
                            <span className="text-secondary-text">Started</span>
                            <div className="font-medium text-dark-text mt-0.5">
                              {new Date(stage.started_at).toLocaleString()}
                            </div>
                          </div>
                        )}
                        {stage.completed_at && (
                          <div>
                            <span className="text-secondary-text">Completed</span>
                            <div className="font-medium text-dark-text mt-0.5">
                              {new Date(stage.completed_at).toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Agent output */}
                      {stage.agent_output && (
                        <div>
                          <div className="text-xs text-secondary-text mb-1">Agent Output</div>
                          <div className="bg-white rounded border border-gray-200 p-3 text-sm leading-relaxed max-h-60 overflow-y-auto">
                            {typeof stage.agent_output === 'string' ? (
                              <SimpleMarkdown content={stage.agent_output} />
                            ) : stage.agent_output.text ? (
                              <SimpleMarkdown content={stage.agent_output.text} />
                            ) : (
                              <pre className="text-xs whitespace-pre-wrap">
                                {JSON.stringify(stage.agent_output, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Human edited output */}
                      {stage.human_edited_output && (
                        <div>
                          <div className="text-xs text-secondary-text mb-1">
                            Human Response
                            {stage.editor?.name && <span> by {stage.editor.name}</span>}
                          </div>
                          <div className="bg-white rounded border border-gray-200 p-3 text-sm leading-relaxed max-h-40 overflow-y-auto">
                            {typeof stage.human_edited_output === 'string' ? (
                              <SimpleMarkdown content={stage.human_edited_output} />
                            ) : stage.human_edited_output.notes || stage.human_edited_output.output ? (
                              <SimpleMarkdown content={stage.human_edited_output.notes || stage.human_edited_output.output} />
                            ) : (
                              <pre className="text-xs whitespace-pre-wrap">
                                {JSON.stringify(stage.human_edited_output, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Error */}
                      {stage.error_message && (
                        <div className="bg-red-50 border border-red-100 rounded p-3 text-xs text-red-700">
                          {stage.error_message}
                        </div>
                      )}

                      {/* Actions for awaiting stages */}
                      {isAwaiting && isAdmin && (
                        <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
                          {/* Reassign */}
                          {reassigningStageId === stage.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <select
                                value={reassignUserId}
                                onChange={e => setReassignUserId(e.target.value)}
                                className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
                              >
                                <option value="">Select user...</option>
                                {users.map(u => (
                                  <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleReassign(stage.id)}
                                disabled={!reassignUserId || reassigning}
                                className="px-2 py-1 text-xs font-medium bg-aa-blue text-white rounded hover:bg-aa-blue/90 disabled:opacity-50"
                              >
                                {reassigning ? <Loader2 size={10} className="animate-spin" /> : 'Assign'}
                              </button>
                              <button
                                onClick={() => { setReassigningStageId(null); setReassignUserId(''); }}
                                className="px-2 py-1 text-xs text-secondary-text hover:text-dark-text"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReassigningStageId(stage.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-dark-text hover:bg-gray-200 transition-colors"
                            >
                              <UserPlus size={11} />
                              Reassign
                            </button>
                          )}

                          {/* Reject */}
                          {rejectingStageId === stage.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="Reason (optional)"
                                className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
                              />
                              <button
                                onClick={() => handleReject(stage.id)}
                                disabled={rejecting}
                                className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                {rejecting ? <Loader2 size={10} className="animate-spin" /> : 'Reject'}
                              </button>
                              <button
                                onClick={() => { setRejectingStageId(null); setRejectReason(''); }}
                                className="px-2 py-1 text-xs text-secondary-text hover:text-dark-text"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRejectingStageId(stage.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <XCircle size={11} />
                              Reject
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
