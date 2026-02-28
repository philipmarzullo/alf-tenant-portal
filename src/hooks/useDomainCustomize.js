import { useCallback } from 'react';
import useCustomizeMode from './useCustomizeMode';
import { useRBAC } from '../contexts/RBACContext';
import { resolveConfig } from '../data/dashboardKPIRegistry';

/**
 * Wraps useCustomizeMode with domain-specific draft update helpers.
 * Returns everything from useCustomizeMode plus reorder/toggle/rename helpers for KPIs and charts.
 * Tier-filters KPIs/charts — hidden tier metrics never appear, even in customize mode.
 */
export default function useDomainCustomize(domain) {
  const mode = useCustomizeMode(domain);
  const { draft, updateDraft } = mode;
  const { metricTier } = useRBAC();

  const reorderKpis = useCallback((newIdOrder) => {
    updateDraft(prev => {
      const config = prev || {};
      const current = resolveConfig(domain, config, metricTier).kpis;
      const map = {};
      for (const k of current) map[k.id] = k;
      return { ...config, kpis: newIdOrder.map((id, i) => ({ ...map[id], order: i })) };
    });
  }, [domain, metricTier, updateDraft]);

  const toggleKpi = useCallback((id) => {
    updateDraft(prev => {
      const config = prev || {};
      const current = resolveConfig(domain, config, metricTier).kpis;
      return { ...config, kpis: current.map(k => k.id === id ? { ...k, visible: !k.visible } : k) };
    });
  }, [domain, metricTier, updateDraft]);

  const renameKpi = useCallback((id, label) => {
    updateDraft(prev => {
      const config = prev || {};
      const current = resolveConfig(domain, config, metricTier).kpis;
      return { ...config, kpis: current.map(k => k.id === id ? { ...k, label } : k) };
    });
  }, [domain, metricTier, updateDraft]);

  const reorderCharts = useCallback((newIdOrder) => {
    updateDraft(prev => {
      const config = prev || {};
      const current = resolveConfig(domain, config, metricTier).charts;
      const map = {};
      for (const c of current) map[c.id] = c;
      return { ...config, charts: newIdOrder.map((id, i) => ({ ...map[id], order: i })) };
    });
  }, [domain, metricTier, updateDraft]);

  const toggleChart = useCallback((id) => {
    updateDraft(prev => {
      const config = prev || {};
      const current = resolveConfig(domain, config, metricTier).charts;
      return { ...config, charts: current.map(c => c.id === id ? { ...c, visible: !c.visible } : c) };
    });
  }, [domain, metricTier, updateDraft]);

  const renameChart = useCallback((id, label) => {
    updateDraft(prev => {
      const config = prev || {};
      const current = resolveConfig(domain, config, metricTier).charts;
      return { ...config, charts: current.map(c => c.id === id ? { ...c, label } : c) };
    });
  }, [domain, metricTier, updateDraft]);

  return {
    ...mode,
    reorderKpis,
    toggleKpi,
    renameKpi,
    reorderCharts,
    toggleChart,
    renameChart,
  };
}
