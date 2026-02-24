import { useState } from 'react';
import { Users, UserCheck, Shield, Boxes, Plus } from 'lucide-react';
import MetricCard from '../../components/shared/MetricCard';
import DataTable from '../../components/shared/DataTable';
import SlidePanel from '../../components/layout/SlidePanel';
import { MODULE_DEFINITIONS, createUser, updateUser } from '../../data/users';
import { useUser } from '../../contexts/UserContext';

const EMPTY_FORM = { name: '', email: '', title: '', role: 'user', modules: [], active: true };

export default function UserManagement() {
  const { currentUser, allUsers, refreshUsers } = useUser();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const openAdd = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
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
    });
    setPanelOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    if (editingUser) {
      updateUser(editingUser.id, form);
    } else {
      createUser(form);
    }
    refreshUsers();
    setPanelOpen(false);
  };

  const toggleModule = (key) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(key)
        ? prev.modules.filter((m) => m !== key)
        : [...prev.modules, key],
    }));
  };

  const isSelf = editingUser?.id === currentUser.id;
  const activeCount = allUsers.filter((u) => u.active).length;
  const adminCount = allUsers.filter((u) => u.role === 'admin' && u.active).length;
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
      render: (val) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            val === 'admin'
              ? 'bg-purple-50 text-purple-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {val === 'admin' ? 'Admin' : 'User'}
        </span>
      ),
    },
    {
      key: 'modules',
      label: 'Modules',
      render: (modules, row) => {
        if (row.role === 'admin') {
          return <span className="text-xs text-secondary-text italic">All (admin)</span>;
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
            />
          </div>

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
            </select>
            {isSelf && (
              <p className="text-xs text-secondary-text mt-1">You cannot change your own role.</p>
            )}
          </div>

          {/* Modules — hidden when admin */}
          {form.role !== 'admin' && (
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

          {form.role === 'admin' && (
            <div className="bg-purple-50 rounded-lg px-4 py-3">
              <p className="text-sm text-purple-700">
                Admins automatically have access to all modules.
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

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.email.trim()}
              className="flex-1 px-4 py-2 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
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
