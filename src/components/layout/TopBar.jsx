import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Eye, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';

const BREADCRUMB_MAP = {
  '/': ['Dashboard'],
  '/hr': ['Workspaces', 'HR'],
  '/hr/benefits': ['Workspaces', 'HR', 'Benefits'],
  '/hr/pay-rates': ['Workspaces', 'HR', 'Pay Rate Changes'],
  '/hr/leave': ['Workspaces', 'HR', 'Leave Management'],
  '/hr/unemployment': ['Workspaces', 'HR', 'Unemployment'],
  '/hr/union-calendar': ['Workspaces', 'HR', 'Union Calendar'],
  '/finance': ['Workspaces', 'Finance'],
  '/purchasing': ['Workspaces', 'Purchasing'],
  '/tools/qbu': ['Tools', 'QBU Builder'],
  '/tools/sales-deck': ['Tools', 'Sales Deck Builder'],
  '/sales': ['Workspaces', 'Sales'],
  '/sales/contracts': ['Workspaces', 'Sales', 'Contracts'],
  '/sales/apc': ['Workspaces', 'Sales', 'APC Tracker'],
  '/sales/tbi': ['Workspaces', 'Sales', 'TBI Tracker'],
  '/ops': ['Workspaces', 'Operations'],
  '/admin/users': ['Admin', 'User Management'],
  '/admin/agents': ['Admin', 'Agent Management'],
  '/admin/settings': ['Admin', 'Settings'],
};

export default function TopBar() {
  const location = useLocation();
  const crumbs = BREADCRUMB_MAP[location.pathname] || ['Dashboard'];
  const { realIsSuperAdmin, realUser, activeUsers, viewingAs, setViewingAs, clearViewingAs } = useUser();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Users available for impersonation (exclude self)
  const impersonateList = realIsSuperAdmin
    ? activeUsers.filter((u) => u.id !== realUser?.id)
    : [];

  return (
    <>
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
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
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md w-48 focus:outline-none focus:border-aa-blue"
            />
          </div>
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-aa-red rounded-full" />
          </button>

          {/* View-as-user dropdown — super-admin only */}
          {realIsSuperAdmin && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  viewingAs
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-gray-50 border-gray-200 text-secondary-text hover:border-gray-300'
                }`}
              >
                <Eye size={14} />
                <span>{viewingAs ? viewingAs.name : 'View as...'}</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                  {viewingAs && (
                    <button
                      onClick={() => { clearViewingAs(); setDropdownOpen(false); }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-amber-700 hover:bg-amber-50 border-b border-gray-100 flex items-center gap-2"
                    >
                      <X size={12} />
                      Exit impersonation
                    </button>
                  )}
                  {impersonateList.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => { setViewingAs(user); setDropdownOpen(false); }}
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

          <span className="text-xs text-secondary-text">{today}</span>
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
