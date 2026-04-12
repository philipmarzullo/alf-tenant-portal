// src/pages/ops/OpsOverview.jsx
// Operations Workspace — three-tab layout with shared filter bar.
// Tab 1: Executive Summary (KPI cards + VP/Manager tables)
// Tab 2: Inspection Dashboard (charts + tables)
// Tab 3: VP Report

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import VPReportTab from './VPReportTab';
import {
  Users, TrendingUp, ShieldCheck, DollarSign,
  ChevronDown, ChevronUp, ChevronRight, Info, RefreshCw,
  ClipboardList, BarChart2, ChevronLeft, AlertTriangle
} from 'lucide-react';
import { useTenantId } from '../../contexts/TenantIdContext';
import { getFreshToken } from '../../lib/supabase';
import SlidePanel from '../../components/layout/SlidePanel';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

function statusBadge(value, greenMin, amberMin, nullLabel = null) {
  if (value === null || value === undefined) return { color: 'bg-gray-100 text-gray-400', label: '—', isNull: true, nullLabel };
  if (value >= greenMin) return { color: 'bg-green-100 text-green-700', label: `${value}%`, isNull: false };
  if (value >= amberMin) return { color: 'bg-amber-100 text-amber-700', label: `${value}%`, isNull: false };
  return { color: 'bg-red-100 text-red-700', label: `${value}%`, isNull: false };
}

function vpRowStatus(safetyPassRate, qualityScore) {
  const safetyStatus = safetyPassRate == null ? 'gray' : safetyPassRate >= 95 ? 'green' : safetyPassRate >= 85 ? 'amber' : 'red';
  const qualityStatus = qualityScore == null ? 'gray' : qualityScore >= 80 ? 'green' : qualityScore >= 65 ? 'amber' : 'red';
  if (safetyStatus === 'red' || qualityStatus === 'red') return 'bg-red-500';
  if (safetyStatus === 'amber' || qualityStatus === 'amber') return 'bg-amber-500';
  if (safetyStatus === 'gray' && qualityStatus === 'gray') return 'bg-gray-300';
  return 'bg-green-500';
}

function budgetDateColor(dateStr) {
  const d = new Date(dateStr);
  const daysSince = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return daysSince > 365 ? 'text-red-600' : daysSince > 180 ? 'text-amber-600' : 'text-green-600';
}

function BudgetLastUpdated({ date, oldestDate, isJobSelected }) {
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (isJobSelected || !oldestDate || oldestDate === date) {
    // Single date display
    return (
      <div className="pt-2 border-t border-gray-100 mt-2">
        <span className="text-xs text-gray-500">Budget last updated: </span>
        <span className={`text-xs font-medium ${budgetDateColor(date)}`}>{fmtDate(date)}</span>
      </div>
    );
  }
  // Range display
  return (
    <div className="pt-2 border-t border-gray-100 mt-2">
      <span className="text-xs text-gray-500">Budget range: </span>
      <span className={`text-xs font-medium ${budgetDateColor(oldestDate)}`}>{fmtDate(oldestDate)}</span>
      <span className="text-xs text-gray-400"> → </span>
      <span className="text-xs text-gray-700">{fmtDate(date)}</span>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function KPIRow({ label, value, type, sub, alert, onClick }) {
  return (
    <div
      className={`flex items-center justify-between ${onClick ? 'cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors' : ''}`}
      onClick={onClick}
    >
      <span className="text-xs text-gray-500 flex items-center gap-1">
        {label}
        {onClick && <ChevronRight size={10} className="text-gray-300" />}
      </span>
      <div className="text-right">
        <span className={`text-sm font-semibold ${alert ? 'text-red-600' : 'text-gray-900'}`}>
          {fmt(value, type)}
        </span>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}

function MiniKPI({ label, value, type, alert, onClick, sub }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border border-gray-200 p-4 flex flex-col items-center justify-center relative ${onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all' : ''}`}
    >
      {onClick && <ChevronRight size={12} className="absolute top-2 right-2 text-gray-300" />}
      <div className={`text-2xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>
        {fmt(value, type)}
      </div>
      <div className="text-xs text-gray-500 mt-1 text-center">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5 text-center">{sub}</div>}
    </div>
  );
}

function SiteDeficiencyDetail({ data, loading }) {
  const [expanded, setExpanded] = useState({});

  if (loading) return <KPICardSkeleton />;
  if (!data || !data.items || data.items.length === 0) {
    return <div className="text-sm text-gray-400 py-6 text-center">No deficiencies on record for this site</div>;
  }

  const { summary, items } = data;

  const groups = {};
  for (const item of items) {
    const key = item.area || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  const toggleGroup = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        <strong>{summary.openCount}</strong> open deficiencies, <strong>{summary.totalCount}</strong> total recorded
      </div>

      {Object.entries(groups).map(([area, areaItems]) => {
        const isExpanded = expanded[area] !== false;
        const openInArea = areaItems.filter(i => i.isOpen).length;
        return (
          <div key={area} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleGroup(area)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-xs font-semibold text-gray-700">
                {area}
                <span className="text-gray-400 font-normal ml-1">({areaItems.length})</span>
                {openInArea > 0 && (
                  <span className="text-red-600 font-normal ml-1">· {openInArea} open</span>
                )}
              </span>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {isExpanded && (
              <div className="divide-y divide-gray-100">
                {areaItems.map((item, i) => (
                  <div key={i} className="px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{item.item}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        item.isOpen
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        {item.isOpen ? 'Open' : 'Closed'}
                      </span>
                      {item.repeatCount > 2 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                          Recurring x{item.repeatCount}
                        </span>
                      )}
                      {item.repeatCount === 2 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                          Repeat x{item.repeatCount}
                        </span>
                      )}
                    </div>
                    {item.detail && <div className="text-gray-500 mt-1">{item.detail}</div>}
                    <div className="flex items-center gap-3 mt-1 text-gray-400">
                      <span>{item.inspectionDate ? new Date(item.inspectionDate).toLocaleDateString() : '—'}</span>
                      {item.inspectionType && <span>{item.inspectionType}</span>}
                      {item.isClosed && item.closedBy && <span>Closed by {item.closedBy}</span>}
                    </div>
                  </div>
                ))}
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
  const [allManagers, setAllManagers]     = useState([]);
  const [allJobs, setAllJobs]             = useState([]);
  const [vp, setVp]                       = useState('all');
  const [manager, setManager]             = useState('all');
  const [job, setJob]                     = useState('all');
  const [startDate, setStartDate]         = useState(getQuarterStart());
  const [endDate, setEndDate]             = useState(today());

  // Derived: cascade manager options from VP
  const managerOptions = useMemo(() => {
    const filtered = vp === 'all' ? allManagers : allManagers.filter(m => m.vp === vp);
    const seen = new Set();
    return filtered.filter(m => {
      if (seen.has(m.manager)) return false;
      seen.add(m.manager);
      return true;
    });
  }, [vp, allManagers]);

  // Derived: cascade job options from VP + Manager
  const jobOptions = useMemo(() => {
    return allJobs.filter(j =>
      (vp === 'all' || j.vp === vp) &&
      (manager === 'all' || j.manager === manager)
    );
  }, [vp, manager, allJobs]);

  // Data — Tab 1
  const [vpSummary, setVpSummary]         = useState([]);
  const [managerSummary, setManagerSummary] = useState([]);
  const [workforceKpis, setWorkforceKpis] = useState(null);
  const [qualityKpis, setQualityKpis]     = useState(null);
  const [financialKpis, setFinancialKpis] = useState(null);
  const [safetyKpis, setSafetyKpis]       = useState(null);

  // Data — Tab 2
  const [deficiencyTrend, setDeficiencyTrend]     = useState(null);
  const [deficiencyByArea, setDeficiencyByArea]   = useState(null);
  const [sitesByDeficiency, setSitesByDeficiency] = useState(null);
  const [daysSinceInspection, setDaysSinceInspection] = useState(null);
  const [daysActiveOnly, setDaysActiveOnly]       = useState(true);
  const [daysSort, setDaysSort]                   = useState({ col: 'daysSince', dir: 'asc' });

  // UI state
  const [activeTab, setActiveTab]         = useState('executive');
  const [selectedVP, setSelectedVP]       = useState(null);
  const [loading, setLoading]             = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError]                 = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  // kpiDetailOpen removed — section is always open

  // Drilldown state
  const [drilldown, setDrilldown]         = useState(null);
  const [drilldownData, setDrilldownData] = useState(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // KPI detail panel state
  const [kpiPanel, setKpiPanel]             = useState(null); // null | { type: 'absences'|'deficiencies'|'belowObj'|'turnover', title }
  const [kpiPanelData, setKpiPanelData]     = useState(null);
  const [kpiPanelLoading, setKpiPanelLoading] = useState(false);
  const [kpiPanelSort, setKpiPanelSort]     = useState({ col: null, dir: 'desc' });

  // ── Load filter options once
  useEffect(() => {
    if (!tenantId) return;
    setLoadingFilters(true);
    apiFetch(`/api/ops-workspace/${tenantId}/filter-options`)
      .then(d => {
        setVpOptions(d.vps || []);
        setAllManagers(d.managers || []);
        setAllJobs(d.jobs || []);
      })
      .catch(err => console.error('filter-options error', err))
      .finally(() => setLoadingFilters(false));
  }, [tenantId]);

  // ── Reset child selections when parent changes
  useEffect(() => { setManager('all'); setJob('all'); setSelectedVP(null); }, [vp]);
  useEffect(() => { setJob('all'); }, [manager]);

  // ── Fetch all data
  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);

    const shared = {
      startDate, endDate,
      ...(vp !== 'all' ? { vp } : {}),
      ...(manager !== 'all' ? { manager } : {}),
      ...(job !== 'all' ? { jobName: job } : {}),
    };
    const params = new URLSearchParams(shared).toString();

    try {
      const [vpRes, mgRes, wfRes, qlRes, finRes, sfRes, trendRes, areaRes, sitesRes, daysRes] = await Promise.all([
        apiFetch(`/api/ops-workspace/${tenantId}/vp-summary?${params}`),
        apiFetch(`/api/ops-workspace/${tenantId}/manager-summary?${params}`),
        apiFetch(`/api/ops-workspace/${tenantId}/workforce-kpis?${params}`),
        apiFetch(`/api/ops-workspace/${tenantId}/quality-kpis?${params}`),
        apiFetch(`/api/ops-workspace/${tenantId}/financial-kpis?${params}`),
        apiFetch(`/api/ops-workspace/${tenantId}/safety-kpis?${params}`),
        apiFetch(`/api/ops-workspace/${tenantId}/deficiency-trend?${params}`),
        apiFetch(`/api/ops-workspace/${tenantId}/deficiency-by-area?${params}`),
        apiFetch(`/api/ops-workspace/${tenantId}/sites-by-deficiency?${params}`),
        apiFetch(`/api/ops-workspace/${tenantId}/days-since-inspection?${params}&activeOnly=${daysActiveOnly}`),
      ]);

      setVpSummary(vpRes.rows || []);
      setManagerSummary(mgRes.rows || []);
      setWorkforceKpis(wfRes);
      setQualityKpis(qlRes);
      setFinancialKpis(finRes);
      setSafetyKpis(sfRes);
      setDeficiencyTrend(trendRes);
      setDeficiencyByArea(areaRes);
      setSitesByDeficiency(sitesRes);
      setDaysSinceInspection(daysRes);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('ops-workspace fetch error:', err);
      setError('Failed to load workspace data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, startDate, endDate, vp, manager, job, daysActiveOnly]);

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
      const qs = new URLSearchParams({ jobNumber: site.jobNumber }).toString();
      const res = await apiFetch(`/api/ops-workspace/${tenantId}/site-deficiencies?${qs}`);
      setDrilldownData(res);
    } catch (err) {
      console.error('site-deficiencies fetch error:', err);
    } finally {
      setDrilldownLoading(false);
    }
  }, [tenantId]);

  const closeDrilldown = () => { setDrilldown(null); setDrilldownData(null); };

  const backToManagerSites = useCallback(() => {
    if (drilldown?.manager) {
      openManagerDrilldown(drilldown.manager);
    }
  }, [drilldown, openManagerDrilldown]);

  // ── KPI Panel handlers
  const openKpiPanel = useCallback(async (type, title) => {
    setKpiPanel({ type, title });
    setKpiPanelLoading(true);
    setKpiPanelData(null);
    setKpiPanelSort({ col: null, dir: 'desc' });
    try {
      const shared = { startDate, endDate };
      if (vp !== 'all') shared.vp = vp;
      if (manager !== 'all') shared.manager = manager;
      if (job !== 'all') shared.jobName = job;
      const qs = new URLSearchParams(shared).toString();

      const endpointMap = {
        absences: 'absence-detail',
        deficiencies: 'open-deficiencies-detail',
        belowObj: 'sites-below-objective',
        turnover: 'turnover-detail',
      };
      const res = await apiFetch(`/api/ops-workspace/${tenantId}/${endpointMap[type]}?${qs}`);
      setKpiPanelData(res.rows || []);
    } catch (err) {
      console.error('kpi-panel fetch error:', err);
      setKpiPanelData([]);
    } finally {
      setKpiPanelLoading(false);
    }
  }, [tenantId, startDate, endDate, vp, manager, job]);

  const closeKpiPanel = () => { setKpiPanel(null); setKpiPanelData(null); };

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

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Job</label>
            <select
              value={job}
              onChange={e => setJob(e.target.value)}
              disabled={loadingFilters}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">(All)</option>
              {jobOptions.map(j => (
                <option key={j.jobName} value={j.jobName}>{j.jobName}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            { key: 'executive',  label: 'Executive Summary', icon: BarChart2 },
            { key: 'inspection', label: 'Inspection Dashboard', icon: ClipboardList },
            { key: 'vp-report',  label: 'VP Report', icon: TrendingUp },
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

        {/* ── TAB 1: EXECUTIVE SUMMARY ── */}
        {activeTab === 'executive' && (
          <>
            {/* KPI Cards — 2 rows of 4 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniKPI
                label="Active Headcount"
                value={workforceKpis?.activeHeadcount}
                type="integer"
              />
              <MiniKPI
                label="Turnover Rate"
                value={workforceKpis?.hasTurnoverData ? workforceKpis?.turnoverRate : null}
                type="pct"
                alert={workforceKpis?.turnoverRate > 10}
                onClick={workforceKpis?.hasTurnoverData ? () => openKpiPanel('turnover', 'Turnover Detail') : undefined}
              />
              <MiniKPI
                label="Open Deficiencies"
                value={qualityKpis?.openDeficiencies}
                type="integer"
                alert={qualityKpis?.openDeficiencies > 0}
                onClick={qualityKpis?.openDeficiencies > 0 ? () => openKpiPanel('deficiencies', 'Open Deficiencies') : undefined}
              />
              <MiniKPI
                label="Open Claims"
                value={safetyKpis?.openClaims}
                type="integer"
                alert={safetyKpis?.openClaims > 0}
              />
              <MiniKPI
                label="Total Payroll YTD"
                value={financialKpis?.totalPayroll}
                type="currency"
              />
              <MiniKPI
                label="Overtime %"
                value={workforceKpis?.hasOvertimeData ? workforceKpis?.overtimePct : null}
                type="pct"
                alert={workforceKpis?.overtimePct > 15}
              />
              <MiniKPI
                label="Avg Inspection Score"
                value={qualityKpis?.avgScore}
                type="pct"
                alert={qualityKpis?.avgScore < 80}
                sub="Standard inspections only"
              />
              <MiniKPI
                label="Inspections"
                value={qualityKpis?.totalInspections}
                type="integer"
              />
            </div>

            {/* VP Performance Table */}
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
                  <LoadingSkeleton rows={5} cols={8} />
                ) : vpSummary.length === 0 ? (
                  <div className="text-sm text-gray-400 py-6 text-center">No data for selected filters.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 w-6"></th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">VP</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Jobs</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Safety Insp.</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Safety Score</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Quality Insp.</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Quality Score</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Deficiencies</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Open Def.</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Payroll</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Claims</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Avg Close Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vpSummary.map((row, i) => {
                          const isSelected = selectedVP === row.vp;
                          const safety = statusBadge(row.safetyPassRate, 95, 85);
                          const quality = statusBadge(row.standardAvgScore, 80, 65, 'No standard inspections');
                          const dot = vpRowStatus(row.safetyPassRate, row.standardAvgScore);
                          return (
                            <tr
                              key={i}
                              onClick={() => setSelectedVP(isSelected ? null : row.vp)}
                              className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors
                                ${isSelected ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                            >
                              <td className="py-2 px-3">
                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${dot}`}></span>
                              </td>
                              <td className="py-2 px-3 font-medium text-gray-900">{row.vp}</td>
                              <td className="py-2 px-3 text-gray-700">{row.jobCount}</td>
                              <td className="py-2 px-3 text-right text-gray-700">{row.safetyInspCount || 0}</td>
                              <td className="py-2 px-3">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${safety.color}`}>
                                  {safety.label}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right text-gray-700">{row.standardInspCount || 0}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${quality.color}`}
                                  title={quality.isNull ? quality.nullLabel : undefined}
                                >
                                  {quality.label}
                                </span>
                                {quality.isNull && quality.nullLabel && (
                                  <div className="text-[10px] text-gray-400 mt-0.5">{quality.nullLabel}</div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right text-gray-700">{row.totalDeficiencies || 0}</td>
                              <td className={`py-2 px-3 text-right ${row.openDeficiencies > 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                                {row.openDeficiencies}
                              </td>
                              <td className="py-2 px-3 text-gray-700">{fmt(row.payroll, 'currency')}</td>
                              <td className={`py-2 px-3 text-right ${row.claims > 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                                {row.claims}
                              </td>
                              <td className="py-2 px-3 text-gray-700">{row.avgCloseDays ?? '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Manager Summary */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
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
              <div className="p-5">
                {loading ? (
                  <LoadingSkeleton rows={8} cols={8} />
                ) : filteredManagerSummary.length === 0 ? (
                  <div className="text-sm text-gray-400 py-6 text-center">No data for selected filters.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 w-6"></th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Manager</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">VP</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Jobs</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Safety Insp.</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Safety Score</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Quality Insp.</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Quality Score</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Deficiencies</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Open Def.</th>
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Avg Close Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredManagerSummary.map((row, i) => {
                          const isSelected = drilldown?.type === 'manager' && drilldown.manager === row.manager;
                          const safety = statusBadge(row.safetyPassRate, 95, 85);
                          const quality = statusBadge(row.standardAvgScore, 80, 65, 'No standard inspections');
                          const dot = vpRowStatus(row.safetyPassRate, row.standardAvgScore);
                          return (
                            <tr
                              key={i}
                              onClick={() => openManagerDrilldown(row.manager)}
                              className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors
                                ${isSelected ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                            >
                              <td className="py-2 px-3">
                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${dot}`}></span>
                              </td>
                              <td className="py-2 px-3 font-medium text-gray-900">{row.manager}</td>
                              <td className="py-2 px-3 text-gray-500 text-xs">{row.vp}</td>
                              <td className="py-2 px-3 text-gray-700">{row.jobCount}</td>
                              <td className="py-2 px-3 text-right text-gray-700">{row.safetyInspCount || 0}</td>
                              <td className="py-2 px-3">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${safety.color}`}>
                                  {safety.label}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right text-gray-700">{row.standardInspCount || 0}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${quality.color}`}
                                  title={quality.isNull ? quality.nullLabel : undefined}
                                >
                                  {quality.label}
                                </span>
                                {quality.isNull && quality.nullLabel && (
                                  <div className="text-[10px] text-gray-400 mt-0.5">{quality.nullLabel}</div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right text-gray-700">{row.totalDeficiencies || 0}</td>
                              <td className={`py-2 px-3 text-right ${row.openDeficiencies > 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                                {row.openDeficiencies}
                              </td>
                              <td className="py-2 px-3 text-gray-700">{row.avgCloseDays ?? '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* KPI Detail */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">KPI Detail</span>
              </div>
              <div className="px-5 pb-5 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Workforce */}
                    <KPICard title="Workforce & Labor" icon={Users} color="text-blue-700 bg-blue-50">
                      {loading || !workforceKpis ? (
                        <KPICardSkeleton />
                      ) : (
                        <>
                          <KPIRow label="Active Headcount" value={workforceKpis.activeHeadcount} type="integer" />
                          <KPIRow
                            label="Turnover Rate"
                            value={workforceKpis.hasTurnoverData ? workforceKpis.turnoverRate : null}
                            type="pct"
                            alert={workforceKpis.turnoverRate > 10}
                            sub={workforceKpis.hasTurnoverData ? `${workforceKpis.terminations} terminations` : 'No activity'}
                            onClick={workforceKpis.hasTurnoverData ? () => openKpiPanel('turnover', 'Turnover Detail') : undefined}
                          />
                          <KPIRow
                            label="Overtime %"
                            value={workforceKpis.hasOvertimeData ? workforceKpis.overtimePct : null}
                            type="pct"
                            alert={workforceKpis.overtimePct > 15}
                            sub={workforceKpis.hasOvertimeData ? `of ${Number(workforceKpis.totalHours).toLocaleString()} total hours` : 'No activity'}
                          />
                          <KPIRow
                            label="Unexcused Absences"
                            value={workforceKpis.hasAbsenceData ? workforceKpis.unexcusedAbsences : null}
                            type="integer"
                            alert={workforceKpis.unexcusedAbsences > 0}
                            onClick={workforceKpis.unexcusedAbsences > 0 ? () => openKpiPanel('absences', 'Unexcused Absences') : undefined}
                          />
                        </>
                      )}
                    </KPICard>

                    {/* Quality */}
                    <KPICard title="Quality" icon={ClipboardList} color="text-green-700 bg-green-50">
                      {loading || !qualityKpis ? (
                        <KPICardSkeleton />
                      ) : (
                        <>
                          <KPIRow label="Avg Inspection Score" value={qualityKpis.avgScore} type="pct" alert={qualityKpis.avgScore < 80} sub="Standard inspections only" />
                          <KPIRow label="Open Deficiencies" value={qualityKpis.openDeficiencies} type="integer" alert={qualityKpis.openDeficiencies > 0} sub={`${Number(qualityKpis.totalDeficiencies).toLocaleString()} total`} onClick={qualityKpis.openDeficiencies > 0 ? () => openKpiPanel('deficiencies', 'Open Deficiencies') : undefined} />
                          <KPIRow label="Sites Below Objective" value={qualityKpis.sitesBelowObjective} type="integer" alert={qualityKpis.sitesBelowObjective > 0} sub={`of ${qualityKpis.totalSitesInspected} inspected`} onClick={qualityKpis.sitesBelowObjective > 0 ? () => openKpiPanel('belowObj', 'Sites Below Objective') : undefined} />
                        </>
                      )}
                    </KPICard>

                    {/* Payroll */}
                    <KPICard title="Payroll Actuals" icon={DollarSign} color="text-purple-700 bg-purple-50">
                      {loading || !financialKpis ? (
                        <KPICardSkeleton />
                      ) : financialKpis.hasPayrollData ? (
                        <>
                          <KPIRow label="Total Payroll" value={financialKpis.totalPayroll} type="currency" />
                          <KPIRow label="Regular Pay" value={financialKpis.regularPay} type="currency" />
                          <KPIRow label="Overtime Pay" value={financialKpis.otPay} type="currency" />
                          <KPIRow label="Total Hours" value={financialKpis.totalHours} type="integer" />
                          <KPIRow label="Overtime %" value={financialKpis.otPct} type="pct" alert={financialKpis.otPct > 15} />
                          {financialKpis.hasBudgetData && (
                            <>
                              <div className="pt-3 mt-3 border-t border-gray-200">
                                <div className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-2">Budget</div>
                              </div>
                              <KPIRow label="Budget Labor" value={financialKpis.budgetLaborDollars} type="currency" />
                              <KPIRow label="Budget Hours" value={financialKpis.budgetHours} type="integer" />
                              <KPIRow label="Variance" value={financialKpis.laborVariancePct} type="pct" alert={financialKpis.laborVariancePct > 0} sub={financialKpis.laborVariancePct > 0 ? 'Over budget' : 'Under budget'} />
                            </>
                          )}
                          {financialKpis.budgetLastUpdated && (
                            <BudgetLastUpdated date={financialKpis.budgetLastUpdated} oldestDate={financialKpis.oldestBudgetUpdate} isJobSelected={job !== 'all'} />
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-gray-400 py-2">No payroll data in selected period</div>
                      )}
                    </KPICard>

                    {/* Safety */}
                    <KPICard title="Safety & Compliance" icon={ShieldCheck} color="text-red-700 bg-red-50">
                      {loading || !safetyKpis ? (
                        <KPICardSkeleton />
                      ) : safetyKpis.hasData ? (
                        <>
                          <KPIRow label="Open Claims" value={safetyKpis.openClaims} type="integer" alert={safetyKpis.openClaims > 0} />
                          <KPIRow label="Out of Work" value={safetyKpis.outOfWork} type="integer" alert={safetyKpis.outOfWork > 0} />
                          <KPIRow label="Total Incurred" value={safetyKpis.totalIncurred} type="currency" />
                          <KPIRow label="Recordable Incidents" value={safetyKpis.recordableIncidents} type="integer" sub={`${safetyKpis.totalClaims} total claims`} />
                          <KPIRow label="Lost Time Incidents" value={safetyKpis.lostTimeIncidents} type="integer" alert={safetyKpis.lostTimeIncidents > 0} />
                        </>
                      ) : (
                        <div className="text-sm text-gray-400 py-2">No claims data in selected period</div>
                      )}
                    </KPICard>
                  </div>
                </div>
            </div>
          </>
        )}

        {/* ── TAB 2: INSPECTION DASHBOARD ── */}
        {activeTab === 'inspection' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top left: Deficiency Trend */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Deficiency Trend (Weekly %)</h3>
              {loading || !deficiencyTrend ? (
                <LoadingSkeleton rows={6} cols={4} />
              ) : deficiencyTrend.weeks?.length > 0 ? (
                <DeficiencyTrendChart weeks={deficiencyTrend.weeks} />
              ) : (
                <div className="text-sm text-gray-400 py-12 text-center">No data for selected period</div>
              )}
            </div>

            {/* Top right: Deficiency by Area */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Deficiency % by Area (Top 10)</h3>
              {loading || !deficiencyByArea ? (
                <LoadingSkeleton rows={6} cols={4} />
              ) : deficiencyByArea.areas?.length > 0 ? (
                <DeficiencyByAreaChart areas={deficiencyByArea.areas} />
              ) : (
                <div className="text-sm text-gray-400 py-12 text-center">No data for selected period</div>
              )}
            </div>

            {/* Bottom left: Sites by Deficiency Rate */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Sites by Deficiency Rate</h3>
              {loading || !sitesByDeficiency ? (
                <LoadingSkeleton rows={8} cols={5} />
              ) : sitesByDeficiency.sites?.length > 0 ? (
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 font-semibold text-gray-500">Site</th>
                        <th className="text-left py-2 px-2 font-semibold text-gray-500">Manager</th>
                        <th className="text-right py-2 px-2 font-semibold text-gray-500">Def. %</th>
                        <th className="text-right py-2 px-2 font-semibold text-gray-500">Deficient</th>
                        <th className="text-right py-2 px-2 font-semibold text-gray-500">Total Items</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sitesByDeficiency.sites.map((site, i) => (
                        <tr
                          key={i}
                          onClick={() => openSiteDrilldown(site)}
                          className="border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors"
                        >
                          <td className="py-2 px-2 font-medium text-gray-900">{site.jobName}</td>
                          <td className="py-2 px-2 text-gray-500">{site.manager}</td>
                          <td className={`py-2 px-2 text-right font-semibold ${
                            site.deficiencyPct > 5 ? 'text-red-600' : site.deficiencyPct > 3 ? 'text-amber-600' : 'text-green-600'
                          }`}>
                            {site.deficiencyPct}%
                          </td>
                          <td className="py-2 px-2 text-right text-gray-700">{site.deficientItems}</td>
                          <td className="py-2 px-2 text-right text-gray-500">{site.totalItems}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-gray-400 py-12 text-center">No data for selected period</div>
              )}
            </div>

            {/* Bottom right: Days Since Last Inspection */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Days Since Last Inspection</h3>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={daysActiveOnly}
                    onChange={e => setDaysActiveOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  Active only (inspected within 2 years + never inspected)
                </label>
              </div>
              {loading || !daysSinceInspection ? (
                <LoadingSkeleton rows={8} cols={4} />
              ) : (() => {
                const sorted = [...(daysSinceInspection.sites || [])].sort((a, b) => {
                  const { col, dir } = daysSort;
                  let av = a[col], bv = b[col];
                  if (typeof av === 'string') av = av.toLowerCase();
                  if (typeof bv === 'string') bv = bv.toLowerCase();
                  if (av < bv) return dir === 'asc' ? -1 : 1;
                  if (av > bv) return dir === 'asc' ? 1 : -1;
                  return 0;
                });
                const SortHeader = ({ col, label, align }) => (
                  <th
                    className={`${align === 'right' ? 'text-right' : 'text-left'} py-2 px-2 font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none`}
                    onClick={() => setDaysSort(s => ({ col, dir: s.col === col && s.dir === 'desc' ? 'asc' : 'desc' }))}
                  >
                    {label}
                    {daysSort.col === col && (
                      <span className="ml-0.5">{daysSort.dir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                );
                return sorted.length > 0 ? (
                  <>
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b border-gray-200">
                            <SortHeader col="jobName" label="Site" align="left" />
                            <SortHeader col="manager" label="Manager" align="left" />
                            <SortHeader col="daysSince" label="Days" align="right" />
                            <SortHeader col="lastInspectionDate" label="Last Inspected" align="left" />
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((site, i) => (
                            <tr
                              key={i}
                              onClick={() => openSiteDrilldown(site)}
                              className="border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors"
                            >
                              <td className="py-2 px-2 font-medium text-gray-900">{site.jobName}</td>
                              <td className="py-2 px-2 text-gray-500">{site.manager}</td>
                              <td className={`py-2 px-2 text-right font-semibold ${
                                site.daysSince >= 9999 ? 'text-red-600' : site.daysSince > 180 ? 'text-red-600' : site.daysSince > 90 ? 'text-amber-600' : 'text-gray-700'
                              }`}>
                                {site.daysSince >= 9999 ? 'Never' : site.daysSince}
                              </td>
                              <td className="py-2 px-2 text-gray-500">
                                {site.daysSince >= 9999 ? '—' : site.lastInspectionDate ? new Date(site.lastInspectionDate).toLocaleDateString() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Showing {sorted.length} sites</p>
                  </>
                ) : (
                  <div className="text-sm text-gray-400 py-12 text-center">All active sites inspected within 30 days</div>
                );
              })()}
            </div>

          </div>
        )}

        {/* ── TAB 3: VP REPORT ── */}
        {activeTab === 'vp-report' && (
          <VPReportTab
            vp={vp}
            startDate={startDate}
            endDate={endDate}
            workforceKpis={workforceKpis}
            qualityKpis={qualityKpis}
            financialKpis={financialKpis}
            safetyKpis={safetyKpis}
            deficiencyByArea={deficiencyByArea}
            vpSummary={vpSummary}
            tenantId={tenantId}
          />
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
              <LoadingSkeleton rows={5} cols={4} />
            ) : drilldownData?.rows?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {['Job Name', 'Safety Pass', 'Std. Score', 'Open Def.'].map(h => (
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
                        <td className="py-2 px-2 font-medium text-gray-900">{site.jobName}</td>
                        <td className={`py-2 px-2 ${site.safetyPassRate !== null && site.safetyPassRate < 85 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                          {site.safetyPassRate != null ? `${site.safetyPassRate}%` : '—'}
                        </td>
                        <td className={`py-2 px-2 ${site.standardAvgScore !== null && site.standardAvgScore < 80 ? 'text-red-600 font-semibold' : site.standardAvgScore !== null && site.standardAvgScore < 85 ? 'text-amber-600 font-semibold' : 'text-gray-700'}`}>
                          {site.standardAvgScore != null ? `${site.standardAvgScore}%` : '—'}
                        </td>
                        <td className={`py-2 px-2 ${site.openDeficiencies > 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                          {site.openDeficiencies}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-gray-400 mt-2">{drilldownData.rows.length} sites</p>
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

      {/* ── KPI Detail Panel ── */}
      <SlidePanel
        open={!!kpiPanel}
        onClose={closeKpiPanel}
        title={kpiPanel ? `${kpiPanel.title}${kpiPanelData ? ` (${kpiPanelData.length})` : ''}` : ''}
      >
        {kpiPanelLoading ? (
          <LoadingSkeleton rows={8} cols={4} />
        ) : kpiPanelData && kpiPanelData.length > 0 ? (
          <KpiDetailTable type={kpiPanel?.type} data={kpiPanelData} sort={kpiPanelSort} setSort={setKpiPanelSort} />
        ) : (
          <div className="text-sm text-gray-400 py-6 text-center">No records found for selected filters.</div>
        )}
      </SlidePanel>
    </div>
  );
}

// ─── KPI Detail Table ─────────────────────────────────────────────────────────

function KpiDetailTable({ type, data, sort, setSort }) {
  const columns = {
    absences: [
      { key: 'employeeName', label: 'Employee', align: 'left' },
      { key: 'jobName', label: 'Job Name', align: 'left' },
      { key: 'manager', label: 'Manager', align: 'left' },
      { key: 'absenceDate', label: 'Date', align: 'left' },
      { key: 'reason', label: 'Reason', align: 'left' },
      { key: 'hours', label: 'Hours', align: 'right' },
    ],
    deficiencies: [
      { key: 'jobName', label: 'Site', align: 'left' },
      { key: 'area', label: 'Area', align: 'left' },
      { key: 'item', label: 'Item', align: 'left' },
      { key: 'daysOpen', label: 'Days Open', align: 'right' },
      { key: 'manager', label: 'Manager', align: 'left' },
    ],
    belowObj: [
      { key: 'jobName', label: 'Site', align: 'left' },
      { key: 'manager', label: 'Manager', align: 'left' },
      { key: 'avgScore', label: 'Avg Score', align: 'right' },
      { key: 'objective', label: 'Objective', align: 'right' },
      { key: 'belowCount', label: '# Below', align: 'right' },
      { key: 'totalInspections', label: 'Total Insp.', align: 'right' },
    ],
    turnover: [
      { key: 'employeeName', label: 'Employee', align: 'left' },
      { key: 'status', label: 'Status', align: 'left' },
      { key: 'jobName', label: 'Job Name', align: 'left' },
      { key: 'manager', label: 'Manager', align: 'left' },
      { key: 'effectiveDate', label: 'Date', align: 'left' },
    ],
  };

  const cols = columns[type] || [];

  const sorted = useMemo(() => {
    if (!sort.col) return data;
    return [...data].sort((a, b) => {
      let av = a[sort.col], bv = b[sort.col];
      if (av == null) av = '';
      if (bv == null) bv = '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sort]);

  const toggleSort = (col) => {
    setSort(s => ({ col, dir: s.col === col && s.dir === 'desc' ? 'asc' : 'desc' }));
  };

  const formatCell = (row, col) => {
    const val = row[col.key];
    if (val == null || val === '') return '—';
    if (col.key === 'absenceDate' || col.key === 'effectiveDate' || col.key === 'inspectionDate') {
      return new Date(val).toLocaleDateString();
    }
    if (col.key === 'hours') return Number(val).toFixed(1);
    if (col.key === 'avgScore' || col.key === 'objective') return `${val}%`;
    return val;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-gray-200">
            {cols.map(col => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={`${col.align === 'right' ? 'text-right' : 'text-left'} py-2 px-2 font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none whitespace-nowrap`}
              >
                {col.label}
                {sort.col === col.key && (
                  <span className="ml-0.5">{sort.dir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              {cols.map(col => (
                <td
                  key={col.key}
                  className={`py-2 px-2 ${col.align === 'right' ? 'text-right' : ''} ${
                    col.key === 'daysOpen' && row.daysOpen > 90 ? 'text-red-600 font-semibold' :
                    col.key === 'avgScore' && row.avgScore < 80 ? 'text-red-600 font-semibold' :
                    'text-gray-700'
                  }`}
                >
                  {formatCell(row, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Chart Components ─────────────────────────────────────────────────────────

function DeficiencyTrendChart({ weeks }) {
  const labels = weeks.map(w => {
    const d = new Date(w.weekStart);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const colors = weeks.map(w => {
    if (w.deficiencyPct > 5) return 'rgba(239, 68, 68, 0.7)';
    if (w.deficiencyPct > 3) return 'rgba(245, 158, 11, 0.7)';
    return 'rgba(34, 197, 94, 0.7)';
  });

  const data = {
    labels,
    datasets: [{
      label: 'Deficiency %',
      data: weeks.map(w => w.deficiencyPct),
      backgroundColor: colors,
      borderRadius: 3,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const w = weeks[ctx.dataIndex];
            return `${w.deficiencyPct}% (${w.deficientItems}/${w.totalItems})`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: v => `${v}%`, font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      x: {
        ticks: { font: { size: 10 } },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="h-[250px]">
      <Bar data={data} options={options} />
    </div>
  );
}

function DeficiencyByAreaChart({ areas }) {
  const data = {
    labels: areas.map(a => a.area.length > 25 ? a.area.slice(0, 25) + '...' : a.area),
    datasets: [{
      label: 'Deficiency %',
      data: areas.map(a => a.deficiencyPct),
      backgroundColor: areas.map(a => {
        if (a.deficiencyPct > 5) return 'rgba(239, 68, 68, 0.7)';
        if (a.deficiencyPct > 3) return 'rgba(245, 158, 11, 0.7)';
        return 'rgba(34, 197, 94, 0.7)';
      }),
      borderRadius: 3,
    }],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const a = areas[ctx.dataIndex];
            return `${a.deficiencyPct}% (${a.deficientItems}/${a.totalItems})`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { callback: v => `${v}%`, font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      y: {
        ticks: { font: { size: 10 } },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="h-[300px]">
      <Bar data={data} options={options} />
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
