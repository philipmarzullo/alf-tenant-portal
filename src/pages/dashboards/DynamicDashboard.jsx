import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import useDynamicMetrics from '../../hooks/useDynamicMetrics';
import { useDashboardDataContext } from '../../contexts/DashboardDataContext';
import DashboardFilters from '../../components/dashboards/DashboardFilters';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';
import KPICard from '../../components/dashboards/KPICard';

const CHART_COLORS = [
  '#009ADE', '#16A34A', '#7C3AED', '#DC2626', '#0D9488',
  '#D97706', '#4B5563', '#2563EB', '#DB2777', '#059669',
];

function formatMetricValue(value, format, unit) {
  if (value == null) return '--';
  switch (format) {
    case 'percent':  return `${value}%`;
    case 'currency': return `$${Number(value).toLocaleString()}`;
    case 'integer':  return Math.round(value).toLocaleString();
    default:         return Number(value).toLocaleString();
  }
}

export default function DynamicDashboard({ domain }) {
  const [filters, setFilters] = useState({
    dateFrom: '2025-01-01',
    dateTo: '2025-12-31',
    jobIds: null,
  });

  const { data, isDynamic, loading, error } = useDynamicMetrics(domain, filters);
  const { setDashboardData } = useDashboardDataContext();

  useEffect(() => {
    if (!data?.metrics?.length) return;
    const kpis = {};
    const highlights = [];
    data.metrics.filter(m => m.display_as === 'kpi').forEach(m => {
      kpis[m.key] = m.value;
      highlights.push(`${m.label}: ${formatMetricValue(m.value, m.format, m.unit)}`);
    });
    setDashboardData({ domain, data: { kpis, highlights }, filters });
  }, [data, domain, filters, setDashboardData]);

  const { kpiMetrics, chartMetrics } = useMemo(() => {
    if (!data?.metrics) return { kpiMetrics: [], chartMetrics: [] };

    const kpis = data.metrics.filter(m => m.display_as === 'kpi');
    const charts = data.metrics.filter(m => m.display_as !== 'kpi');

    return { kpiMetrics: kpis, chartMetrics: charts };
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
          <p className="text-sm text-red-700">{String(error)}</p>
        </div>
      </div>
    );
  }

  if (!data?.metrics?.length) {
    return <DashboardEmptyState domain={domain} />;
  }

  return (
    <div className="space-y-6">
      <DashboardFilters filters={filters} onChange={setFilters} />

      {/* KPI Cards */}
      {kpiMetrics.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {kpiMetrics.map(metric => (
            <KPICard
              key={metric.key}
              label={metric.label}
              value={formatMetricValue(metric.value, metric.format, metric.unit)}
            />
          ))}
        </div>
      )}

      {/* Charts */}
      {chartMetrics.length > 0 && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {chartMetrics.map(metric => (
            <div key={metric.key} className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-dark-text mb-4">{metric.label}</h3>
              <DynamicChart metric={metric} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DynamicChart({ metric }) {
  const chartData = useMemo(() => {
    if (!Array.isArray(metric.value)) return [];
    return metric.value.map(item => ({
      name: item.label || item.group,
      value: item.value,
    }));
  }, [metric.value]);

  if (!chartData.length) {
    return <div className="text-sm text-secondary-text py-8 text-center">No data available</div>;
  }

  switch (metric.display_as) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill={metric.color || '#009ADE'} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
      return (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke={metric.color || '#009ADE'}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );

    default:
      return (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill={metric.color || '#009ADE'} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
  }
}
