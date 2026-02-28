import { useState, useEffect, useCallback } from 'react';
import { Users, UserCheck, Shield, Boxes, Plus, Loader2, Mail } from 'lucide-react';
import MetricCard from '../../components/shared/MetricCard';
import DataTable from '../../components/shared/DataTable';
import SlidePanel from '../../components/layout/SlidePanel';
import { MODULE_DEFINITIONS } from '../../data/users';
import { useUser } from '../../contexts/UserContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, getFreshToken } from '../../lib/supabase';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
const TENANT_ID = import.meta.env.VITE_TENANT_ID;

const EMPTY_FORM = { name: '', email: '', title: '', role: 'user', modules: [], active: true, password: '' };

const TIER_BADGES = {
  operational: { label: 'Operational', style: 'bg-gray-100 text-gray-700' },
  managerial: { label: 'Managerial', style: 'bg-blue-50 text-blue-700' },
  financial: { label: 'Financial', style: 'bg-purple-50 text-purple-700' },
};

export default function UserManagement() {
  const { currentUser, allUsers, refreshUsers } = useUser();
  const { session, resetPassword } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [resetSending, setResetSending] = useState(false);

  // Role templates + site assignments for the edit form
  const [roleTemplates, setRoleTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sites, setSites] = useState([]);
  const [assignedSiteIds, setAssignedSiteIds] = useState([]);
  const [loadingExtras, setLoadingExtras] = useState(false);

  // Fetch role templates and sites when panel opens
  const fetchExtras = useCallback(async (userId) => {
    if (!TENANT_ID) return;
    setLoadingExtras(true);
    try {
      const token = await getFreshToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const [templatesRes, sitesRes, assignmentsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/role-templates`, { headers }),
        fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/home-summary`, { headers }),
        userId
          ? fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/site-assignments/${userId}`, { headers })
          : Promise.resolve(null),
      ]);

      if (templatesRes.ok) {
        setRoleTemplates(await templatesRes.json());
      }

      // Extract jobs list from home-summary response (uses the JOBS query)
      if (sitesRes.ok) {
        const summaryData = await sitesRes.json();
        // We need the actual jobs list — let's fetch it directly
        const jobsRes = await fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/operations?dateFrom=2000-01-01&dateTo=2099-12-31`, { headers });
        if (jobsRes.ok) {
          const domainData = await jobsRes.json();
          setSites(domainData.jobs || []);
        }
      }

      if (assignmentsRes?.ok) {
        const assignments = await assignmentsRes.json();
        setAssignedSiteIds(assignments.map(a => a.job_id));
      } else {
        setAssignedSiteIds([]);
      }
    } catch (err) {
      console.error('[UserManagement] Error loading extras:', err.message);
    } finally {
      setLoadingExtras(false);
    }
  }, []);

  const openAdd = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setSelectedTemplateId('');
    setAssignedSiteIds([]);
    setSaveError(null);
    setPanelOpen(true);
    fetchExtras(null);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      title: user.title,
      role: user.role,
      modules: [...user.modules],
      active: user.active,
      password: '',
    });
    setSelectedTemplateId(user.dashboard_template_id || '');
    setSaveError(null);
    setPanelOpen(true);
    fetchExtras(user.id);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    setSaveError(null);

    // Defense in depth: block role escalation beyond caller's rank
    const saveRoleRank = ROLE_RANK[form.role] ?? 0;
    if (saveRoleRank > myRank) {
      setSaveError('You cannot assign a role higher than your own.');
      setSaving(false);
      return;
    }

    // Block deactivation of users at or above caller's rank (unless super-admin)
    if (editingUser && !form.active && editingUser.active) {
      const editTargetRank = ROLE_RANK[editingUser.role] ?? 0;
      if (editingUser.id === currentUser.id) {
        setSaveError('You cannot deactivate yourself.');
        setSaving(false);
        return;
      }
      if (currentUser.role !== 'super-admin' && editTargetRank >= myRank) {
        setSaveError('You cannot deactivate users at or above your role.');
        setSaving(false);
        return;
      }
    }

    const modules = (form.role === 'admin' || form.role === 'super-admin')
      ? MODULE_DEFINITIONS.map((m) => m.key)
      : form.modules;

    if (editingUser) {
      // Update existing profile (including dashboard_template_id)
      const updatePayload = {
        name: form.name.trim(),
        email: form.email.trim(),
        title: form.title.trim(),
        role: form.role,
        modules,
        active: form.active,
        dashboard_template_id: selectedTemplateId || null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', editingUser.id);

      if (error) {
        setSaveError(error.message);
        setSaving(false);
        return;
      }

      // Save site assignments (for non-admin users)
      if (form.role !== 'admin' && form.role !== 'super-admin') {
        try {
          const token = await getFreshToken();
          if (token) {
            await fetch(`${BACKEND_URL}/api/dashboards/${TENANT_ID}/site-assignments/${editingUser.id}`, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ jobIds: assignedSiteIds }),
            });
          }
        } catch (err) {
          console.error('[UserManagement] Site assignment save error:', err.message);
        }
      }
    } else {
      // Create new user via Edge Function
      if (!form.password || form.password.length < 6) {
        setSaveError('Password is required and must be at least 6 characters.');
        setSaving(false);
        return;
      }

      try {
        const token = await getFreshToken();
        if (!token) throw new Error('Not authenticated — please sign in again');
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`;

        const res = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            name: form.name.trim(),
            title: form.title.trim(),
            role: form.role,
            modules,
            tenant_id: currentUser.tenant_id,
          }),
        });

        const result = await res.json();

        if (!res.ok) {
          setSaveError(result.error || result.message || `Failed to create user (${res.status})`);
          setSaving(false);
          return;
        }
      } catch (err) {
        setSaveError(
          'Could not reach the admin-create-user Edge Function: ' + err.message
        );
        setSaving(false);
        return;
      }
    }

    await refreshUsers();
    setSaving(false);
    setPanelOpen(false);
  };

  const handleSendReset = async () => {
    if (!editingUser) return;
    setResetSending(true);
    await resetPassword(editingUser.email);
    setResetSending(false);
    alert(`Password reset email sent to ${editingUser.email}`);
  };

  const toggleModule = (key) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(key)
        ? prev.modules.filter((m) => m !== key)
        : [...prev.modules, key],
    }));
  };

  const toggleSite = (jobId) => {
    setAssignedSiteIds(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const isSelf = editingUser?.id === currentUser?.id;
  const isNonAdminRole = form.role !== 'admin' && form.role !== 'super-admin';

  // Role hierarchy for permission checks
  const ROLE_RANK = { user: 0, manager: 1, admin: 2, 'super-admin': 3 };
  const myRank = ROLE_RANK[currentUser?.role] ?? 0;

  // Roles the current user can assign (up to and including their own)
  const assignableRoles = ['user', 'manager', 'admin', 'super-admin'].filter(r => ROLE_RANK[r] <= myRank);

  // Can this user edit the target's role?
  const targetRank = ROLE_RANK[editingUser?.role] ?? 0;
  const canEditRole = !isSelf && targetRank <= myRank;

  // Can this user toggle the target's active status?
  const canToggleActive = !isSelf && (
    currentUser?.role === 'super-admin'
      ? true // super-admin can deactivate anyone except self
      : targetRank < myRank // admin can only deactivate users/managers below them
  );

  // Filter to this tenant's users (exclude platform_owner accounts)
  const tenantId = import.meta.env.VITE_TENANT_ID;
  const visibleUsers = allUsers.filter((u) =>
    u.role !== 'platform_owner' && (!tenantId || u.tenant_id === tenantId)
  );

  const activeCount = visibleUsers.filter((u) => u.active).length;
  const adminCount = visibleUsers.filter((u) => (u.role === 'admin' || u.role === 'super-admin') && u.active).length;
  const avgModules =
    visibleUsers.length > 0
      ? (visibleUsers.reduce((sum, u) => sum + u.modules.length, 0) / visibleUsers.length).toFixed(1)
      : 0;

  // Group module definitions for the form checkbox UI
  const modulesByGroup = MODULE_DEFINITIONS.filter((m) => m.key !== 'admin').reduce((acc, m) => {
    if (!acc[m.group]) acc[m.group] = [];
    acc[m.group].push(m);
    return acc;
  }, {});

  // Find template for a user (for table display)
  const getTemplateName = (user) => {
    if (!user.dashboard_template_id) return null;
    const t = roleTemplates.find(rt => rt.id === user.dashboard_template_id);
    return t?.name || null;
  };

  const columns = [
    {
      key: 'name',
      label: 'User',
      render: (_, row) => (
        <div>
          <div className="font-medium text-dark-text">{row.name}</div>
          <div className="text-xs text-secondary-text">{row.email}</div>
        </div>
      ),
    },
    { key: 'title', label: 'Title' },
    {
      key: 'role',
      label: 'Role',
      render: (val) => {
        const styles =
          val === 'platform_owner'
            ? 'bg-amber-50 text-amber-700'
            : val === 'super-admin' || val === 'admin'
            ? 'bg-purple-50 text-purple-700'
            : val === 'manager'
            ? 'bg-blue-50 text-blue-700'
            : 'bg-gray-100 text-gray-600';
        const label =
          val === 'platform_owner' ? 'Platform Owner'
            : val === 'super-admin' ? 'Super Admin'
            : val === 'admin' ? 'Admin'
            : val === 'manager' ? 'Manager'
            : 'User';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}>
            {label}
          </span>
        );
      },
    },
    {
      key: 'modules',
      label: 'Modules',
      render: (modules, row) => {
        if (row.role === 'admin' || row.role === 'super-admin') {
          return <span className="text-xs text-secondary-text italic">All ({row.role})</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {modules.map((key) => {
              const def = MODULE_DEFINITIONS.find((m) => m.key === key);
              return (
                <span
                  key={key}
                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700"
                >
                  {def?.label || key}
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'active',
      label: 'Status',
      render: (val) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            val ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {val ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'id',
      label: '',
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openEdit(row);
          }}
          className="text-xs text-aa-blue hover:text-aa-blue/80 font-medium transition-colors"
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-light text-dark-text mb-1">User Management</h1>
          <p className="text-sm text-secondary-text">
            Manage portal users and module access. Admins automatically receive access to all modules.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Users" value={visibleUsers.length} icon={Users} />
        <MetricCard label="Active" value={activeCount} icon={UserCheck} color="#16A34A" />
        <MetricCard label="Admins" value={adminCount} icon={Shield} color="#7C3AED" />
        <MetricCard label="Avg Modules/User" value={avgModules} icon={Boxes} />
      </div>

      {/* Table */}
      <DataTable columns={columns} data={visibleUsers} onRowClick={openEdit} />

      {/* SlidePanel form */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editingUser ? `Edit ${editingUser.name}` : 'Add User'}
      >
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
              placeholder="Full name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
              placeholder="email@yourcompany.com"
              disabled={!!editingUser}
            />
          </div>

          {/* Password — only when creating */}
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">Temporary Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
              <p className="text-xs text-secondary-text mt-1">
                The user will use this to sign in the first time. You can send a reset email after.
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
              placeholder="Job title"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              disabled={editingUser ? !canEditRole : false}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {r === 'super-admin' ? 'Super Admin' : r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            {isSelf && (
              <p className="text-xs text-secondary-text mt-1">You cannot change your own role.</p>
            )}
            {editingUser && !isSelf && !canEditRole && (
              <p className="text-xs text-secondary-text mt-1">This user has a higher role than yours.</p>
            )}
          </div>

          {/* Modules — hidden when admin or super-admin */}
          {isNonAdminRole && (
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">Module Access</label>
              <div className="space-y-4">
                {Object.entries(modulesByGroup).map(([group, modules]) => (
                  <div key={group}>
                    <div className="text-[11px] font-semibold text-secondary-text uppercase tracking-wider mb-1.5">
                      {group}
                    </div>
                    <div className="space-y-1.5">
                      {modules.map((m) => (
                        <label
                          key={m.key}
                          className="flex items-center gap-2.5 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={form.modules.includes(m.key)}
                            onChange={() => toggleModule(m.key)}
                            className="w-4 h-4 rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
                          />
                          <span className="text-sm text-dark-text group-hover:text-aa-blue transition-colors">
                            {m.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(form.role === 'admin' || form.role === 'super-admin') && (
            <div className="bg-purple-50 rounded-lg px-4 py-3">
              <p className="text-sm text-purple-700">
                Admins automatically have access to all modules.
              </p>
            </div>
          )}

          {/* Dashboard Template — non-admin roles only */}
          {isNonAdminRole && editingUser && (
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">Dashboard Template</label>
              {loadingExtras ? (
                <div className="flex items-center gap-2 text-sm text-secondary-text py-2">
                  <Loader2 size={14} className="animate-spin" /> Loading templates...
                </div>
              ) : (
                <>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
                  >
                    <option value="">No template (uses defaults)</option>
                    {roleTemplates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.metric_tier}{t.is_default ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                  {selectedTemplateId && (() => {
                    const t = roleTemplates.find(rt => rt.id === selectedTemplateId);
                    if (!t) return null;
                    const badge = TIER_BADGES[t.metric_tier] || TIER_BADGES.operational;
                    return (
                      <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.style}`}>
                            {badge.label}
                          </span>
                        </div>
                        {t.description && (
                          <p className="text-xs text-secondary-text">{t.description}</p>
                        )}
                        {t.allowed_domains?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {t.allowed_domains.map(d => (
                              <span key={d} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white border border-gray-200 text-secondary-text">
                                {d}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* Site Access — non-admin roles only, edit mode only */}
          {isNonAdminRole && editingUser && (
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">Site Access</label>
              <p className="text-xs text-secondary-text mb-2">
                {assignedSiteIds.length === 0
                  ? 'No sites assigned — user sees all sites (default).'
                  : `${assignedSiteIds.length} site${assignedSiteIds.length === 1 ? '' : 's'} assigned. User only sees data for these sites.`}
              </p>
              {loadingExtras ? (
                <div className="flex items-center gap-2 text-sm text-secondary-text py-2">
                  <Loader2 size={14} className="animate-spin" /> Loading sites...
                </div>
              ) : sites.length === 0 ? (
                <p className="text-xs text-secondary-text italic">No sites found in the database.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {sites.map(site => (
                    <label key={site.id} className="flex items-center gap-2.5 cursor-pointer group py-0.5">
                      <input
                        type="checkbox"
                        checked={assignedSiteIds.includes(site.id)}
                        onChange={() => toggleSite(site.id)}
                        className="w-4 h-4 rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
                      />
                      <span className="text-sm text-dark-text group-hover:text-aa-blue transition-colors">
                        {site.job_name}
                      </span>
                      {site.location && (
                        <span className="text-xs text-secondary-text">({site.location})</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active toggle — edit mode only */}
          {editingUser && (
            <div>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-dark-text">Active</span>
                <button
                  type="button"
                  onClick={() => canToggleActive && setForm({ ...form, active: !form.active })}
                  disabled={!canToggleActive}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.active ? 'bg-aa-blue' : 'bg-gray-300'
                  } ${!canToggleActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      form.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
              {isSelf && (
                <p className="text-xs text-secondary-text mt-1">You cannot deactivate yourself.</p>
              )}
              {!isSelf && !canToggleActive && (
                <p className="text-xs text-secondary-text mt-1">You cannot deactivate users at or above your role.</p>
              )}
            </div>
          )}

          {/* Send Password Reset — edit mode, non-self users */}
          {editingUser && !isSelf && (
            <div>
              <button
                type="button"
                onClick={handleSendReset}
                disabled={resetSending}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 text-sm font-medium text-secondary-text rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {resetSending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Send Password Reset Email
              </button>
            </div>
          )}

          {/* Error display */}
          {saveError && (
            <div className="text-sm text-aa-red bg-red-50 rounded-lg px-3 py-2">
              {saveError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.email.trim()}
              className="flex-1 px-4 py-2 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingUser ? 'Save Changes' : 'Create User'}
            </button>
            <button
              onClick={() => setPanelOpen(false)}
              className="px-4 py-2 border border-gray-200 text-sm font-medium text-secondary-text rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
