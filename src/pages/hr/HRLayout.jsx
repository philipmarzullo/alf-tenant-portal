import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Bot } from 'lucide-react';
import AgentChatPanel from '../../components/shared/AgentChatPanel';

const TABS = [
  { label: 'Overview', path: '/hr' },
  { label: 'Benefits', path: '/hr/benefits' },
  { label: 'Pay Rate Changes', path: '/hr/pay-rates' },
  { label: 'Leave Management', path: '/hr/leave' },
  { label: 'Unemployment', path: '/hr/unemployment' },
  { label: 'Union Calendar', path: '/hr/union-calendar' },
];

export default function HRLayout() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-light text-dark-text">HR Workspace</h1>
        <button
          onClick={() => setChatOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
        >
          <Bot size={16} />
          Ask HR Agent
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/hr'}
            className={({ isActive }) =>
              `px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'text-aa-blue border-aa-blue'
                  : 'text-secondary-text border-transparent hover:text-dark-text hover:border-gray-300'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
        {/* Extensibility hint */}
        <div className="px-3 py-2.5 text-sm text-gray-300 border-b-2 border-transparent -mb-px">
          + More
        </div>
      </div>

      <Outlet />

      <AgentChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        agentKey="hr"
        agentName="HR Agent"
        context="HR processes, benefits, leave, pay rates, and union calendars"
      />
    </div>
  );
}
