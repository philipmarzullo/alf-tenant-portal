import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Users, DollarSign, Briefcase, HardHat, Loader, CheckCircle, XCircle, AlertTriangle, Mail, Link as LinkIcon } from 'lucide-react';
import { getFreshToken } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
const TENANT_ID = import.meta.env.VITE_TENANT_ID;

// ─── Action inventory ────────────────────────────────────────────────────────

const RISK_RECOMMENDED = { low: 'automated', medium: 'review', high: 'review' };

const WORKSPACES = [
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

const ICONS = { Users, DollarSign, Briefcase, HardHat };

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

// ─── Mode Selector ───────────────────────────────────────────────────────────

function ModeSelector({ action, currentMode, msConnected, saving, onSelect }) {
  const modes = ['draft', 'review', 'automated'];
  const locked = !msConnected;
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

function WorkspaceGroup({ workspace, preferences, msConnected, savingKey, onModeChange }) {
  const [expanded, setExpanded] = useState(true);
  const Icon = ICONS[workspace.icon] || Users;

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
        </div>
        {expanded ? <ChevronDown size={16} className="text-secondary-text" /> : <ChevronRight size={16} className="text-secondary-text" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {workspace.actions.map((action, idx) => {
            const key = prefKey(action);
            const pref = preferences[key];
            const currentMode = pref?.execution_mode || 'draft';
            const riskStyle = RISK_STYLES[action.risk];
            const recommended = RISK_RECOMMENDED[action.risk];
            const isSaving = savingKey === key;

            return (
              <div
                key={key}
                className={`px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-dark-text">{action.label}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${riskStyle.bg} ${riskStyle.text}`}>
                      {riskStyle.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-secondary-text">
                    <span className="flex items-center gap-1">
                      <Mail size={11} />
                      Email
                    </span>
                    <span>Alf recommends: <span className="font-medium">{MODE_LABELS[recommended]}</span></span>
                  </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AutomationPreferencesPage() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({}); // keyed by "agentKey:actionKey:integration"
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [msStatus, setMsStatus] = useState(null);
  const [msLoading, setMsLoading] = useState(true);

  async function loadPreferences() {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/automation-preferences/${TENANT_ID}`, { headers });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      const map = {};
      data.forEach(p => { map[`${p.agent_key}:${p.action_key}:${p.integration_type}`] = p; });
      setPreferences(map);
    } catch (err) {
      console.error('[automation-preferences] Load error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMsStatus() {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/oauth/microsoft/status?tenantId=${TENANT_ID}`, { headers });
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
    loadPreferences();
    loadMsStatus();
  }, []);

  async function handleModeChange(action, newMode) {
    const key = prefKey(action);
    setSavingKey(key);

    // Optimistic update
    setPreferences(prev => ({
      ...prev,
      [key]: { ...prev[key], execution_mode: newMode },
    }));

    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/automation-preferences/${TENANT_ID}`, {
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
      // Revert optimistic update
      loadPreferences();
    } finally {
      setSavingKey(null);
    }
  }

  const msConnected = msStatus?.connected === true;

  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-2">Automation Preferences</h1>
      <p className="text-sm text-secondary-text mb-6">
        Control how agent actions interact with connected services. Each action can draft only, present a send button for review, or execute automatically.
      </p>

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
                  All actions locked to Draft mode.
                </span>
              </div>
            </div>
          )}
          {!msLoading && !msConnected && (
            <button
              onClick={() => navigate('/admin/connections')}
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
        {!loading && WORKSPACES.map(ws => (
          <WorkspaceGroup
            key={ws.key}
            workspace={ws}
            preferences={preferences}
            msConnected={msConnected}
            savingKey={savingKey}
            onModeChange={handleModeChange}
          />
        ))}

        {/* ── Footer note ── */}
        {!loading && (
          <p className="text-xs text-secondary-text pt-2">
            Default: all actions start in Draft mode. Connecting Microsoft 365 unlocks Review & Send and Automated modes.
            Changes are saved immediately and logged to the activity log.
          </p>
        )}
      </div>
    </div>
  );
}
