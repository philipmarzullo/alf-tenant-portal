import { useState } from 'react';
import { Key, Shield, Bell, Database } from 'lucide-react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (apiKey) {
      localStorage.setItem('aa_anthropic_key', apiKey);
    } else {
      localStorage.removeItem('aa_anthropic_key');
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-2">Settings</h1>
      <p className="text-sm text-secondary-text mb-6">Portal configuration and AI agent settings.</p>

      <div className="space-y-6 max-w-2xl">
        {/* API Key */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} className="text-aa-blue" />
            <h2 className="text-sm font-semibold text-dark-text">Anthropic API Key</h2>
          </div>
          <p className="text-xs text-secondary-text mb-3">
            Connect a Claude API key to enable live AI agent responses. Without a key, agents return demo mock responses.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-aa-blue font-mono"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-aa-blue rounded-md hover:bg-aa-blue/90 transition-colors"
            >
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
          <p className="text-[11px] text-secondary-text mt-2">
            Key is stored in browser localStorage only. Never sent anywhere except the Anthropic API.
          </p>
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
            <p>API calls are made directly from your browser to the Anthropic API — no A&A proxy.</p>
            <p>Mock data is used for all employee records in this prototype.</p>
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
              <span className="text-dark-text font-medium">0.1.0-prototype</span>
            </div>
            <div>
              <span className="text-secondary-text">Model:</span>{' '}
              <span className="text-dark-text font-medium">Claude Sonnet 4</span>
            </div>
            <div>
              <span className="text-secondary-text">Agents:</span>{' '}
              <span className="text-dark-text font-medium">5 configured</span>
            </div>
            <div>
              <span className="text-secondary-text">Knowledge Modules:</span>{' '}
              <span className="text-dark-text font-medium">5 loaded</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
