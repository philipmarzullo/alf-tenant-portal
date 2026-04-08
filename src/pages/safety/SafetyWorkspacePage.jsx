import { useState } from 'react';
import { Bot, ShieldAlert, ListChecks } from 'lucide-react';
import ClaimsDashboard from './ClaimsDashboard';
import ClaimTracker from './ClaimTracker';
import AgentChatPanel from '../../components/shared/AgentChatPanel';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: ShieldAlert },
  { id: 'tracker', label: 'Claim Tracker', icon: ListChecks },
];

export default function SafetyWorkspacePage() {
  const [tab, setTab] = useState('dashboard');
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
        <h1 className="text-2xl font-light text-dark-text">Safety Workspace</h1>
        <button
          onClick={() => setChatOpen(true)}
          disabled
          title="Coming soon"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-aa-blue/50 bg-aa-blue/5 border border-aa-blue/10 rounded-lg cursor-not-allowed"
        >
          <Bot size={16} />
          Ask Safety Agent
        </button>
      </div>

      {/* Sub-nav tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-aa-blue text-aa-blue'
                  : 'border-transparent text-secondary-text hover:text-dark-text'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'dashboard' && <ClaimsDashboard />}
      {tab === 'tracker' && <ClaimTracker />}

      <AgentChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        agentKey="safety"
        agentName="Safety Agent"
        context="Workers comp claims, incident trends, OSHA reporting"
      />
    </div>
  );
}
