import { useState, useEffect } from 'react';
import { Building2, Users, Activity, Plus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import MetricCard from '../../components/shared/MetricCard';
import DataTable from '../../components/shared/DataTable';

export default function PlatformTenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    setLoading(true);

    // Fetch tenants
    const { data: tenantRows, error: tErr } = await supabase
      .from('alf_tenants')
      .select('*')
      .order('created_at', { ascending: true });

    if (tErr) {
      setError(tErr.message);
      setLoading(false);
      return;
    }

    // Fetch user counts per tenant
    const { data: profiles } = await supabase
      .from('profiles')
      .select('tenant_id');

    // Fetch usage counts per tenant (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: usageLogs } = await supabase
      .from('alf_usage_logs')
      .select('tenant_id')
      .gte('created_at', thirtyDaysAgo);

    // Aggregate
    const userCounts = {};
    const usageCounts = {};
    (profiles || []).forEach((p) => {
      if (p.tenant_id) userCounts[p.tenant_id] = (userCounts[p.tenant_id] || 0) + 1;
    });
    (usageLogs || []).forEach((u) => {
      if (u.tenant_id) usageCounts[u.tenant_id] = (usageCounts[u.tenant_id] || 0) + 1;
    });

    const enriched = (tenantRows || []).map((t) => ({
      ...t,
      user_count: userCounts[t.id] || 0,
      usage_30d: usageCounts[t.id] || 0,
    }));

    setTenants(enriched);
    setLoading(false);
  }

  const totalUsers = tenants.reduce((sum, t) => sum + t.user_count, 0);
  const totalUsage = tenants.reduce((sum, t) => sum + t.usage_30d, 0);
  const activeTenants = tenants.filter((t) => t.status === 'active').length;

  const columns = [
    {
      key: 'company_name',
      label: 'Company',
      render: (val, row) => (
        <div>
          <div className="font-medium text-dark-text">{val}</div>
          <div className="text-xs text-secondary-text">{row.slug}</div>
        </div>
      ),
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (val) => (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 capitalize">
          {val || 'free'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
          val === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {val}
        </span>
      ),
    },
    {
      key: 'user_count',
      label: 'Users',
      render: (val) => <span className="text-sm text-dark-text">{val}</span>,
    },
    {
      key: 'usage_30d',
      label: 'Usage (30d)',
      render: (val) => <span className="text-sm text-dark-text">{val.toLocaleString()}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-dark-text">Tenants</h1>
          <p className="text-sm text-secondary-text mt-1">Manage organizations on the Alf platform</p>
        </div>
        <button
          onClick={() => navigate('/platform/tenants/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          New Tenant
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Total Tenants" value={tenants.length} icon={Building2} color="#6366F1" />
        <MetricCard label="Total Users" value={totalUsers} icon={Users} color="#6366F1" />
        <MetricCard label="Agent Calls (30d)" value={totalUsage.toLocaleString()} icon={Activity} color="#6366F1" />
      </div>

      <DataTable
        columns={columns}
        data={tenants}
        onRowClick={(row) => navigate(`/platform/tenants/${row.id}`)}
      />

      {tenants.length === 0 && !error && (
        <div className="text-center py-12 text-sm text-secondary-text">
          No tenants yet. Create one to get started.
        </div>
      )}
    </div>
  );
}
