import { useState, useEffect } from 'react';
import {
  Cable, Plus, Trash2, Play, Power, PowerOff, Loader, CheckCircle, XCircle,
  X, History, ExternalLink, Unplug, Zap, Mail, Database, FolderOpen,
  Users, MessageSquare, ChevronDown, ChevronRight, Cloud,
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
    authType: 'platform_managed',
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
  0: 'No integrations connected. Connect email or a data warehouse to get started.',
  1: 'One integration connected — agents can access data or send communications.',
  2: 'Email + data connected — agents can act on live data and send results.',
  3: 'Full integration — agents operate autonomously across all systems.',
};

// Generic paste-key services (microsoft handled separately via OAuth)
const SERVICE_TYPES = {};

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

  // Setup guide state
  const [setupGuideOpen, setSetupGuideOpen] = useState(false);

  // Sync health state (for platform-managed Snowflake)
  const [syncHealth, setSyncHealth] = useState(null);
  const [syncHealthLoading, setSyncHealthLoading] = useState(true);

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
        not_configured: 'Microsoft 365 integration is not configured yet. Follow the setup guide below to enable it.',
      };
      setMsMessage({
        type: 'error',
        text: messages[error] || `Microsoft connection failed: ${error}`,
        showSetupGuide: error === 'not_configured',
      });
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
    loadSyncHealth();
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

  async function loadSyncHealth() {
    setSyncHealthLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/sync/${tenantId}/health`, { headers });
      if (res.ok) {
        setSyncHealth(await res.json());
      } else {
        setSyncHealth(null);
      }
    } catch (err) {
      console.error('[connections] Sync health error:', err.message);
      setSyncHealth(null);
    } finally {
      setSyncHealthLoading(false);
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

  // Snowflake is platform-managed — use sync health status
  const hasSnowflake = syncHealth && ['healthy', 'stale'].includes(syncHealth.status);

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
                <div className="mt-3 ml-11">
                  <div className={`flex items-center gap-2 text-xs ${msMessage.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                    {msMessage.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {msMessage.text}
                    <button onClick={() => { setMsMessage(null); setSetupGuideOpen(false); }} className="ml-auto text-secondary-text hover:text-dark-text">
                      <X size={12} />
                    </button>
                  </div>

                  {/* Setup guide for not_configured error */}
                  {msMessage.showSetupGuide && (
                    <div className="mt-2">
                      <button
                        onClick={() => setSetupGuideOpen(!setupGuideOpen)}
                        className="flex items-center gap-1 text-xs font-medium text-aa-blue hover:text-aa-blue/80 transition-colors"
                      >
                        {setupGuideOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Azure AD Setup Guide
                      </button>
                      {setupGuideOpen && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-dark-text space-y-3">
                          <div>
                            <div className="font-medium mb-1">1. Register an app in Azure AD</div>
                            <ol className="list-decimal list-inside space-y-0.5 text-secondary-text">
                              <li>Go to <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="text-aa-blue underline">Azure Portal &rarr; App registrations</a></li>
                              <li>Click <span className="font-medium text-dark-text">New registration</span></li>
                              <li>Name it (e.g. "Alf Platform")</li>
                              <li>Set <span className="font-medium text-dark-text">Supported account types</span> to "Accounts in any organizational directory"</li>
                              <li>Set <span className="font-medium text-dark-text">Redirect URI</span> (Web) to:<br />
                                <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-[11px]">
                                  https://&#123;your-backend-url&#125;/api/oauth/microsoft/callback
                                </code>
                              </li>
                            </ol>
                          </div>
                          <div>
                            <div className="font-medium mb-1">2. Create a client secret</div>
                            <p className="text-secondary-text">Under <span className="font-medium text-dark-text">Certificates &amp; secrets</span>, add a new client secret and copy the value.</p>
                          </div>
                          <div>
                            <div className="font-medium mb-1">3. Add these env vars to the backend</div>
                            <div className="bg-white rounded border border-gray-200 p-2 font-mono text-[11px] space-y-0.5">
                              <div><span className="text-secondary-text">MICROSOFT_CLIENT_ID=</span>&#123;Application (client) ID&#125;</div>
                              <div><span className="text-secondary-text">MICROSOFT_CLIENT_SECRET=</span>&#123;Client secret value&#125;</div>
                              <div><span className="text-secondary-text">MICROSOFT_REDIRECT_URI=</span>https://&#123;backend-url&#125;/api/oauth/microsoft/callback</div>
                            </div>
                          </div>
                          <div>
                            <div className="font-medium mb-1">4. Required scopes (configured automatically)</div>
                            <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-[11px]">
                              openid profile email offline_access User.Read Mail.Send
                            </code>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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

                  {/* ── Data Warehouse (Platform-managed) ── */}
                  {cat.key === 'erp' && (
                    <div className="text-xs">
                      {syncHealthLoading ? (
                        <div className="flex items-center gap-2 text-secondary-text">
                          <Loader size={14} className="animate-spin" />
                          Checking status...
                        </div>
                      ) : syncHealth && ['healthy', 'stale'].includes(syncHealth.status) ? (
                        <div className="flex items-center gap-2">
                          <Cloud size={14} className={syncHealth.status === 'healthy' ? 'text-green-500' : 'text-amber-500'} />
                          <div>
                            <span className="font-medium text-dark-text">Platform data warehouse connected</span>
                            {syncHealth.last_sync_at && (
                              <span className="text-secondary-text ml-2">
                                Last sync {new Date(syncHealth.last_sync_at).toLocaleString(undefined, {
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-secondary-text">
                          <Cloud size={14} className="text-gray-300" />
                          <span>Data warehouse not yet provisioned</span>
                        </div>
                      )}
                    </div>
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
