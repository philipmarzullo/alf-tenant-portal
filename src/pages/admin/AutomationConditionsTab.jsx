import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Loader2, Plus, Trash2, Power, PowerOff,
  Clock, CheckCircle, XCircle, ChevronDown, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';

function formatRelativeTime(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const absDiff = Math.abs(d - now);
  const minutes = Math.round(absDiff / 60000);
  const hours = Math.round(absDiff / 3600000);
  const days = Math.round(absDiff / 86400000);

  if (d < now) {
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
  return null;
}

const COOLDOWN_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
  { value: 1440, label: '24 hours' },
];

const OPERATOR_LABELS = {
  gt: 'exceeds',
  gte: 'reaches',
  lt: 'drops below',
  lte: 'is at or below',
};

export default function AutomationConditionsTab() {
  const { tenantId } = useTenantId();
  const [workflows, setWorkflows] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // New condition form
  const [showAdd, setShowAdd] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('');
  const [selectedThreshold, setSelectedThreshold] = useState('');
  const [cooldownMinutes, setCooldownMinutes] = useState(60);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    const [wfRes, metRes, thrRes, trigRes] = await Promise.all([
      supabase
        .from('workflow_definitions')
        .select('id, name, description, department, status')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('tenant_metrics')
        .select('id, metric_key, label, format, domain_key')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('label'),
      supabase
        .from('tenant_metric_thresholds')
        .select('id, metric_id, operator, threshold_value, priority, scope, description_template')
        .eq('tenant_id', tenantId)
        .eq('is_active', true),
      supabase
        .from('workflow_triggers')
        .select(`
          id, workflow_definition_id, event_source, event_config,
          is_active, last_triggered_at,
          workflow_definitions(name, department, status)
        `)
        .eq('tenant_id', tenantId)
        .eq('trigger_type', 'event')
        .eq('event_source', 'metric_threshold')
        .order('created_at', { ascending: false }),
    ]);

    setWorkflows(wfRes.data || []);
    setMetrics(metRes.data || []);
    setThresholds(thrRes.data || []);
    setTriggers(trigRes.data || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-select first threshold when metric changes
  useEffect(() => {
    if (selectedMetric) {
      const matching = thresholds.filter(t => t.metric_id === selectedMetric);
      setSelectedThreshold(matching.length === 1 ? matching[0].id : '');
    } else {
      setSelectedThreshold('');
    }
  }, [selectedMetric, thresholds]);

  async function handleAddCondition(e) {
    e.preventDefault();
    if (!selectedWorkflow || !selectedMetric) return;

    setSaving('add');
    const { error } = await supabase.from('workflow_triggers').insert({
      tenant_id: tenantId,
      workflow_definition_id: selectedWorkflow,
      trigger_type: 'event',
      event_source: 'metric_threshold',
      event_config: {
        metric_id: selectedMetric,
        threshold_id: selectedThreshold || null,
        cooldown_minutes: cooldownMinutes,
      },
      is_active: true,
    });

    if (error) {
      console.error('[conditions] Add error:', error.message);
    } else {
      setShowAdd(false);
      setSelectedWorkflow('');
      setSelectedMetric('');
      setSelectedThreshold('');
      setCooldownMinutes(60);
      await loadData();
    }
    setSaving(null);
  }

  async function handleToggle(triggerId, currentActive) {
    setSaving(triggerId);
    await supabase.from('workflow_triggers').update({
      is_active: !currentActive,
      updated_at: new Date().toISOString(),
    }).eq('id', triggerId);
    await loadData();
    setSaving(null);
  }

  async function handleDelete(triggerId) {
    setSaving(triggerId);
    await supabase.from('workflow_triggers').delete().eq('id', triggerId);
    await loadData();
    setSaving(null);
  }

  function getMetricLabel(metricId) {
    return metrics.find(m => m.id === metricId)?.label || 'Unknown metric';
  }

  function getThresholdSummary(trigger) {
    const config = trigger.event_config || {};
    const metric = metrics.find(m => m.id === config.metric_id);
    const threshold = thresholds.find(t => t.id === config.threshold_id);

    if (!metric) return 'Unknown metric condition';

    if (threshold) {
      const opLabel = OPERATOR_LABELS[threshold.operator] || threshold.operator;
      return `When ${metric.label} ${opLabel} ${threshold.threshold_value}`;
    }
    return `When any ${metric.label} threshold is breached`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  const metricThresholds = selectedMetric
    ? thresholds.filter(t => t.metric_id === selectedMetric)
    : [];

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Existing condition triggers */}
      {triggers.length === 0 && !showAdd ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Activity size={32} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-sm font-medium text-dark-text mb-1">No condition triggers</h3>
          <p className="text-xs text-secondary-text mb-4">
            Set up data conditions to automatically trigger workflows when metric thresholds are breached.
          </p>
          {workflows.length > 0 && metrics.length > 0 ? (
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-aa-blue text-white rounded-lg hover:bg-aa-blue/90 transition-colors"
            >
              <Plus size={16} />
              Add Condition Trigger
            </button>
          ) : (
            <p className="text-xs text-secondary-text mt-2">
              {!workflows.length
                ? 'Activate a workflow in the SOP Builder first.'
                : 'Set up metrics and thresholds in your dashboard configuration first.'}
            </p>
          )}
        </div>
      ) : (
        <>
          {triggers.map(trigger => {
            const wf = trigger.workflow_definitions;
            const config = trigger.event_config || {};
            const isExpanded = expandedId === trigger.id;
            const isSaving = saving === trigger.id;

            return (
              <div key={trigger.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : trigger.id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={16} className={trigger.is_active ? 'text-amber-500' : 'text-gray-400'} />
                      <div>
                        <div className="text-sm font-medium text-dark-text">
                          {wf?.name || 'Unknown Workflow'}
                        </div>
                        <div className="text-xs text-secondary-text mt-0.5">
                          {getThresholdSummary(trigger)}
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    {trigger.is_active ? (
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    ) : (
                      <span className="text-[11px] text-secondary-text">Paused</span>
                    )}
                    <button
                      onClick={() => handleToggle(trigger.id, trigger.is_active)}
                      disabled={isSaving}
                      className="p-1 text-secondary-text hover:text-dark-text transition-colors disabled:opacity-50"
                      title={trigger.is_active ? 'Pause' : 'Resume'}
                    >
                      {isSaving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : trigger.is_active ? (
                        <Power size={14} />
                      ) : (
                        <PowerOff size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : trigger.id)}
                      className="p-1 text-secondary-text hover:text-dark-text transition-colors"
                    >
                      <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Timing info */}
                <div className="flex items-center gap-4 mt-2 ml-7 text-xs text-secondary-text">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    Cooldown: {config.cooldown_minutes || 60}min
                  </span>
                  {trigger.last_triggered_at && (
                    <span className="flex items-center gap-1">
                      <CheckCircle size={10} />
                      Last fired: {formatRelativeTime(trigger.last_triggered_at)}
                    </span>
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 ml-7 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-secondary-text">Metric</span>
                        <div className="font-medium text-dark-text mt-0.5">
                          {getMetricLabel(config.metric_id)}
                        </div>
                      </div>
                      <div>
                        <span className="text-secondary-text">Department</span>
                        <div className="font-medium text-dark-text mt-0.5">{wf?.department || '—'}</div>
                      </div>
                      <div>
                        <span className="text-secondary-text">Cooldown</span>
                        <div className="font-medium text-dark-text mt-0.5">
                          {COOLDOWN_OPTIONS.find(c => c.value === (config.cooldown_minutes || 60))?.label
                            || `${config.cooldown_minutes} minutes`}
                        </div>
                      </div>
                      <div>
                        <span className="text-secondary-text">Workflow Status</span>
                        <div className="font-medium mt-0.5">
                          {wf?.status === 'active' ? (
                            <span className="text-green-700">Active</span>
                          ) : (
                            <span className="text-amber-600">{wf?.status}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleDelete(trigger.id)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        Remove Condition
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add condition button */}
          {!showAdd && workflows.length > 0 && metrics.length > 0 && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-aa-blue hover:text-aa-blue/80 transition-colors"
            >
              <Plus size={16} />
              Add Condition Trigger
            </button>
          )}
        </>
      )}

      {/* Add condition form */}
      {showAdd && (
        <form onSubmit={handleAddCondition} className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-dark-text">New Condition Trigger</h3>
            <button type="button" onClick={() => setShowAdd(false)} className="text-secondary-text hover:text-dark-text">
              <XCircle size={16} />
            </button>
          </div>

          {/* Workflow selector */}
          <div>
            <label className="block text-xs font-medium text-dark-text mb-1">Workflow</label>
            <select
              value={selectedWorkflow}
              onChange={e => setSelectedWorkflow(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
            >
              <option value="">Select a workflow...</option>
              {workflows.map(wf => (
                <option key={wf.id} value={wf.id}>
                  {wf.name}{wf.department ? ` (${wf.department})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Metric selector */}
          <div>
            <label className="block text-xs font-medium text-dark-text mb-1">Metric</label>
            <select
              value={selectedMetric}
              onChange={e => setSelectedMetric(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
            >
              <option value="">Select a metric...</option>
              {metrics.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label}{m.domain_key ? ` (${m.domain_key})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Threshold selector (auto-populated from selected metric) */}
          {selectedMetric && metricThresholds.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-dark-text mb-1">Threshold</label>
              <select
                value={selectedThreshold}
                onChange={e => setSelectedThreshold(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
              >
                <option value="">Any threshold breach</option>
                {metricThresholds.map(t => (
                  <option key={t.id} value={t.id}>
                    {OPERATOR_LABELS[t.operator] || t.operator} {t.threshold_value} ({t.priority})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedMetric && metricThresholds.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                No thresholds configured for this metric. Set up thresholds in your dashboard configuration first.
              </p>
            </div>
          )}

          {/* Cooldown */}
          <div>
            <label className="block text-xs font-medium text-dark-text mb-1">Cooldown Period</label>
            <select
              value={cooldownMinutes}
              onChange={e => setCooldownMinutes(Number(e.target.value))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
            >
              {COOLDOWN_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-secondary-text mt-1">
              Minimum time between repeated triggers for the same condition.
            </p>
          </div>

          {/* Preview */}
          {selectedWorkflow && selectedMetric && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-secondary-text">Preview</div>
              <div className="text-sm font-medium text-dark-text mt-0.5">
                When <span className="text-amber-600">{getMetricLabel(selectedMetric)}</span> threshold is breached,
                run <span className="text-aa-blue">{workflows.find(w => w.id === selectedWorkflow)?.name}</span>
              </div>
              <div className="text-xs text-secondary-text mt-1">
                Cooldown: {COOLDOWN_OPTIONS.find(c => c.value === cooldownMinutes)?.label}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!selectedWorkflow || !selectedMetric || saving === 'add'}
              className="px-4 py-2 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving === 'add' && <Loader2 size={14} className="animate-spin" />}
              Create Condition
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm text-secondary-text hover:text-dark-text transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
