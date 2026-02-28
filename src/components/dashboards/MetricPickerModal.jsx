import { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { useRBAC } from '../../contexts/RBACContext';
import { filterCatalogByTier } from '../../data/dashboardKPIRegistry';

const DOMAIN_LABELS = {
  home: 'Home',
  operations: 'Operations',
  labor: 'Labor',
  quality: 'Quality',
  timekeeping: 'Timekeeping',
  safety: 'Safety',
};

const TIER_BADGES = {
  operational: { label: 'Operational', style: 'bg-gray-100 text-gray-600' },
  managerial: { label: 'Managerial', style: 'bg-blue-50 text-blue-700' },
  financial: { label: 'Financial', style: 'bg-purple-50 text-purple-700' },
};

/**
 * Modal that shows available metrics from the catalog, filtered by the user's tier.
 * Already-selected metrics are shown as disabled.
 *
 * Props:
 *   open - boolean
 *   onClose - () => void
 *   onSelect - (metricId) => void
 *   excludeIds - string[] - IDs already in use (shown as disabled)
 *   domainFilter - string | null - if set, only show metrics from this domain
 */
export default function MetricPickerModal({ open, onClose, onSelect, excludeIds = [], domainFilter = null }) {
  const { metricTier } = useRBAC();
  const [search, setSearch] = useState('');

  const catalog = useMemo(() => {
    let items = filterCatalogByTier(metricTier);

    // Only show hero metrics for home domain picker
    if (domainFilter === 'home') {
      items = items.filter(m => m.domain === 'home' && m.type === 'hero');
    } else if (domainFilter) {
      items = items.filter(m => m.domain === domainFilter);
    }

    return items;
  }, [metricTier, domainFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return catalog;
    const q = search.toLowerCase();
    return catalog.filter(m =>
      m.defaultLabel.toLowerCase().includes(q) ||
      m.domain.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
  }, [catalog, search]);

  // Group by domain
  const grouped = useMemo(() => {
    const groups = {};
    for (const m of filtered) {
      const key = m.domain;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    return groups;
  }, [filtered]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-dark-text">Add Metric</h2>
          <button onClick={onClose} className="p-1 text-secondary-text hover:text-dark-text rounded transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search metrics..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
              autoFocus
            />
          </div>
        </div>

        {/* Metric list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-secondary-text text-center py-8">No metrics match your search.</p>
          ) : (
            Object.entries(grouped).map(([domain, metrics]) => (
              <div key={domain} className="mb-4">
                <div className="text-[11px] font-semibold text-secondary-text uppercase tracking-wider mb-2">
                  {DOMAIN_LABELS[domain] || domain}
                </div>
                <div className="space-y-1">
                  {metrics.map(m => {
                    const isExcluded = excludeIds.includes(m.id);
                    const badge = TIER_BADGES[m.sensitivity] || TIER_BADGES.operational;
                    return (
                      <button
                        key={`${m.domain}-${m.id}`}
                        onClick={() => !isExcluded && onSelect(m.id)}
                        disabled={isExcluded}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          isExcluded
                            ? 'bg-gray-50 opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-50 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-dark-text">{m.defaultLabel}</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.style}`}>
                            {badge.label}
                          </span>
                        </div>
                        {isExcluded && (
                          <span className="text-[10px] text-secondary-text">Already added</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
