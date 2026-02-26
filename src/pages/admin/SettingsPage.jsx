import { useState, useEffect } from 'react';
import { Key, Shield, Bell, Database, CheckCircle, XCircle, Loader } from 'lucide-react';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

export default function SettingsPage() {
  const [backendStatus, setBackendStatus] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    fetch(`${BACKEND_URL}/health`)
      .then(r => r.json())
      .then(data => setBackendStatus({ loading: false, data, error: null }))
      .catch(() => setBackendStatus({ loading: false, data: null, error: 'Backend unreachable' }));
  }, []);

  const { loading, data: health, error: healthError } = backendStatus;

  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-2">Settings</h1>
      <p className="text-sm text-secondary-text mb-6">Portal configuration and AI agent settings.</p>

      <div className="space-y-6 max-w-2xl">
        {/* AI Backend Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} className="text-aa-blue" />
            <h2 className="text-sm font-semibold text-dark-text">AI Backend</h2>
          </div>
          <p className="text-xs text-secondary-text mb-3">
            Agent calls are routed through a secure backend proxy. The Anthropic API key is stored server-side and never exposed to the browser.
          </p>

          {loading ? (
            <div className="flex items-center gap-2 text-xs text-secondary-text">
              <Loader size={14} className="animate-spin" />
              Checking backend connection...
            </div>
          ) : healthError ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-red-500" />
                <span className="text-xs text-red-600 font-medium">Backend unreachable</span>
              </div>
              <p className="text-[11px] text-secondary-text">
                The backend proxy at <code className="text-xs bg-gray-100 px-1 rounded">{BACKEND_URL}</code> is not responding.
                Agents will return demo mock responses until the connection is restored.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-xs text-green-700 font-medium">Backend connected</span>
                <span className="text-[10px] text-secondary-text">v{health.version}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <StatusRow label="Anthropic API Key" ok={health.anthropic_configured} />
                <StatusRow label="Supabase" ok={health.supabase_configured} />
              </div>
              {!health.anthropic_configured && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Anthropic API key is not configured on the server. Set ANTHROPIC_API_KEY in the backend environment.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-aa-blue" />
            <h2 className="text-sm font-semibold text-dark-text">Notifications</h2>
          </div>
          <div className="space-y-3">
            {['Task deadline reminders', 'Agent action completions', 'Union rate change alerts'].map((item) => (
              <label key={item} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-aa-blue focus:ring-aa-blue" />
                <span className="text-sm text-dark-text">{item}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-aa-blue" />
            <h2 className="text-sm font-semibold text-dark-text">Data & Privacy</h2>
          </div>
          <div className="space-y-2 text-sm text-secondary-text">
            <p>Agent conversations are not persisted between sessions.</p>
            <p>API calls are routed through a secure backend proxy — the API key never reaches the browser.</p>
            <p>All requests are authenticated via Supabase JWT and rate-limited per tenant.</p>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-aa-blue" />
            <h2 className="text-sm font-semibold text-dark-text">System</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-secondary-text">Version:</span>{' '}
              <span className="text-dark-text font-medium">0.2.0</span>
            </div>
            <div>
              <span className="text-secondary-text">Model:</span>{' '}
              <span className="text-dark-text font-medium">Claude Sonnet 4</span>
            </div>
            <div>
              <span className="text-secondary-text">Agents:</span>{' '}
              <span className="text-dark-text font-medium">8 configured</span>
            </div>
            <div>
              <span className="text-secondary-text">API Routing:</span>{' '}
              <span className="text-dark-text font-medium">Backend Proxy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, ok }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-amber-500'}`} />
      <span className="text-[11px] text-secondary-text">{label}</span>
      <span className={`text-[11px] font-medium ${ok ? 'text-green-700' : 'text-amber-600'}`}>
        {ok ? 'Ready' : 'Not configured'}
      </span>
    </div>
  );
}
