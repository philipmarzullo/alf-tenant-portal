import { useState, useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Bot } from 'lucide-react';
import AgentChatPanel from '../../components/shared/AgentChatPanel';
import { useTenantConfig } from '../../contexts/TenantConfigContext';
import { MODULE_REGISTRY } from '../../data/moduleRegistry';

const ALL_TABS = MODULE_REGISTRY.hr.pages.map((p) => ({
  key: p.key,
  label: p.label,
  path: p.path,
}));

export default function HRLayout() {
  const [chatOpen, setChatOpen] = useState(false);
  const { getEnabledPages } = useTenantConfig();

  const tabs = useMemo(() => {
    const enabledKeys = getEnabledPages('hr');
    // null = no config loaded, show all (backwards compat)
    if (!enabledKeys) return ALL_TABS;
    return ALL_TABS.filter((t) => enabledKeys.includes(t.key));
  }, [getEnabledPages]);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
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
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
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
