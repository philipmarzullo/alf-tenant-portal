import { useMemo } from 'react';
import { useDashboardConfigContext } from '../contexts/DashboardConfigContext';
import { resolveConfig, resolveHomeConfig } from '../data/dashboardKPIRegistry';

/**
 * Convenience hook for domain dashboards.
 * Returns resolved { kpis, charts } with tenant labels merged over registry defaults.
 * If no config exists for this dashboard, returns registry defaults (all visible).
 */
export default function useDashboardConfig(dashboardKey) {
  const { getConfig, loading } = useDashboardConfigContext();
  const config = getConfig(dashboardKey);

  const resolved = useMemo(() => resolveConfig(dashboardKey, config), [dashboardKey, config]);

  return { ...resolved, configLoading: loading };
}

/**
 * Convenience hook for the home dashboard.
 * Returns resolved { heroMetrics, workspaceCards, sections }.
 */
export function useHomeConfig() {
  const { getConfig, loading } = useDashboardConfigContext();
  const config = getConfig('home');

  const resolved = useMemo(() => resolveHomeConfig(config), [config]);

  return { ...resolved, configLoading: loading };
}
