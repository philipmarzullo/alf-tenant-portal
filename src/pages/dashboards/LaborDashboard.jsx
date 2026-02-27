import { useState, useMemo } from 'react';
import { Loader2, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useDashboardData from '../../hooks/useDashboardData';
import useDashboardConfig from '../../hooks/useDashboardConfig';
import DashboardFilters from '../../components/dashboards/DashboardFilters';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';
import KPICard from '../../components/dashboards/KPICard';

const COLORS = ['#009ADE', '#E12F2C', '#5A5D62', '#16A34A'];
const ICON_MAP = { DollarSign, AlertTriangle, Clock };

export default function LaborDashboard() {
  const [filters, setFilters] = useState({ dateFrom: '2025-01-01', dateTo: '2025-12-31', jobIds: null });
  const { data, loading, error } = useDashboardData('labor', filters);
  const { kpis, charts } = useDashboardConfig('labor');

  const chartLabel = (id) => charts.find(c => c.id === id)?.label ?? id;
  const chartVisible = (id) => charts.find(c => c.id === id)?.visible !== false;

  const metrics = useMemo(() => {
    if (!data?.labor?.length) return null;
    const labor = data.labor;
    const jobs = data.jobs || [];
    const jobMap = {};
    for (const j of jobs) jobMap[j.id] = j.job_name.split(' - ')[0];

    let totalBudget = 0, totalActual = 0, totalOTHours = 0, totalOTDollars = 0, totalActualHours = 0;
    const bySite = {};
    const byMonth = {};

    for (const r of labor) {
      const budget = Number(r.budget_dollars) || 0;
      const actual = Number(r.actual_dollars) || 0;
      const otH = Number(r.ot_hours) || 0;
      const otD = Number(r.ot_dollars) || 0;
      const actH = Number(r.actual_hours) || 0;

      totalBudget += budget;
      totalActual += actual;
      totalOTHours += otH;
      totalOTDollars += otD;
      totalActualHours += actH;

      const site = jobMap[r.job_id] || 'Unknown';
      if (!bySite[site]) bySite[site] = { budget: 0, actual: 0, ot: 0 };
      bySite[site].budget += budget;
      bySite[site].actual += actual;
      bySite[site].ot += otD;

      const month = r.period_start?.slice(0, 7);
      if (month) {
        if (!byMonth[month]) byMonth[month] = { budget: 0, actual: 0 };
        byMonth[month].budget += budget;
        byMonth[month].actual += actual;
      }
    }

    const variancePct = totalBudget ? (((totalActual - totalBudget) / totalBudget) * 100).toFixed(1) : 0;
    const otPct = totalActualHours ? ((totalOTHours / totalActualHours) * 100).toFixed(1) : 0;

    const siteChart = Object.entries(bySite).map(([name, v]) => ({
      name,
      budget: Math.round(v.budget),
      actual: Math.round(v.actual),
    }));

    const trendChart = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month: month.slice(5),
        variance: ((v.actual - v.budget) / v.budget * 100).toFixed(1),
      }));

    const otBreakdown = Object.entries(bySite).map(([name, v]) => ({
      name,
      value: Math.round(v.ot),
    }));

    return {
      totalBudget, totalActual, variancePct, totalOTHours: Math.round(totalOTHours),
      otPct, siteChart, trendChart, otBreakdown,
    };
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
  if (!metrics) return <DashboardEmptyState domain="labor" />;

  const varianceTrend = Number(metrics.variancePct) > 0 ? 'down' : 'up';

  // Build visible KPI cards in config order
  const kpiCards = {
    budget: { value: `$${(metrics.totalBudget / 1000).toFixed(0)}K`, icon: DollarSign },
    actual: { value: `$${(metrics.totalActual / 1000).toFixed(0)}K`, icon: DollarSign },
    variance: { value: `${metrics.variancePct}%`, icon: AlertTriangle, trend: varianceTrend, trendLabel: Number(metrics.variancePct) > 0 ? 'Over budget' : 'Under budget' },
    ot_hours: { value: metrics.totalOTHours.toLocaleString(), icon: Clock, trendLabel: `${metrics.otPct}% of total hours` },
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
        {chartVisible('budget_vs_actual_by_site') && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-dark-text mb-4">{chartLabel('budget_vs_actual_by_site')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={metrics.siteChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="budget" fill="#009ADE" name="Budget" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#5A5D62" name="Actual" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartVisible('variance_trend') && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-dark-text mb-4">{chartLabel('variance_trend')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={metrics.trendChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Line type="monotone" dataKey="variance" stroke="#E12F2C" strokeWidth={2} name="Variance %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {chartVisible('ot_spend_by_site') && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-4">{chartLabel('ot_spend_by_site')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={metrics.otBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {metrics.otBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
