import { useState, useMemo } from 'react';
import { Loader2, CheckCircle, AlertTriangle, Edit3, Clock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useDashboardData from '../../hooks/useDashboardData';
import useDashboardConfig from '../../hooks/useDashboardConfig';
import DashboardFilters from '../../components/dashboards/DashboardFilters';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';
import KPICard from '../../components/dashboards/KPICard';

const STATUS_COLORS = {
  accepted: '#16A34A',
  incomplete: '#EAB308',
  manual_edit: '#009ADE',
  exception: '#E12F2C',
};

const ICON_MAP = { CheckCircle, Clock, Edit3, AlertTriangle };

export default function TimekeepingDashboard() {
  const [filters, setFilters] = useState({ dateFrom: '2025-01-01', dateTo: '2025-12-31', jobIds: null });
  const { data, loading, error } = useDashboardData('timekeeping', filters);
  const { kpis, charts } = useDashboardConfig('timekeeping');

  const chartLabel = (id) => charts.find(c => c.id === id)?.label ?? id;
  const chartVisible = (id) => charts.find(c => c.id === id)?.visible !== false;

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

  const kpiCards = {
    punch_acceptance: {
      value: `${metrics.acceptancePct}%`,
      icon: CheckCircle,
      trend: Number(metrics.acceptancePct) >= 90 ? 'up' : 'down',
      trendLabel: Number(metrics.acceptancePct) >= 90 ? 'On target' : 'Below target',
    },
    incomplete: { value: metrics.statuses.incomplete.toLocaleString(), icon: Clock },
    manual_edits: { value: metrics.statuses.manual_edit.toLocaleString(), icon: Edit3 },
    exceptions: {
      value: metrics.statuses.exception.toLocaleString(),
      icon: AlertTriangle,
      trend: metrics.statuses.exception > 50 ? 'down' : 'up',
      trendLabel: `${((metrics.statuses.exception / metrics.total) * 100).toFixed(1)}% of punches`,
    },
  };

  const visibleKpis = kpis.filter(k => k.visible !== false && kpiCards[k.id]);

  return (
    <div className="space-y-6">
      <DashboardFilters filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleKpis.map(k => {
          const card = kpiCards[k.id];
          return (
            <KPICard
              key={k.id}
              label={k.label}
              value={card.value}
              icon={ICON_MAP[k.icon] || card.icon}
              trend={card.trend}
              trendLabel={card.trendLabel}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {chartVisible('acceptance_rate_trend') && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-dark-text mb-4">{chartLabel('acceptance_rate_trend')}</h3>
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
        )}

        {chartVisible('exceptions_by_site') && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-dark-text mb-4">{chartLabel('exceptions_by_site')}</h3>
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
        )}
      </div>

      {chartVisible('punch_status_breakdown') && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-4">{chartLabel('punch_status_breakdown')}</h3>
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
      )}
    </div>
  );
}
