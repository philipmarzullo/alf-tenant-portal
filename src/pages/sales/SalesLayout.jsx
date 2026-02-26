import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import AlfIcon from '../../components/shared/AlfIcon';
import AgentChatPanel from '../../components/shared/AgentChatPanel';

const TABS = [
  { label: 'Overview', path: '/sales' },
  { label: 'Contracts', path: '/sales/contracts' },
  { label: 'APC Tracker', path: '/sales/apc' },
  { label: 'TBI Tracker', path: '/sales/tbi' },
];

export default function SalesLayout() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
        <h1 className="text-2xl font-light text-dark-text">Sales Workspace</h1>
        <button
          onClick={() => setChatOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-lg hover:bg-aa-blue/10 transition-colors"
        >
          <AlfIcon size={16} />
          Ask Alf
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/sales'}
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
      </div>

      <Outlet />

      <AgentChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        agentKey="sales"
        agentName="Sales Agent"
        context="Contract renewals, APC tracking, TBI extra work, and pipeline management"
      />
    </div>
  );
}
