import { useState, useMemo } from 'react';
import { Loader2, Search, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useDashboardData from '../../hooks/useDashboardData';
import useDashboardConfig from '../../hooks/useDashboardConfig';
import DashboardFilters from '../../components/dashboards/DashboardFilters';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';
import KPICard from '../../components/dashboards/KPICard';

const ICON_MAP = { Search, AlertCircle, BarChart3, TrendingUp };

export default function QualityDashboard() {
  const [filters, setFilters] = useState({ dateFrom: '2025-01-01', dateTo: '2025-12-31', jobIds: null });
  const { data, loading, error } = useDashboardData('quality', filters);
  const { kpis, charts } = useDashboardConfig('quality');

  const chartLabel = (id) => charts.find(c => c.id === id)?.label ?? id;
  const chartVisible = (id) => charts.find(c => c.id === id)?.visible !== false;

  const metrics = useMemo(() => {
    if (!data?.quality?.length) return null;
    const quality = data.quality;

    let totalAudits = 0, totalCA = 0;
    const byQuarter = {};
    const byMonth = {};

    for (const r of quality) {
      totalAudits += r.audits || 0;
      totalCA += r.corrective_actions || 0;

      const date = new Date(r.date_key);
      const q = `Q${Math.floor(date.getMonth() / 3) + 1}`;
      if (!byQuarter[q]) byQuarter[q] = { audits: 0, ca: 0 };
      byQuarter[q].audits += r.audits || 0;
      byQuarter[q].ca += r.corrective_actions || 0;

      const month = r.date_key?.slice(0, 7);
      if (month) {
        if (!byMonth[month]) byMonth[month] = { ca: 0 };
        byMonth[month].ca += r.corrective_actions || 0;
      }
    }

    const ratio = totalAudits ? (totalCA / totalAudits * 100).toFixed(1) : 0;

    const quarterChart = Object.entries(byQuarter)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([q, v]) => ({ quarter: q, audits: v.audits, corrective: v.ca }));

    const caTrendChart = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month: month.slice(5), corrective: v.ca }));

    const quarters = Object.keys(byQuarter).sort();
    let qoqChange = null;
    if (quarters.length >= 2) {
      const curr = byQuarter[quarters[quarters.length - 1]].ca;
      const prev = byQuarter[quarters[quarters.length - 2]].ca;
      qoqChange = prev ? (((curr - prev) / prev) * 100).toFixed(1) : null;
    }

    return { totalAudits, totalCA, ratio, quarterChart, caTrendChart, qoqChange };
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
  if (!metrics) return <DashboardEmptyState domain="quality" />;

  const kpiCards = {
    total_audits: { value: metrics.totalAudits.toLocaleString(), icon: Search },
    corrective_actions: { value: metrics.totalCA.toLocaleString(), icon: AlertCircle },
    ca_to_audit_ratio: { value: `${metrics.ratio}%`, icon: BarChart3 },
    qoq_change: {
      value: metrics.qoqChange !== null ? `${metrics.qoqChange}%` : 'N/A',
      icon: TrendingUp,
      trend: metrics.qoqChange !== null ? (Number(metrics.qoqChange) <= 0 ? 'up' : 'down') : null,
      trendLabel: metrics.qoqChange !== null ? (Number(metrics.qoqChange) <= 0 ? 'Improving' : 'Increasing') : '',
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
        {chartVisible('audits_by_quarter') && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-dark-text mb-4">{chartLabel('audits_by_quarter')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={metrics.quarterChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="audits" fill="#009ADE" name="Audits" radius={[4, 4, 0, 0]} />
                <Bar dataKey="corrective" fill="#E12F2C" name="Corrective Actions" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartVisible('corrective_actions_trend') && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-dark-text mb-4">{chartLabel('corrective_actions_trend')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={metrics.caTrendChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="corrective" stroke="#E12F2C" strokeWidth={2} name="Corrective Actions" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
