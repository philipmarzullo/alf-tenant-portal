import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { contracts, groupByQuarter, daysUntilExpiry, getUrgencyTier } from '../../data/mock/salesMocks';
import StatusBadge from '../../components/shared/StatusBadge';

const fmt = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};

const SERVICE_LABELS = {
  janitorial: 'Janitorial',
  integrated: 'Integrated',
  grounds: 'Grounds',
  mep: 'MEP',
};

export default function SalesContracts() {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const quarters = groupByQuarter(contracts);

  const toggle = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div>
      <p className="text-sm text-secondary-text mb-4">
        All contracts grouped by expiration quarter. Click to expand.
      </p>

      <div className="space-y-6">
        {quarters.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-semibold text-dark-text">{group.label}</h3>
              <span className="text-xs text-secondary-text">
                {group.contracts.length} contract{group.contracts.length > 1 ? 's' : ''} · {fmt(group.totalApc)} annual APC
              </span>
            </div>

            <div className="space-y-2">
              {group.contracts.map((c) => {
                const isOpen = expandedIds.has(c.id);
                const urgency = getUrgencyTier(c.contractEnd);
                const days = daysUntilExpiry(c.contractEnd);

                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-lg border border-gray-200"
                    style={{ borderLeftWidth: 3, borderLeftColor: urgency.color }}
                  >
                    {/* Collapsed row */}
                    <div
                      onClick={() => toggle(c.id)}
                      className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    >
                      {isOpen
                        ? <ChevronDown size={14} className="text-secondary-text" />
                        : <ChevronRight size={14} className="text-secondary-text" />
                      }
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: urgency.color }}
                      />
                      <div className="flex-1 flex items-center gap-3">
                        <span className="text-sm font-medium text-dark-text">{c.client}</span>
                        <span className="text-xs text-secondary-text">{c.site}</span>
                      </div>
                      <span className="text-sm text-secondary-text w-28 text-right">
                        {new Date(c.contractEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <div className="grid grid-cols-4 gap-4 pt-3">
                          <div>
                            <div className="text-xs text-secondary-text mb-1">Contract Period</div>
                            <div className="text-sm font-medium text-dark-text">
                              {new Date(c.contractStart).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} — {new Date(c.contractEnd).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-secondary-text mb-1">APC Monthly</div>
                            <div className="text-sm font-medium text-dark-text">{fmt(c.apcMonthly)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-secondary-text mb-1">APC Annual</div>
                            <div className="text-sm font-medium text-aa-blue">{fmt(c.apcAnnual)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-secondary-text mb-1">Service Type</div>
                            <div className="text-sm font-medium text-dark-text">{SERVICE_LABELS[c.serviceType]}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 pt-3">
                          <div>
                            <div className="text-xs text-secondary-text mb-1">Account Manager</div>
                            <div className="text-sm font-medium text-dark-text">{c.accountManager}</div>
                          </div>
                          <div>
                            <div className="text-xs text-secondary-text mb-1">TBI YTD</div>
                            <div className="text-sm font-medium text-dark-text">{fmt(c.tbiYtd)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-secondary-text mb-1">TBI Pending</div>
                            <div className="text-sm font-medium text-dark-text">
                              {c.tbiPending > 0 ? fmt(c.tbiPending) : '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-secondary-text mb-1">Days Remaining</div>
                            <div
                              className="text-sm font-semibold"
                              style={{ color: urgency.color }}
                            >
                              {days > 0 ? `${days} days` : 'Expired'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
