import { useMemo } from 'react';
import { useDashboardConfigContext } from '../contexts/DashboardConfigContext';
import { useRBAC } from '../contexts/RBACContext';
import { resolveConfig, resolveHomeConfig } from '../data/dashboardKPIRegistry';

/**
 * Convenience hook for domain dashboards.
 * Returns resolved { kpis, charts, configLoading, source } with tenant labels merged over registry defaults.
 * If no config exists for this dashboard, returns registry defaults (all visible).
 * Filters out metrics above the user's tier via RBACContext.
 */
export default function useDashboardConfig(dashboardKey) {
  const { getConfig, getSource, loading } = useDashboardConfigContext();
  const { metricTier } = useRBAC();
  const config = getConfig(dashboardKey);
  const source = getSource ? getSource(dashboardKey) : 'default';

  const resolved = useMemo(
    () => resolveConfig(dashboardKey, config, metricTier),
    [dashboardKey, config, metricTier]
  );

  return { ...resolved, configLoading: loading, source };
}

/**
 * Convenience hook for the home dashboard.
 * Returns resolved { heroMetrics, workspaceCards, sections, configLoading, source }.
 * Filters out hero metrics above the user's tier.
 */
export function useHomeConfig() {
  const { getConfig, getSource, loading } = useDashboardConfigContext();
  const { metricTier } = useRBAC();
  const config = getConfig('home');
  const source = getSource ? getSource('home') : 'default';

  const resolved = useMemo(
    () => resolveHomeConfig(config, metricTier),
    [config, metricTier]
  );

  return { ...resolved, configLoading: loading, source };
}
