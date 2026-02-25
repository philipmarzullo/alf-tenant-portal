import { useState } from 'react';
import { Users, UserCheck, Shield, Boxes, Plus, Loader2, Mail } from 'lucide-react';
import MetricCard from '../../components/shared/MetricCard';
import DataTable from '../../components/shared/DataTable';
import SlidePanel from '../../components/layout/SlidePanel';
import { MODULE_DEFINITIONS } from '../../data/users';
import { useUser } from '../../contexts/UserContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const EMPTY_FORM = { name: '', email: '', title: '', role: 'user', modules: [], active: true, password: '' };

export default function UserManagement() {
  const { currentUser, allUsers, refreshUsers } = useUser();
  const { session, resetPassword } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [resetSending, setResetSending] = useState(false);

  const openAdd = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setPanelOpen(true);
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
    setSaveError(null);
    setPanelOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    setSaveError(null);

    const modules = (form.role === 'admin' || form.role === 'super-admin')
      ? MODULE_DEFINITIONS.map((m) => m.key)
      : form.modules;

    if (editingUser) {
      // Update existing profile
      const { error } = await supabase
        .from('profiles')
        .update({
          name: form.name.trim(),
          email: form.email.trim(),
          title: form.title.trim(),
          role: form.role,
          modules,
          active: form.active,
        })
        .eq('id', editingUser.id);

      if (error) {
        setSaveError(error.message);
        setSaving(false);
        return;
      }
    } else {
      // Create new user via Edge Function
      if (!form.password || form.password.length < 6) {
        setSaveError('Password is required and must be at least 6 characters.');
        setSaving(false);
        return;
      }

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`;

        const res = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            name: form.name.trim(),
            title: form.title.trim(),
            role: form.role,
            modules,
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
    // The toast for this would come from a toast context if wired up
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

  const isSelf = editingUser?.id === currentUser?.id;
  const activeCount = allUsers.filter((u) => u.active).length;
  const adminCount = allUsers.filter((u) => (u.role === 'admin' || u.role === 'super-admin') && u.active).length;
  const avgModules =
    allUsers.length > 0
      ? (allUsers.reduce((sum, u) => sum + u.modules.length, 0) / allUsers.length).toFixed(1)
      : 0;

  // Group module definitions for the form checkbox UI
  const modulesByGroup = MODULE_DEFINITIONS.filter((m) => m.key !== 'admin').reduce((acc, m) => {
    if (!acc[m.group]) acc[m.group] = [];
    acc[m.group].push(m);
    return acc;
  }, {});

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
          val === 'super-admin'
            ? 'bg-red-50 text-red-700'
            : val === 'admin'
            ? 'bg-purple-50 text-purple-700'
            : 'bg-gray-100 text-gray-600';
        const label =
          val === 'super-admin' ? 'Super Admin' : val === 'admin' ? 'Admin' : 'User';
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
      <div className="flex items-center justify-between mb-6">
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
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Users" value={allUsers.length} icon={Users} />
        <MetricCard label="Active" value={activeCount} icon={UserCheck} color="#16A34A" />
        <MetricCard label="Admins" value={adminCount} icon={Shield} color="#7C3AED" />
        <MetricCard label="Avg Modules/User" value={avgModules} icon={Boxes} />
      </div>

      {/* Table */}
      <DataTable columns={columns} data={allUsers} onRowClick={openEdit} />

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
              placeholder="email@aaefs.com"
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
              disabled={isSelf}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="super-admin">Super Admin</option>
            </select>
            {isSelf && (
              <p className="text-xs text-secondary-text mt-1">You cannot change your own role.</p>
            )}
          </div>

          {/* Modules — hidden when admin or super-admin */}
          {form.role !== 'admin' && form.role !== 'super-admin' && (
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
                {form.role === 'super-admin' ? 'Super Admins' : 'Admins'} automatically have access to all modules.
              </p>
            </div>
          )}

          {/* Active toggle — edit mode only */}
          {editingUser && (
            <div>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-dark-text">Active</span>
                <button
                  type="button"
                  onClick={() => !isSelf && setForm({ ...form, active: !form.active })}
                  disabled={isSelf}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.active ? 'bg-aa-blue' : 'bg-gray-300'
                  } ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
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
