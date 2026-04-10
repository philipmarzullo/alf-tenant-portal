// src/pages/ops/OpsOverview.jsx
// Operations Workspace — live Snowflake-backed VP/Manager summary,
// workforce, quality, and financial KPI cards.

import { useState, useEffect, useCallback } from 'react';
import {
  Users, TrendingUp, ShieldCheck, DollarSign,
  ChevronDown, ChevronUp, Info, RefreshCw,
  ClipboardList, BarChart2, ChevronLeft
} from 'lucide-react';
import { useTenantId } from '../../contexts/TenantIdContext';
import { getFreshToken } from '../../lib/supabase';
import SlidePanel from '../../components/layout/SlidePanel';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(path) {
  const token = await getFreshToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

function fmt(val, type = 'number') {
  if (val === null || val === undefined) return '—';
  if (type === 'pct')      return `${val}%`;
  if (type === 'currency') return `$${Number(val).toLocaleString()}`;
  if (type === 'integer')  return Number(val).toLocaleString();
  return val;
}

function getQuarterStart() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PendingBadge({ label = 'Pending data share' }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
      <Info size={10} />
      {label}
    </span>
  );
}

function KPICard({ title, icon: Icon, color, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-3 border-b border-gray-100 ${color}`}>
        <Icon size={16} />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function KPIRow({ label, value, type, sub, alert }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold ${alert ? 'text-red-600' : 'text-gray-900'}`}>
          {fmt(value, type)}
        </span>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}

function SummaryTable({ rows, threshold, groupKey, groupLabel, onRowClick, selectedRow }) {
  if (!rows || rows.length === 0) {
    return <div className="text-sm text-gray-400 py-6 text-center">No data for selected filters.</div>;
  }

  const cols = [
    { key: groupKey, label: groupLabel, width: 'w-32' },
    ...(groupKey === 'manager' ? [{ key: 'vp', label: 'VP', width: 'w-28' }] : []),
    { key: 'jobCount',            label: 'Jobs',           format: 'integer' },
    { key: 'safetyInspCount',     label: 'Safety Insp.',   format: 'integer' },
    { key: 'safetyPct',           label: 'Safety %',       format: 'pct',     threshold: true },
    { key: 'commercialInspCount', label: 'Comm. Insp.',    format: 'integer' },
    { key: 'inspectionScore',     label: 'Insp. Score',    format: 'number',  threshold: true },
    { key: 'totalDeficiencies',   label: 'Deficiencies',   format: 'integer' },
    { key: 'openDeficiencies',    label: 'Open Def.',      format: 'integer' },
    { key: 'incidents',           label: 'Incidents',      pending: true },
    { key: 'goodSaves',           label: 'Good Saves',     pending: true },
    { key: 'compliments',         label: 'Compliments',    pending: true },
    { key: 'avgCloseDays',        label: 'Avg Close Days', format: 'number' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {cols.map(c => (
              <th key={c.key} className={`text-left py-2 px-3 text-xs font-semibold text-gray-500 whitespace-nowrap ${c.width || ''}`}>
                {c.label}
                {c.pending && (
                  <Info size={10} className="inline ml-1 text-amber-400" title="Pending data share expansion" />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isSelected = selectedRow && row[groupKey] === selectedRow;
            const belowSafety = threshold && row.safetyPct !== null && row.safetyPct < threshold;
            const belowComm   = threshold && row.inspectionScore !== null && row.inspectionScore < threshold;
            const rowAlert    = belowSafety || belowComm;

            return (
              <tr
                key={i}
                onClick={() => onRowClick && onRowClick(row[groupKey])}
                className={`border-b border-gray-100 transition-colors
                  ${onRowClick ? 'cursor-pointer hover:bg-blue-50' : ''}
                  ${isSelected ? 'bg-blue-50' : rowAlert ? 'bg-red-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                `}
              >
                {cols.map(c => {
                  if (c.pending) {
                    return (
                      <td key={c.key} className="py-2 px-3 text-gray-300">—</td>
                    );
                  }
                  const val = row[c.key];
                  const isThresholdCol = c.threshold;
                  const isBelow = isThresholdCol && threshold && val !== null && val < threshold;
                  return (
                    <td key={c.key} className={`py-2 px-3 whitespace-nowrap font-medium
                      ${c.key === groupKey ? 'text-gray-900' : ''}
                      ${isBelow ? 'text-red-600 font-semibold' : 'text-gray-700'}
                    `}>
                      {val === null || val === undefined ? '—' : fmt(val, c.format)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SiteDeficiencyDetail({ data, loading }) {
  const [tab, setTab] = useState('open');
  const [expanded, setExpanded] = useState({});

  if (loading) return <KPICardSkeleton />;
  if (!data || !data.items || data.items.length === 0) {
    return <div className="text-sm text-gray-400 py-6 text-center">No deficiencies found for this site.</div>;
  }

  const { summary } = data;
  const filtered = tab === 'open' ? data.items.filter(i => i.isOpen) : data.items;

  // Group by areaType
  const groups = {};
  for (const item of filtered) {
    const key = item.areaType || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  const toggleGroup = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        <strong>{summary.openCount}</strong> open deficiencies across <strong>{summary.areaCount}</strong> areas
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[{ key: 'open', label: 'Open' }, { key: 'all', label: 'All' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.key === 'open' && <span className="ml-1 text-xs">({summary.openCount})</span>}
            {t.key === 'all' && <span className="ml-1 text-xs">({summary.totalCount})</span>}
          </button>
        ))}
      </div>

      {/* Grouped sections */}
      {Object.entries(groups).map(([areaType, items]) => {
        const isExpanded = expanded[areaType] !== false; // default open
        return (
          <div key={areaType} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleGroup(areaType)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-xs font-semibold text-gray-700">
                {areaType} <span className="text-gray-400 font-normal">({items.length})</span>
              </span>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {isExpanded && (
              <div className="divide-y divide-gray-100">
                {items.map((item, i) => {
                  const daysOpen = item.isOpen && item.inspectionDate
                    ? Math.floor((Date.now() - new Date(item.inspectionDate).getTime()) / 86400000)
                    : null;
                  return (
                    <div key={i} className="px-3 py-2 text-xs space-y-1">
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${item.isOpen ? 'bg-red-500' : 'bg-green-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">{item.area}</span>
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-700">{item.item}</span>
                            {tab === 'all' && item.isRepeat && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                Repeat
                              </span>
                            )}
                          </div>
                          {item.detail && <div className="text-gray-500 mt-0.5">{item.detail}</div>}
                          <div className="flex items-center gap-3 mt-1 text-gray-400">
                            <span>{item.inspectionDate ? new Date(item.inspectionDate).toLocaleDateString() : '—'}</span>
                            {item.isOpen && daysOpen !== null && (
                              <span className={daysOpen > 30 ? 'text-red-500 font-medium' : ''}>
                                {daysOpen}d open
                              </span>
                            )}
                            {item.isClosed && item.closedBy && (
                              <span>Closed by {item.closedBy}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OpsOverview() {
  const { tenantId } = useTenantId();

  // Filters
  const [vpOptions, setVpOptions]         = useState([]);
  const [managerOptions, setManagerOptions] = useState([]);
  const [allManagers, setAllManagers]     = useState([]);
  const [vp, setVp]                       = useState('all');
  const [manager, setManager]             = useState('all');
  const [startDate, setStartDate]         = useState(getQuarterStart());
  const [endDate, setEndDate]             = useState(today());
  const [threshold, setThreshold]         = useState(50);

  // Data
  const [vpSummary, setVpSummary]         = useState([]);
  const [managerSummary, setManagerSummary] = useState([]);
  const [workforceKpis, setWorkforceKpis] = useState(null);
  const [qualityKpis, setQualityKpis]     = useState(null);
  const [financialKpis, setFinancialKpis] = useState(null);

  // UI state
  const [activeTab, setActiveTab]         = useState('dashboard');
  const [selectedVP, setSelectedVP]       = useState(null);
  const [loading, setLoading]             = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError]                 = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Drilldown state
  const [drilldown, setDrilldown]         = useState(null);
  const [drilldownData, setDrilldownData] = useState(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // ── Load filter options once
  useEffect(() => {
    if (!tenantId) return;
    setLoadingFilters(true);
    apiFetch(`/api/ops-workspace/${tenantId}/filter-options`)
      .then(d => {
        setVpOptions(d.vps || []);
        setAllManagers(d.managers || []);
        setManagerOptions(d.managers || []);
      })
      .catch(err => console.error('filter-options error', err))
      .finally(() => setLoadingFilters(false));
  }, [tenantId]);

  // ── Cascade manager dropdown when VP changes
  useEffect(() => {
    if (vp === 'all') {
      setManagerOptions(allManagers);
    } else {
      setManagerOptions(allManagers.filter(m => m.vp === vp));
    }
    setManager('all');
    setSelectedVP(null);
  }, [vp, allManagers]);

  // ── Fetch all data
  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);

    const shared = {
      startDate, endDate, threshold,
      ...(vp !== 'all' ? { vp } : {}),
      ...(manager !== 'all' ? { manager } : {}),
    };
    const params = new URLSearchParams(shared).toString();

    try {
      const [vpRes, mgRes, wfRes, qlRes, finRes] = await Promise.all([
        apiFetch(`/api/ops-workspace/${tenantId}/vp-summary?${params}`),
        apiFetch(`/api/ops-workspace/${tenantId}/manager-summary?${params}`),
        apiFetch(`/api/ops-workspace/${tenantId}/workforce-kpis?${params}`),
        apiFetch(`/api/ops-workspace/${tenantId}/quality-kpis?${params}`),
        apiFetch(`/api/ops-workspace/${tenantId}/financial-kpis?${params}`),
      ]);

      setVpSummary(vpRes.rows || []);
      setManagerSummary(mgRes.rows || []);
      setWorkforceKpis(wfRes);
      setQualityKpis(qlRes);
      setFinancialKpis(finRes);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('ops-workspace fetch error:', err);
      setError('Failed to load workspace data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, startDate, endDate, vp, manager, threshold]);

  // Initial load
  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter manager summary when VP row is clicked
  const filteredManagerSummary = selectedVP
    ? managerSummary.filter(r => r.vp === selectedVP)
    : managerSummary;

  // ── Drilldown handlers
  const openManagerDrilldown = useCallback(async (managerName) => {
    const mgr = managerSummary.find(r => r.manager === managerName);
    setDrilldown({ type: 'manager', manager: managerName, vp: mgr?.vp || '' });
    setDrilldownLoading(true);
    setDrilldownData(null);
    try {
      const qs = new URLSearchParams({ manager: managerName, startDate, endDate }).toString();
      const res = await apiFetch(`/api/ops-workspace/${tenantId}/manager-sites?${qs}`);
      setDrilldownData(res);
    } catch (err) {
      console.error('manager-sites fetch error:', err);
    } finally {
      setDrilldownLoading(false);
    }
  }, [tenantId, startDate, endDate, managerSummary]);

  const openSiteDrilldown = useCallback(async (site) => {
    setDrilldown(prev => ({ type: 'site', jobNumber: site.jobNumber, jobName: site.jobName, manager: prev?.manager }));
    setDrilldownLoading(true);
    setDrilldownData(null);
    try {
      const qs = new URLSearchParams({ jobNumber: site.jobNumber, startDate, endDate }).toString();
      const res = await apiFetch(`/api/ops-workspace/${tenantId}/site-deficiencies?${qs}`);
      setDrilldownData(res);
    } catch (err) {
      console.error('site-deficiencies fetch error:', err);
    } finally {
      setDrilldownLoading(false);
    }
  }, [tenantId, startDate, endDate]);

  const closeDrilldown = () => { setDrilldown(null); setDrilldownData(null); };

  const backToManagerSites = useCallback(() => {
    if (drilldown?.manager) {
      openManagerDrilldown(drilldown.manager);
    }
  }, [drilldown, openManagerDrilldown]);

  // ── Render
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Operations Workspace</h1>
            {lastRefreshed && (
              <p className="text-xs text-gray-400 mt-0.5">
                Last refreshed {lastRefreshed.toLocaleTimeString()}
              </p>
            )}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-end gap-3 mt-4">
          {/* VP */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">VP</label>
            <select
              value={vp}
              onChange={e => setVp(e.target.value)}
              disabled={loadingFilters}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">(All)</option>
              {vpOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Manager */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Manager</label>
            <select
              value={manager}
              onChange={e => setManager(e.target.value)}
              disabled={loadingFilters}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">(All)</option>
              {managerOptions.map(m => (
                <option key={m.manager} value={m.manager}>{m.manager}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Threshold */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Highlight Below % Inspected</label>
            <input
              type="number"
              value={threshold}
              min={0} max={100}
              onChange={e => setThreshold(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {[
            { key: 'dashboard', label: 'Dashboard',   icon: BarChart2 },
            { key: 'vp-report', label: 'VP Report',   icon: ClipboardList },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
                ${activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── DASHBOARD TAB ── */}
        {activeTab === 'dashboard' && (
          <>
            {/* Action Items pending banner */}
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <Info size={14} className="flex-shrink-0" />
              <span>
                <strong>Incidents, Good Saves, and Compliments</strong> are pending a data share expansion with WorkWave.
                All other columns are live from WinTeam.
              </span>
            </div>

            {/* VP Performance Summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">VP Performance Summary</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Click a row to filter the manager table below</p>
                </div>
                {selectedVP && (
                  <button
                    onClick={() => setSelectedVP(null)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Clear filter
                  </button>
                )}
              </div>
              <div className="p-5">
                {loading ? (
                  <LoadingSkeleton rows={5} cols={12} />
                ) : (
                  <SummaryTable
                    rows={vpSummary}
                    threshold={threshold}
                    groupKey="vp"
                    groupLabel="VP"
                    onRowClick={setSelectedVP}
                    selectedRow={selectedVP}
                  />
                )}
              </div>
            </div>

            {/* Manager Summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Manager Summary
                    {selectedVP && (
                      <span className="ml-2 text-xs font-normal text-blue-600">
                        — Filtered to VP: {selectedVP}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Click a manager to see their site breakdown</p>
                </div>
              </div>
              <div className="p-5">
                {loading ? (
                  <LoadingSkeleton rows={8} cols={12} />
                ) : (
                  <SummaryTable
                    rows={filteredManagerSummary}
                    threshold={threshold}
                    groupKey="manager"
                    groupLabel="Manager"
                    onRowClick={openManagerDrilldown}
                    selectedRow={drilldown?.type === 'manager' ? drilldown.manager : null}
                  />
                )}
              </div>
            </div>

            {/* KPI Domain Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Workforce */}
              <KPICard title="Workforce & Labor" icon={Users} color="text-blue-700 bg-blue-50">
                {loading || !workforceKpis ? (
                  <KPICardSkeleton />
                ) : (
                  <>
                    <KPIRow label="Active Headcount"  value={workforceKpis.activeHeadcount} type="integer" />
                    <KPIRow
                      label="Turnover Rate"
                      value={workforceKpis.hasTurnoverData ? workforceKpis.turnoverRate : null}
                      type="pct"
                      alert={workforceKpis.turnoverRate > 10}
                      sub={workforceKpis.hasTurnoverData
                        ? `${workforceKpis.terminations} terminations`
                        : 'No activity in selected period'}
                    />
                    <KPIRow
                      label="Overtime %"
                      value={workforceKpis.hasOvertimeData ? workforceKpis.overtimePct : null}
                      type="pct"
                      alert={workforceKpis.overtimePct > 15}
                      sub={workforceKpis.hasOvertimeData
                        ? `of ${Number(workforceKpis.totalHours).toLocaleString()} total hours`
                        : 'No activity in selected period'}
                    />
                    <KPIRow
                      label="Unexcused Absences"
                      value={workforceKpis.hasAbsenceData ? workforceKpis.unexcusedAbsences : null}
                      type="integer"
                      alert={workforceKpis.unexcusedAbsences > 0}
                      sub={workforceKpis.hasAbsenceData ? null : 'No activity in selected period'}
                    />
                    {workforceKpis.hasAbsenceData && (
                      <KPIRow
                        label="Total Absence Hours"
                        value={workforceKpis.totalAbsenceHours}
                        type="integer"
                      />
                    )}
                    {workforceKpis.dataNote && (
                      <div className="pt-2 border-t border-gray-100 text-xs text-gray-400">
                        {workforceKpis.dataNote}
                      </div>
                    )}
                  </>
                )}
              </KPICard>

              {/* Quality */}
              <KPICard title="Quality" icon={ClipboardList} color="text-green-700 bg-green-50">
                {loading || !qualityKpis ? (
                  <KPICardSkeleton />
                ) : (
                  <>
                    <KPIRow
                      label="Avg Inspection Score"
                      value={qualityKpis.avgScore}
                      type="pct"
                      alert={qualityKpis.avgScore < threshold}
                      sub={`${Number(qualityKpis.totalInspections).toLocaleString()} inspections`}
                    />
                    <KPIRow
                      label="Open Deficiencies"
                      value={qualityKpis.openDeficiencies}
                      type="integer"
                      alert={qualityKpis.openDeficiencies > 0}
                      sub={`${Number(qualityKpis.totalDeficiencies).toLocaleString()} total`}
                    />
                    <KPIRow
                      label="Sites Below Objective"
                      value={qualityKpis.sitesBelowObjective}
                      type="integer"
                      alert={qualityKpis.sitesBelowObjective > 0}
                      sub={`of ${qualityKpis.totalSitesInspected} inspected`}
                    />
                    <KPIRow
                      label="Avg Variance from Objective"
                      value={qualityKpis.avgVarianceFromObjective}
                      type="pct"
                      alert={qualityKpis.avgVarianceFromObjective < -5}
                    />
                    <div className="pt-2 border-t border-gray-100">
                      <PendingBadge label="Incidents / Good Saves / Compliments pending" />
                    </div>
                  </>
                )}
              </KPICard>

              {/* Payroll Actuals */}
              <KPICard title="Payroll Actuals" icon={DollarSign} color="text-purple-700 bg-purple-50">
                {loading || !financialKpis ? (
                  <KPICardSkeleton />
                ) : financialKpis.hasData ? (
                  <>
                    <KPIRow
                      label="Total Payroll"
                      value={financialKpis.actualLaborDollars}
                      type="currency"
                    />
                    <KPIRow
                      label="Regular Pay"
                      value={financialKpis.regularDollars}
                      type="currency"
                    />
                    <KPIRow
                      label="Overtime Pay"
                      value={financialKpis.otDollars}
                      type="currency"
                    />
                    <KPIRow
                      label="Total Hours"
                      value={financialKpis.totalHours}
                      type="integer"
                    />
                    <KPIRow
                      label="Overtime %"
                      value={financialKpis.otPct}
                      type="pct"
                      alert={financialKpis.otPct > 15}
                    />
                    <div className="pt-2 border-t border-gray-100 text-xs text-gray-400">
                      Budget comparison pending finance data alignment
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400 py-2">
                    No payroll data in selected period
                  </div>
                )}
              </KPICard>

              {/* Safety */}
              <KPICard title="Safety & Compliance" icon={ShieldCheck} color="text-red-700 bg-red-50">
                <div className="text-sm text-gray-500 py-1">
                  Live safety data is available in the{' '}
                  <a href="/portal/safety" className="text-blue-600 hover:underline font-medium">
                    Safety Workspace
                  </a>
                  .
                </div>
                <div className="pt-2 border-t border-gray-100 space-y-2 mt-2">
                  <KPIRow label="Compliance Obligations Due" value={null} />
                  <div className="text-xs text-gray-400">
                    FACT_EMPLOYEE_COMPLIANCE_OBLIGATION — query pending implementation
                  </div>
                </div>
              </KPICard>

            </div>
          </>
        )}

        {/* ── VP REPORT TAB ── */}
        {activeTab === 'vp-report' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <ClipboardList size={40} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-base font-semibold text-gray-700">VP Quarterly Report</h3>
            <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
              Auto-generated quarterly performance reports for VPs are coming soon.
              Data foundation is live — report builder in progress.
            </p>
          </div>
        )}

      </div>

      {/* ── Drilldown SlidePanel ── */}
      <SlidePanel
        open={!!drilldown}
        onClose={closeDrilldown}
        title={
          drilldown?.type === 'manager'
            ? `${drilldown.manager} — Sites`
            : drilldown?.type === 'site'
            ? drilldown.jobName || drilldown.jobNumber
            : ''
        }
      >
        {drilldown?.type === 'manager' && (
          <div className="space-y-4">
            {drilldown.vp && (
              <div className="text-xs text-gray-400">VP: {drilldown.vp}</div>
            )}
            {drilldownLoading ? (
              <LoadingSkeleton rows={5} cols={6} />
            ) : drilldownData?.rows?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {['Job Name', 'Safety %', 'Insp. Score', 'Deficiencies', 'Open Def.', 'Avg Close Days'].map(h => (
                        <th key={h} className="text-left py-2 px-2 font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownData.rows.map((site, i) => (
                      <tr
                        key={i}
                        onClick={() => openSiteDrilldown(site)}
                        className="border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <td className="py-2 px-2 font-medium text-gray-900 whitespace-nowrap">{site.jobName}</td>
                        <td className={`py-2 px-2 ${site.safetyPct !== null && site.safetyPct < 50 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                          {site.safetyPct != null ? `${site.safetyPct}%` : '—'}
                        </td>
                        <td className={`py-2 px-2 ${site.inspectionScore !== null && site.inspectionScore < 50 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                          {site.inspectionScore != null ? site.inspectionScore : '—'}
                        </td>
                        <td className="py-2 px-2 text-gray-700">{site.totalDeficiencies}</td>
                        <td className={`py-2 px-2 ${site.openDeficiencies > 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                          {site.openDeficiencies}
                        </td>
                        <td className="py-2 px-2 text-gray-700">{site.avgCloseDays != null ? site.avgCloseDays : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-400 py-6 text-center">No sites found for this manager.</div>
            )}
          </div>
        )}

        {drilldown?.type === 'site' && (
          <div className="space-y-4">
            <button
              onClick={backToManagerSites}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <ChevronLeft size={14} />
              Back to {drilldown.manager}'s sites
            </button>
            <SiteDeficiencyDetail data={drilldownData} loading={drilldownLoading} />
          </div>
        )}
      </SlidePanel>
    </div>
  );
}

// ─── Skeleton loaders ──────────────────────────────────────────────────────────

function LoadingSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="flex gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-gray-100 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function KPICardSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex justify-between">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  );
}
