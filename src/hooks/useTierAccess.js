import { useMemo, useCallback } from 'react';
import { useTenantConfig } from '../contexts/TenantConfigContext';
import { useTenantPortal } from '../contexts/TenantPortalContext';
import { TIER_REGISTRY, TIER_KEYS } from '../data/tierRegistry';

const TIER_ORDER = { melmac: 0, orbit: 1, galaxy: 2 };

/**
 * Hook providing tier-based feature gating.
 * Uses tenant_module_registry from DB for tier requirements.
 *
 * When `tenantPlan` is null (no plan set), everything is allowed
 * for backwards compatibility with existing tenants.
 */
export default function useTierAccess() {
  const { tenantPlan } = useTenantConfig();
  const { moduleRegistry } = useTenantPortal();

  const tierKey = tenantPlan || null;
  const tier = tierKey ? TIER_REGISTRY[tierKey] : null;
  const tierLabel = tier?.label || '';

  // Build feature tier map from DB module registry
  const featureTierMap = useMemo(() => {
    const map = {};
    for (const mod of moduleRegistry) {
      if (mod.min_tier) {
        map[mod.module_key] = mod.min_tier;
      }
    }
    return map;
  }, [moduleRegistry]);

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
      const required = featureTierMap[featureKey];
      if (!required) return true; // unknown feature = allow
      return (TIER_ORDER[tierKey] ?? -1) >= (TIER_ORDER[required] ?? 99);
    },
    [tierKey, featureTierMap],
  );

  const requiredTier = useCallback(
    (featureKey) => featureTierMap[featureKey] || null,
    [featureTierMap],
  );

  const requiredTierLabel = useCallback(
    (featureKey) => {
      const key = featureTierMap[featureKey];
      return key ? TIER_REGISTRY[key]?.label || key : null;
    },
    [featureTierMap],
  );

  return { tierKey, tierLabel, hasFeature, requiredTier, requiredTierLabel, nextTierKey, nextTierLabel };
}
