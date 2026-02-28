import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Eye, X, Bot, AlertTriangle, FileText, CheckCircle, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';

const NOTIF_ICONS = {
  agent: Bot,
  alert: AlertTriangle,
  update: FileText,
  success: CheckCircle,
};

const NOTIF_COLORS = {
  agent: 'text-aa-blue bg-aa-blue/10',
  alert: 'text-amber-600 bg-amber-50',
  update: 'text-secondary-text bg-gray-100',
  success: 'text-green-600 bg-green-50',
};

const NOTIFICATIONS = [
  { id: 1, type: 'agent', text: 'Review Builder generated quarterly deck', time: '10m ago', unread: true },
  { id: 2, type: 'alert', text: 'Contract expiring in 18 days', time: '25m ago', unread: true },
  { id: 3, type: 'agent', text: 'Sales Agent flagged 4 contracts expiring within 90 days', time: '1h ago', unread: true },
  { id: 4, type: 'alert', text: 'Medical/FMLA certification overdue', time: '2h ago', unread: false },
  { id: 5, type: 'success', text: 'Benefits enrollment completed', time: '3h ago', unread: false },
  { id: 6, type: 'agent', text: 'Operations Agent flagged 2 VPs below safety target', time: '4h ago', unread: false },
];

const BREADCRUMB_MAP = {
  '/': ['Command Center'],
  '/hr': ['Workspaces', 'HR'],
  '/hr/benefits': ['Workspaces', 'HR', 'Benefits'],
  '/hr/pay-rates': ['Workspaces', 'HR', 'Pay Rate Changes'],
  '/hr/leave': ['Workspaces', 'HR', 'Leave Management'],
  '/hr/unemployment': ['Workspaces', 'HR', 'Unemployment'],
  '/hr/union-calendar': ['Workspaces', 'HR', 'Union Calendar'],
  '/finance': ['Workspaces', 'Finance'],
  '/purchasing': ['Workspaces', 'Purchasing'],
  '/tools/qbu': ['Tools', 'Quarterly Review Builder'],
  '/tools/sales-deck': ['Tools', 'Proposal Builder'],
  '/tools/transition-plan': ['Tools', 'Transition Plan Builder'],
  '/tools/budget': ['Tools', 'Budget Builder'],
  '/tools/incident-report': ['Tools', 'Incident Report'],
  '/tools/training-plan': ['Tools', 'Training Plan'],
  '/sales': ['Workspaces', 'Sales'],
  '/sales/contracts': ['Workspaces', 'Sales', 'Contracts'],
  '/sales/apc': ['Workspaces', 'Sales', 'APC Tracker'],
  '/sales/tbi': ['Workspaces', 'Sales', 'TBI Tracker'],
  '/ops': ['Workspaces', 'Operations'],
  '/dashboards/action-plans': ['Analytics', 'Action Plans'],
  '/admin/users': ['Admin', 'User Management'],
  '/admin/knowledge': ['Admin', 'Knowledge Base'],
  '/admin/agents': ['Admin', 'Agent Management'],
  '/admin/settings': ['Admin', 'Settings'],
  '/admin/role-templates': ['Admin', 'Role Templates'],
  '/admin/dashboard-settings': ['Admin', 'Dashboard Defaults'],
  '/admin/automation': ['Admin', 'Automation Insights'],
};

export default function TopBar({ isMobile, onMenuToggle }) {
  const location = useLocation();
  const crumbs = BREADCRUMB_MAP[location.pathname] || ['Dashboard'];
  const { realIsAdmin, realUser, activeUsers, viewingAs, setViewingAs, clearViewingAs } = useUser();

  const [viewAsOpen, setViewAsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const viewAsRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!viewAsOpen && !notifOpen) return;
    function handleClick(e) {
      if (viewAsOpen && viewAsRef.current && !viewAsRef.current.contains(e.target)) {
        setViewAsOpen(false);
      }
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [viewAsOpen, notifOpen]);

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
          {/* Notifications dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Bell size={18} />
              {NOTIFICATIONS.some((n) => n.unread) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-aa-red rounded-full" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-dark-text">Notifications</span>
                  <span className="text-[10px] text-secondary-text">
                    {NOTIFICATIONS.filter((n) => n.unread).length} new
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {NOTIFICATIONS.map((n) => {
                    const Icon = NOTIF_ICONS[n.type];
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${
                          n.unread ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <div className={`p-1.5 rounded shrink-0 mt-0.5 ${NOTIF_COLORS[n.type]}`}>
                          <Icon size={12} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-dark-text leading-snug">{n.text}</div>
                          <div className="text-[11px] text-secondary-text mt-1">{n.time}</div>
                        </div>
                        {n.unread && (
                          <span className="w-1.5 h-1.5 bg-aa-blue rounded-full shrink-0 mt-2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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
