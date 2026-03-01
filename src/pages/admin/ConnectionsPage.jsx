import { useState, useEffect } from 'react';
import { Cable, Plus, Trash2, Play, Power, PowerOff, Loader, CheckCircle, XCircle, X, History, ExternalLink, Unplug } from 'lucide-react';
import { getFreshToken } from '../../lib/supabase';
import { useUser } from '../../contexts/UserContext';
import { useTenantId } from '../../contexts/TenantIdContext';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

// Generic paste-key services (microsoft handled separately via OAuth)
const SERVICE_TYPES = {
  snowflake: { label: 'Snowflake', color: 'blue', description: 'Data warehouse — Wavelytics, custom queries' },
};

const COLOR_CLASSES = {
  blue: 'bg-blue-100 text-blue-700',
  teal: 'bg-teal-100 text-teal-700',
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
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState(null);
  const [testResults, setTestResults] = useState(new Map());
  const [deleting, setDeleting] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [saving, setSaving] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Microsoft OAuth state
  const [msStatus, setMsStatus] = useState(null); // null = loading, { connected, user_email, ... }
  const [msLoading, setMsLoading] = useState(true);
  const [msDisconnecting, setMsDisconnecting] = useState(false);
  const [msMessage, setMsMessage] = useState(null); // { type: 'success'|'error', text }

  // Add form state
  const [formType, setFormType] = useState('snowflake');
  const [formLabel, setFormLabel] = useState('');
  const [formKey, setFormKey] = useState('');

  // Handle OAuth redirect query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('oauth_success');
    const error = params.get('oauth_error');

    if (success === 'microsoft') {
      setMsMessage({ type: 'success', text: 'Microsoft 365 connected successfully.' });
    } else if (error) {
      const messages = {
        access_denied: 'Microsoft sign-in was cancelled or denied.',
        token_exchange_failed: 'Failed to complete Microsoft authentication. Please try again.',
        server_error: 'A server error occurred. Please try again.',
      };
      setMsMessage({ type: 'error', text: messages[error] || `Microsoft connection failed: ${error}` });
    }

    // Clean URL params without triggering navigation
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
      // Filter out anthropic (platform-only) and microsoft (handled via OAuth card)
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
      // Navigate to authorize endpoint (browser redirect, not fetch)
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
      loadAuditLog();
    } catch (err) {
      console.error('[connections] MS disconnect error:', err.message);
      setMsMessage({ type: 'error', text: 'Failed to disconnect Microsoft 365.' });
    } finally {
      setMsDisconnecting(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!formKey.trim()) return;
    setSaving(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/credentials/${tenantId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ service_type: formType, key: formKey, label: formLabel || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save');
      }
      setAdding(false);
      setFormType('snowflake');
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

  // All service types for the audit log display (including microsoft)
  const allServiceTypes = {
    ...SERVICE_TYPES,
    microsoft: { label: 'Microsoft 365', color: 'teal' },
  };

  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-2">Connections</h1>
      <p className="text-sm text-secondary-text mb-6">Manage data source credentials and service integrations.</p>

      <div className="space-y-4 max-w-2xl">

        {/* ── Microsoft 365 OAuth Card ── */}
        {isSuperAdmin && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                  Microsoft 365
                </span>
                <span className="text-sm text-secondary-text">Email, files, calendar</span>
              </div>
              {msStatus?.connected && (
                <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
              )}
            </div>

            {/* Status message from OAuth redirect */}
            {msMessage && (
              <div className={`mt-3 flex items-center gap-2 text-xs ${msMessage.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                {msMessage.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {msMessage.text}
                <button onClick={() => setMsMessage(null)} className="ml-auto text-secondary-text hover:text-dark-text">
                  <X size={12} />
                </button>
              </div>
            )}

            {msLoading ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-secondary-text">
                <Loader size={14} className="animate-spin" />
                Checking Microsoft status...
              </div>
            ) : msStatus?.connected ? (
              <div className="mt-3">
                <div className="flex items-center gap-4 text-xs text-secondary-text mb-3">
                  <span className="text-dark-text font-medium">{msStatus.user_email}</span>
                  {msStatus.user_name && msStatus.user_name !== 'Unknown' && (
                    <span>{msStatus.user_name}</span>
                  )}
                  {!msStatus.token_valid && (
                    <span className="text-amber-600 font-medium">Token expired — reconnect</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!msStatus.token_valid && (
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
              <div className="mt-3">
                <button
                  onClick={handleMsConnect}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors flex items-center gap-2 hover:opacity-90"
                  style={{ backgroundColor: '#0078d4' }}
                >
                  <ExternalLink size={14} />
                  Sign in with Microsoft
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Add credential form (generic paste-key services) ── */}
        {adding && (
          <form onSubmit={handleAdd} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-dark-text">Add Connection</h2>
              <button type="button" onClick={() => setAdding(false)} className="text-secondary-text hover:text-dark-text">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-dark-text mb-1">Service Type</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
                >
                  {Object.entries(SERVICE_TYPES).map(([key, st]) => (
                    <option key={key} value={key}>{st.label} — {st.description}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-text mb-1">Label <span className="text-secondary-text font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={e => setFormLabel(e.target.value)}
                  placeholder="e.g. Production, Staging"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-text mb-1">Credential / API Key</label>
                <textarea
                  value={formKey}
                  onChange={e => setFormKey(e.target.value)}
                  rows={3}
                  placeholder="Paste your credential here"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
                  style={{ WebkitTextSecurity: 'disc' }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!formKey.trim() || saving}
                  className="px-4 py-2 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader size={14} className="animate-spin" />}
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="px-4 py-2 text-sm text-secondary-text hover:text-dark-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Add button (when form is closed) */}
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors"
          >
            <Plus size={16} />
            Add Connection
          </button>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-secondary-text py-8 justify-center">
            <Loader size={16} className="animate-spin" />
            Loading connections...
          </div>
        )}

        {/* Empty state (only show when no credentials AND no Microsoft card) */}
        {!loading && credentials.length === 0 && !adding && !(isSuperAdmin && msStatus?.connected) && !isSuperAdmin && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Cable size={32} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-sm font-medium text-dark-text mb-1">No connections configured</h3>
            <p className="text-xs text-secondary-text">
              Add a data source connection to enable syncing and integrations.
            </p>
          </div>
        )}

        {/* Generic credential cards */}
        {credentials.map(cred => {
          const svc = SERVICE_TYPES[cred.service_type] || { label: cred.service_type, color: 'blue' };
          const result = testResults.get(cred.id);
          const isDeleting = deleting === cred.id;

          return (
            <div key={cred.id} className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${COLOR_CLASSES[svc.color] || COLOR_CLASSES.blue}`}>
                    {svc.label}
                  </span>
                  <span className="text-sm font-medium text-dark-text">
                    {cred.credential_label || 'Untitled'}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${cred.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
                <div className="flex items-center gap-1">
                  {/* Test */}
                  <button
                    onClick={() => handleTest(cred.id)}
                    disabled={testing === cred.id}
                    title="Test connection"
                    className="p-1.5 text-secondary-text hover:text-aa-blue transition-colors disabled:opacity-50"
                  >
                    {testing === cred.id ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
                  </button>

                  {/* Toggle active */}
                  <button
                    onClick={() => handleToggle(cred)}
                    disabled={toggling === cred.id}
                    title={cred.is_active ? 'Deactivate' : 'Activate'}
                    className="p-1.5 text-secondary-text hover:text-dark-text transition-colors disabled:opacity-50"
                  >
                    {toggling === cred.id
                      ? <Loader size={14} className="animate-spin" />
                      : cred.is_active ? <Power size={14} /> : <PowerOff size={14} />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleting(cred.id)}
                    title="Delete"
                    className="p-1.5 text-secondary-text hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-4 text-xs text-secondary-text">
                <span className="font-mono">{'••••'} {cred.key_hint || '????'}</span>
                {cred.updated_at && (
                  <span>Updated {new Date(cred.updated_at).toLocaleDateString()}</span>
                )}
              </div>

              {/* Test result */}
              {result && (
                <div className={`mt-3 flex items-center gap-2 text-xs ${result.success ? 'text-green-700' : 'text-red-600'}`}>
                  {result.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {result.message || (result.success ? 'Connection successful' : 'Connection failed')}
                </div>
              )}

              {/* Delete confirmation */}
              {isDeleting && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
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

        {/* Activity Log */}
        {!loading && (credentials.length > 0 || auditLog.length > 0 || (isSuperAdmin && msStatus?.connected)) && (
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
      </div>
    </div>
  );
}
