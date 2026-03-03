import { useState, useMemo } from 'react';
import { Loader2, ClipboardList, CheckCircle, Clock, TrendingUp, Settings2 } from 'lucide-react';
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

const ICON_MAP = { ClipboardList, CheckCircle, TrendingUp, Clock };

export default function OperationsDashboard() {
  const [filters, setFilters] = useState({ dateFrom: '2025-01-01', dateTo: '2025-12-31', jobIds: null });
  const { data, loading, error } = useDashboardData('operations', filters);
  const { kpis, charts } = useDashboardConfig('operations');
  const { isAdmin } = useUser();

  const {
    isCustomizing, enterCustomize, exitCustomize,
    draft, saveDraft, resetToDefaults,
    isDirty, saving, source,
    reorderKpis, toggleKpi, renameKpi,
    reorderCharts, toggleChart, renameChart,
  } = useDomainCustomize('operations');

  const activeKpis = isCustomizing && draft ? resolveConfig('operations', draft).kpis : kpis;
  const activeCharts = isCustomizing && draft ? resolveConfig('operations', draft).charts : charts;

  // First-time setup for non-admin users
  const [setupDismissed, setSetupDismissed] = useState(false);

  // useMemo must be called before any early returns (React hooks rules)
  const metrics = useMemo(() => {
    if (!data?.tickets?.length) return null;
    const tickets = data.tickets;
    const jobs = data.jobs || [];
    const jobMap = {};
    for (const j of jobs) jobMap[j.id] = j.job_name.split(' - ')[0];

    const total = tickets.length;
    const completed = tickets.filter((t) => t.status === 'completed').length;
    const completionRate = total ? ((completed / total) * 100).toFixed(1) : 0;

    const bySite = {};
    for (const t of tickets) {
      const site = jobMap[t.job_id] || 'Unknown';
      bySite[site] = (bySite[site] || 0) + 1;
    }
    const siteChart = Object.entries(bySite).map(([name, count]) => ({ name, tickets: count }));

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
      .map(([month, v]) => ({ month: month.slice(5), total: v.total, completed: v.completed }));

    const byCat = {};
    for (const t of tickets) byCat[t.category] = (byCat[t.category] || 0) + 1;
    const categoryChart = Object.entries(byCat).sort(([, a], [, b]) => b - a).map(([name, count]) => ({ name, count }));

    return { total, completed, completionRate, siteChart, trendChart, categoryChart };
  }, [data]);

  if (!isAdmin && !setupDismissed && source === 'default' && !loading) {
    return (
      <FirstTimeSetup
        domain="operations"
        onComplete={() => setSetupDismissed(true)}
      />
    );
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-aa-blue animate-spin" /></div>;
  if (error) return <div className="text-center py-20"><div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto"><p className="text-sm text-red-700">{String(error)}</p></div></div>;
  if (!metrics) return <DashboardEmptyState domain="operations" />;

  const kpiCards = {
    total_tickets: { value: metrics.total.toLocaleString(), icon: ClipboardList },
    completed: { value: metrics.completed.toLocaleString(), icon: CheckCircle, trend: 'up', trendLabel: `${metrics.completionRate}% completion rate` },
    completion_rate: { value: `${metrics.completionRate}%`, icon: TrendingUp },
    open_tickets: { value: (metrics.total - metrics.completed).toLocaleString(), icon: Clock },
  };

  const allKpis = activeKpis.filter(k => kpiCards[k.id]);
  const visibleKpis = isCustomizing ? allKpis : allKpis.filter(k => k.visible !== false);
  const visibleChartItems = isCustomizing ? activeCharts : activeCharts.filter(c => c.visible !== false);

  const chartRenderers = {
    tickets_by_site: () => (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={metrics.siteChart}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="tickets" fill="#009ADE" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    ),
    monthly_trend: () => (
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
    ),
    category_breakdown: () => (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={metrics.categoryChart} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
          <Tooltip />
          <Bar dataKey="count" fill="#5A5D62" radius={[0, 4, 4, 0]} />
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
