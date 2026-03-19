import { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import useDashboardData from '../../hooks/useDashboardData';
import { useDashboardDataContext } from '../../contexts/DashboardDataContext';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';

const BAR_COLOR = '#00AEEF';
const BAR_LATEST = '#005F8A';

export default function InspectionsDashboard() {
  const today = new Date();
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 90);

  const defaultFilters = {
    dateFrom: ninetyDaysAgo.toISOString().slice(0, 10),
    dateTo: today.toISOString().slice(0, 10),
    vp: null,
    manager: null,
    inspectionType: null,
    jobName: null,
    jobNumber: null,
  };

  // Applied filters (sent to API) vs pending filters (UI state)
  const [filters, setFilters] = useState(defaultFilters);
  const [pending, setPending] = useState(defaultFilters);

  const [dateDisplay, setDateDisplay] = useState('weekly');
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);

  // Text inputs with debounce
  const [jobNameInput, setJobNameInput] = useState('');
  const [jobNumberInput, setJobNumberInput] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setPending(f => ({ ...f, jobName: jobNameInput || null })), 500);
    return () => clearTimeout(t);
  }, [jobNameInput]);

  useEffect(() => {
    const t = setTimeout(() => setPending(f => ({ ...f, jobNumber: jobNumberInput || null })), 500);
    return () => clearTimeout(t);
  }, [jobNumberInput]);

  const isDirty = JSON.stringify(pending) !== JSON.stringify(filters);

  const applyFilters = useCallback(() => {
    setFilters({ ...pending });
    setSelectedJob(null);
    setSelectedArea(null);
  }, [pending]);

  const { data, loading, error } = useDashboardData('inspections', filters);
  const { setDashboardData } = useDashboardDataContext();

  // Push data summary to layout for analytics agent context
  useEffect(() => {
    if (!data?.kpis) return;
    const kpis = {
      inspections: data.kpis.inspections ?? data.kpis.inspection_count ?? 0,
      items: data.kpis.items ?? data.kpis.touchpoint_count ?? 0,
      items_deficient_pct: data.kpis.items_deficient_pct ?? data.kpis.deficiency_pct ?? 0,
    };
    const highlights = [];
    if (data.deficiencyByArea?.length) {
      const top = data.deficiencyByArea.slice(0, 3);
      highlights.push(`Top deficient areas: ${top.map(a => `${a.area} (${a.pct.toFixed(1)}%)`).join(', ')}`);
    }
    if (data.jobDetail?.length) {
      const worst = data.jobDetail.slice(0, 3);
      highlights.push(`Jobs with most deficiencies: ${worst.map(j => `${j.job_name} (${j.pct_deficient}%)`).join(', ')}`);
    }
    if (data.daysSince?.length) {
      const stale = data.daysSince.filter(r => r.days > 90);
      if (stale.length) highlights.push(`${stale.length} jobs not inspected in 90+ days`);
    }
    const sections = {};
    if (data.jobDetail?.length) {
      sections['Job Detail'] = data.jobDetail.slice(0, 10).map(j =>
        `${j.job_number} ${j.job_name}: ${j.total_items} items, ${j.pct_deficient}% deficient`
      );
    }
    if (data.deficiencyByArea?.length) {
      sections['Deficiency by Area'] = data.deficiencyByArea.map(a => `${a.area}: ${a.pct.toFixed(2)}%`);
    }
    setDashboardData({ domain: 'inspections', data: { kpis, highlights, sections }, filters });
  }, [data, filters, setDashboardData]);

  // VP → Manager cascade: filter manager dropdown by selected VP
  const filteredManagerValues = useMemo(() => {
    if (!data?.filters) return [];
    if (!pending.vp) return data.filters.managerValues || [];
    const pairs = data.filters.vpManagerPairs || [];
    return [...new Set(pairs.filter(p => p.vp === pending.vp).map(p => p.manager))].sort();
  }, [data?.filters, pending.vp]);

  const trendData = useMemo(() => {
    if (!data) return [];
    const src = dateDisplay === 'weekly' ? data.weeklyTrend : data.monthlyTrend;
    if (!src) return [];
    return src.map(r => ({
      period: new Date(r.period).toLocaleDateString('en-US',
        dateDisplay === 'weekly'
          ? { month: 'short', day: 'numeric' }
          : { month: 'short', year: '2-digit' }
      ),
      pct: r.pct,
    }));
  }, [data, dateDisplay]);

  const filteredDeficiencyDetail = useMemo(() => {
    if (!data?.deficiencyDetail) return [];
    let items = data.deficiencyDetail;
    if (selectedJob) items = items.filter(d => String(d.job_key) === String(selectedJob));
    if (selectedArea) items = items.filter(d => d.area === selectedArea);
    return items;
  }, [data, selectedJob, selectedArea]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-aa-blue animate-spin" /></div>;
  if (error) return <div className="text-center py-20"><div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto"><p className="text-sm text-red-700">{String(error)}</p></div></div>;
  if (!data?.kpis) return <DashboardEmptyState domain="inspections" />;

  const kpis = {
    inspections: data.kpis.inspections ?? data.kpis.inspection_count ?? 0,
    items: data.kpis.items ?? data.kpis.touchpoint_count ?? 0,
    items_deficient_pct: data.kpis.items_deficient_pct ?? data.kpis.deficiency_pct ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Start Date</label>
          <input type="date" value={pending.dateFrom || ''} onChange={e => setPending(f => ({ ...f, dateFrom: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue" />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">End Date</label>
          <input type="date" value={pending.dateTo || ''} onChange={e => setPending(f => ({ ...f, dateTo: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue" />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">VP OPS</label>
          <select value={pending.vp || ''} onChange={e => setPending(f => ({ ...f, vp: e.target.value || null, manager: null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[120px]">
            <option value="">(All)</option>
            {data.filters?.vpValues?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Manager</label>
          <select value={pending.manager || ''} onChange={e => setPending(f => ({ ...f, manager: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[160px]">
            <option value="">(All)</option>
            {filteredManagerValues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Inspection Type</label>
          <select value={pending.inspectionType || ''} onChange={e => setPending(f => ({ ...f, inspectionType: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[160px]">
            <option value="">(All)</option>
            {data.filters?.inspectionTypes?.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Job Name</label>
          <input type="text" value={jobNameInput} onChange={e => setJobNameInput(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue w-[140px]" />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Job Number</label>
          <input type="text" value={jobNumberInput} onChange={e => setJobNumberInput(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue w-[120px]" />
        </div>
        <button
          onClick={applyFilters}
          disabled={!isDirty}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${isDirty ? 'bg-aa-blue text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
        >
          Apply
        </button>
        {(pending.vp || pending.manager || pending.inspectionType || pending.jobName || pending.jobNumber) && (
          <button
            onClick={() => {
              const cleared = { ...pending, vp: null, manager: null, inspectionType: null, jobName: null, jobNumber: null };
              setPending(cleared);
              setFilters(cleared);
              setJobNameInput('');
              setJobNumberInput('');
              setSelectedJob(null);
              setSelectedArea(null);
            }}
            className="text-xs text-aa-blue hover:underline pb-1.5"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* KPI Cards + Days Since Last Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
          <p className="text-xs font-medium text-secondary-text mb-1">Inspections</p>
          <p className="text-3xl font-bold text-dark-text">{kpis.inspections.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
          <p className="text-xs font-medium text-secondary-text mb-1">Items</p>
          <p className="text-3xl font-bold text-dark-text">{kpis.items.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
          <p className="text-xs font-medium text-secondary-text mb-1">Items Deficient</p>
          <p className="text-3xl font-bold text-dark-text">{kpis.items_deficient_pct}%</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-dark-text">Days Since Last Inspection</h3>
          </div>
          <div className="overflow-y-auto max-h-[200px]">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                {data.daysSince?.slice(0, 10).map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-1.5 text-secondary-text tabular-nums">{r.job_number}</td>
                    <td className="px-3 py-1.5 text-dark-text truncate max-w-[140px]">{r.job_name}</td>
                    <td className={`px-3 py-1.5 text-right font-medium tabular-nums ${r.days > 180 ? 'text-red-600' : r.days > 90 ? 'text-amber-600' : 'text-dark-text'}`}>{r.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Deficiency Trend + Deficiency % by Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-dark-text">Deficiency Trend</h3>
            <div className="flex items-center gap-2">
              <label className="text-xs text-secondary-text">Date Display</label>
              <select value={dateDisplay} onChange={e => setDateDisplay(e.target.value)} className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-aa-blue">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v) => [`${v}%`, 'Deficiency %']} />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {trendData.map((_, i) => (
                    <Cell key={i} fill={i === trendData.length - 1 ? BAR_LATEST : BAR_COLOR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-secondary-text text-sm">No trend data</div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-1">
            Deficiency % by Area
            <span className="ml-1 text-xs font-normal text-secondary-text italic">- Click to Filter</span>
          </h3>
          <div className="space-y-3 mt-4">
            {data.deficiencyByArea?.length > 0 ? data.deficiencyByArea.map((r, i) => (
              <div
                key={i}
                className={`cursor-pointer rounded px-1 py-0.5 transition-colors ${selectedArea === r.area ? 'ring-2 ring-aa-blue' : 'hover:bg-gray-50'}`}
                onClick={() => setSelectedArea(selectedArea === r.area ? null : r.area)}
              >
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-dark-text font-medium truncate mr-2">{r.area}</span>
                  <span className="text-secondary-text tabular-nums">{r.pct.toFixed(2)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4">
                  <div
                    className="h-4 rounded-full"
                    style={{ width: `${Math.min(r.pct, 100)}%`, backgroundColor: BAR_COLOR }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-sm text-secondary-text text-center py-4">No deficiency data</p>
            )}
          </div>
          {selectedArea && (
            <button onClick={() => setSelectedArea(null)} className="text-xs text-aa-blue hover:underline mt-3">Clear area filter</button>
          )}
        </div>
      </div>

      {/* Job Detail + Deficiency Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-dark-text">
              Job Detail
              <span className="ml-1 text-xs font-normal text-secondary-text italic">- Click to Filter</span>
            </h3>
            {selectedJob && (
              <button onClick={() => setSelectedJob(null)} className="text-xs text-aa-blue hover:underline">Show all</button>
            )}
          </div>
          <div className="overflow-y-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Job Number</th>
                  <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Job Name</th>
                  <th className="text-right px-3 py-2 font-medium text-secondary-text text-xs">Total Items</th>
                  <th className="text-right px-3 py-2 font-medium text-secondary-text text-xs">Items Deficient</th>
                  <th className="text-right px-3 py-2 font-medium text-secondary-text text-xs">% of Items Deficient</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.jobDetail?.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-secondary-text">No jobs found</td></tr>
                ) : data.jobDetail?.map(r => (
                  <tr
                    key={r.job_key}
                    className={`cursor-pointer transition-colors ${String(selectedJob) === String(r.job_key) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedJob(String(selectedJob) === String(r.job_key) ? null : r.job_key)}
                  >
                    <td className="px-3 py-2 text-dark-text tabular-nums">{r.job_number}</td>
                    <td className="px-3 py-2 text-dark-text truncate max-w-[160px]">{r.job_name}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-dark-text">{r.total_items.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-dark-text">{r.items_deficient.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-dark-text">{r.pct_deficient}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-dark-text">
              Deficiency Detail
              {selectedJob && <span className="ml-2 text-xs text-secondary-text font-normal">(Job: {data.jobDetail?.find(j => String(j.job_key) === String(selectedJob))?.job_number})</span>}
              {selectedArea && <span className="ml-2 text-xs text-secondary-text font-normal">(Area: {selectedArea})</span>}
            </h3>
            {(selectedJob || selectedArea) && (
              <button onClick={() => { setSelectedJob(null); setSelectedArea(null); }} className="text-xs text-aa-blue hover:underline">Show all</button>
            )}
          </div>
          <div className="overflow-y-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Checkpoint Id</th>
                  <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Area Description</th>
                  <th className="text-left px-3 py-2 font-medium text-secondary-text text-xs">Result Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDeficiencyDetail.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-secondary-text">No deficiencies found</td></tr>
                ) : filteredDeficiencyDetail.slice(0, 200).map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-dark-text tabular-nums">{d.checkpoint_id}</td>
                    <td className="px-3 py-2 text-dark-text">{d.area || '—'}</td>
                    <td className="px-3 py-2 text-secondary-text max-w-xs truncate">{d.result_notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
