import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert, AlertTriangle, DollarSign, Wallet, Loader2, FileSearch,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from 'recharts';
import { getSummary, listClaims } from './wcClaimsApi';
import ClaimDetailDrawer from './ClaimDetailDrawer';

const BAR_COLOR = '#009ADE';
const BAR_HIGHLIGHT = '#005F8A';
const RED = '#DC2626';
const GREEN = '#16A34A';

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '$0';
  const num = Number(n);
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function StatusBadge({ value }) {
  if (!value) return <span className="text-secondary-text text-xs">—</span>;
  const v = value.toLowerCase();
  let cls = 'bg-gray-100 text-gray-700';
  if (v.includes('out of work') || v === 'oow') cls = 'bg-red-50 text-red-700 border border-red-200';
  else if (v.includes('light')) cls = 'bg-amber-50 text-amber-700 border border-amber-200';
  else if (v.includes('full duty') || v.includes('returned')) cls = 'bg-green-50 text-green-700 border border-green-200';
  else if (v === 'closed') cls = 'bg-gray-100 text-gray-600';
  else if (v.includes('non-reportable') || v === 'nr') cls = 'bg-gray-100 text-gray-500';
  return <span className={`px-2 py-0.5 text-[11px] font-medium rounded ${cls}`}>{value}</span>;
}

function KPICard({ label, value, icon: Icon, color = '#1B2133', onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`w-full bg-white rounded-lg border p-5 text-left transition-colors ${
        active ? 'border-aa-blue ring-1 ring-aa-blue' : 'border-gray-200 hover:border-aa-blue/40'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-secondary-text uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={18} style={{ color }} />}
      </div>
      <div className="text-3xl font-light text-dark-text tabular-nums">{value}</div>
    </button>
  );
}

export default function ClaimsDashboard() {
  // Applied filters (sent to API) vs pending (UI state)
  const defaultFilters = { vp: null, state: null, year: null, dateFrom: null, dateTo: null };
  const [pending, setPending] = useState(defaultFilters);
  const [filters, setFilters] = useState(defaultFilters);

  // Drill state — selected chart slice / KPI
  const [statusDrill, setStatusDrill] = useState(null); // 'open' | 'oow' | null
  const [yearDrill, setYearDrill] = useState(null);
  const [siteDrill, setSiteDrill] = useState(null);
  const [injuryDrill, setInjuryDrill] = useState(null);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  const [tableRows, setTableRows] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableTotal, setTableTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [drawerClaimId, setDrawerClaimId] = useState(null);

  const isDirty = JSON.stringify(pending) !== JSON.stringify(filters);

  // Load summary whenever applied filters change
  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    setSummaryError(null);
    getSummary(filters)
      .then(d => { if (!cancelled) setSummary(d); })
      .catch(e => { if (!cancelled) setSummaryError(e.message); })
      .finally(() => { if (!cancelled) setSummaryLoading(false); });
    return () => { cancelled = true; };
  }, [filters]);

  // Build the query for the table from applied filters + drill state
  const tableQuery = useMemo(() => {
    const q = { ...filters, page, limit: 50 };
    if (statusDrill === 'open') q.status = 'open';
    if (statusDrill === 'closed') q.status = 'closed';
    if (yearDrill) q.year = yearDrill;
    if (siteDrill) {
      const site = summary?.topSites?.find(s => s.job_name === siteDrill);
      if (site) {
        // Filter by job_name via search since job_name isn't a discrete API filter
        q.search = siteDrill;
      }
    }
    if (injuryDrill) q.injury_cause = injuryDrill;
    return q;
  }, [filters, statusDrill, yearDrill, siteDrill, injuryDrill, page, summary]);

  // Load table rows whenever query changes
  useEffect(() => {
    let cancelled = false;
    setTableLoading(true);
    listClaims(tableQuery)
      .then(d => {
        if (cancelled) return;
        setTableRows(d.claims || []);
        setTableTotal(d.pagination?.total || 0);
      })
      .catch(() => { if (!cancelled) setTableRows([]); })
      .finally(() => { if (!cancelled) setTableLoading(false); });
    return () => { cancelled = true; };
  }, [tableQuery]);

  const applyFilters = useCallback(() => {
    setFilters({ ...pending });
    setPage(1);
    setStatusDrill(null);
    setYearDrill(null);
    setSiteDrill(null);
    setInjuryDrill(null);
  }, [pending]);

  const clearDrills = () => {
    setStatusDrill(null);
    setYearDrill(null);
    setSiteDrill(null);
    setInjuryDrill(null);
    setPage(1);
  };

  const kpis = summary?.kpis;

  if (summaryLoading && !summary) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }
  if (summaryError) {
    return (
      <div className="text-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-sm text-red-700">{summaryError}</p>
        </div>
      </div>
    );
  }
  if (!summary || (kpis?.total_claims || 0) === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
        <ShieldAlert size={32} className="mx-auto mb-3 text-secondary-text" />
        <h3 className="text-base font-medium text-dark-text mb-1">No claim data yet</h3>
        <p className="text-sm text-secondary-text">Once claims are seeded, this dashboard will populate automatically.</p>
      </div>
    );
  }

  const anyDrill = statusDrill || yearDrill || siteDrill || injuryDrill;

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-4 bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Loss Date From</label>
          <input
            type="date"
            value={pending.dateFrom || ''}
            onChange={e => setPending(f => ({ ...f, dateFrom: e.target.value || null }))}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Loss Date To</label>
          <input
            type="date"
            value={pending.dateTo || ''}
            onChange={e => setPending(f => ({ ...f, dateTo: e.target.value || null }))}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">VP</label>
          <select
            value={pending.vp || ''}
            onChange={e => setPending(f => ({ ...f, vp: e.target.value || null }))}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[100px]"
          >
            <option value="">(All)</option>
            {summary.filters?.vpValues?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">State</label>
          <select
            value={pending.state || ''}
            onChange={e => setPending(f => ({ ...f, state: e.target.value || null }))}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[100px]"
          >
            <option value="">(All)</option>
            {summary.filters?.stateValues?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Year</label>
          <select
            value={pending.year || ''}
            onChange={e => setPending(f => ({ ...f, year: e.target.value || null }))}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[100px]"
          >
            <option value="">(All)</option>
            {summary.filters?.yearValues?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button
          onClick={applyFilters}
          disabled={!isDirty}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
            isDirty ? 'bg-aa-blue text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Apply
        </button>
        {(pending.vp || pending.state || pending.year || pending.dateFrom || pending.dateTo) && (
          <button
            onClick={() => {
              setPending(defaultFilters);
              setFilters(defaultFilters);
              clearDrills();
            }}
            className="text-xs text-aa-blue hover:underline pb-1.5"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Open Claims"
          value={kpis.open_count.toLocaleString()}
          icon={ShieldAlert}
          color="#1B2133"
          onClick={() => setStatusDrill(statusDrill === 'open' ? null : 'open')}
          active={statusDrill === 'open'}
        />
        <KPICard
          label="Out of Work"
          value={kpis.oow_count.toLocaleString()}
          icon={AlertTriangle}
          color={kpis.oow_count > 0 ? RED : '#1B2133'}
          onClick={() => setStatusDrill(statusDrill === 'oow' ? null : 'oow')}
          active={statusDrill === 'oow'}
        />
        <KPICard
          label="Total Incurred"
          value={fmtMoney(kpis.total_incurred)}
          icon={DollarSign}
          color="#1B2133"
        />
        <KPICard
          label="Outstanding Reserve"
          value={fmtMoney(kpis.outstanding_reserve)}
          icon={Wallet}
          color="#1B2133"
        />
      </div>

      {/* Charts row 1: Claims by Year + Top Sites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-1">
            Claims by Year
            <span className="ml-1 text-xs font-normal text-secondary-text italic">- Click bar to filter</span>
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary.claimsByYear}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="count"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(data) => setYearDrill(yearDrill === data.year ? null : data.year)}
              >
                {summary.claimsByYear.map((row) => (
                  <Cell key={row.year} fill={yearDrill === row.year ? BAR_HIGHLIGHT : BAR_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-1">
            Top Sites by Claims
            <span className="ml-1 text-xs font-normal text-secondary-text italic">- Click row to filter</span>
          </h3>
          <div className="space-y-2 mt-4 max-h-[260px] overflow-y-auto">
            {summary.topSites.length === 0 && (
              <p className="text-sm text-secondary-text text-center py-4">No site data</p>
            )}
            {summary.topSites.map((s) => {
              const max = summary.topSites[0]?.count || 1;
              const pct = (s.count / max) * 100;
              const active = siteDrill === s.job_name;
              return (
                <button
                  key={s.job_name}
                  onClick={() => setSiteDrill(active ? null : s.job_name)}
                  className={`w-full text-left rounded px-2 py-1 transition-colors ${active ? 'ring-2 ring-aa-blue bg-aa-blue/5' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-dark-text font-medium truncate mr-2 max-w-[200px]">{s.job_name}</span>
                    <span className="text-secondary-text tabular-nums">{s.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: BAR_COLOR }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts row 2: Top Injury Types + Cost Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-1">
            Top Injury Types
            <span className="ml-1 text-xs font-normal text-secondary-text italic">- Click row to filter</span>
          </h3>
          <div className="space-y-2 mt-4 max-h-[260px] overflow-y-auto">
            {summary.topInjuryTypes.map((it) => {
              const max = summary.topInjuryTypes[0]?.count || 1;
              const pct = (it.count / max) * 100;
              const active = injuryDrill === it.name;
              return (
                <button
                  key={it.name}
                  onClick={() => setInjuryDrill(active ? null : it.name)}
                  className={`w-full text-left rounded px-2 py-1 transition-colors ${active ? 'ring-2 ring-aa-blue bg-aa-blue/5' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-dark-text font-medium truncate mr-2 max-w-[220px]">{it.name}</span>
                    <span className="text-secondary-text tabular-nums">{it.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: GREEN }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-4">Cost Trend (Total Incurred by Year)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={summary.claimsByYear}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={fmtMoney} />
              <Tooltip formatter={(v) => fmtMoney(v)} />
              <Line type="monotone" dataKey="incurred" stroke={RED} strokeWidth={2} name="Total Incurred" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Drilled claim table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-dark-text">Claims</h3>
            {statusDrill && <span className="text-xs px-2 py-0.5 rounded bg-aa-blue/10 text-aa-blue">Status: {statusDrill}</span>}
            {yearDrill && <span className="text-xs px-2 py-0.5 rounded bg-aa-blue/10 text-aa-blue">Year: {yearDrill}</span>}
            {siteDrill && <span className="text-xs px-2 py-0.5 rounded bg-aa-blue/10 text-aa-blue">Site: {siteDrill}</span>}
            {injuryDrill && <span className="text-xs px-2 py-0.5 rounded bg-aa-blue/10 text-aa-blue">Injury: {injuryDrill}</span>}
            <span className="text-xs text-secondary-text">({tableTotal.toLocaleString()})</span>
          </div>
          {anyDrill && (
            <button onClick={clearDrills} className="text-xs text-aa-blue hover:underline">Clear drill filters</button>
          )}
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Date of Loss</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Claim #</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Employee</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Job</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">VP</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">State</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Status</th>
                <th className="text-right px-3 py-2 font-medium text-secondary-text text-xs">Total Incurred</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableLoading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center"><Loader2 size={18} className="inline animate-spin text-aa-blue" /></td></tr>
              )}
              {!tableLoading && tableRows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-secondary-text">No claims match the current filters</td></tr>
              )}
              {!tableLoading && tableRows.map(c => (
                <tr
                  key={c.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setDrawerClaimId(c.id)}
                >
                  <td className="px-3 py-2 text-dark-text whitespace-nowrap">{c.date_of_loss || '—'}</td>
                  <td className="px-3 py-2 text-dark-text font-medium whitespace-nowrap">{c.claim_number || '—'}</td>
                  <td className="px-3 py-2 text-dark-text">{c.employee_name || '—'}</td>
                  <td className="px-3 py-2 text-dark-text truncate max-w-[200px]">{c.job_name || '—'}</td>
                  <td className="px-3 py-2 text-dark-text">{c.vp || '—'}</td>
                  <td className="px-3 py-2 text-dark-text">{c.accident_state || '—'}</td>
                  <td className="px-3 py-2"><StatusBadge value={c.work_status || c.ee_status || c.claim_status} /></td>
                  <td className="px-3 py-2 text-right tabular-nums text-dark-text">{fmtMoney(c.total_incurred)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tableTotal > 50 && (
          <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-secondary-text">
            <span>Page {page} · {tableTotal.toLocaleString()} total</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={`px-2 py-1 rounded ${page === 1 ? 'text-gray-300' : 'text-aa-blue hover:bg-aa-blue/10'}`}
              >
                Prev
              </button>
              <button
                disabled={page * 50 >= tableTotal}
                onClick={() => setPage(p => p + 1)}
                className={`px-2 py-1 rounded ${page * 50 >= tableTotal ? 'text-gray-300' : 'text-aa-blue hover:bg-aa-blue/10'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ClaimDetailDrawer
        claimId={drawerClaimId}
        onClose={() => setDrawerClaimId(null)}
      />
    </div>
  );
}
