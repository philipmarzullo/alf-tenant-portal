import { Search, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';

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
  '/admin/agents': ['Admin', 'Agent Management'],
  '/admin/settings': ['Admin', 'Settings'],
};

export default function TopBar() {
  const location = useLocation();
  const crumbs = BREADCRUMB_MAP[location.pathname] || ['Dashboard'];

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
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
        <span className="text-xs text-secondary-text">{today}</span>
      </div>
    </div>
  );
}
