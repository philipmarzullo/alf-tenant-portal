import { useState } from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { unionCalendar } from '../../data/mock/unionCalendar';
import StatusBadge from '../../components/shared/StatusBadge';
import AgentActionButton from '../../components/shared/AgentActionButton';

export default function UnionCalendar() {
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggle = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Group by month
  const months = [];
  const seen = new Set();
  for (const item of unionCalendar) {
    if (!seen.has(item.month)) {
      seen.add(item.month);
      months.push(item.month);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-secondary-text">
          2026 union contract rate changes — real A&A contract data.
        </p>
        <AgentActionButton label="Generate Rate Change Batch" variant="default" onClick={() => {}} />
      </div>

      <div className="space-y-6">
        {months.map((month) => {
          const items = unionCalendar.filter((i) => i.month === month);
          const totalAffected = items.reduce((sum, i) => sum + i.employeesAffected, 0);

          return (
            <div key={month}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-semibold text-dark-text">{month}</h3>
                <span className="text-xs text-secondary-text">{items.length} contract{items.length > 1 ? 's' : ''} · {totalAffected.toLocaleString()} employees</span>
              </div>

              <div className="space-y-2">
                {items.map((item) => {
                  const isOpen = expandedIds.has(item.id);

                  return (
                    <div key={item.id} className={`bg-white rounded-lg border ${item.urgent ? 'border-status-yellow/40' : 'border-gray-200'}`}>
                      <div
                        onClick={() => toggle(item.id)}
                        className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                      >
                        {isOpen ? <ChevronDown size={14} className="text-secondary-text" /> : <ChevronRight size={14} className="text-secondary-text" />}
                        <div className="flex-1 flex items-center gap-3">
                          <span className="text-sm font-medium text-dark-text w-16">{item.effectiveDate}</span>
                          <span className="text-sm text-dark-text">{item.union}</span>
                          {item.urgent && <span className="text-xs font-medium text-status-yellow">⚠ Next up</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-xs text-secondary-text">
                            <Users size={12} />
                            {item.employeesAffected.toLocaleString()}
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                      </div>

                      {isOpen && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                          <div className="grid grid-cols-3 gap-4 pt-3">
                            <div>
                              <div className="text-xs text-secondary-text mb-1">Current Rate</div>
                              <div className="text-sm font-medium text-dark-text">{item.currentRate}/hr</div>
                            </div>
                            <div>
                              <div className="text-xs text-secondary-text mb-1">New Rate</div>
                              <div className="text-sm font-medium text-aa-blue">{item.newRate}/hr</div>
                            </div>
                            <div>
                              <div className="text-xs text-secondary-text mb-1">Employees Affected</div>
                              <div className="text-sm font-medium text-dark-text">{item.employeesAffected.toLocaleString()}</div>
                            </div>
                          </div>
                          {item.status === 'upcoming' && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <AgentActionButton label="Generate Rate Change Batch" onClick={() => {}} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
