import { useState, useMemo } from 'react';
import { Loader2, CheckCircle, AlertTriangle, Edit3, Clock, Settings2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  const { isAdmin } = useUser();

  const {
    isCustomizing, enterCustomize, exitCustomize,
    draft, saveDraft, resetToDefaults,
    isDirty, saving, source,
    reorderKpis, toggleKpi, renameKpi,
    reorderCharts, toggleChart, renameChart,
  } = useDomainCustomize('timekeeping');

  const activeKpis = isCustomizing && draft ? resolveConfig('timekeeping', draft).kpis : kpis;
  const activeCharts = isCustomizing && draft ? resolveConfig('timekeeping', draft).charts : charts;

  // First-time setup for non-admin users
  const [setupDismissed, setSetupDismissed] = useState(false);
  if (!isAdmin && !setupDismissed && source === 'default' && !loading) {
    return (
      <FirstTimeSetup
        domain="timekeeping"
        onComplete={() => setSetupDismissed(true)}
      />
    );
  }

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
    const trendChart = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month: month.slice(5), acceptance: v.total ? ((v.accepted / v.total) * 100).toFixed(1) : 0 }));
    const exceptionChart = Object.entries(bySite).map(([name, v]) => ({ name, exceptions: v.exceptions }));
    const statusPieChart = Object.entries(statuses).filter(([, v]) => v > 0).map(([name, value]) => ({ name: name.replace('_', ' '), value, fill: STATUS_COLORS[name] }));

    return { total, statuses, acceptancePct, trendChart, exceptionChart, statusPieChart };
  }, [data]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-aa-blue animate-spin" /></div>;
  if (error) return <div className="text-center py-20"><div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto"><p className="text-sm text-red-700">{error}</p></div></div>;
  if (!metrics) return <DashboardEmptyState domain="timekeeping" />;

  const kpiCards = {
    punch_acceptance: {
      value: `${metrics.acceptancePct}%`, icon: CheckCircle,
      trend: Number(metrics.acceptancePct) >= 90 ? 'up' : 'down',
      trendLabel: Number(metrics.acceptancePct) >= 90 ? 'On target' : 'Below target',
    },
    incomplete: { value: metrics.statuses.incomplete.toLocaleString(), icon: Clock },
    manual_edits: { value: metrics.statuses.manual_edit.toLocaleString(), icon: Edit3 },
    exceptions: {
      value: metrics.statuses.exception.toLocaleString(), icon: AlertTriangle,
      trend: metrics.statuses.exception > 50 ? 'down' : 'up',
      trendLabel: `${((metrics.statuses.exception / metrics.total) * 100).toFixed(1)}% of punches`,
    },
  };

  const allKpis = activeKpis.filter(k => kpiCards[k.id]);
  const visibleKpis = isCustomizing ? allKpis : allKpis.filter(k => k.visible !== false);
  const visibleChartItems = isCustomizing ? activeCharts : activeCharts.filter(c => c.visible !== false);

  const chartRenderers = {
    acceptance_rate_trend: () => (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={metrics.trendChart}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(v) => `${v}%`} />
          <Line type="monotone" dataKey="acceptance" stroke="#009ADE" strokeWidth={2} name="Acceptance %" />
        </LineChart>
      </ResponsiveContainer>
    ),
    exceptions_by_site: () => (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={metrics.exceptionChart}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="exceptions" fill="#E12F2C" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    ),
    punch_status_breakdown: () => (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={metrics.statusPieChart} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
            {metrics.statusPieChart.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Pie>
          <Tooltip />
        </PieChart>
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
