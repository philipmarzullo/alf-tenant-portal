import { useState, useMemo } from 'react';
import { Loader2, ShieldAlert, Activity, ThumbsUp, AlertTriangle, Settings2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useDashboardData from '../../hooks/useDashboardData';
import useDashboardConfig from '../../hooks/useDashboardConfig';
import useDomainCustomize from '../../hooks/useDomainCustomize';
import DashboardFilters from '../../components/dashboards/DashboardFilters';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';
import FirstTimeSetup from '../../components/dashboards/FirstTimeSetup';
import KPICard from '../../components/dashboards/KPICard';
import SortableGrid from '../../components/dashboards/SortableGrid';
import DraggableWidget from '../../components/dashboards/DraggableWidget';
import CustomizeToolbar from '../../components/dashboards/CustomizeToolbar';
import { useUser } from '../../contexts/UserContext';
import { resolveConfig } from '../../data/dashboardKPIRegistry';

const ICON_MAP = { ShieldAlert, Activity, ThumbsUp, AlertTriangle };

export default function SafetyDashboard() {
  const [filters, setFilters] = useState({ dateFrom: '2025-01-01', dateTo: '2025-12-31', jobIds: null });
  const { data, loading, error } = useDashboardData('safety', filters);
  const { kpis, charts } = useDashboardConfig('safety');
  const { isAdmin } = useUser();

  const {
    isCustomizing, enterCustomize, exitCustomize,
    draft, saveDraft, resetToDefaults,
    isDirty, saving, source,
    reorderKpis, toggleKpi, renameKpi,
    reorderCharts, toggleChart, renameChart,
  } = useDomainCustomize('safety');

  const activeKpis = isCustomizing && draft ? resolveConfig('safety', draft).kpis : kpis;
  const activeCharts = isCustomizing && draft ? resolveConfig('safety', draft).charts : charts;

  // First-time setup for non-admin users
  const [setupDismissed, setSetupDismissed] = useState(false);
  if (!isAdmin && !setupDismissed && source === 'default' && !loading) {
    return (
      <FirstTimeSetup
        domain="safety"
        onComplete={() => setSetupDismissed(true)}
      />
    );
  }

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
      .map(([month, v]) => ({ month: month.slice(5), trir: (v.sum / v.count).toFixed(3) }));

    const goodSavesChart = Object.entries(goodSavesBySite).map(([name, value]) => ({ name, goodSaves: value }));

    return { totalRecordables, avgTRIR, totalGoodSaves, totalNearMisses, recordablesChart, trirChart, goodSavesChart, siteNames };
  }, [data]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-aa-blue animate-spin" /></div>;
  if (error) return <div className="text-center py-20"><div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto"><p className="text-sm text-red-700">{String(error)}</p></div></div>;
  if (!metrics) return <DashboardEmptyState domain="safety" />;

  const SITE_COLORS = ['#009ADE', '#E12F2C', '#5A5D62'];

  const kpiCards = {
    total_recordables: {
      value: metrics.totalRecordables, icon: ShieldAlert,
      trend: metrics.totalRecordables > 10 ? 'down' : 'up',
      trendLabel: metrics.totalRecordables > 10 ? 'Above threshold' : 'Within target',
    },
    avg_trir: { value: metrics.avgTRIR, icon: Activity },
    good_saves: { value: metrics.totalGoodSaves, icon: ThumbsUp, trend: 'up', trendLabel: 'Recognition events' },
    near_misses: { value: metrics.totalNearMisses, icon: AlertTriangle },
  };

  const allKpis = activeKpis.filter(k => kpiCards[k.id]);
  const visibleKpis = isCustomizing ? allKpis : allKpis.filter(k => k.visible !== false);
  const visibleChartItems = isCustomizing ? activeCharts : activeCharts.filter(c => c.visible !== false);

  const chartRenderers = {
    recordables_by_site_quarter: () => (
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
    ),
    trir_trend: () => (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={metrics.trirChart}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="trir" stroke="#E12F2C" strokeWidth={2} name="TRIR" />
        </LineChart>
      </ResponsiveContainer>
    ),
    good_saves_by_site: () => (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={metrics.goodSavesChart}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="goodSaves" fill="#16A34A" name="Good Saves" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    ),
  };

  return (
    <div className="space-y-6">
      {isCustomizing && (
        <CustomizeToolbar onSave={saveDraft} onCancel={exitCustomize} onReset={resetToDefaults} saving={saving} isDirty={isDirty} source={source} />
      )}

      <div className="flex items-center justify-between">
        <DashboardFilters filters={filters} onChange={setFilters} />
        {isAdmin && !isCustomizing && (
          <button onClick={enterCustomize} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-secondary-text bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shrink-0 ml-4">
            <Settings2 size={16} />
            Customize
          </button>
        )}
      </div>

      <SortableGrid items={allKpis.map(k => k.id)} onReorder={reorderKpis} disabled={!isCustomizing}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleKpis.map(k => {
            const card = kpiCards[k.id];
            return (
              <DraggableWidget key={k.id} id={k.id} isCustomizing={isCustomizing} visible={k.visible !== false} label={k.label} onToggleVisible={() => toggleKpi(k.id)} onRenameLabel={(label) => renameKpi(k.id, label)}>
                <KPICard label={k.label} value={card.value} icon={ICON_MAP[k.icon] || card.icon} trend={card.trend} trendLabel={card.trendLabel} />
              </DraggableWidget>
            );
          })}
        </div>
      </SortableGrid>

      <SortableGrid items={activeCharts.map(c => c.id)} onReorder={reorderCharts} disabled={!isCustomizing}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibleChartItems.map(c => {
            const renderer = chartRenderers[c.id];
            if (!renderer) return null;
            return (
              <DraggableWidget key={c.id} id={c.id} isCustomizing={isCustomizing} visible={c.visible !== false} label={c.label} onToggleVisible={() => toggleChart(c.id)} onRenameLabel={(label) => renameChart(c.id, label)}>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-dark-text mb-4">{c.label}</h3>
                  {renderer()}
                </div>
              </DraggableWidget>
            );
          })}
        </div>
      </SortableGrid>
    </div>
  );
}
