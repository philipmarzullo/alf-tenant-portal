import { useMemo, useCallback } from 'react';
import { useTenantConfig } from '../contexts/TenantConfigContext';
import { TIER_REGISTRY, TIER_KEYS } from '../data/tierRegistry';

/**
 * Maps feature keys to the minimum tier required.
 * Module keys come from TIER_REGISTRY; capability keys are extras.
 */
const FEATURE_TIER_MAP = {
  // Module-level (from TIER_REGISTRY)
  dashboards: 'melmac',
  analytics: 'melmac',
  tools: 'orbit',
  actionPlans: 'orbit',
  knowledge: 'orbit',
  hr: 'galaxy',
  finance: 'galaxy',
  purchasing: 'galaxy',
  sales: 'galaxy',
  ops: 'galaxy',
  automation: 'galaxy',
  // Capability-level
  agentChat: 'orbit',
  customToolBuilder: 'orbit',
};

const TIER_ORDER = { melmac: 0, orbit: 1, galaxy: 2 };

/**
 * Hook providing tier-based feature gating.
 *
 * When `tenantPlan` is null (no plan set), everything is allowed
 * for backwards compatibility with existing tenants.
 */
export default function useTierAccess() {
  const { tenantPlan } = useTenantConfig();

  const tierKey = tenantPlan || null;
  const tier = tierKey ? TIER_REGISTRY[tierKey] : null;
  const tierLabel = tier?.label || '';

  const nextTierKey = useMemo(() => {
    if (!tierKey) return null;
    const idx = TIER_KEYS.indexOf(tierKey);
    if (idx < 0 || idx >= TIER_KEYS.length - 1) return null;
    return TIER_KEYS[idx + 1];
  }, [tierKey]);

  const nextTierLabel = nextTierKey ? TIER_REGISTRY[nextTierKey]?.label || null : null;

  const hasFeature = useCallback(
    (featureKey) => {
      if (!tierKey) return true; // no plan = allow all
      const required = FEATURE_TIER_MAP[featureKey];
      if (!required) return true; // unknown feature = allow
      return (TIER_ORDER[tierKey] ?? -1) >= (TIER_ORDER[required] ?? 99);
    },
    [tierKey],
  );

  const requiredTier = useCallback(
    (featureKey) => FEATURE_TIER_MAP[featureKey] || null,
    [],
  );

  const requiredTierLabel = useCallback(
    (featureKey) => {
      const key = FEATURE_TIER_MAP[featureKey];
      return key ? TIER_REGISTRY[key]?.label || key : null;
    },
    [],
  );

  return { tierKey, tierLabel, hasFeature, requiredTier, requiredTierLabel, nextTierKey, nextTierLabel };
}
