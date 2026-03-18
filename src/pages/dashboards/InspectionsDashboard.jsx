import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import useDashboardData from '../../hooks/useDashboardData';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';

export default function InspectionsDashboard() {
  const today = new Date();
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 90);

  const [filters, setFilters] = useState({
    dateFrom: ninetyDaysAgo.toISOString().slice(0, 10),
    dateTo: today.toISOString().slice(0, 10),
    vp: null,
    manager: null,
    inspectionType: null,
    jobName: null,
    jobNumber: null,
  });
  const [dateDisplay, setDateDisplay] = useState('weekly');
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);

  // Debounced text filters
  const [jobNameInput, setJobNameInput] = useState('');
  const [jobNumberInput, setJobNumberInput] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setFilters(f => ({ ...f, jobName: jobNameInput || null })), 500);
    return () => clearTimeout(t);
  }, [jobNameInput]);

  useEffect(() => {
    const t = setTimeout(() => setFilters(f => ({ ...f, jobNumber: jobNumberInput || null })), 500);
    return () => clearTimeout(t);
  }, [jobNumberInput]);

  const { data, loading, error } = useDashboardData('inspections', filters);

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
    if (selectedJob) items = items.filter(d => d.job_key === selectedJob);
    if (selectedArea) items = items.filter(d => d.area === selectedArea);
    return items;
  }, [data, selectedJob, selectedArea]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-aa-blue animate-spin" /></div>;
  if (error) return <div className="text-center py-20"><div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto"><p className="text-sm text-red-700">{String(error)}</p></div></div>;
  if (!data?.kpis) return <DashboardEmptyState domain="inspections" />;

  const kpis = data.kpis;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Start Date</label>
          <input type="date" value={filters.dateFrom || ''} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue" />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">End Date</label>
          <input type="date" value={filters.dateTo || ''} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue" />
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">VP OPS</label>
          <select value={filters.vp || ''} onChange={e => setFilters(f => ({ ...f, vp: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[120px]">
            <option value="">(All)</option>
            {data.filters?.vpValues?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Manager</label>
          <select value={filters.manager || ''} onChange={e => setFilters(f => ({ ...f, manager: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[160px]">
            <option value="">(All)</option>
            {data.filters?.managerValues?.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-secondary-text mb-1">Inspection Type</label>
          <select value={filters.inspectionType || ''} onChange={e => setFilters(f => ({ ...f, inspectionType: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[160px]">
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
        {(filters.vp || filters.manager || filters.inspectionType || filters.jobName || filters.jobNumber) && (
          <button
            onClick={() => {
              setFilters(f => ({ ...f, vp: null, manager: null, inspectionType: null, jobName: null, jobNumber: null }));
              setJobNameInput('');
              setJobNumberInput('');
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
                    <Cell key={i} fill={i === trendData.length - 1 ? '#DC2626' : '#3B82A0'} />
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
                    style={{
                      width: `${Math.min(r.pct, 100)}%`,
                      backgroundColor: i < 2 ? '#3B82A0' : '#0891B2',
                    }}
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
                    className={`cursor-pointer transition-colors ${selectedJob === r.job_key ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedJob(selectedJob === r.job_key ? null : r.job_key)}
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
              {selectedJob && <span className="ml-2 text-xs text-secondary-text font-normal">(Job: {data.jobDetail?.find(j => j.job_key === selectedJob)?.job_number})</span>}
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
