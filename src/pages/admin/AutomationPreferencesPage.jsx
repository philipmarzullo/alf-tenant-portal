import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Users, DollarSign, Briefcase, HardHat, Loader, CheckCircle, XCircle, AlertTriangle, Mail, Link as LinkIcon, Sparkles, X, Bot, Zap } from 'lucide-react';
import { getFreshToken } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useTenantId } from '../../contexts/TenantIdContext';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

// ─── Fallback built-in actions (used when no DB actions exist) ───────────────

const RISK_RECOMMENDED = { low: 'automated', medium: 'review', high: 'review' };

const BUILTIN_WORKSPACES = [
  {
    key: 'hr',
    label: 'HR',
    icon: 'Users',
    actions: [
      { agentKey: 'hr', actionKey: 'draftReminder', label: 'Benefits Enrollment Reminder', integration: 'microsoft_email', risk: 'medium' },
      { agentKey: 'hr', actionKey: 'notifyOperations', label: 'Leave Notification to Supervisors', integration: 'microsoft_email', risk: 'medium' },
      { agentKey: 'hr', actionKey: 'sendReminder', label: 'Overdue Document Follow-up', integration: 'microsoft_email', risk: 'low' },
      { agentKey: 'hr', actionKey: 'generateRateChangeBatch', label: 'Rate Change Notification', integration: 'microsoft_email', risk: 'medium' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    icon: 'DollarSign',
    actions: [
      { agentKey: 'finance', actionKey: 'draftCollectionEmail', label: 'AR Collection Email', integration: 'microsoft_email', risk: 'high' },
      { agentKey: 'finance', actionKey: 'summarizeAccount', label: 'Account Summary Distribution', integration: 'microsoft_email', risk: 'medium' },
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: 'Briefcase',
    actions: [
      { agentKey: 'sales', actionKey: 'renewalBrief', label: 'Renewal Brief to Account Team', integration: 'microsoft_email', risk: 'medium' },
      { agentKey: 'sales', actionKey: 'pipelineSummary', label: 'Pipeline Report Distribution', integration: 'microsoft_email', risk: 'low' },
    ],
  },
  {
    key: 'ops',
    label: 'Operations',
    icon: 'HardHat',
    actions: [
      { agentKey: 'ops', actionKey: 'vpPerformanceSummary', label: 'VP Performance Report Distribution', integration: 'microsoft_email', risk: 'medium' },
      { agentKey: 'ops', actionKey: 'inspectionAnalysis', label: 'Inspection Alert to Site Managers', integration: 'microsoft_email', risk: 'medium' },
    ],
  },
];

const DEPT_LABELS = {
  hr: 'HR', finance: 'Finance', purchasing: 'Purchasing',
  sales: 'Sales', ops: 'Operations', admin: 'Admin', general: 'General',
};

const DEPT_ICONS = {
  hr: 'Users', finance: 'DollarSign', purchasing: 'Briefcase',
  sales: 'Briefcase', ops: 'HardHat', admin: 'Zap', general: 'Bot',
};

const ICONS = { Users, DollarSign, Briefcase, HardHat, Zap, Bot };

const RISK_STYLES = {
  low: { label: 'Low', bg: 'bg-green-100', text: 'text-green-700' },
  medium: { label: 'Medium', bg: 'bg-amber-100', text: 'text-amber-700' },
  high: { label: 'High', bg: 'bg-red-100', text: 'text-red-700' },
};

const MODE_LABELS = {
  draft: 'Draft',
  review: 'Review & Send',
  automated: 'Automated',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function authHeaders() {
  const token = await getFreshToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function prefKey(action) {
  return `${action.agentKey}:${action.actionKey}:${action.integration}`;
}

/** Convert DB automation_actions into workspace groups. */
function buildWorkspacesFromActions(dbActions) {
  const byDept = {};

  for (const a of dbActions) {
    const dept = a.department || a.agent_key || 'general';
    if (!byDept[dept]) byDept[dept] = [];

    // Map assignee_type to risk level
    const risk = a.assignee_type === 'agent' ? 'low'
      : a.assignee_type === 'human' ? 'high'
      : 'medium';

    byDept[dept].push({
      agentKey: a.agent_key || dept,
      actionKey: a.id,         // use DB id as action_key
      label: a.title,
      integration: 'agent_skill',
      risk,
      source: 'sop',           // marks as SOP-derived
      description: a.description,
    });
  }

  return Object.entries(byDept).map(([dept, actions]) => ({
    key: dept,
    label: DEPT_LABELS[dept] || dept.charAt(0).toUpperCase() + dept.slice(1),
    icon: DEPT_ICONS[dept] || 'Bot',
    actions,
  }));
}

// ─── Execution Stats ─────────────────────────────────────────────────────────

function ExecutionStats({ pref }) {
  if (!pref || !pref.total_executions) {
    return <span className="text-[10px] text-secondary-text">No executions yet</span>;
  }

  const mode = pref.execution_mode || 'draft';
  const total = pref.total_executions;
  const clean = pref.total_approved_without_edit || 0;
  const pct = total > 0 ? Math.round((clean / total) * 100) : 0;

  if (mode === 'automated') {
    return (
      <span className="text-[10px] text-green-700">
        {total} sent · fully automated
      </span>
    );
  }

  return (
    <span className="text-[10px] text-secondary-text">
      {total} sent · {pct}% approved without edits
    </span>
  );
}

// ─── Auto-Promotion Banner ──────────────────────────────────────────────────

function PromotionBanner({ pref, onAccept, onDismiss, accepting }) {
  if (!pref?.auto_promote_eligible) return null;

  const threshold = pref.auto_promote_threshold || 10;

  return (
    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
      <Sparkles size={14} className="text-blue-600 shrink-0" />
      <span className="text-xs text-blue-800 flex-1">
        <span className="font-medium">Recommended: Switch to Automated</span> — {threshold} consecutive approvals without edits
      </span>
      <button
        onClick={onAccept}
        disabled={accepting}
        className="px-2.5 py-1 text-[11px] font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
      >
        {accepting ? <Loader size={10} className="animate-spin" /> : <CheckCircle size={10} />}
        Accept
      </button>
      <button
        onClick={onDismiss}
        disabled={accepting}
        className="p-1 text-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
        title="Dismiss recommendation"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ─── Mode Selector ───────────────────────────────────────────────────────────

function ModeSelector({ action, currentMode, msConnected, saving, onSelect }) {
  const modes = ['draft', 'review', 'automated'];
  const isSkill = action.integration === 'agent_skill';
  const locked = !isSkill && !msConnected;
  const isHighRiskAuto = action.risk === 'high' && currentMode === 'automated';

  return (
    <div>
      <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
        {modes.map(mode => {
          const active = currentMode === mode;
          const disabled = locked && mode !== 'draft';

          let bg = 'bg-white hover:bg-gray-50';
          if (active && mode === 'draft') bg = 'bg-gray-100';
          if (active && mode === 'review') bg = 'bg-blue-50';
          if (active && mode === 'automated') bg = 'bg-green-50';

          let textColor = 'text-secondary-text';
          if (active && mode === 'draft') textColor = 'text-dark-text font-medium';
          if (active && mode === 'review') textColor = 'text-blue-700 font-medium';
          if (active && mode === 'automated') textColor = 'text-green-700 font-medium';

          return (
            <button
              key={mode}
              onClick={() => !disabled && !active && onSelect(mode)}
              disabled={disabled || saving}
              className={`px-3 py-1.5 text-xs border-r border-gray-200 last:border-r-0 transition-colors ${bg} ${textColor} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${saving ? 'opacity-50' : ''}`}
              title={disabled ? 'Connect Microsoft 365 to enable' : MODE_LABELS[mode]}
            >
              {MODE_LABELS[mode]}
            </button>
          );
        })}
      </div>
      {locked && (
        <p className="text-[10px] text-secondary-text mt-1">Connect Microsoft 365 to enable execution modes</p>
      )}
      {isHighRiskAuto && (
        <div className="flex items-start gap-1.5 mt-1.5">
          <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-700">
            Alf recommends human review for this action. External client communications and financial actions carry compliance risk.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Workspace Group ─────────────────────────────────────────────────────────

function WorkspaceGroup({ workspace, preferences, msConnected, savingKey, onModeChange, onPromote, onDismissPromotion, promotingKey }) {
  const [expanded, setExpanded] = useState(true);
  const Icon = ICONS[workspace.icon] || Users;

  const promoCount = workspace.actions.filter(a => preferences[prefKey(a)]?.auto_promote_eligible).length;
  const hasSopActions = workspace.actions.some(a => a.source === 'sop');

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className="text-secondary-text" />
          <span className="text-sm font-semibold text-dark-text">{workspace.label}</span>
          <span className="text-xs text-secondary-text">{workspace.actions.length} actions</span>
          {hasSopActions && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
              SOP-derived
            </span>
          )}
          {promoCount > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {promoCount} recommendation{promoCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {expanded ? <ChevronDown size={16} className="text-secondary-text" /> : <ChevronRight size={16} className="text-secondary-text" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {workspace.actions.map((action, idx) => {
            const key = prefKey(action);
            const pref = preferences[key];
            const currentMode = pref?.execution_mode || 'draft';
            const riskStyle = RISK_STYLES[action.risk] || RISK_STYLES.medium;
            const recommended = RISK_RECOMMENDED[action.risk] || 'review';
            const isSaving = savingKey === key;
            const isPromoting = promotingKey === key;

            return (
              <div
                key={key}
                className={`px-5 py-4 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-dark-text">{action.label}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${riskStyle.bg} ${riskStyle.text}`}>
                        {riskStyle.label}
                      </span>
                      {action.source === 'sop' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">Skill</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-secondary-text mb-1">
                      <span className="flex items-center gap-1">
                        {action.integration === 'agent_skill' ? <Bot size={11} /> : <Mail size={11} />}
                        {action.integration === 'agent_skill' ? 'Agent Skill' : 'Email'}
                      </span>
                      <span>Alf recommends: <span className="font-medium">{MODE_LABELS[recommended]}</span></span>
                    </div>
                    {action.description && (
                      <p className="text-[11px] text-secondary-text mb-1 line-clamp-1">{action.description}</p>
                    )}
                    <ExecutionStats pref={pref} />
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {isSaving && <Loader size={12} className="animate-spin text-secondary-text" />}
                    <ModeSelector
                      action={action}
                      currentMode={currentMode}
                      msConnected={msConnected}
                      saving={isSaving}
                      onSelect={(mode) => onModeChange(action, mode)}
                    />
                  </div>
                </div>
                <PromotionBanner
                  pref={pref}
                  onAccept={() => onPromote(action)}
                  onDismiss={() => onDismissPromotion(action)}
                  accepting={isPromoting}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AutomationPreferencesPage({ embedded = false }) {
  const navigate = useNavigate();
  const { tenantId } = useTenantId();
  const [preferences, setPreferences] = useState({});
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [promotingKey, setPromotingKey] = useState(null);
  const [msStatus, setMsStatus] = useState(null);
  const [msLoading, setMsLoading] = useState(true);

  async function loadData() {
    try {
      const headers = await authHeaders();

      // Load preferences and DB actions in parallel
      const [prefsRes, actionsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/automation-preferences/${tenantId}`, { headers }),
        fetch(`${BACKEND_URL}/api/sop-analysis/actions?status=active`, { headers }),
      ]);

      // Parse preferences
      if (prefsRes.ok) {
        const data = await prefsRes.json();
        const map = {};
        data.forEach(p => { map[`${p.agent_key}:${p.action_key}:${p.integration_type}`] = p; });
        setPreferences(map);
      }

      // Parse DB actions and build workspaces
      let dbWorkspaces = [];
      if (actionsRes.ok) {
        const { actions: dbActions } = await actionsRes.json();
        if (dbActions?.length > 0) {
          dbWorkspaces = buildWorkspacesFromActions(dbActions);
        }
      }

      // Merge: DB-derived workspaces first, then built-in workspaces
      // Avoid duplicating departments that exist in both
      const dbDepts = new Set(dbWorkspaces.map(w => w.key));
      const builtinFiltered = BUILTIN_WORKSPACES.filter(w => !dbDepts.has(w.key));
      setWorkspaces([...dbWorkspaces, ...builtinFiltered]);
    } catch (err) {
      console.error('[automation-preferences] Load error:', err.message);
      setWorkspaces(BUILTIN_WORKSPACES);
    } finally {
      setLoading(false);
    }
  }

  async function loadMsStatus() {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/oauth/microsoft/status?tenantId=${tenantId}`, { headers });
      if (res.ok) {
        setMsStatus(await res.json());
      } else {
        setMsStatus({ connected: false });
      }
    } catch (err) {
      console.error('[automation-preferences] MS status error:', err.message);
      setMsStatus({ connected: false });
    } finally {
      setMsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    loadMsStatus();
  }, []);

  async function handleModeChange(action, newMode) {
    const key = prefKey(action);
    setSavingKey(key);

    setPreferences(prev => ({
      ...prev,
      [key]: { ...prev[key], execution_mode: newMode },
    }));

    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/automation-preferences/${tenantId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          agent_key: action.agentKey,
          action_key: action.actionKey,
          integration_type: action.integration,
          execution_mode: newMode,
          risk_level: action.risk,
          alf_recommended_mode: RISK_RECOMMENDED[action.risk],
        }),
      });

      if (!res.ok) throw new Error('Failed to save');
      const saved = await res.json();
      setPreferences(prev => ({ ...prev, [key]: saved }));
    } catch (err) {
      console.error('[automation-preferences] Save error:', err.message);
      loadData();
    } finally {
      setSavingKey(null);
    }
  }

  async function handlePromote(action) {
    const key = prefKey(action);
    setPromotingKey(key);

    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/automation-preferences/${tenantId}/promote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agent_key: action.agentKey,
          action_key: action.actionKey,
          integration_type: action.integration,
        }),
      });

      if (!res.ok) throw new Error('Failed to promote');
      const saved = await res.json();
      setPreferences(prev => ({ ...prev, [key]: saved }));
    } catch (err) {
      console.error('[automation-preferences] Promote error:', err.message);
    } finally {
      setPromotingKey(null);
    }
  }

  async function handleDismissPromotion(action) {
    const key = prefKey(action);
    setPromotingKey(key);

    // Optimistic
    setPreferences(prev => ({
      ...prev,
      [key]: { ...prev[key], auto_promote_eligible: false, total_approved_without_edit: 0 },
    }));

    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/automation-preferences/${tenantId}/dismiss-promotion`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agent_key: action.agentKey,
          action_key: action.actionKey,
          integration_type: action.integration,
        }),
      });

      if (!res.ok) throw new Error('Failed to dismiss');
      const saved = await res.json();
      setPreferences(prev => ({ ...prev, [key]: saved }));
    } catch (err) {
      console.error('[automation-preferences] Dismiss error:', err.message);
      loadData();
    } finally {
      setPromotingKey(null);
    }
  }

  const msConnected = msStatus?.connected === true;

  return (
    <div>
      {!embedded && (
        <>
          <h1 className="text-2xl font-light text-dark-text mb-2">Automation Preferences</h1>
          <p className="text-sm text-secondary-text mb-6">
            Control how agent actions interact with connected services. Each action can draft only, present a send button for review, or execute automatically.
          </p>
        </>
      )}

      <div className="space-y-4 max-w-3xl">

        {/* ── Integration Status Banner ── */}
        <div className={`rounded-lg border p-4 flex items-center justify-between ${msConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          {msLoading ? (
            <div className="flex items-center gap-2 text-sm text-secondary-text">
              <Loader size={14} className="animate-spin" />
              Checking integration status...
            </div>
          ) : msConnected ? (
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-green-600" />
              <div>
                <span className="text-sm font-medium text-green-800">Microsoft 365: Connected</span>
                {msStatus.user_email && (
                  <span className="text-xs text-green-700 ml-2">({msStatus.user_email})</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <XCircle size={18} className="text-gray-400" />
              <div>
                <span className="text-sm font-medium text-dark-text">Microsoft 365: Not connected</span>
                <span className="text-xs text-secondary-text ml-2">
                  Email actions locked to Draft mode. Agent skills can be configured independently.
                </span>
              </div>
            </div>
          )}
          {!msLoading && !msConnected && (
            <button
              onClick={() => navigate('/portal/admin/connections')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-secondary-text hover:text-dark-text hover:border-gray-400 transition-colors"
            >
              <LinkIcon size={12} />
              Connect
            </button>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-secondary-text py-8 justify-center">
            <Loader size={16} className="animate-spin" />
            Loading preferences...
          </div>
        )}

        {/* ── Workspace Groups ── */}
        {!loading && workspaces.map(ws => (
          <WorkspaceGroup
            key={ws.key}
            workspace={ws}
            preferences={preferences}
            msConnected={msConnected}
            savingKey={savingKey}
            onModeChange={handleModeChange}
            onPromote={handlePromote}
            onDismissPromotion={handleDismissPromotion}
            promotingKey={promotingKey}
          />
        ))}

        {/* ── Empty state ── */}
        {!loading && workspaces.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Zap size={32} className="text-gray-300 mx-auto mb-3" />
            <div className="text-sm text-secondary-text">No automation actions available.</div>
            <div className="text-xs text-secondary-text mt-1">
              Active agent skills and email actions will appear here once configured.
            </div>
          </div>
        )}

        {/* ── Footer note ── */}
        {!loading && workspaces.length > 0 && (
          <p className="text-xs text-secondary-text pt-2">
            Default: all actions start in Draft mode. Connecting Microsoft 365 unlocks Review & Send and Automated modes for email actions.
            Agent skills can be configured independently. After 10 consecutive approvals without edits, Alf recommends switching to Automated.
            Changes are saved immediately and logged to the activity log.
          </p>
        )}
      </div>
    </div>
  );
}
