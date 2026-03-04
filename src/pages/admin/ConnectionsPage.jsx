import { useState, useEffect } from 'react';
import {
  Cable, Plus, Trash2, Play, Power, PowerOff, Loader, CheckCircle, XCircle,
  X, History, ExternalLink, Unplug, Zap, Mail, Database, FolderOpen,
  Users, MessageSquare,
} from 'lucide-react';
import { getFreshToken } from '../../lib/supabase';
import { useUser } from '../../contexts/UserContext';
import { useTenantId } from '../../contexts/TenantIdContext';
import { useTenantPortal } from '../../contexts/TenantPortalContext';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

// ── Integration Categories ──────────────────────────────────────────
const INTEGRATION_CATEGORIES = [
  {
    key: 'email',
    label: 'Email & Calendar',
    icon: Mail,
    connectionType: 'email',
    provider: 'microsoft',
    description: 'Microsoft 365 — email, calendar, contacts',
    unlocks: [
      'Email sending from agents',
      'Compose and send in My Work',
      'Calendar scheduling',
    ],
    status: 'available', // 'available' | 'coming_soon'
    authType: 'oauth',   // 'oauth' | 'api_key'
  },
  {
    key: 'erp',
    label: 'Data Warehouse',
    icon: Database,
    connectionType: 'erp',
    provider: 'snowflake',
    description: 'Snowflake — dashboards, reports, agent data access',
    unlocks: [
      'Live dashboards with real data',
      'Agent access to operational data',
      'Automated reports and analytics',
    ],
    status: 'available',
    authType: 'api_key',
    serviceType: 'snowflake',
  },
  {
    key: 'file_storage',
    label: 'File Storage',
    icon: FolderOpen,
    connectionType: 'file_storage',
    description: 'SharePoint / Google Drive',
    unlocks: [
      'Agent file retrieval',
      'Automatic document filing',
    ],
    status: 'coming_soon',
  },
  {
    key: 'crm',
    label: 'CRM',
    icon: Users,
    connectionType: 'crm',
    description: 'Salesforce / HubSpot',
    unlocks: [
      'Customer-aware agents',
      'Automatic CRM updates',
    ],
    status: 'coming_soon',
  },
  {
    key: 'team_comms',
    label: 'Team Communication',
    icon: MessageSquare,
    connectionType: 'team_comms',
    description: 'Slack / Microsoft Teams channels',
    unlocks: [
      'Channel notifications from agents',
      'Chat-triggered agent workflows',
    ],
    status: 'coming_soon',
  },
];

// ── Tier descriptions ───────────────────────────────────────────────
const TIER_DESCRIPTIONS = {
  0: 'No integrations connected. Connect email to unlock agent capabilities.',
  1: 'Email connected — agents can draft and send emails directly.',
  2: 'Email + data connected — agents can act on live data and send results.',
  3: 'Full integration — agents operate autonomously across all systems.',
};

// Generic paste-key services (microsoft handled separately via OAuth)
const SERVICE_TYPES = {
  snowflake: { label: 'Snowflake', color: 'blue', description: 'Data warehouse — Wavelytics, custom queries' },
};

async function authHeaders() {
  const token = await getFreshToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function ConnectionsPage() {
  const { isSuperAdmin } = useUser();
  const { tenantId } = useTenantId();
  const { connectionTier, refreshAll: refreshPortal } = useTenantPortal();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);
  const [testResults, setTestResults] = useState(new Map());
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Microsoft OAuth state
  const [msStatus, setMsStatus] = useState(null);
  const [msLoading, setMsLoading] = useState(true);
  const [msDisconnecting, setMsDisconnecting] = useState(false);
  const [msMessage, setMsMessage] = useState(null);

  // Add Snowflake form state
  const [showAddSnowflake, setShowAddSnowflake] = useState(false);
  const [formLabel, setFormLabel] = useState('');
  const [formKey, setFormKey] = useState('');

  // Handle OAuth redirect query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('oauth_success');
    const error = params.get('oauth_error');

    if (success === 'microsoft') {
      setMsMessage({ type: 'success', text: 'Microsoft 365 connected successfully.' });
      refreshPortal();
    } else if (error) {
      const messages = {
        access_denied: 'Microsoft sign-in was cancelled or denied.',
        token_exchange_failed: 'Failed to complete Microsoft authentication. Please try again.',
        server_error: 'A server error occurred. Please try again.',
      };
      setMsMessage({ type: 'error', text: messages[error] || `Microsoft connection failed: ${error}` });
    }

    if (success || error) {
      const url = new URL(window.location);
      url.searchParams.delete('oauth_success');
      url.searchParams.delete('oauth_error');
      window.history.replaceState({}, '', url.pathname);
    }
  }, []);

  async function loadCredentials() {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/credentials/${tenantId}`, { headers });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCredentials(data.filter(c => c.service_type !== 'anthropic' && c.service_type !== 'microsoft'));
    } catch (err) {
      console.error('[connections] Load error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditLog() {
    setAuditLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/credentials/${tenantId}/audit-log`, { headers });
      if (res.ok) setAuditLog(await res.json());
    } catch (err) {
      console.error('[connections] Audit log error:', err.message);
    } finally {
      setAuditLoading(false);
    }
  }

  async function loadMsStatus() {
    setMsLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/oauth/microsoft/status?tenantId=${tenantId}`, { headers });
      if (res.ok) {
        setMsStatus(await res.json());
      } else {
        setMsStatus({ connected: false });
      }
    } catch (err) {
      console.error('[connections] MS status error:', err.message);
      setMsStatus({ connected: false });
    } finally {
      setMsLoading(false);
    }
  }

  useEffect(() => {
    loadCredentials();
    loadAuditLog();
    if (isSuperAdmin) loadMsStatus();
    else setMsLoading(false);
  }, [isSuperAdmin]);

  async function handleMsConnect() {
    try {
      const token = await getFreshToken();
      if (!token) {
        setMsMessage({ type: 'error', text: 'Session expired. Please log in again.' });
        return;
      }
      window.location.href = `${BACKEND_URL}/api/oauth/microsoft/authorize?tenantId=${tenantId}&token=${token}`;
    } catch (err) {
      console.error('[connections] MS connect error:', err.message);
      setMsMessage({ type: 'error', text: 'Failed to start Microsoft sign-in.' });
    }
  }

  async function handleMsDisconnect() {
    setMsDisconnecting(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/oauth/microsoft/disconnect`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tenantId: tenantId }),
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      setMsStatus({ connected: false });
      setMsMessage({ type: 'success', text: 'Microsoft 365 disconnected.' });
      refreshPortal();
      loadAuditLog();
    } catch (err) {
      console.error('[connections] MS disconnect error:', err.message);
      setMsMessage({ type: 'error', text: 'Failed to disconnect Microsoft 365.' });
    } finally {
      setMsDisconnecting(false);
    }
  }

  async function handleAddSnowflake(e) {
    e.preventDefault();
    if (!formKey.trim()) return;
    setSaving(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/credentials/${tenantId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ service_type: 'snowflake', key: formKey, label: formLabel || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save');
      }
      setShowAddSnowflake(false);
      setFormLabel('');
      setFormKey('');
      await Promise.all([loadCredentials(), loadAuditLog()]);
    } catch (err) {
      console.error('[connections] Add error:', err.message);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(credentialId) {
    setTesting(credentialId);
    setTestResults(prev => { const m = new Map(prev); m.delete(credentialId); return m; });
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/credentials/${credentialId}/test`, {
        method: 'POST',
        headers,
      });
      const result = await res.json();
      setTestResults(prev => new Map(prev).set(credentialId, result));
      loadAuditLog();
    } catch (err) {
      setTestResults(prev => new Map(prev).set(credentialId, { success: false, message: err.message }));
    } finally {
      setTesting(null);
    }
  }

  async function handleToggle(cred) {
    setToggling(cred.id);
    try {
      const headers = await authHeaders();
      await fetch(`${BACKEND_URL}/api/credentials/${cred.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !cred.is_active }),
      });
      await Promise.all([loadCredentials(), loadAuditLog()]);
    } catch (err) {
      console.error('[connections] Toggle error:', err.message);
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(credentialId) {
    try {
      const headers = await authHeaders();
      await fetch(`${BACKEND_URL}/api/credentials/${credentialId}`, {
        method: 'DELETE',
        headers,
      });
      setDeleting(null);
      await Promise.all([loadCredentials(), loadAuditLog()]);
    } catch (err) {
      console.error('[connections] Delete error:', err.message);
    }
  }

  // Find Snowflake credentials for the data warehouse card
  const snowflakeCredentials = credentials.filter(c => c.service_type === 'snowflake');
  const hasSnowflake = snowflakeCredentials.some(c => c.is_active);

  // All service types for audit log display
  const allServiceTypes = {
    ...SERVICE_TYPES,
    microsoft: { label: 'Microsoft 365', color: 'teal' },
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-dark-text">Connections</h1>
      <p className="text-sm text-secondary-text mb-6">
        Connect your systems to unlock agent capabilities across your organization.
      </p>

      <div className="space-y-4 max-w-2xl">

        {/* ── Tier Summary Card ── */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Zap size={16} className="text-teal-600" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-dark-text">
                  Tier {connectionTier}
                </span>
                <span className="flex gap-0.5">
                  {[1, 2, 3].map(i => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${i <= connectionTier ? 'bg-teal-500' : 'bg-gray-200'}`}
                    />
                  ))}
                </span>
              </div>
              <p className="text-xs text-secondary-text mt-0.5">
                {TIER_DESCRIPTIONS[connectionTier] || TIER_DESCRIPTIONS[0]}
              </p>
            </div>
          </div>
        </div>

        {/* ── Integration Category Cards ── */}
        {INTEGRATION_CATEGORIES.map(cat => {
          const CatIcon = cat.icon;
          const isComingSoon = cat.status === 'coming_soon';

          // Determine connection status for this category
          let isConnected = false;
          let connectionDetail = null;

          if (cat.key === 'email') {
            isConnected = msStatus?.connected && msStatus?.token_valid !== false;
            connectionDetail = msStatus?.connected ? {
              email: msStatus.user_email,
              name: msStatus.user_name,
              tokenExpired: msStatus.token_valid === false,
            } : null;
          } else if (cat.key === 'erp') {
            isConnected = hasSnowflake;
            const activeCred = snowflakeCredentials.find(c => c.is_active);
            connectionDetail = activeCred ? { keyHint: activeCred.key_hint } : null;
          }

          return (
            <div key={cat.key} className={`bg-white rounded-lg border border-gray-200 p-5 ${isComingSoon ? 'opacity-60' : ''}`}>
              {/* Header row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isConnected ? 'bg-teal-50' : 'bg-gray-50'}`}>
                    <CatIcon size={18} className={isConnected ? 'text-teal-600' : 'text-gray-400'} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-dark-text">{cat.label}</div>
                    <div className="text-xs text-secondary-text">{cat.description}</div>
                  </div>
                </div>
                <div className="shrink-0 mt-1">
                  {isComingSoon ? (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-secondary-text">
                      Coming Soon
                    </span>
                  ) : isConnected ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
                  )}
                </div>
              </div>

              {/* What this unlocks */}
              <div className="mt-3 ml-11">
                <div className="text-[11px] font-medium text-secondary-text uppercase tracking-wider mb-1">
                  What this unlocks
                </div>
                <ul className="space-y-0.5">
                  {cat.unlocks.map((item, i) => (
                    <li key={i} className="text-xs text-secondary-text flex items-center gap-1.5">
                      <span className={`w-1 h-1 rounded-full shrink-0 ${isConnected ? 'bg-teal-400' : 'bg-gray-300'}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Status message (Microsoft only) */}
              {cat.key === 'email' && msMessage && (
                <div className={`mt-3 ml-11 flex items-center gap-2 text-xs ${msMessage.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                  {msMessage.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {msMessage.text}
                  <button onClick={() => setMsMessage(null)} className="ml-auto text-secondary-text hover:text-dark-text">
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Action area */}
              {!isComingSoon && (
                <div className="mt-3 ml-11">
                  {/* ── Email & Calendar (OAuth) ── */}
                  {cat.key === 'email' && isSuperAdmin && (
                    <>
                      {msLoading ? (
                        <div className="flex items-center gap-2 text-xs text-secondary-text">
                          <Loader size={14} className="animate-spin" />
                          Checking status...
                        </div>
                      ) : msStatus?.connected ? (
                        <div>
                          <div className="flex items-center gap-4 text-xs text-secondary-text mb-2">
                            <span className="text-dark-text font-medium">{msStatus.user_email}</span>
                            {msStatus.user_name && msStatus.user_name !== 'Unknown' && (
                              <span>{msStatus.user_name}</span>
                            )}
                            {connectionDetail?.tokenExpired && (
                              <span className="text-amber-600 font-medium">Token expired — reconnect</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {connectionDetail?.tokenExpired && (
                              <button
                                onClick={handleMsConnect}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors"
                                style={{ backgroundColor: '#0078d4' }}
                              >
                                Reconnect
                              </button>
                            )}
                            <button
                              onClick={handleMsDisconnect}
                              disabled={msDisconnecting}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-secondary-text hover:text-red-600 hover:border-red-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {msDisconnecting ? <Loader size={12} className="animate-spin" /> : <Unplug size={12} />}
                              Disconnect
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={handleMsConnect}
                          className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors flex items-center gap-2 hover:opacity-90"
                          style={{ backgroundColor: '#0078d4' }}
                        >
                          <ExternalLink size={14} />
                          Sign in with Microsoft
                        </button>
                      )}
                    </>
                  )}
                  {cat.key === 'email' && !isSuperAdmin && !msStatus?.connected && (
                    <p className="text-xs text-secondary-text">Contact your administrator to connect Microsoft 365.</p>
                  )}

                  {/* ── Data Warehouse (API key) ── */}
                  {cat.key === 'erp' && (
                    <>
                      {/* Connected Snowflake credentials */}
                      {snowflakeCredentials.map(cred => {
                        const result = testResults.get(cred.id);
                        const isDeleting = deleting === cred.id;
                        return (
                          <div key={cred.id} className="mb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs">
                                <span className={`w-1.5 h-1.5 rounded-full ${cred.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <span className="font-medium text-dark-text">{cred.credential_label || 'Snowflake'}</span>
                                <span className="font-mono text-secondary-text">{'••••'} {cred.key_hint || '????'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleTest(cred.id)}
                                  disabled={testing === cred.id}
                                  title="Test connection"
                                  className="p-1 text-secondary-text hover:text-aa-blue transition-colors disabled:opacity-50"
                                >
                                  {testing === cred.id ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
                                </button>
                                <button
                                  onClick={() => handleToggle(cred)}
                                  disabled={toggling === cred.id}
                                  title={cred.is_active ? 'Deactivate' : 'Activate'}
                                  className="p-1 text-secondary-text hover:text-dark-text transition-colors disabled:opacity-50"
                                >
                                  {toggling === cred.id
                                    ? <Loader size={12} className="animate-spin" />
                                    : cred.is_active ? <Power size={12} /> : <PowerOff size={12} />}
                                </button>
                                <button
                                  onClick={() => setDeleting(cred.id)}
                                  title="Delete"
                                  className="p-1 text-secondary-text hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            {result && (
                              <div className={`mt-1 flex items-center gap-2 text-xs ${result.success ? 'text-green-700' : 'text-red-600'}`}>
                                {result.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                {result.message || (result.success ? 'Connection successful' : 'Connection failed')}
                              </div>
                            )}
                            {isDeleting && (
                              <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                                <p className="text-xs text-red-700 mb-2">Delete this connection? This cannot be undone.</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleDelete(cred.id)}
                                    className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setDeleting(null)}
                                    className="px-3 py-1 text-xs text-secondary-text hover:text-dark-text transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add Snowflake form */}
                      {showAddSnowflake ? (
                        <form onSubmit={handleAddSnowflake} className="space-y-3 mt-2 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-dark-text">Add Snowflake Connection</span>
                            <button type="button" onClick={() => setShowAddSnowflake(false)} className="text-secondary-text hover:text-dark-text">
                              <X size={14} />
                            </button>
                          </div>
                          <div>
                            <label className="block text-xs text-secondary-text mb-1">Label <span className="text-secondary-text">(optional)</span></label>
                            <input
                              type="text"
                              value={formLabel}
                              onChange={e => setFormLabel(e.target.value)}
                              placeholder="e.g. Production"
                              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-secondary-text mb-1">Credential / API Key</label>
                            <textarea
                              value={formKey}
                              onChange={e => setFormKey(e.target.value)}
                              rows={2}
                              placeholder="Paste your Snowflake credential"
                              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
                              style={{ WebkitTextSecurity: 'disc' }}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={!formKey.trim() || saving}
                              className="px-3 py-1.5 bg-aa-blue text-white text-xs font-medium rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {saving && <Loader size={12} className="animate-spin" />}
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddSnowflake(false)}
                              className="px-3 py-1.5 text-xs text-secondary-text hover:text-dark-text transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => setShowAddSnowflake(true)}
                          className="flex items-center gap-1.5 text-xs font-medium text-aa-blue hover:text-aa-blue/80 transition-colors mt-1"
                        >
                          <Plus size={14} />
                          Add Connection
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Activity Log ── */}
        {!loading && (auditLog.length > 0 || credentials.length > 0 || (isSuperAdmin && msStatus?.connected)) && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 mt-2">
            <div className="flex items-center gap-2 mb-4">
              <History size={16} className="text-aa-blue" />
              <h2 className="text-sm font-semibold text-dark-text">Activity Log</h2>
            </div>
            {auditLoading ? (
              <div className="flex items-center gap-2 text-xs text-secondary-text">
                <Loader size={14} className="animate-spin" />
                Loading...
              </div>
            ) : auditLog.length === 0 ? (
              <p className="text-xs text-secondary-text">No activity recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {auditLog.map(entry => {
                  const svc = allServiceTypes[entry.service_type] || { label: entry.service_type };
                  return (
                    <div key={entry.id} className="flex items-start gap-3 text-xs py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-secondary-text whitespace-nowrap min-w-[120px]">
                        {new Date(entry.created_at).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      <span className="text-dark-text">
                        <span className="font-medium">{entry.user_name || 'Unknown'}</span>
                        {' '}{entry.action}{' '}
                        <span className="font-medium">{svc.label}</span>
                        {entry.action === 'toggled' && entry.detail?.is_active !== undefined && (
                          <span> — {entry.detail.is_active ? 'activated' : 'deactivated'}</span>
                        )}
                        {entry.action === 'tested' && entry.detail?.result && (
                          <span className={entry.detail.result === 'success' ? 'text-green-700' : 'text-red-600'}>
                            {' '}— {entry.detail.result}
                          </span>
                        )}
                        {entry.action === 'connected' && entry.detail?.email && (
                          <span> — {entry.detail.email}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-secondary-text py-8 justify-center">
            <Loader size={16} className="animate-spin" />
            Loading connections...
          </div>
        )}
      </div>
    </div>
  );
}
