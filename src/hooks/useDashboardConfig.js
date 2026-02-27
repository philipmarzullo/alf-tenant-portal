import { useMemo } from 'react';
import { useDashboardConfigContext } from '../contexts/DashboardConfigContext';
import { resolveConfig, resolveHomeConfig } from '../data/dashboardKPIRegistry';

/**
 * Convenience hook for domain dashboards.
 * Returns resolved { kpis, charts, configLoading, source } with tenant labels merged over registry defaults.
 * If no config exists for this dashboard, returns registry defaults (all visible).
 */
export default function useDashboardConfig(dashboardKey) {
  const { getConfig, getSource, loading } = useDashboardConfigContext();
  const config = getConfig(dashboardKey);
  const source = getSource ? getSource(dashboardKey) : 'default';

  const resolved = useMemo(() => resolveConfig(dashboardKey, config), [dashboardKey, config]);

  return { ...resolved, configLoading: loading, source };
}

/**
 * Convenience hook for the home dashboard.
 * Returns resolved { heroMetrics, workspaceCards, sections, configLoading, source }.
 */
export function useHomeConfig() {
  const { getConfig, getSource, loading } = useDashboardConfigContext();
  const config = getConfig('home');
  const source = getSource ? getSource('home') : 'default';

  const resolved = useMemo(() => resolveHomeConfig(config), [config]);

  return { ...resolved, configLoading: loading, source };
}
