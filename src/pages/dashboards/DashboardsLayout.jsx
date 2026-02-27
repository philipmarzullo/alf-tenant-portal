import { useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTenantConfig } from '../../contexts/TenantConfigContext';
import { MODULE_REGISTRY } from '../../data/moduleRegistry';

const ALL_TABS = MODULE_REGISTRY.dashboards.pages.map((p) => ({
  key: p.key,
  label: p.label,
  path: p.path,
}));

export default function DashboardsLayout() {
  const { getEnabledPages } = useTenantConfig();

  const tabs = useMemo(() => {
    const enabledKeys = getEnabledPages('dashboards');
    if (!enabledKeys) return ALL_TABS;
    return ALL_TABS.filter((t) => enabledKeys.includes(t.key));
  }, [getEnabledPages]);

  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-4">Dashboards</h1>

      {/* Tab nav */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/dashboards'}
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
      </div>

      <Outlet />
    </div>
  );
}
