import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Loader2, RefreshCw } from 'lucide-react';
import { listClaims, getSummary, updateClaim } from './wcClaimsApi';
import ClaimDetailDrawer from './ClaimDetailDrawer';

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '$0';
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
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
  return <span className={`px-2 py-0.5 text-[11px] font-medium rounded whitespace-nowrap ${cls}`}>{value}</span>;
}

export default function ClaimTracker() {
  const [filters, setFilters] = useState({
    status: 'open',
    vp: null,
    state: null,
    year: null,
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterValues, setFilterValues] = useState({ vpValues: [], stateValues: [], yearValues: [] });
  const [drawerClaimId, setDrawerClaimId] = useState(null);
  const [drawerNew, setDrawerNew] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Inline cost editing for non-reportable rows.
  // editingCost = { id, value } when a cell is open; null otherwise.
  const [editingCost, setEditingCost] = useState(null);
  const [savingCost, setSavingCost] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput }));
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load filter dropdown values once (from /summary)
  useEffect(() => {
    getSummary({}).then(d => setFilterValues(d.filters || { vpValues: [], stateValues: [], yearValues: [] })).catch(() => {});
  }, []);

  // Load claims whenever filters/page/refreshKey changes
  const query = useMemo(() => ({
    ...filters,
    page,
    limit: 100,
  }), [filters, page]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listClaims(query)
      .then(d => {
        if (cancelled) return;
        setRows(d.claims || []);
        setTotal(d.pagination?.total || 0);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, refreshKey]);

  const updateFilter = useCallback((key, value) => {
    setFilters(f => ({ ...f, [key]: value || null }));
    setPage(1);
  }, []);

  const handleClaimSaved = () => {
    setRefreshKey(k => k + 1);
    setDrawerNew(false);
  };

  // Save inline-edited manual_cost. We patch the row in local state on success
  // so the UI doesn't have to wait for a full refetch.
  const saveManualCost = async (claim) => {
    if (!editingCost || editingCost.id !== claim.id) return;
    const raw = editingCost.value;
    const next = raw === '' || raw == null ? null : Number(raw);
    if (Number(claim.manual_cost || 0) === Number(next || 0)) {
      setEditingCost(null);
      return;
    }
    setSavingCost(true);
    try {
      const { claim: updated } = await updateClaim(claim.id, { manual_cost: next });
      setRows(rs => rs.map(r => (r.id === claim.id ? { ...r, manual_cost: updated.manual_cost } : r)));
      setEditingCost(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingCost(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Status</label>
          <select
            value={filters.status || ''}
            onChange={e => updateFilter('status', e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
          >
            <option value="">(All)</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="non-reportable">Non-Reportable</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">VP</label>
          <select
            value={filters.vp || ''}
            onChange={e => updateFilter('vp', e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[100px]"
          >
            <option value="">(All)</option>
            {filterValues.vpValues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">State</label>
          <select
            value={filters.state || ''}
            onChange={e => updateFilter('state', e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[100px]"
          >
            <option value="">(All)</option>
            {filterValues.stateValues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Year</label>
          <select
            value={filters.year || ''}
            onChange={e => updateFilter('year', e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[90px]"
          >
            <option value="">(All)</option>
            {filterValues.yearValues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-secondary-text mb-1">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary-text" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Name, claim #, job…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
            />
          </div>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          title="Refresh"
          className="px-2 py-1.5 text-secondary-text hover:text-aa-blue"
        >
          <RefreshCw size={16} />
        </button>
        <button
          onClick={() => setDrawerNew(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-aa-blue rounded-lg hover:bg-blue-700"
        >
          <Plus size={14} />
          Add New Claim
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-260px)] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs whitespace-nowrap">Date of Loss</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs whitespace-nowrap">Claim #</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Employee</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Job Name</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">VP</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">State</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Status</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs whitespace-nowrap">RTW Date</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Body Part</th>
                <th className="text-right px-3 py-2 font-medium text-secondary-text text-xs whitespace-nowrap">Total Incurred</th>
                <th className="text-right px-3 py-2 font-medium text-secondary-text text-xs whitespace-nowrap">Cost (NR)</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Case Manager</th>
                <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Claim Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={13} className="px-4 py-10 text-center"><Loader2 size={20} className="inline animate-spin text-aa-blue" /></td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={13} className="px-4 py-6 text-center"><span className="text-red-600 text-sm">{error}</span></td></tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr><td colSpan={13} className="px-4 py-10 text-center text-secondary-text">No claims match the current filters</td></tr>
              )}
              {!loading && rows.map(c => (
                <tr
                  key={c.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setDrawerClaimId(c.id)}
                >
                  <td className="px-3 py-2 text-dark-text whitespace-nowrap">{c.date_of_loss || '—'}</td>
                  <td className="px-3 py-2 text-dark-text font-medium whitespace-nowrap">{c.claim_number || '—'}</td>
                  <td className="px-3 py-2 text-dark-text">{c.employee_name || '—'}</td>
                  <td className="px-3 py-2 text-dark-text truncate max-w-[180px]">{c.job_name || '—'}</td>
                  <td className="px-3 py-2 text-dark-text">{c.vp || '—'}</td>
                  <td className="px-3 py-2 text-dark-text">{c.accident_state || '—'}</td>
                  <td className="px-3 py-2"><StatusBadge value={c.work_status || c.ee_status || c.claim_status} /></td>
                  <td className="px-3 py-2 text-dark-text whitespace-nowrap">{c.rtw_date || '—'}</td>
                  <td className="px-3 py-2 text-dark-text">{c.part_of_body || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-dark-text whitespace-nowrap">{fmtMoney(c.total_incurred)}</td>
                  <td
                    className="px-3 py-2 text-right tabular-nums text-dark-text whitespace-nowrap"
                    onClick={(e) => {
                      // Only non-reportable rows are editable; clicking
                      // anywhere else should still open the drawer.
                      if (c.claim_status !== 'Non-Reportable') return;
                      e.stopPropagation();
                      if (editingCost?.id !== c.id) {
                        setEditingCost({ id: c.id, value: c.manual_cost ?? '' });
                      }
                    }}
                  >
                    {c.claim_status !== 'Non-Reportable' ? (
                      <span className="text-secondary-text">—</span>
                    ) : editingCost?.id === c.id ? (
                      <input
                        type="number"
                        step="0.01"
                        autoFocus
                        disabled={savingCost}
                        value={editingCost.value}
                        onChange={(e) => setEditingCost({ id: c.id, value: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => saveManualCost(c)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); saveManualCost(c); }
                          if (e.key === 'Escape') { e.preventDefault(); setEditingCost(null); }
                        }}
                        className="w-24 px-2 py-1 text-sm text-right tabular-nums border border-aa-blue rounded focus:outline-none"
                      />
                    ) : (
                      <span className="cursor-text px-2 py-1 rounded hover:bg-aa-blue/10">
                        {c.manual_cost != null && c.manual_cost !== '' ? fmtMoney(c.manual_cost) : <span className="text-secondary-text/60 italic">add</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-dark-text truncate max-w-[140px]">{c.case_manager || '—'}</td>
                  <td className="px-3 py-2 text-dark-text truncate max-w-[160px]">{c.claim_stage || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 100 && (
          <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-secondary-text">
            <span>Page {page} · {total.toLocaleString()} total</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={`px-2 py-1 rounded ${page === 1 ? 'text-gray-300' : 'text-aa-blue hover:bg-aa-blue/10'}`}
              >
                Prev
              </button>
              <button
                disabled={page * 100 >= total}
                onClick={() => setPage(p => p + 1)}
                className={`px-2 py-1 rounded ${page * 100 >= total ? 'text-gray-300' : 'text-aa-blue hover:bg-aa-blue/10'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ClaimDetailDrawer
        claimId={drawerClaimId}
        isNew={drawerNew}
        onClose={() => { setDrawerClaimId(null); setDrawerNew(false); }}
        onSaved={handleClaimSaved}
      />
    </div>
  );
}
