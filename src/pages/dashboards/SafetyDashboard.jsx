import { useState, useMemo } from 'react';
import { Loader2, ShieldAlert, Activity, ThumbsUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useDashboardData from '../../hooks/useDashboardData';
import useDashboardConfig from '../../hooks/useDashboardConfig';
import DashboardFilters from '../../components/dashboards/DashboardFilters';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';
import KPICard from '../../components/dashboards/KPICard';

const ICON_MAP = { ShieldAlert, Activity, ThumbsUp, AlertTriangle };

export default function SafetyDashboard() {
  const [filters, setFilters] = useState({ dateFrom: '2025-01-01', dateTo: '2025-12-31', jobIds: null });
  const { data, loading, error } = useDashboardData('safety', filters);
  const { kpis, charts } = useDashboardConfig('safety');

  const chartLabel = (id) => charts.find(c => c.id === id)?.label ?? id;
  const chartVisible = (id) => charts.find(c => c.id === id)?.visible !== false;

  const metrics = useMemo(() => {
    if (!data?.safety?.length) return null;
    const safety = data.safety;
    const jobs = data.jobs || [];
    const jobMap = {};
    for (const j of jobs) jobMap[j.id] = j.job_name.split(' - ')[0];

    let totalRecordables = 0, totalGoodSaves = 0, totalNearMisses = 0;
    const trirValues = [];
    const bySiteQuarter = {};
    const trirByMonth = {};
    const goodSavesBySite = {};

    for (const r of safety) {
      totalRecordables += r.recordable_incidents || 0;
      totalGoodSaves += r.good_saves || 0;
      totalNearMisses += r.near_misses || 0;
      if (r.trir) trirValues.push(Number(r.trir));

      const site = jobMap[r.job_id] || 'Unknown';
      const date = new Date(r.date_key);
      const q = `Q${Math.floor(date.getMonth() / 3) + 1}`;
      const key = `${site}|${q}`;

      if (!bySiteQuarter[key]) bySiteQuarter[key] = { site, quarter: q, recordables: 0 };
      bySiteQuarter[key].recordables += r.recordable_incidents || 0;

      const month = r.date_key?.slice(0, 7);
      if (month && r.trir) {
        if (!trirByMonth[month]) trirByMonth[month] = { sum: 0, count: 0 };
        trirByMonth[month].sum += Number(r.trir);
        trirByMonth[month].count++;
      }

      if (!goodSavesBySite[site]) goodSavesBySite[site] = 0;
      goodSavesBySite[site] += r.good_saves || 0;
    }

    const avgTRIR = trirValues.length
      ? (trirValues.reduce((a, b) => a + b, 0) / trirValues.length).toFixed(3)
      : 'N/A';

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const siteNames = [...new Set(Object.values(bySiteQuarter).map((v) => v.site))];
    const recordablesChart = quarters.map((q) => {
      const row = { quarter: q };
      for (const site of siteNames) {
        const key = `${site}|${q}`;
        row[site] = bySiteQuarter[key]?.recordables || 0;
      }
      return row;
    });

    const trirChart = Object.entries(trirByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month: month.slice(5),
        trir: (v.sum / v.count).toFixed(3),
      }));

    const goodSavesChart = Object.entries(goodSavesBySite).map(([name, value]) => ({ name, goodSaves: value }));

    return { totalRecordables, avgTRIR, totalGoodSaves, totalNearMisses, recordablesChart, trirChart, goodSavesChart, siteNames };
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
  if (!metrics) return <DashboardEmptyState domain="safety" />;

  const SITE_COLORS = ['#009ADE', '#E12F2C', '#5A5D62'];

  const kpiCards = {
    total_recordables: {
      value: metrics.totalRecordables,
      icon: ShieldAlert,
      trend: metrics.totalRecordables > 10 ? 'down' : 'up',
      trendLabel: metrics.totalRecordables > 10 ? 'Above threshold' : 'Within target',
    },
    avg_trir: { value: metrics.avgTRIR, icon: Activity },
    good_saves: { value: metrics.totalGoodSaves, icon: ThumbsUp, trend: 'up', trendLabel: 'Recognition events' },
    near_misses: { value: metrics.totalNearMisses, icon: AlertTriangle },
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
        {chartVisible('recordables_by_site_quarter') && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-dark-text mb-4">{chartLabel('recordables_by_site_quarter')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={metrics.recordablesChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                {metrics.siteNames.map((site, i) => (
                  <Bar key={site} dataKey={site} fill={SITE_COLORS[i % SITE_COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartVisible('trir_trend') && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-dark-text mb-4">{chartLabel('trir_trend')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={metrics.trirChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="trir" stroke="#E12F2C" strokeWidth={2} name="TRIR" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {chartVisible('good_saves_by_site') && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-4">{chartLabel('good_saves_by_site')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={metrics.goodSavesChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="goodSaves" fill="#16A34A" name="Good Saves" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
