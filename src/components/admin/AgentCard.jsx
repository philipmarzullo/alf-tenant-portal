import { ChevronDown, ChevronRight } from 'lucide-react';
import AlfIcon from '../shared/AlfIcon';
import StatusBadge from '../shared/StatusBadge';
import { DEPT_COLORS } from '../../data/constants';
import { hasOverride } from '../../agents/overrides';

/**
 * Collapsed agent row in the agent list.
 * Shows agent name, status, model, stats, and modified/dirty badges.
 */
export default function AgentCard({ agent, stats, isOpen, isDirty, onClick }) {
  const deptColor = DEPT_COLORS[agent.department] || DEPT_COLORS.ops;
  const isModified = hasOverride(agent.key);

  return (
    <div
      className="bg-white rounded-lg border border-gray-200"
      style={{ borderLeftWidth: 4, borderLeftColor: deptColor }}
    >
      <div
        onClick={onClick}
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
      >
        {isOpen ? (
          <ChevronDown size={14} className="text-secondary-text" />
        ) : (
          <ChevronRight size={14} className="text-secondary-text" />
        )}

        <div className="p-2 rounded-lg" style={{ backgroundColor: deptColor + '15' }}>
          <AlfIcon size={18} />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-dark-text text-sm">{agent.name}</span>
            <StatusBadge status={agent.status} />
            {isModified && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                Modified
              </span>
            )}
            {isDirty && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                Unsaved
              </span>
            )}
          </div>
          <div className="text-xs text-secondary-text mt-0.5">
            {agent.model} · {agent.knowledgeModules.length} knowledge module
            {agent.knowledgeModules.length !== 1 ? 's' : ''}
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
    </div>
  );
}
