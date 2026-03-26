import { useState, useEffect, useMemo } from 'react';
import { Briefcase, Search, Loader2, MapPin, Clock } from 'lucide-react';
import { getFreshToken } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';
import MetricCard from '../../components/shared/MetricCard';
import DataTable from '../../components/shared/DataTable';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

export default function JobDirectoryPage() {
  const { tenantId } = useTenantId();
  const [jobs, setJobs] = useState([]);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [regionFilter, setRegionFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;

    async function fetchJobs() {
      setLoading(true);
      setError(null);
      try {
        const token = await getFreshToken();
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`${BACKEND_URL}/api/ingestion/${tenantId}/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
        if (!cancelled) {
          setJobs(json.jobs || []);
          setLastLoadedAt(json.last_loaded_at || null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchJobs();
    return () => { cancelled = true; };
  }, [tenantId]);

  // Derive filter options from data
  const regions = useMemo(() => {
    const set = new Set(jobs.map(j => j.region).filter(Boolean));
    return [...set].sort();
  }, [jobs]);

  const states = useMemo(() => {
    const set = new Set(jobs.map(j => j.state).filter(Boolean));
    return [...set].sort();
  }, [jobs]);

  // Apply filters
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return jobs.filter(j => {
      if (statusFilter && j.job_status !== statusFilter) return false;
      if (regionFilter && j.region !== regionFilter) return false;
      if (stateFilter && j.state !== stateFilter) return false;
      if (q) {
        const hay = `${j.job_number} ${j.job_name} ${j.supervisor} ${j.city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, search, statusFilter, regionFilter, stateFilter]);

  // Metrics
  const totalJobs = jobs.length;
  const activeCount = jobs.filter(j => j.job_status === 'Active').length;
  const inactiveCount = totalJobs - activeCount;
  const uniqueRegions = new Set(jobs.map(j => j.region).filter(Boolean)).size;

  const columns = [
    {
      key: 'job_number',
      label: 'Job #',
      render: (v) => <span className="font-mono text-xs text-dark-text">{v}</span>,
    },
    {
      key: 'job_name',
      label: 'Job Name',
      render: (v) => <span className="text-sm text-dark-text font-medium">{v}</span>,
    },
    {
      key: 'job_status',
      label: 'Status',
      render: (v) => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
          v === 'Active'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {v}
        </span>
      ),
    },
    {
      key: 'region',
      label: 'Region',
      render: (v) => <span className="text-xs text-secondary-text">{v || '—'}</span>,
    },
    {
      key: 'state',
      label: 'State',
      render: (v) => <span className="text-xs text-secondary-text">{v || '—'}</span>,
    },
    {
      key: 'city',
      label: 'City',
      render: (v) => <span className="text-xs text-secondary-text">{v || '—'}</span>,
    },
    {
      key: 'supervisor',
      label: 'Supervisor',
      render: (v) => <span className="text-xs text-secondary-text">{v || '—'}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        Failed to load jobs: {error}
      </div>
    );
  }

  return (
    <div>
      {/* Header + last loaded badge */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light text-dark-text">Job Directory</h1>
          <p className="text-sm text-secondary-text mt-1">
            All jobs from WinTeam via Alf ingestion pipeline
          </p>
        </div>
        {lastLoadedAt && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-secondary-text">
            <Clock size={12} />
            Last synced {new Date(lastLoadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Jobs" value={totalJobs.toLocaleString()} icon={Briefcase} />
        <MetricCard label="Active" value={activeCount.toLocaleString()} color="#16A34A" icon={Briefcase} />
        <MetricCard label="Inactive" value={inactiveCount.toLocaleString()} icon={Briefcase} />
        <MetricCard label="Regions" value={uniqueRegions} icon={MapPin} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue focus:ring-1 focus:ring-aa-blue/20"
          />
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-aa-blue"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        {/* Region */}
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-aa-blue"
        >
          <option value="">All Regions</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {/* State */}
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-aa-blue"
        >
          <option value="">All States</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <span className="text-xs text-secondary-text">
          {filtered.length.toLocaleString()} of {totalJobs.toLocaleString()} jobs
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Briefcase size={32} className="mx-auto text-gray-300 mb-3" />
          <div className="text-sm text-secondary-text">No jobs match current filters.</div>
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}
    </div>
  );
}
