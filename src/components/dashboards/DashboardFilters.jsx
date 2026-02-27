import { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { getFreshToken } from '../../lib/supabase';

const TENANT_ID = import.meta.env.VITE_TENANT_ID;
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

export default function DashboardFilters({ filters, onChange }) {
  const [sites, setSites] = useState([]);

  // Fetch sites for the multi-select filter
  useEffect(() => {
    async function loadSites() {
      try {
        const token = await getFreshToken();
        if (!token) return;

        // Use operations domain to get jobs list
        const res = await fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/operations?dateFrom=2025-01-01&dateTo=2025-01-02`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const json = await res.json();
        if (json.jobs) setSites(json.jobs);
      } catch {
        // Sites will just be empty — filter still works
      }
    }
    loadSites();
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3 mb-6">
      <Filter size={16} className="text-secondary-text" />

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-secondary-text">From</label>
        <input
          type="date"
          value={filters.dateFrom || ''}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || null })}
          className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-secondary-text">To</label>
        <input
          type="date"
          value={filters.dateTo || ''}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value || null })}
          className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
        />
      </div>

      {sites.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-secondary-text">Sites</label>
          <select
            multiple
            value={filters.jobIds || []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => o.value);
              onChange({ ...filters, jobIds: selected.length ? selected : null });
            }}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue min-w-[180px] max-h-[80px]"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.job_name}</option>
            ))}
          </select>
        </div>
      )}

      {(filters.dateFrom || filters.dateTo || filters.jobIds) && (
        <button
          onClick={() => onChange({ dateFrom: null, dateTo: null, jobIds: null })}
          className="text-xs text-aa-blue hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
