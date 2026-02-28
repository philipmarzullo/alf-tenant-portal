import { useState, useMemo } from 'react';
import { Loader2, Search, AlertCircle, TrendingUp, BarChart3, Settings2 } from 'lucide-react';
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

const ICON_MAP = { Search, AlertCircle, BarChart3, TrendingUp };

export default function QualityDashboard() {
  const [filters, setFilters] = useState({ dateFrom: '2025-01-01', dateTo: '2025-12-31', jobIds: null });
  const { data, loading, error } = useDashboardData('quality', filters);
  const { kpis, charts } = useDashboardConfig('quality');
  const { isAdmin } = useUser();

  const {
    isCustomizing, enterCustomize, exitCustomize,
    draft, saveDraft, resetToDefaults,
    isDirty, saving, source,
    reorderKpis, toggleKpi, renameKpi,
    reorderCharts, toggleChart, renameChart,
  } = useDomainCustomize('quality');

  const activeKpis = isCustomizing && draft ? resolveConfig('quality', draft).kpis : kpis;
  const activeCharts = isCustomizing && draft ? resolveConfig('quality', draft).charts : charts;

  // First-time setup for non-admin users
  const [setupDismissed, setSetupDismissed] = useState(false);
  if (!isAdmin && !setupDismissed && source === 'default' && !loading) {
    return (
      <FirstTimeSetup
        domain="quality"
        onComplete={() => setSetupDismissed(true)}
      />
    );
  }

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
    const quarterChart = Object.entries(byQuarter).sort(([a], [b]) => a.localeCompare(b)).map(([q, v]) => ({ quarter: q, audits: v.audits, corrective: v.ca }));
    const caTrendChart = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month: month.slice(5), corrective: v.ca }));

    const quarters = Object.keys(byQuarter).sort();
    let qoqChange = null;
    if (quarters.length >= 2) {
      const curr = byQuarter[quarters[quarters.length - 1]].ca;
      const prev = byQuarter[quarters[quarters.length - 2]].ca;
      qoqChange = prev ? (((curr - prev) / prev) * 100).toFixed(1) : null;
    }

    return { totalAudits, totalCA, ratio, quarterChart, caTrendChart, qoqChange };
  }, [data]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-aa-blue animate-spin" /></div>;
  if (error) return <div className="text-center py-20"><div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto"><p className="text-sm text-red-700">{error}</p></div></div>;
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

  const allKpis = activeKpis.filter(k => kpiCards[k.id]);
  const visibleKpis = isCustomizing ? allKpis : allKpis.filter(k => k.visible !== false);
  const visibleChartItems = isCustomizing ? activeCharts : activeCharts.filter(c => c.visible !== false);

  const chartRenderers = {
    audits_by_quarter: () => (
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
    ),
    corrective_actions_trend: () => (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={metrics.caTrendChart}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="corrective" stroke="#E12F2C" strokeWidth={2} name="Corrective Actions" />
        </LineChart>
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
