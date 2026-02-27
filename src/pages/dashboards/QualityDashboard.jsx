import { useState, useMemo } from 'react';
import { Loader2, Search, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useDashboardData from '../../hooks/useDashboardData';
import DashboardFilters from '../../components/dashboards/DashboardFilters';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';
import KPICard from '../../components/dashboards/KPICard';

export default function QualityDashboard() {
  const [filters, setFilters] = useState({ dateFrom: '2025-01-01', dateTo: '2025-12-31', jobIds: null });
  const { data, loading, error } = useDashboardData('quality', filters);

  const metrics = useMemo(() => {
    if (!data?.quality?.length) return null;
    const quality = data.quality;
    const jobs = data.jobs || [];
    const jobMap = {};
    for (const j of jobs) jobMap[j.id] = j.job_name.split(' - ')[0];

    let totalAudits = 0, totalCA = 0;
    const byQuarter = {};
    const byMonth = {};

    for (const r of quality) {
      totalAudits += r.audits || 0;
      totalCA += r.corrective_actions || 0;

      // Quarter
      const date = new Date(r.date_key);
      const q = `Q${Math.floor(date.getMonth() / 3) + 1}`;
      if (!byQuarter[q]) byQuarter[q] = { audits: 0, ca: 0 };
      byQuarter[q].audits += r.audits || 0;
      byQuarter[q].ca += r.corrective_actions || 0;

      // Month
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

    // Q-o-Q change
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

  return (
    <div className="space-y-6">
      <DashboardFilters filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Audits" value={metrics.totalAudits.toLocaleString()} icon={Search} />
        <KPICard label="Corrective Actions" value={metrics.totalCA.toLocaleString()} icon={AlertCircle} />
        <KPICard label="CA-to-Audit Ratio" value={`${metrics.ratio}%`} icon={BarChart3} />
        <KPICard
          label="QoQ Change"
          value={metrics.qoqChange !== null ? `${metrics.qoqChange}%` : 'N/A'}
          icon={TrendingUp}
          trend={metrics.qoqChange !== null ? (Number(metrics.qoqChange) <= 0 ? 'up' : 'down') : null}
          trendLabel={metrics.qoqChange !== null ? (Number(metrics.qoqChange) <= 0 ? 'Improving' : 'Increasing') : ''}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-4">Audits by Quarter</h3>
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

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-4">Corrective Actions Trend</h3>
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
      </div>
    </div>
  );
}
