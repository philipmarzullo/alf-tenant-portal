import { useState, useMemo } from 'react';
import { Loader2, TrendingDown, UserMinus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useDashboardData from '../../hooks/useDashboardData';
import KPICard from '../../components/dashboards/KPICard';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';

export default function TurnoverDashboard() {
  const [filters, setFilters] = useState({ dateFrom: '2025-01-01', dateTo: '2025-12-31', jobIds: null });
  const { data, loading, error } = useDashboardData('turnover', filters);

  const chartData = useMemo(() => {
    if (!data?.monthly?.length) return [];
    return data.monthly.map(m => ({
      month: m.month,
      turnover_pct: m.turnover_pct,
      termed: m.termed,
    }));
  }, [data]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-aa-blue animate-spin" /></div>;
  if (error) return <div className="text-center py-20"><div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto"><p className="text-sm text-red-700">{String(error)}</p></div></div>;
  if (!data?.kpis) return <DashboardEmptyState domain="turnover" />;

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
        {(filters.dateFrom || filters.dateTo || filters.jobIds) && (
          <button onClick={() => setFilters({ dateFrom: null, dateTo: null, jobIds: null })} className="text-xs text-aa-blue hover:underline">Clear filters</button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Monthly Turnover %" value={`${kpis.monthly_turnover_pct}%`} icon={TrendingDown} />
        <KPICard label="Termed Employees" value={kpis.termed_employees.toLocaleString()} icon={UserMinus} />
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-dark-text mb-4">Turnover % by Month</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} unit="%" />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'turnover_pct') return [`${value}%`, 'Turnover'];
                return [value, name];
              }}
            />
            <Bar dataKey="turnover_pct" fill="var(--color-aa-blue, #00AEEF)" radius={[4, 4, 0, 0]} name="turnover_pct" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Detail Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-dark-text">Monthly Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Month</th>
                <th className="text-right px-4 py-2.5 font-medium text-secondary-text">Turnover %</th>
                <th className="text-right px-4 py-2.5 font-medium text-secondary-text">Termed</th>
                <th className="text-right px-4 py-2.5 font-medium text-secondary-text">Active Employees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.monthly.map((m, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-dark-text">{m.month}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-dark-text">{m.turnover_pct}%</td>
                  <td className="px-4 py-2.5 text-right text-dark-text">{m.termed}</td>
                  <td className="px-4 py-2.5 text-right text-secondary-text">{m.active_employees.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
