import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { label: 'Overview', path: '/hr' },
  { label: 'Benefits', path: '/hr/benefits' },
  { label: 'Pay Rate Changes', path: '/hr/pay-rates' },
  { label: 'Leave Management', path: '/hr/leave' },
  { label: 'Unemployment', path: '/hr/unemployment' },
  { label: 'Union Calendar', path: '/hr/union-calendar' },
];

export default function HRLayout() {
  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-4">HR Workspace</h1>

      {/* Tab nav */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/hr'}
            className={({ isActive }) =>
              `px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'text-aa-blue border-aa-blue'
                  : 'text-secondary-text border-transparent hover:text-dark-text hover:border-gray-300'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
        {/* Extensibility hint */}
        <div className="px-3 py-2.5 text-sm text-gray-300 border-b-2 border-transparent -mb-px">
          + More
        </div>
      </div>

      <Outlet />
    </div>
  );
}
