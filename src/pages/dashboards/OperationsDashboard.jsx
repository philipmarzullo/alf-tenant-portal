import { useState, useMemo } from 'react';
import { Loader2, ClipboardList, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useDashboardData from '../../hooks/useDashboardData';
import DashboardFilters from '../../components/dashboards/DashboardFilters';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';
import KPICard from '../../components/dashboards/KPICard';

export default function OperationsDashboard() {
  const [filters, setFilters] = useState({ dateFrom: '2025-01-01', dateTo: '2025-12-31', jobIds: null });
  const { data, loading, error } = useDashboardData('operations', filters);

  const metrics = useMemo(() => {
    if (!data?.tickets?.length) return null;
    const tickets = data.tickets;
    const jobs = data.jobs || [];
    const jobMap = {};
    for (const j of jobs) jobMap[j.id] = j.job_name.split(' - ')[0];

    const total = tickets.length;
    const completed = tickets.filter((t) => t.status === 'completed').length;
    const completionRate = total ? ((completed / total) * 100).toFixed(1) : 0;

    // Tickets by site
    const bySite = {};
    for (const t of tickets) {
      const site = jobMap[t.job_id] || 'Unknown';
      bySite[site] = (bySite[site] || 0) + 1;
    }
    const siteChart = Object.entries(bySite).map(([name, count]) => ({ name, tickets: count }));

    // Monthly trend
    const byMonth = {};
    for (const t of tickets) {
      const month = t.date_key?.slice(0, 7);
      if (!month) continue;
      if (!byMonth[month]) byMonth[month] = { total: 0, completed: 0 };
      byMonth[month].total++;
      if (t.status === 'completed') byMonth[month].completed++;
    }
    const trendChart = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month: month.slice(5),
        total: v.total,
        completed: v.completed,
      }));

    // Category breakdown
    const byCat = {};
    for (const t of tickets) {
      byCat[t.category] = (byCat[t.category] || 0) + 1;
    }
    const categoryChart = Object.entries(byCat)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));

    return { total, completed, completionRate, siteChart, trendChart, categoryChart };
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

  if (!metrics) {
    return <DashboardEmptyState domain="operations" />;
  }

  return (
    <div className="space-y-6">
      <DashboardFilters filters={filters} onChange={setFilters} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Tickets" value={metrics.total.toLocaleString()} icon={ClipboardList} />
        <KPICard label="Completed" value={metrics.completed.toLocaleString()} icon={CheckCircle} trend="up" trendLabel={`${metrics.completionRate}% completion rate`} />
        <KPICard label="Completion Rate" value={`${metrics.completionRate}%`} icon={TrendingUp} />
        <KPICard label="Open Tickets" value={(metrics.total - metrics.completed).toLocaleString()} icon={Clock} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets by Site */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-4">Tickets by Site</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={metrics.siteChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="tickets" fill="#009ADE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-4">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={metrics.trendChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#009ADE" strokeWidth={2} name="Total" />
              <Line type="monotone" dataKey="completed" stroke="#16A34A" strokeWidth={2} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-dark-text mb-4">Category Breakdown</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={metrics.categoryChart} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
            <Tooltip />
            <Bar dataKey="count" fill="#5A5D62" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
