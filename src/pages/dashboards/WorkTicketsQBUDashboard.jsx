import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import useDashboardData from '../../hooks/useDashboardData';
import DashboardEmptyState from '../../components/dashboards/DashboardEmptyState';

export default function WorkTicketsQBUDashboard() {
  const [filters, setFilters] = useState({ dateFrom: '2025-01-01', dateTo: '2025-12-31', jobIds: null, ticketType: null });
  const { data, loading, error } = useDashboardData('work-tickets-qbu', filters);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-aa-blue animate-spin" /></div>;
  if (error) return <div className="text-center py-20"><div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto"><p className="text-sm text-red-700">{String(error)}</p></div></div>;
  if (!data?.completed && !data?.upcoming) return <DashboardEmptyState domain="work-tickets-qbu" />;

  const completed = data.completed || [];
  const upcoming = data.upcoming || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-secondary-text">From</label>
          <input type="date" value={filters.dateFrom || ''} onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-secondary-text">To</label>
          <input type="date" value={filters.dateTo || ''} onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue" />
        </div>
        {data?.jobs?.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-secondary-text">Job</label>
            <select value={filters.jobIds?.[0] || ''} onChange={(e) => setFilters(f => ({ ...f, jobIds: e.target.value ? [e.target.value] : null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[180px]">
              <option value="">All Jobs</option>
              {data.jobs.map(j => <option key={j.id} value={j.id}>{j.job_name}</option>)}
            </select>
          </div>
        )}
        {data?.ticketTypes?.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-secondary-text">Type</label>
            <select value={filters.ticketType || ''} onChange={(e) => setFilters(f => ({ ...f, ticketType: e.target.value || null }))} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[140px]">
              <option value="">All Types</option>
              {data.ticketTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
        {(filters.dateFrom || filters.dateTo || filters.jobIds || filters.ticketType) && (
          <button onClick={() => setFilters({ dateFrom: null, dateTo: null, jobIds: null, ticketType: null })} className="text-xs text-aa-blue hover:underline">Clear filters</button>
        )}
      </div>

      {/* Completed Work Tickets */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-dark-text">Completed Work Tickets</h3>
          <span className="text-xs text-secondary-text">{completed.length} tickets</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Ticket #</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Schedule Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Completion Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Address</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">City</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">State</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Work Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {completed.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-secondary-text">No completed tickets</td></tr>
              ) : completed.map((t, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-dark-text font-medium">{t.ticket_number}</td>
                  <td className="px-4 py-2.5 text-dark-text">{t.schedule_date}</td>
                  <td className="px-4 py-2.5 text-dark-text">{t.completion_date}</td>
                  <td className="px-4 py-2.5 text-dark-text max-w-[200px] truncate">{t.address || '—'}</td>
                  <td className="px-4 py-2.5 text-dark-text">{t.city || '—'}</td>
                  <td className="px-4 py-2.5 text-dark-text">{t.state || '—'}</td>
                  <td className="px-4 py-2.5 text-secondary-text">{t.type || '—'}</td>
                  <td className="px-4 py-2.5 text-secondary-text max-w-[250px] truncate">{t.work_description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Work Tickets */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-dark-text">Upcoming Work Tickets</h3>
          <span className="text-xs text-secondary-text">{upcoming.length} tickets</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Ticket #</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Schedule Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Address</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">City</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">State</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-secondary-text">Work Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {upcoming.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-secondary-text">No upcoming tickets</td></tr>
              ) : upcoming.map((t, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-dark-text font-medium">{t.ticket_number}</td>
                  <td className="px-4 py-2.5 text-dark-text">{t.schedule_date}</td>
                  <td className="px-4 py-2.5 text-dark-text max-w-[200px] truncate">{t.address || '—'}</td>
                  <td className="px-4 py-2.5 text-dark-text">{t.city || '—'}</td>
                  <td className="px-4 py-2.5 text-dark-text">{t.state || '—'}</td>
                  <td className="px-4 py-2.5 text-secondary-text">{t.type || '—'}</td>
                  <td className="px-4 py-2.5 text-secondary-text max-w-[250px] truncate">{t.work_description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
