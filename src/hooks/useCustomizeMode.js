import { useState, useCallback, useRef } from 'react';
import { useDashboardConfigContext } from '../contexts/DashboardConfigContext';

/**
 * Hook for inline dashboard customization.
 * Manages draft state, save/cancel/reset flows, and dirty tracking.
 */
export default function useCustomizeMode(dashboardKey) {
  const { getConfig, getSource, updateUserConfig, resetUserConfig, refreshConfigs } = useDashboardConfigContext();
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const snapshotRef = useRef(null);

  const source = getSource ? getSource(dashboardKey) : 'default';

  const enterCustomize = useCallback(() => {
    // Take a snapshot of current resolved config to detect dirty
    const config = getConfig(dashboardKey);
    snapshotRef.current = JSON.stringify(config);
    setDraft(config ? JSON.parse(JSON.stringify(config)) : null);
    setIsCustomizing(true);
  }, [dashboardKey, getConfig]);

  const exitCustomize = useCallback(() => {
    setIsCustomizing(false);
    setDraft(null);
    snapshotRef.current = null;
  }, []);

  const updateDraft = useCallback((updater) => {
    setDraft(prev => {
      if (typeof updater === 'function') return updater(prev);
      return updater;
    });
  }, []);

  const saveDraft = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await updateUserConfig(dashboardKey, draft);
      setIsCustomizing(false);
      setDraft(null);
      snapshotRef.current = null;
    } catch (err) {
      console.error('[useCustomizeMode] Save failed:', err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [dashboardKey, draft, updateUserConfig]);

  const resetToDefaults = useCallback(async () => {
    setSaving(true);
    try {
      await resetUserConfig(dashboardKey);
      await refreshConfigs();
      setIsCustomizing(false);
      setDraft(null);
      snapshotRef.current = null;
    } catch (err) {
      console.error('[useCustomizeMode] Reset failed:', err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [dashboardKey, resetUserConfig, refreshConfigs]);

  const isDirty = draft !== null && JSON.stringify(draft) !== snapshotRef.current;

  return {
    isCustomizing,
    enterCustomize,
    exitCustomize,
    draft,
    updateDraft,
    saveDraft,
    resetToDefaults,
    isDirty,
    saving,
    source,
  };
}
