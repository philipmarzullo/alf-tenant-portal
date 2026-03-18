import { useState, useMemo } from 'react';
import { Loader2, ClipboardCheck, Target, AlertCircle, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useDashboardData from '../../hooks/useDashboardData';
import KPICard from '../../components/dashboards/KPICard';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';

export default function InspectionsDashboard() {
  const [filters, setFilters] = useState({ dateFrom: '2025-01-01', dateTo: '2025-12-31', jobIds: null, inspectionType: null });
  const [selectedInspection, setSelectedInspection] = useState(null);
  const { data, loading, error } = useDashboardData('inspections', filters);

  const weeklyChart = useMemo(() => {
    if (!data?.inspections?.length) return [];
    const byWeek = {};
    for (const insp of data.inspections) {
      if (!insp.date) continue;
      const d = new Date(insp.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      byWeek[key] = (byWeek[key] || 0) + 1;
    }
    return Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      }));
  }, [data]);

  const filteredDeficiencies = useMemo(() => {
    if (!data?.deficiencies?.length) return [];
    if (!selectedInspection) return data.deficiencies;
    return data.deficiencies.filter(d => d.checkpoint_id === selectedInspection);
  }, [data, selectedInspection]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-aa-blue animate-spin" /></div>;
  if (error) return <div className="text-center py-20"><div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto"><p className="text-sm text-red-700">{String(error)}</p></div></div>;
  if (!data?.kpis) return <DashboardEmptyState domain="inspections" />;

  const kpis = data.kpis;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-secondary-text">From</label>
          <input type="date" value={filters.dateFrom || ''} onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-secondary-text">To</label>
          <input type="date" value={filters.dateTo || ''} onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue" />
        </div>
        {data?.jobs?.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-secondary-text">Job</label>
            <select value={filters.jobIds?.[0] || ''} onChange={(e) => setFilters(f => ({ ...f, jobIds: e.target.value ? [e.target.value] : null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[180px]">
              <option value="">All Jobs</option>
              {data.jobs.map(j => <option key={j.id} value={j.id}>{j.job_name}</option>)}
            </select>
          </div>
        )}
        {data?.inspectionTypes?.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-secondary-text">Inspection Type</label>
            <select value={filters.inspectionType || ''} onChange={(e) => setFilters(f => ({ ...f, inspectionType: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[160px]">
              <option value="">All Types</option>
              {data.inspectionTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
        {(filters.dateFrom || filters.dateTo || filters.jobIds || filters.inspectionType) && (
          <button onClick={() => setFilters({ dateFrom: null, dateTo: null, jobIds: null, inspectionType: null })} className="text-xs text-aa-blue hover:underline">Clear filters</button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Inspection Count" value={kpis.inspection_count.toLocaleString()} icon={ClipboardCheck} />
        <KPICard label="Touchpoint Count" value={kpis.touchpoint_count.toLocaleString()} icon={Target} />
        <KPICard label="Deficiency Count" value={kpis.deficiency_count.toLocaleString()} icon={AlertCircle} />
        <KPICard label="Deficiency %" value={`${kpis.deficiency_pct}%`} icon={Percent} />
      </div>

      {/* Chart + Inspection Table side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-4">Inspections by Week</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--color-aa-blue, #00AEEF)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Inspection Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-dark-text">Inspections</h3>
          </div>
          <div className="overflow-y-auto max-h-[340px]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-secondary-text">ID</th>
                  <th className="text-left px-3 py-2 font-medium text-secondary-text">Job #</th>
                  <th className="text-left px-3 py-2 font-medium text-secondary-text">Job Name</th>
                  <th className="text-left px-3 py-2 font-medium text-secondary-text">Date</th>
                  <th className="text-right px-3 py-2 font-medium text-secondary-text">Score %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.inspections.map((insp, i) => (
                  <tr
                    key={i}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedInspection === insp.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedInspection(selectedInspection === insp.id ? null : insp.id)}
                  >
                    <td className="px-3 py-2 text-dark-text">{insp.id}</td>
                    <td className="px-3 py-2 text-dark-text">{insp.job_number}</td>
                    <td className="px-3 py-2 text-dark-text truncate max-w-[150px]">{insp.job_name}</td>
                    <td className="px-3 py-2 text-secondary-text">{insp.date}</td>
                    <td className="px-3 py-2 text-right font-medium text-dark-text">
                      {insp.score_pct != null ? `${Number(insp.score_pct).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Deficiency Detail Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-dark-text">
            Deficiency Details
            {selectedInspection && <span className="ml-2 text-xs text-secondary-text font-normal">(Inspection #{selectedInspection})</span>}
          </h3>
          {selectedInspection && (
            <button onClick={() => setSelectedInspection(null)} className="text-xs text-aa-blue hover:underline">Show all</button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Added Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Closed Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Item Description</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Deficiency Notes</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Closed Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDeficiencies.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-secondary-text">No deficiencies found</td></tr>
              ) : filteredDeficiencies.map((d, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-dark-text">{d.added_date}</td>
                  <td className="px-4 py-2.5 text-secondary-text">{d.closed_date ? new Date(d.closed_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2.5 text-dark-text max-w-xs truncate">{d.item_description}</td>
                  <td className="px-4 py-2.5 text-secondary-text max-w-sm truncate">{d.deficiency_notes || '—'}</td>
                  <td className="px-4 py-2.5 text-secondary-text max-w-sm truncate">{d.closed_notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
