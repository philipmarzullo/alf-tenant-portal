import { useState } from 'react';
import { Bot, ChevronDown, ChevronRight, Plus, FileText, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getAllAgents } from '../../agents/registry';
import StatusBadge from '../../components/shared/StatusBadge';
import { DEPT_COLORS } from '../../data/constants';

const usageData = Array.from({ length: 14 }, (_, i) => ({
  day: `Feb ${i + 10}`,
  calls: Math.floor(Math.random() * 40) + 15,
}));

const MOCK_STATS = {
  hr: { today: 12, week: 67, month: 284, lastInvoked: '2 minutes ago', errors: 0 },
  finance: { today: 0, week: 0, month: 0, lastInvoked: 'Never', errors: 0 },
  purchasing: { today: 0, week: 0, month: 0, lastInvoked: 'Never', errors: 0 },
  qbu: { today: 2, week: 8, month: 31, lastInvoked: '4 hours ago', errors: 0 },
  sales: { today: 4, week: 22, month: 89, lastInvoked: '1 hour ago', errors: 0 },
  ops: { today: 6, week: 34, month: 142, lastInvoked: '15 minutes ago', errors: 0 },
  admin: { today: 3, week: 18, month: 74, lastInvoked: '45 minutes ago', errors: 0 },
  salesDeck: { today: 1, week: 5, month: 19, lastInvoked: 'Yesterday', errors: 0 },
};

export default function AgentManagement() {
  const agents = getAllAgents();
  const [expandedKeys, setExpandedKeys] = useState(new Set());

  const toggle = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-2">Agent Management</h1>
      <p className="text-sm text-secondary-text mb-6 max-w-2xl">
        Each agent is a configuration — a system prompt, knowledge files, and action definitions — assembled and sent to the AI when a user triggers an action. No persistent processes. No always-on servers.
      </p>

      {/* Agent cards */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider">Agents</h2>
        <button className="inline-flex items-center gap-1.5 text-sm font-medium text-aa-blue hover:text-aa-blue/80 transition-colors">
          <Plus size={14} />
          Add Agent
        </button>
      </div>

      <div className="space-y-3 mb-10">
        {agents.map((agent) => {
          const isOpen = expandedKeys.has(agent.key);
          const stats = MOCK_STATS[agent.key] || {};
          const deptColor = DEPT_COLORS[agent.department] || DEPT_COLORS.ops;

          return (
            <div key={agent.key} className="bg-white rounded-lg border border-gray-200" style={{ borderLeftWidth: 4, borderLeftColor: deptColor }}>
              <div
                onClick={() => toggle(agent.key)}
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
              >
                {isOpen ? <ChevronDown size={14} className="text-secondary-text" /> : <ChevronRight size={14} className="text-secondary-text" />}

                <div className="p-2 rounded-lg" style={{ backgroundColor: deptColor + '15' }}>
                  <Bot size={18} style={{ color: deptColor }} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-dark-text text-sm">{agent.name}</span>
                    <StatusBadge status={agent.status} />
                  </div>
                  <div className="text-xs text-secondary-text mt-0.5">
                    {agent.model} · {agent.knowledgeModules.length} knowledge module{agent.knowledgeModules.length !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-secondary-text">
                  <div className="text-center">
                    <div className="font-semibold text-dark-text text-sm">{stats.today}</div>
                    <div>Today</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-dark-text text-sm">{stats.week}</div>
                    <div>This Week</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-dark-text text-sm">{stats.month}</div>
                    <div>This Month</div>
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-6 pt-4">
                    {/* Config */}
                    <div>
                      <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
                        System Prompt
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-xs text-secondary-text font-mono leading-relaxed max-h-40 overflow-y-auto">
                        {agent.systemPrompt.slice(0, 400)}...
                      </div>
                    </div>

                    {/* Knowledge + Actions */}
                    <div>
                      <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
                        Knowledge Modules
                      </div>
                      {agent.knowledgeModules.length > 0 ? (
                        <div className="space-y-1.5 mb-4">
                          {agent.knowledgeModules.map((km) => (
                            <div key={km} className="flex items-center gap-2 text-xs text-dark-text">
                              <FileText size={12} className="text-secondary-text" />
                              {km}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-secondary-text italic mb-4">No knowledge modules loaded — awaiting process mapping</div>
                      )}

                      <div className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
                        Actions ({Object.keys(agent.actions).length})
                      </div>
                      <div className="space-y-1.5">
                        {Object.values(agent.actions).map((action) => (
                          <div key={action.label} className="flex items-center gap-2 text-xs text-dark-text">
                            <Zap size={12} className="text-aa-blue" />
                            {action.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-secondary-text">
                    <span>Last invoked: {stats.lastInvoked}</span>
                    <span>Errors: {stats.errors}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* API Usage */}
      <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-4">API Usage</h2>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <div className="text-xs text-secondary-text mb-1">Calls (14 days)</div>
            <div className="text-2xl font-semibold text-dark-text">
              {usageData.reduce((s, d) => s + d.calls, 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-secondary-text mb-1">Tokens This Month</div>
            <div className="text-2xl font-semibold text-dark-text">1.2M</div>
          </div>
          <div>
            <div className="text-xs text-secondary-text mb-1">Est. Monthly Cost</div>
            <div className="text-2xl font-semibold text-dark-text">$18.40</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={usageData}>
            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
            <Tooltip />
            <Bar dataKey="calls" fill="#009ADE" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
