import { useCallback } from 'react';
import useCustomizeMode from './useCustomizeMode';
import { resolveConfig } from '../data/dashboardKPIRegistry';

/**
 * Wraps useCustomizeMode with domain-specific draft update helpers.
 * Returns everything from useCustomizeMode plus reorder/toggle/rename helpers for KPIs and charts.
 */
export default function useDomainCustomize(domain) {
  const mode = useCustomizeMode(domain);
  const { draft, updateDraft } = mode;

  const reorderKpis = useCallback((newIdOrder) => {
    updateDraft(prev => {
      const config = prev || {};
      const current = resolveConfig(domain, config).kpis;
      const map = {};
      for (const k of current) map[k.id] = k;
      return { ...config, kpis: newIdOrder.map((id, i) => ({ ...map[id], order: i })) };
    });
  }, [domain, updateDraft]);

  const toggleKpi = useCallback((id) => {
    updateDraft(prev => {
      const config = prev || {};
      const current = resolveConfig(domain, config).kpis;
      return { ...config, kpis: current.map(k => k.id === id ? { ...k, visible: !k.visible } : k) };
    });
  }, [domain, updateDraft]);

  const renameKpi = useCallback((id, label) => {
    updateDraft(prev => {
      const config = prev || {};
      const current = resolveConfig(domain, config).kpis;
      return { ...config, kpis: current.map(k => k.id === id ? { ...k, label } : k) };
    });
  }, [domain, updateDraft]);

  const reorderCharts = useCallback((newIdOrder) => {
    updateDraft(prev => {
      const config = prev || {};
      const current = resolveConfig(domain, config).charts;
      const map = {};
      for (const c of current) map[c.id] = c;
      return { ...config, charts: newIdOrder.map((id, i) => ({ ...map[id], order: i })) };
    });
  }, [domain, updateDraft]);

  const toggleChart = useCallback((id) => {
    updateDraft(prev => {
      const config = prev || {};
      const current = resolveConfig(domain, config).charts;
      return { ...config, charts: current.map(c => c.id === id ? { ...c, visible: !c.visible } : c) };
    });
  }, [domain, updateDraft]);

  const renameChart = useCallback((id, label) => {
    updateDraft(prev => {
      const config = prev || {};
      const current = resolveConfig(domain, config).charts;
      return { ...config, charts: current.map(c => c.id === id ? { ...c, label } : c) };
    });
  }, [domain, updateDraft]);

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
