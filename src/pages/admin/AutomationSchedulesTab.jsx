import { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock, Loader2, Plus, Trash2, Power, PowerOff,
  Clock, CheckCircle, XCircle, ChevronDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';

// ── Frequency presets ───────────────────────────────────────────────
const FREQUENCY_PRESETS = [
  { key: 'daily',     label: 'Every day',     cron: (h, m) => `${m} ${h} * * *` },
  { key: 'weekdays',  label: 'Every weekday', cron: (h, m) => `${m} ${h} * * 1-5` },
  { key: 'weekly',    label: 'Weekly',         cron: (h, m, d) => `${m} ${h} * * ${d}` },
  { key: 'monthly',   label: 'Monthly',        cron: (h, m, d) => `${m} ${h} ${d} * *` },
  { key: 'custom',    label: 'Custom cron',    cron: null },
];

const DAYS_OF_WEEK = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
];

const TIMEZONE_OPTIONS = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'UTC',
];

function formatCron(cron) {
  if (!cron) return '';
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [min, hour, dom, , dow] = parts;
  const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;

  if (dom === '*' && dow === '*') return `Daily at ${time}`;
  if (dom === '*' && dow === '1-5') return `Weekdays at ${time}`;
  if (dom === '*' && dow !== '*') {
    const day = DAYS_OF_WEEK.find(d => d.value === dow);
    return `${day?.label || dow} at ${time}`;
  }
  if (dow === '*' && dom !== '*') return `Monthly on day ${dom} at ${time}`;
  return cron;
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d - now;
  const absDiff = Math.abs(diffMs);
  const minutes = Math.round(absDiff / 60000);
  const hours = Math.round(absDiff / 3600000);
  const days = Math.round(absDiff / 86400000);

  if (diffMs > 0) {
    if (minutes < 60) return `in ${minutes}m`;
    if (hours < 24) return `in ${hours}h`;
    return `in ${days}d`;
  } else {
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
}

export default function AutomationSchedulesTab() {
  const { tenantId } = useTenantId();
  const [workflows, setWorkflows] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  // New schedule form
  const [showAdd, setShowAdd] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [hour, setHour] = useState('9');
  const [minute, setMinute] = useState('0');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [customCron, setCustomCron] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    const [wfRes, trigRes] = await Promise.all([
      supabase
        .from('workflow_definitions')
        .select('id, name, description, department, status')
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'draft'])
        .order('name'),
      supabase
        .from('workflow_triggers')
        .select(`
          id, workflow_definition_id, trigger_type, schedule_cron,
          schedule_timezone, is_active, last_triggered_at, next_trigger_at,
          workflow_definitions(name, department, status)
        `)
        .eq('tenant_id', tenantId)
        .eq('trigger_type', 'schedule')
        .order('created_at', { ascending: false }),
    ]);

    setWorkflows(wfRes.data || []);
    setTriggers(trigRes.data || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { loadData(); }, [loadData]);

  function buildCron() {
    const preset = FREQUENCY_PRESETS.find(p => p.key === frequency);
    if (!preset) return '';
    if (preset.key === 'custom') return customCron;
    if (preset.key === 'weekly') return preset.cron(hour, minute, dayOfWeek);
    if (preset.key === 'monthly') return preset.cron(hour, minute, dayOfMonth);
    return preset.cron(hour, minute);
  }

  async function handleAddSchedule(e) {
    e.preventDefault();
    if (!selectedWorkflow) return;
    const cron = buildCron();
    if (!cron) return;

    setSaving('add');
    const { error } = await supabase.from('workflow_triggers').insert({
      tenant_id: tenantId,
      workflow_definition_id: selectedWorkflow,
      trigger_type: 'schedule',
      schedule_cron: cron,
      schedule_timezone: timezone,
      is_active: true,
    });

    if (error) {
      console.error('[schedules] Add error:', error.message);
    } else {
      setShowAdd(false);
      setSelectedWorkflow('');
      setFrequency('daily');
      setHour('9');
      setMinute('0');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  const activeWorkflows = workflows.filter(w => w.status === 'active');
  // Workflows that don't already have a schedule trigger
  const schedulableWorkflows = activeWorkflows.filter(
    w => !triggers.some(t => t.workflow_definition_id === w.id)
  );

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Existing schedules */}
      {triggers.length === 0 && !showAdd ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <CalendarClock size={32} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-sm font-medium text-dark-text mb-1">No scheduled workflows</h3>
          <p className="text-xs text-secondary-text mb-4">
            Set up schedules to run workflows automatically at regular intervals.
          </p>
          {schedulableWorkflows.length > 0 && (
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-aa-blue text-white rounded-lg hover:bg-aa-blue/90 transition-colors"
            >
              <Plus size={16} />
              Add Schedule
            </button>
          )}
          {schedulableWorkflows.length === 0 && activeWorkflows.length === 0 && (
            <p className="text-xs text-secondary-text mt-2">
              Activate a workflow in the SOP Builder to enable scheduling.
            </p>
          )}
        </div>
      ) : (
        <>
          {triggers.map(trigger => {
            const wf = trigger.workflow_definitions;
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
                      <CalendarClock size={16} className={trigger.is_active ? 'text-aa-blue' : 'text-gray-400'} />
                      <div>
                        <div className="text-sm font-medium text-dark-text">
                          {wf?.name || 'Unknown Workflow'}
                        </div>
                        <div className="text-xs text-secondary-text mt-0.5">
                          {formatCron(trigger.schedule_cron)}
                          {trigger.schedule_timezone && trigger.schedule_timezone !== 'America/New_York'
                            ? ` (${trigger.schedule_timezone.split('/')[1]?.replace('_', ' ')})`
                            : ''}
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
                  {trigger.next_trigger_at && trigger.is_active && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      Next: {formatRelativeTime(trigger.next_trigger_at)}
                    </span>
                  )}
                  {trigger.last_triggered_at && (
                    <span className="flex items-center gap-1">
                      <CheckCircle size={10} />
                      Last: {formatRelativeTime(trigger.last_triggered_at)}
                    </span>
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 ml-7 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-secondary-text">Department</span>
                        <div className="font-medium text-dark-text mt-0.5">{wf?.department || '—'}</div>
                      </div>
                      <div>
                        <span className="text-secondary-text">Timezone</span>
                        <div className="font-medium text-dark-text mt-0.5">
                          {trigger.schedule_timezone?.split('/')[1]?.replace('_', ' ') || 'Eastern'}
                        </div>
                      </div>
                      <div>
                        <span className="text-secondary-text">Cron Expression</span>
                        <div className="font-mono font-medium text-dark-text mt-0.5">{trigger.schedule_cron}</div>
                      </div>
                      <div>
                        <span className="text-secondary-text">Status</span>
                        <div className="font-medium mt-0.5">
                          {wf?.status === 'active' ? (
                            <span className="text-green-700">Active</span>
                          ) : (
                            <span className="text-amber-600">{wf?.status}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      {confirmingDelete === trigger.id ? (
                        <>
                          <button
                            onClick={() => { handleDelete(trigger.id); setConfirmingDelete(null); }}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmingDelete(null)}
                            className="px-3 py-1.5 text-xs text-secondary-text hover:text-dark-text transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmingDelete(trigger.id)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          Remove Schedule
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add schedule button */}
          {!showAdd && schedulableWorkflows.length > 0 && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-aa-blue hover:text-aa-blue/80 transition-colors"
            >
              <Plus size={16} />
              Add Schedule
            </button>
          )}
        </>
      )}

      {/* Add schedule form */}
      {showAdd && (
        <form onSubmit={handleAddSchedule} className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-dark-text">New Schedule</h3>
            <button type="button" onClick={() => setShowAdd(false)} className="text-secondary-text hover:text-dark-text">
              <XCircle size={16} />
            </button>
          </div>

          {/* Workflow selector */}
          <div>
            <label className="block text-xs font-medium text-dark-text mb-1">Workflow</label>
            {schedulableWorkflows.length > 0 ? (
              <select
                value={selectedWorkflow}
                onChange={e => setSelectedWorkflow(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
              >
                <option value="">Select a workflow...</option>
                {schedulableWorkflows.map(wf => (
                  <option key={wf.id} value={wf.id}>
                    {wf.name}{wf.department ? ` (${wf.department})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-secondary-text">All active workflows already have schedules.</p>
            )}
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-medium text-dark-text mb-1">Frequency</label>
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
            >
              {FREQUENCY_PRESETS.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Time picker */}
          {frequency !== 'custom' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-dark-text mb-1">Hour</label>
                <select
                  value={hour}
                  onChange={e => setHour(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={String(i)}>
                      {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-dark-text mb-1">Minute</label>
                <select
                  value={minute}
                  onChange={e => setMinute(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={String(m)}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Day selector (weekly) */}
          {frequency === 'weekly' && (
            <div>
              <label className="block text-xs font-medium text-dark-text mb-1">Day of Week</label>
              <select
                value={dayOfWeek}
                onChange={e => setDayOfWeek(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
              >
                {DAYS_OF_WEEK.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Day selector (monthly) */}
          {frequency === 'monthly' && (
            <div>
              <label className="block text-xs font-medium text-dark-text mb-1">Day of Month</label>
              <select
                value={dayOfMonth}
                onChange={e => setDayOfMonth(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
              >
                {Array.from({ length: 28 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                ))}
              </select>
            </div>
          )}

          {/* Custom cron */}
          {frequency === 'custom' && (
            <div>
              <label className="block text-xs font-medium text-dark-text mb-1">Cron Expression</label>
              <input
                type="text"
                value={customCron}
                onChange={e => setCustomCron(e.target.value)}
                placeholder="e.g. 0 9 * * 1-5"
                className="w-full text-sm font-mono border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
              />
              <p className="text-[11px] text-secondary-text mt-1">
                Format: minute hour day-of-month month day-of-week
              </p>
            </div>
          )}

          {/* Timezone */}
          <div>
            <label className="block text-xs font-medium text-dark-text mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
            >
              {TIMEZONE_OPTIONS.map(tz => (
                <option key={tz} value={tz}>
                  {tz.split('/')[1]?.replace('_', ' ') || tz}
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          {frequency !== 'custom' && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-secondary-text">Preview</div>
              <div className="text-sm font-medium text-dark-text mt-0.5">
                {formatCron(buildCron())}
              </div>
              <div className="text-xs font-mono text-secondary-text mt-0.5">
                {buildCron()}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!selectedWorkflow || saving === 'add' || (frequency === 'custom' && !customCron.trim())}
              className="px-4 py-2 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving === 'add' && <Loader2 size={14} className="animate-spin" />}
              Create Schedule
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
