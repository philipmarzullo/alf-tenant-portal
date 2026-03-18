import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import useDashboardData from '../../hooks/useDashboardData';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';

const COL_HEADERS = [
  { key: 'job_count', label: 'Job Count' },
  { key: 'pct_revenue_inspected_safety', label: '% of Revenue Inspected (Safety)', pct: true },
  { key: 'safety_inspections', label: 'Safety Inspections' },
  { key: 'pct_revenue_inspected_commercial', label: '% of Revenue Inspected (Commercial)', pct: true },
  { key: 'commercial_inspections', label: 'Commercial Inspections' },
  { key: 'sites_with_deficiencies', label: '# of Sites with Deficiencies' },
  { key: 'sites_with_incidents', label: '# of Sites with Incidents' },
  { key: 'sites_with_good_saves', label: '# of Sites with Good Saves' },
  { key: 'sites_with_compliments', label: '# of Sites with Compliments' },
  { key: 'avg_deficiency_closed_days', label: 'Avg. Avg Deficiency Closed Days', decimal: true },
];

function formatCell(col, value) {
  if (value == null) return '—';
  if (col.pct) return `${Number(value).toFixed(1)}%`;
  if (col.decimal) return Number(value).toFixed(1);
  return Number(value).toLocaleString();
}

function isHighlighted(row, threshold) {
  return (
    (row.pct_revenue_inspected_safety != null && row.pct_revenue_inspected_safety < threshold) ||
    (row.pct_revenue_inspected_commercial != null && row.pct_revenue_inspected_commercial < threshold)
  );
}

export default function OpsKPIDashboard() {
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(today.getMonth() - 3);

  const [filters, setFilters] = useState({
    dateFrom: threeMonthsAgo.toISOString().slice(0, 10),
    dateTo: today.toISOString().slice(0, 10),
    vp: null,
    manager: null,
  });
  const [highlightThreshold, setHighlightThreshold] = useState(50);
  const [selectedVP, setSelectedVP] = useState(null);

  const { data, loading, error } = useDashboardData('ops-kpi', filters);

  const filteredManagers = useMemo(() => {
    if (!data?.managerSummary) return [];
    if (!selectedVP) return data.managerSummary;
    return data.managerSummary.filter(m => m.vp === selectedVP);
  }, [data, selectedVP]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-sm text-red-700">{String(error)}</p>
        </div>
      </div>
    );
  }

  if (!data?.vpSummary) return <DashboardEmptyState domain="ops-kpi" />;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">VP</label>
          <select
            value={filters.vp || ''}
            onChange={e => { setFilters(f => ({ ...f, vp: e.target.value || null })); setSelectedVP(null); }}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[120px]"
          >
            <option value="">(All)</option>
            {data.filters?.vpValues?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Manager</label>
          <select
            value={filters.manager || ''}
            onChange={e => setFilters(f => ({ ...f, manager: e.target.value || null }))}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[160px]"
          >
            <option value="">(All)</option>
            {data.filters?.managerValues?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Highlight Below X% Inspected</label>
          <input
            type="number"
            value={highlightThreshold}
            onChange={e => setHighlightThreshold(Number(e.target.value) || 0)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue w-[80px]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Start Date</label>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value || null }))}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">End Date</label>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value || null }))}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
          />
        </div>
        {(filters.vp || filters.manager) && (
          <button
            onClick={() => { setFilters(f => ({ ...f, vp: null, manager: null })); setSelectedVP(null); }}
            className="text-xs text-aa-blue hover:underline pb-1.5"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* VP Summary */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-dark-text">
            VP Summary
            <span className="ml-2 text-xs font-normal text-secondary-text italic">- Click to Filter</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-secondary-text sticky left-0 bg-gray-50 min-w-[60px]"></th>
                {COL_HEADERS.map(col => (
                  <th key={col.key} className="text-right px-3 py-2 font-medium text-secondary-text whitespace-nowrap text-xs">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.vpSummary.map(row => (
                <tr
                  key={row.vp}
                  className={`cursor-pointer transition-colors ${selectedVP === row.vp ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setSelectedVP(selectedVP === row.vp ? null : row.vp)}
                >
                  <td className="px-3 py-2 font-bold text-dark-text sticky left-0 bg-inherit text-right">
                    {row.vp}
                  </td>
                  {COL_HEADERS.map(col => (
                    <td key={col.key} className="px-3 py-2 text-right text-dark-text tabular-nums">
                      {formatCell(col, row[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manager Summary */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-dark-text">
            Manager Summary
            <span className="ml-2 text-xs font-normal text-secondary-text italic">- Click to Drill</span>
            {selectedVP && (
              <span className="ml-2 text-xs font-normal text-aa-blue">(VP: {selectedVP})</span>
            )}
          </h3>
          {selectedVP && (
            <button
              onClick={() => setSelectedVP(null)}
              className="text-xs text-aa-blue hover:underline"
            >
              Show all
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-secondary-text sticky left-0 bg-gray-50 min-w-[140px]"></th>
                {COL_HEADERS.map(col => (
                  <th key={col.key} className="text-right px-3 py-2 font-medium text-secondary-text whitespace-nowrap text-xs">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredManagers.length === 0 ? (
                <tr>
                  <td colSpan={COL_HEADERS.length + 1} className="px-4 py-8 text-center text-secondary-text">
                    No managers found
                  </td>
                </tr>
              ) : filteredManagers.map(row => {
                const highlight = isHighlighted(row, highlightThreshold);
                return (
                  <tr
                    key={`${row.vp}-${row.manager}`}
                    className={highlight ? 'bg-red-50' : 'hover:bg-gray-50'}
                  >
                    <td className={`px-3 py-2 font-medium sticky left-0 ${highlight ? 'bg-red-50 text-red-700' : 'bg-white text-dark-text'}`}>
                      {row.manager || '—'}
                    </td>
                    {COL_HEADERS.map(col => (
                      <td
                        key={col.key}
                        className={`px-3 py-2 text-right tabular-nums ${highlight ? 'text-red-700' : 'text-dark-text'}`}
                      >
                        {formatCell(col, row[col.key])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
