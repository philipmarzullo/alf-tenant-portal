import { useState, useMemo } from 'react';
import { Loader2, CheckCircle, AlertTriangle, Edit3, Clock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useDashboardData from '../../hooks/useDashboardData';
import DashboardFilters from '../../components/dashboards/DashboardFilters';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';
import KPICard from '../../components/dashboards/KPICard';

const STATUS_COLORS = {
  accepted: '#16A34A',
  incomplete: '#EAB308',
  manual_edit: '#009ADE',
  exception: '#E12F2C',
};

export default function TimekeepingDashboard() {
  const [filters, setFilters] = useState({ dateFrom: '2025-01-01', dateTo: '2025-12-31', jobIds: null });
  const { data, loading, error } = useDashboardData('timekeeping', filters);

  const metrics = useMemo(() => {
    if (!data?.timekeeping?.length) return null;
    const tk = data.timekeeping;
    const jobs = data.jobs || [];
    const jobMap = {};
    for (const j of jobs) jobMap[j.id] = j.job_name.split(' - ')[0];

    const total = tk.length;
    const statuses = { accepted: 0, incomplete: 0, manual_edit: 0, exception: 0 };
    const byMonth = {};
    const bySite = {};

    for (const r of tk) {
      statuses[r.punch_status] = (statuses[r.punch_status] || 0) + 1;

      const month = r.date_key?.slice(0, 7);
      if (month) {
        if (!byMonth[month]) byMonth[month] = { accepted: 0, total: 0 };
        byMonth[month].total++;
        if (r.punch_status === 'accepted') byMonth[month].accepted++;
      }

      const site = jobMap[r.job_id] || 'Unknown';
      if (!bySite[site]) bySite[site] = { exceptions: 0, total: 0 };
      bySite[site].total++;
      if (r.punch_status === 'exception') bySite[site].exceptions++;
    }

    const acceptancePct = total ? ((statuses.accepted / total) * 100).toFixed(1) : 0;

    const trendChart = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month: month.slice(5),
        acceptance: v.total ? ((v.accepted / v.total) * 100).toFixed(1) : 0,
      }));

    const exceptionChart = Object.entries(bySite).map(([name, v]) => ({
      name,
      exceptions: v.exceptions,
    }));

    const statusPieChart = Object.entries(statuses)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name: name.replace('_', ' '),
        value,
        fill: STATUS_COLORS[name],
      }));

    return { total, statuses, acceptancePct, trendChart, exceptionChart, statusPieChart };
  }, [data]);

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
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }
  if (!metrics) return <DashboardEmptyState domain="timekeeping" />;

  return (
    <div className="space-y-6">
      <DashboardFilters filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Punch Acceptance" value={`${metrics.acceptancePct}%`} icon={CheckCircle} trend={Number(metrics.acceptancePct) >= 90 ? 'up' : 'down'} trendLabel={Number(metrics.acceptancePct) >= 90 ? 'On target' : 'Below target'} />
        <KPICard label="Incomplete" value={metrics.statuses.incomplete.toLocaleString()} icon={Clock} />
        <KPICard label="Manual Edits" value={metrics.statuses.manual_edit.toLocaleString()} icon={Edit3} />
        <KPICard label="Exceptions" value={metrics.statuses.exception.toLocaleString()} icon={AlertTriangle} trend={metrics.statuses.exception > 50 ? 'down' : 'up'} trendLabel={`${((metrics.statuses.exception / metrics.total) * 100).toFixed(1)}% of punches`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-4">Acceptance Rate Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={metrics.trendChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="acceptance" stroke="#009ADE" strokeWidth={2} name="Acceptance %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-4">Exceptions by Site</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={metrics.exceptionChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="exceptions" fill="#E12F2C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-dark-text mb-4">Punch Status Breakdown</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={metrics.statusPieChart}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {metrics.statusPieChart.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
