import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Users, MapPin, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DataTable from '../../components/shared/DataTable';

export default function PlatformTenantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Editable fields
  const [editName, setEditName] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);

    const [tenantRes, usersRes, sitesRes, usageRes] = await Promise.all([
      supabase.from('alf_tenants').select('*').eq('id', id).single(),
      supabase.from('profiles').select('id, name, email, role, active').eq('tenant_id', id).order('name'),
      supabase.from('tenant_sites').select('*').eq('tenant_id', id).order('name'),
      supabase.from('alf_usage_logs').select('id, agent_key, tokens_input, tokens_output, created_at').eq('tenant_id', id).order('created_at', { ascending: false }).limit(100),
    ]);

    if (tenantRes.error) {
      setError(tenantRes.error.message);
      setLoading(false);
      return;
    }

    setTenant(tenantRes.data);
    setEditName(tenantRes.data.company_name);
    setEditPlan(tenantRes.data.plan || 'free');
    setEditStatus(tenantRes.data.status || 'active');
    setUsers(usersRes.data || []);
    setSites(sitesRes.data || []);
    setUsage(usageRes.data || []);
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: updateErr } = await supabase
      .from('alf_tenants')
      .update({ company_name: editName, plan: editPlan, status: editStatus })
      .eq('id', id);

    if (updateErr) {
      setError(updateErr.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setTenant((prev) => ({ ...prev, company_name: editName, plan: editPlan, status: editStatus }));
    }
    setSaving(false);
  }

  const totalTokens = usage.reduce((sum, u) => sum + (u.tokens_input || 0) + (u.tokens_output || 0), 0);

  const userColumns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email', render: (val) => <span className="text-xs text-secondary-text">{val}</span> },
    {
      key: 'role', label: 'Role',
      render: (val) => <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 capitalize">{val}</span>,
    },
    {
      key: 'active', label: 'Status',
      render: (val) => (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${val ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  const siteColumns = [
    { key: 'name', label: 'Site Name' },
    { key: 'address', label: 'Address', render: (val) => <span className="text-xs text-secondary-text">{val || '—'}</span> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-24">
        <p className="text-secondary-text">Tenant not found.</p>
        <button onClick={() => navigate('/platform/tenants')} className="text-sm text-indigo-600 hover:underline mt-2">
          Back to Tenants
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/platform/tenants')}
        className="flex items-center gap-1.5 text-sm text-secondary-text hover:text-dark-text transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Tenants
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          Tenant updated successfully.
        </div>
      )}

      {/* Info Card — Inline Edit */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-5 flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-secondary-text mb-1">Company Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-text mb-1">Plan</label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
              >
                {['free', 'starter', 'pro', 'enterprise'].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-text mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save
          </button>
        </div>
        <div className="border-t border-gray-100 px-5 py-3 flex gap-6 text-xs text-secondary-text">
          <span>Slug: <strong className="font-mono">{tenant.slug}</strong></span>
          <span>Created: {new Date(tenant.created_at).toLocaleDateString()}</span>
          {tenant.modules && <span>Modules: {tenant.modules.join(', ')}</span>}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg"><Users size={18} className="text-indigo-500" /></div>
          <div>
            <div className="text-2xl font-semibold text-dark-text">{users.length}</div>
            <div className="text-xs text-secondary-text">Users</div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg"><MapPin size={18} className="text-indigo-500" /></div>
          <div>
            <div className="text-2xl font-semibold text-dark-text">{sites.length}</div>
            <div className="text-xs text-secondary-text">Sites</div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg"><Activity size={18} className="text-indigo-500" /></div>
          <div>
            <div className="text-2xl font-semibold text-dark-text">{totalTokens.toLocaleString()}</div>
            <div className="text-xs text-secondary-text">Total Tokens (last 100 calls)</div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div>
        <h2 className="text-sm font-semibold text-dark-text mb-3">Users ({users.length})</h2>
        {users.length > 0 ? (
          <DataTable columns={userColumns} data={users} />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-secondary-text">
            No users assigned to this tenant.
          </div>
        )}
      </div>

      {/* Sites Table */}
      <div>
        <h2 className="text-sm font-semibold text-dark-text mb-3">Sites ({sites.length})</h2>
        {sites.length > 0 ? (
          <DataTable columns={siteColumns} data={sites} />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-secondary-text">
            No sites configured for this tenant.
          </div>
        )}
      </div>

      {/* Usage Summary */}
      <div>
        <h2 className="text-sm font-semibold text-dark-text mb-3">Recent Usage ({usage.length} calls)</h2>
        {usage.length > 0 ? (
          <DataTable
            columns={[
              { key: 'agent_key', label: 'Agent', render: (val) => <span className="font-mono text-xs">{val || '—'}</span> },
              { key: 'tokens_input', label: 'Input Tokens', render: (val) => (val || 0).toLocaleString() },
              { key: 'tokens_output', label: 'Output Tokens', render: (val) => (val || 0).toLocaleString() },
              { key: 'created_at', label: 'Date', render: (val) => new Date(val).toLocaleString() },
            ]}
            data={usage}
          />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-secondary-text">
            No usage data yet.
          </div>
        )}
      </div>
    </div>
  );
}
