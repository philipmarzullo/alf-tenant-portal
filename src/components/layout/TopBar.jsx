import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Eye, X, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';

const BREADCRUMB_MAP = {
  '/portal': ['Command Center'],
  '/portal/hr': ['Workspaces', 'HR'],
  '/portal/hr/benefits': ['Workspaces', 'HR', 'Benefits'],
  '/portal/hr/pay-rates': ['Workspaces', 'HR', 'Pay Rate Changes'],
  '/portal/hr/leave': ['Workspaces', 'HR', 'Leave Management'],
  '/portal/hr/unemployment': ['Workspaces', 'HR', 'Unemployment'],
  '/portal/hr/union-calendar': ['Workspaces', 'HR', 'Union Calendar'],
  '/portal/finance': ['Workspaces', 'Finance'],
  '/portal/purchasing': ['Workspaces', 'Purchasing'],
  '/portal/tools/qbu': ['Tools', 'Quarterly Review Builder'],
  '/portal/tools/sales-deck': ['Tools', 'Proposal Builder'],
  '/portal/tools/transition-plan': ['Tools', 'Transition Plan Builder'],
  '/portal/tools/budget': ['Tools', 'Budget Builder'],
  '/portal/tools/incident-report': ['Tools', 'Incident Report'],
  '/portal/tools/training-plan': ['Tools', 'Training Plan'],
  '/portal/sales': ['Workspaces', 'Sales'],
  '/portal/sales/contracts': ['Workspaces', 'Sales', 'Contracts'],
  '/portal/sales/apc': ['Workspaces', 'Sales', 'APC Tracker'],
  '/portal/sales/tbi': ['Workspaces', 'Sales', 'TBI Tracker'],
  '/portal/ops': ['Workspaces', 'Operations'],
  '/portal/dashboards/action-plans': ['Analytics', 'Action Plans'],
  '/portal/admin/users': ['Admin', 'User Management'],
  '/portal/admin/knowledge': ['Admin', 'Knowledge Base'],
  '/portal/admin/agents': ['Admin', 'Agent Management'],
  '/portal/admin/settings': ['Admin', 'Settings'],
  '/portal/admin/role-templates': ['Admin', 'Role Templates'],
  '/portal/admin/dashboard-settings': ['Admin', 'Dashboard Defaults'],
  '/portal/admin/automation': ['Admin', 'Automation Insights'],
};

export default function TopBar({ isMobile, onMenuToggle }) {
  const location = useLocation();
  const crumbs = BREADCRUMB_MAP[location.pathname] || ['Dashboard'];
  const { realIsAdmin, realUser, activeUsers, viewingAs, setViewingAs, clearViewingAs } = useUser();

  const [viewAsOpen, setViewAsOpen] = useState(false);
  const viewAsRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!viewAsOpen) return;
    function handleClick(e) {
      if (viewAsRef.current && !viewAsRef.current.contains(e.target)) {
        setViewAsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [viewAsOpen]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Users available for impersonation (exclude self)
  const impersonateList = realIsAdmin
    ? activeUsers.filter((u) => u.id !== realUser?.id)
    : [];

  return (
    <>
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0">
        {/* Left: hamburger + breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          {isMobile && (
            <button
              onClick={onMenuToggle}
              className="p-1.5 -ml-1 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Menu size={20} />
            </button>
          )}
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-gray-300">/</span>}
              <span className={i === crumbs.length - 1 ? 'text-dark-text font-medium' : 'text-secondary-text'}>
                {crumb}
              </span>
            </span>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md w-48 focus:outline-none focus:border-aa-blue"
            />
          </div>
          {/* Notifications — not yet connected */}
          <button className="p-2 text-gray-300 cursor-default" title="Notifications coming soon">
            <Bell size={18} />
          </button>

          {/* View-as-user dropdown — super-admin only, hidden on mobile */}
          {realIsAdmin && (
            <div className="relative hidden md:block" ref={viewAsRef}>
              <button
                onClick={() => setViewAsOpen(!viewAsOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  viewingAs
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-gray-50 border-gray-200 text-secondary-text hover:border-gray-300'
                }`}
              >
                <Eye size={14} />
                <span>{viewingAs ? viewingAs.name : 'View as...'}</span>
              </button>

              {viewAsOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                  {viewingAs && (
                    <button
                      onClick={() => { clearViewingAs(); setViewAsOpen(false); }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-amber-700 hover:bg-amber-50 border-b border-gray-100 flex items-center gap-2"
                    >
                      <X size={12} />
                      Exit impersonation
                    </button>
                  )}
                  {impersonateList.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => { setViewingAs(user); setViewAsOpen(false); }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                        viewingAs?.id === user.id ? 'bg-blue-50 text-aa-blue' : 'text-dark-text'
                      }`}
                    >
                      <span className="truncate">{user.name}</span>
                      <span className="text-[10px] text-secondary-text capitalize shrink-0 ml-2">{user.role}</span>
                    </button>
                  ))}
                  {impersonateList.length === 0 && (
                    <div className="px-3 py-2 text-xs text-secondary-text">No other active users</div>
                  )}
                </div>
              )}
            </div>
          )}

          <span className="text-xs text-secondary-text hidden md:inline">{today}</span>
        </div>
      </div>

      {/* Impersonation banner */}
      {viewingAs && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between shrink-0">
          <span className="text-xs font-medium text-amber-800">
            Viewing as <strong>{viewingAs.name}</strong> — <span className="capitalize">{viewingAs.role}</span>
          </span>
          <button
            onClick={clearViewingAs}
            className="text-xs font-medium text-amber-700 hover:text-amber-900 underline transition-colors"
          >
            Exit
          </button>
        </div>
      )}
    </>
  );
}
