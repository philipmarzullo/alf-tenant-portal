import { useState, useEffect, useMemo } from 'react';
import {
  Loader2, DollarSign, Search,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { getFreshToken } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';
import SlidePanel from '../../components/layout/SlidePanel';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

const TABS = [
  { key: 'gl', label: 'GL Distribution' },
  { key: 'payroll', label: 'Payroll Actuals' },
  { key: 'stale', label: 'Stale Budgets' },
  { key: 'cards', label: 'Card Charges' },
  { key: 'explorer', label: 'Job Cost Explorer' },
];

function fmt(n) {
  if (n == null) return '—';
  return '$' + Math.round(n).toLocaleString();
}
function fmtPct(n) {
  if (n == null) return '—';
  return n.toFixed(1) + '%';
}
function fmtNum(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

export default function FinanceAudit() {
  const { tenantId } = useTenantId();

  // Filters
  const [vps, setVps] = useState([]);
  const [selectedVp, setSelectedVp] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Tab
  const [activeTab, setActiveTab] = useState('gl');

  // Data
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Slide-out panel
  const [panel, setPanel] = useState(null); // { glAccountNumber, glDescription }
  const [panelData, setPanelData] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);

  // Job drill-down (inline expand in panel)
  const [expandedJob, setExpandedJob] = useState(null); // jobNumber
  const [jobEntries, setJobEntries] = useState([]);
  const [jobEntriesLoading, setJobEntriesLoading] = useState(false);

  // Job Cost Explorer
  const [jobSearch, setJobSearch] = useState('');
  const [explorerData, setExplorerData] = useState(null);
  const [explorerLoading, setExplorerLoading] = useState(false);

  // Default date range: last 12 months
  useEffect(() => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
    setStartDate(start);
    setEndDate(end);
  }, []);

  // Load filter options
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      setFiltersLoading(true);
      try {
        const token = await getFreshToken();
        const res = await fetch(`${BACKEND_URL}/api/finance-workspace/${tenantId}/filter-options`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load filters');
        const d = await res.json();
        setVps(d.vps || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setFiltersLoading(false);
      }
    })();
  }, [tenantId]);

  // Fetch data for active tab
  async function fetchTabData() {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const token = await getFreshToken();
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (selectedVp !== 'all') params.set('vp', selectedVp);

      let endpoint;
      if (activeTab === 'gl') endpoint = 'gl-distribution';
      else if (activeTab === 'payroll') endpoint = 'payroll-actuals';
      else if (activeTab === 'stale') endpoint = 'stale-budgets';
      else if (activeTab === 'cards') endpoint = 'card-charges';
      else return; // explorer uses its own flow

      const res = await fetch(`${BACKEND_URL}/api/finance-workspace/${tenantId}/${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load data');
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (activeTab === 'explorer') return;
    fetchTabData();
  }

  // Auto-fetch on tab change if we have date params
  useEffect(() => {
    if (activeTab === 'explorer') return;
    if (startDate && endDate) fetchTabData();
  }, [activeTab]);

  // Panel: fetch account entries
  async function openPanel(glAccountNumber, glDescription) {
    setPanel({ glAccountNumber, glDescription });
    setPanelLoading(true);
    setPanelData(null);
    setExpandedJob(null);
    setJobEntries([]);

    try {
      const token = await getFreshToken();
      const params = new URLSearchParams();
      params.set('glAccountNumber', glAccountNumber);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (selectedVp !== 'all') params.set('vp', selectedVp);

      const res = await fetch(`${BACKEND_URL}/api/finance-workspace/${tenantId}/account-entries?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load account entries');
      setPanelData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setPanelLoading(false);
    }
  }

  // Job drill-down
  async function toggleJobExpand(jobNumber) {
    if (expandedJob === jobNumber) {
      setExpandedJob(null);
      setJobEntries([]);
      return;
    }
    setExpandedJob(jobNumber);
    setJobEntriesLoading(true);
    setJobEntries([]);

    try {
      const token = await getFreshToken();
      const params = new URLSearchParams();
      params.set('jobNumber', jobNumber);
      if (panel?.glAccountNumber) params.set('glAccountNumber', panel.glAccountNumber);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`${BACKEND_URL}/api/finance-workspace/${tenantId}/job-entries?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load job entries');
      const d = await res.json();
      setJobEntries(d.rows || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setJobEntriesLoading(false);
    }
  }

  // Job Cost Explorer search
  async function searchJobCosts() {
    if (!jobSearch.trim()) return;
    setExplorerLoading(true);
    setExplorerData(null);
    setError(null);

    try {
      const token = await getFreshToken();
      const params = new URLSearchParams();
      params.set('jobSearch', jobSearch.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`${BACKEND_URL}/api/finance-workspace/${tenantId}/account-entries?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to search job costs');
      setExplorerData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setExplorerLoading(false);
    }
  }

  // Group explorer data by GL account
  const explorerGrouped = useMemo(() => {
    if (!explorerData?.rows) return [];
    const groups = {};
    for (const r of explorerData.rows) {
      const key = r.glAccountNumber;
      if (!groups[key]) groups[key] = { glAccountNumber: key, glDescription: r.glDescription, rows: [], total: 0 };
      groups[key].rows.push(r);
      groups[key].total += r.totalAmount;
    }
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [explorerData]);

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">VP</label>
          <select
            value={selectedVp}
            onChange={e => setSelectedVp(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white"
          >
            <option value="all">All VPs</option>
            {vps.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5"
          />
        </div>
        <button
          onClick={handleApply}
          disabled={loading || filtersLoading}
          className="px-4 py-1.5 bg-aa-blue text-white text-sm font-medium rounded-md hover:bg-aa-blue/90 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Apply'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? 'border-aa-blue text-aa-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tab content */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {activeTab === 'gl' && <GLDistribution data={data} loading={loading} onRowClick={openPanel} />}
        {activeTab === 'payroll' && <PayrollActuals data={data} loading={loading} />}
        {activeTab === 'stale' && <StaleBudgets data={data} loading={loading} />}
        {activeTab === 'cards' && <CardCharges data={data} loading={loading} />}
        {activeTab === 'explorer' && (
          <JobCostExplorer
            jobSearch={jobSearch}
            setJobSearch={setJobSearch}
            onSearch={searchJobCosts}
            data={explorerGrouped}
            loading={explorerLoading}
          />
        )}
      </div>

      {/* Slide-out panel for GL drill-down */}
      <SlidePanel
        open={!!panel}
        onClose={() => { setPanel(null); setPanelData(null); setExpandedJob(null); }}
        title={panel ? `${panel.glAccountNumber} — ${panel.glDescription}` : ''}
      >
        {panelLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
        ) : panelData?.rows?.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No entries found.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-3">
              {panelData?.rows?.length} job{panelData?.rows?.length !== 1 ? 's' : ''} &middot; Total: {fmt(panelData?.accountTotal)}
            </p>
            {panelData?.rows?.map(r => {
              const concentrated = r.pctOfAccount > 30;
              const isExpanded = expandedJob === r.jobNumber;
              return (
                <div key={r.jobNumber + r.glAccountNumber} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleJobExpand(r.jobNumber)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-gray-50 transition-colors ${concentrated ? 'bg-amber-50' : ''}`}
                  >
                    {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-dark-text truncate">{r.jobName}</span>
                        {concentrated && (
                          <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Concentrated</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{r.jobNumber} &middot; {r.vp}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-medium">{fmt(r.totalAmount)}</div>
                      <div className="text-xs text-gray-500">{fmtPct(r.pctOfAccount)}</div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
                      {jobEntriesLoading ? (
                        <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-gray-400" /></div>
                      ) : jobEntries.length === 0 ? (
                        <p className="text-xs text-gray-500 py-2">No line items.</p>
                      ) : (
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {jobEntries.map((e, i) => (
                            <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                              <div className="min-w-0 flex-1">
                                <span className="text-gray-600">{e.entryDate?.slice(0, 10)}</span>
                                {e.description && <span className="text-gray-500 ml-2">{e.description}</span>}
                              </div>
                              <span className="font-medium ml-2 shrink-0">{fmt(e.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SlidePanel>
    </div>
  );
}

// ─── Tab: GL Distribution ───────────────────────────────────────────────────

function GLDistribution({ data, loading, onRowClick }) {
  if (loading) return <LoadingState />;
  if (!data) return <EmptyPrompt />;
  if (data.rows?.length === 0) return <NoData />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-3">GL Account #</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3 text-right">Entry Count</th>
            <th className="px-4 py-3 text-right">Total Amount</th>
            <th className="px-4 py-3 text-right">% of Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.rows.map(r => {
            const is4090 = r.glAccountNumber === '4090';
            return (
              <tr
                key={r.glAccountNumber}
                onClick={() => onRowClick(r.glAccountNumber, r.glDescription)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                  {r.glAccountNumber}
                  {is4090 && <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Review</span>}
                </td>
                <td className="px-4 py-2.5 text-gray-600">{r.glDescription}</td>
                <td className="px-4 py-2.5 text-right">{fmtNum(r.entryCount)}</td>
                <td className="px-4 py-2.5 text-right font-medium">{fmt(r.totalAmount)}</td>
                <td className="px-4 py-2.5 text-right text-gray-500">{fmtPct(r.pctOfTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Payroll Actuals ───────────────────────────────────────────────────

function PayrollActuals({ data, loading }) {
  if (loading) return <LoadingState />;
  if (!data) return <EmptyPrompt />;
  if (data.rows?.length === 0) return <NoData />;

  const { summary } = data;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <th className="px-4 py-3">Job Name</th>
            <th className="px-4 py-3">VP</th>
            <th className="px-4 py-3">Manager</th>
            <th className="px-4 py-3 text-right">Total Payroll</th>
            <th className="px-4 py-3 text-right">Regular Pay</th>
            <th className="px-4 py-3 text-right">OT Pay</th>
            <th className="px-4 py-3 text-right">Total Hours</th>
            <th className="px-4 py-3 text-right">OT %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {/* Summary row */}
          <tr className="bg-gray-50 font-semibold">
            <td className="px-4 py-2.5">All Jobs (Summary)</td>
            <td className="px-4 py-2.5" />
            <td className="px-4 py-2.5" />
            <td className="px-4 py-2.5 text-right">{fmt(summary.totalPayroll)}</td>
            <td className="px-4 py-2.5 text-right">{fmt(summary.regularPay)}</td>
            <td className="px-4 py-2.5 text-right">{fmt(summary.otPay)}</td>
            <td className="px-4 py-2.5 text-right">{fmtNum(summary.totalHours)}</td>
            <td className={`px-4 py-2.5 text-right ${otColor(summary.otPct)}`}>{fmtPct(summary.otPct)}</td>
          </tr>
          {data.rows.map(r => (
            <tr key={r.jobNumber} className="hover:bg-gray-50">
              <td className="px-4 py-2.5 font-medium">{r.jobName}</td>
              <td className="px-4 py-2.5 text-gray-600">{r.vp}</td>
              <td className="px-4 py-2.5 text-gray-600">{r.manager}</td>
              <td className="px-4 py-2.5 text-right">{fmt(r.totalPayroll)}</td>
              <td className="px-4 py-2.5 text-right">{fmt(r.regularPay)}</td>
              <td className="px-4 py-2.5 text-right">{fmt(r.otPay)}</td>
              <td className="px-4 py-2.5 text-right">{fmtNum(r.totalHours)}</td>
              <td className={`px-4 py-2.5 text-right font-medium ${otColor(r.otPct)}`}>{fmtPct(r.otPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function otColor(pct) {
  if (pct > 15) return 'bg-red-50 text-red-700';
  if (pct > 10) return 'bg-amber-50 text-amber-700';
  return '';
}

// ─── Tab: Stale Budgets ─────────────────────────────────────────────────────

function StaleBudgets({ data, loading }) {
  if (loading) return <LoadingState />;
  if (!data) return <EmptyPrompt />;
  if (data.rows?.length === 0) return <NoData label="No stale budgets found." />;

  return (
    <div>
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 text-sm text-amber-800 font-medium">
        {data.summary.staleJobCount} active job{data.summary.staleJobCount !== 1 ? 's' : ''} with budgets not updated in 12+ months
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Job Name</th>
              <th className="px-4 py-3">VP</th>
              <th className="px-4 py-3">Manager</th>
              <th className="px-4 py-3">Last Budget Date</th>
              <th className="px-4 py-3 text-right">Days Stale</th>
              <th className="px-4 py-3 text-right">Budget Amount</th>
              <th className="px-4 py-3 text-right">Actual Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.rows.map(r => (
              <tr key={r.jobNumber} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium">{r.jobName}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.vp}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.manager}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.lastBudgetDate?.slice(0, 10)}</td>
                <td className={`px-4 py-2.5 text-right font-medium ${staleColor(r.daysStale)}`}>{r.daysStale}</td>
                <td className="px-4 py-2.5 text-right">{fmt(r.budgetAmount)}</td>
                <td className="px-4 py-2.5 text-right">{fmt(r.actualAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function staleColor(days) {
  if (days > 730) return 'bg-red-50 text-red-700';
  if (days > 365) return 'bg-amber-50 text-amber-700';
  return '';
}

// ─── Tab: Card Charges ──────────────────────────────────────────────────────

function CardCharges({ data, loading }) {
  if (loading) return <LoadingState />;
  if (!data) return <EmptyPrompt />;
  if (data.rows?.length === 0) return <NoData label="No card charges found." />;

  return (
    <div>
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-700">
        Total: {fmt(data.summary.totalCharges)} &middot; {data.summary.distinctAccountCount} GL account{data.summary.distinctAccountCount !== 1 ? 's' : ''}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Job Name</th>
              <th className="px-4 py-3">VP</th>
              <th className="px-4 py-3">GL Account #</th>
              <th className="px-4 py-3">GL Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Entered By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-600">{r.entryDate?.slice(0, 10)}</td>
                <td className="px-4 py-2.5 font-medium">{r.jobName}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.vp}</td>
                <td className="px-4 py-2.5">{r.glAccountNumber}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.glDescription}</td>
                <td className="px-4 py-2.5 text-right font-medium">{fmt(r.amount)}</td>
                <td className="px-4 py-2.5 text-gray-600 truncate max-w-[200px]">{r.vendor}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.enteredBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Job Cost Explorer ─────────────────────────────────────────────────

function JobCostExplorer({ jobSearch, setJobSearch, onSearch, data, loading }) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={jobSearch}
            onChange={e => setJobSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            placeholder="Search by job name or number..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md"
          />
        </div>
        <button
          onClick={onSearch}
          disabled={loading || !jobSearch.trim()}
          className="px-4 py-2 bg-aa-blue text-white text-sm font-medium rounded-md hover:bg-aa-blue/90 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
        </button>
      </div>

      {loading && <LoadingState />}

      {!loading && data.length === 0 && jobSearch && (
        <p className="text-sm text-gray-500 text-center py-8">No results. Try a different search term.</p>
      )}

      {!loading && data.length > 0 && (
        <div className="space-y-4">
          {data.map(group => (
            <div key={group.glAccountNumber} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-dark-text">{group.glAccountNumber}</span>
                  <span className="text-sm text-gray-500 ml-2">{group.glDescription}</span>
                </div>
                <span className="text-sm font-semibold">{fmt(group.total)}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {group.rows.map((r, i) => (
                  <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{r.jobName}</span>
                      <span className="text-gray-500 ml-2 text-xs">{r.jobNumber}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{fmt(r.totalAmount)}</span>
                      <span className="text-gray-500 ml-2 text-xs">{r.entryCount} entries</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 size={24} className="animate-spin text-gray-400" />
    </div>
  );
}

function EmptyPrompt() {
  return (
    <div className="text-center py-16">
      <DollarSign size={32} className="mx-auto text-gray-300 mb-3" />
      <p className="text-sm text-gray-500">Click "Apply" to load data for the selected filters.</p>
    </div>
  );
}

function NoData({ label = 'No data found for the selected filters.' }) {
  return (
    <p className="text-sm text-gray-500 text-center py-16">{label}</p>
  );
}
