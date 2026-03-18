import { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useDashboardData from '../../hooks/useDashboardData';
import { useDashboardDataContext } from '../../contexts/DashboardDataContext';
import KPICard from '../../components/dashboards/KPICard';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';

export default function ActionItemsDashboard() {
  const [filters, setFilters] = useState({ dateFrom: '2025-01-01', dateTo: '2025-12-31', jobIds: null, itemType: null });
  const { data, loading, error } = useDashboardData('action-items', filters);
  const { setDashboardData } = useDashboardDataContext();

  useEffect(() => {
    if (!data?.items?.length) return;
    const openCount = data.items.filter(i => i.status === 'Open').length;
    const closedCount = data.items.filter(i => i.status !== 'Open').length;
    const highlights = [
      `Total action items: ${data.items.length}`,
      `Open: ${openCount}, Closed: ${closedCount}`,
    ];
    setDashboardData({
      domain: 'action-items',
      data: {
        kpis: { total: data.items.length, open: openCount, closed: closedCount },
        highlights,
      },
      filters,
    });
  }, [data, filters, setDashboardData]);

  const metrics = useMemo(() => {
    if (!data?.items?.length) return null;
    const items = data.items;

    // Weekly grouping
    const byWeek = {};
    for (const item of items) {
      if (!item.comment_date) continue;
      const d = new Date(item.comment_date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      byWeek[key] = (byWeek[key] || 0) + 1;
    }

    const weeklyChart = Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({
        week: new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      }));

    return { total: items.length, weeklyChart };
  }, [data]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-aa-blue animate-spin" /></div>;
  if (error) return <div className="text-center py-20"><div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto"><p className="text-sm text-red-700">{String(error)}</p></div></div>;
  if (!metrics) return <DashboardEmptyState domain="action-items" />;

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
        {data?.itemTypes?.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-secondary-text">Type</label>
            <select value={filters.itemType || ''} onChange={(e) => setFilters(f => ({ ...f, itemType: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[140px]">
              <option value="">All Types</option>
              {data.itemTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
        {(filters.dateFrom || filters.dateTo || filters.jobIds || filters.itemType) && (
          <button onClick={() => setFilters({ dateFrom: null, dateTo: null, jobIds: null, itemType: null })} className="text-xs text-aa-blue hover:underline">Clear filters</button>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Action Items" value={metrics.total.toLocaleString()} icon={AlertTriangle} />
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-dark-text mb-4">Action Items by Week</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={metrics.weeklyChart}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="var(--color-aa-blue, #00AEEF)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-dark-text">Action Items Detail</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Action Item #</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Description</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Comment Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Comment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-dark-text">{item.action_item_id}</td>
                  <td className="px-4 py-2.5 text-dark-text max-w-xs truncate">{item.description}</td>
                  <td className="px-4 py-2.5 text-secondary-text">{item.comment_date}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${item.status === 'Open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-secondary-text max-w-sm truncate">{item.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
