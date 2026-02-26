import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getAllAgents, getSourceAgentConfig } from '../../agents/registry';
import { saveOverride, clearOverride, hasOverride, classifyTemplate, extractTemplateText } from '../../agents/overrides';
import { useToast } from '../../components/shared/ToastProvider';
import AgentCard from '../../components/admin/AgentCard';
import AgentDetailPanel from '../../components/admin/AgentDetailPanel';
import AgentEditWarningModal from '../../components/admin/AgentEditWarningModal';

const usageData = Array.from({ length: 14 }, (_, i) => ({
  day: `Feb ${i + 10}`,
  calls: Math.floor(Math.random() * 40) + 15,
}));

const MOCK_STATS = {
  hr: { today: 12, week: 67, month: 284, lastInvoked: '2 minutes ago', errors: 0 },
  finance: { today: 0, week: 0, month: 0, lastInvoked: 'Never', errors: 0 },
  purchasing: { today: 0, week: 0, month: 0, lastInvoked: 'Never', errors: 0 },
  qbu: { today: 2, week: 8, month: 31, lastInvoked: '4 hours ago', errors: 0 },
  sales: { today: 4, week: 22, month: 89, lastInvoked: '1 hour ago', errors: 0 },
  ops: { today: 6, week: 34, month: 142, lastInvoked: '15 minutes ago', errors: 0 },
  admin: { today: 3, week: 18, month: 74, lastInvoked: '45 minutes ago', errors: 0 },
  salesDeck: { today: 1, week: 5, month: 19, lastInvoked: 'Yesterday', errors: 0 },
};

function buildDraft(agent) {
  const actionTemplates = {};
  if (agent.actions) {
    for (const [key, action] of Object.entries(agent.actions)) {
      const analysis = classifyTemplate(action.promptTemplate);
      if (analysis.type === 'simple') {
        actionTemplates[key] = extractTemplateText(action.promptTemplate);
      }
    }
  }
  return {
    name: agent.name,
    status: agent.status,
    model: agent.model,
    maxTokens: agent.maxTokens,
    systemPrompt: agent.systemPrompt,
    actionTemplates,
  };
}

export default function AgentManagement() {
  const [agents, setAgents] = useState(() => getAllAgents());
  const [expandedKey, setExpandedKey] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [modal, setModal] = useState(null);
  const toast = useToast();

  const refreshAgents = useCallback(() => setAgents(getAllAgents()), []);

  const getDraft = (key) => {
    if (drafts[key]) return drafts[key];
    const agent = agents.find((a) => a.key === key);
    return agent ? buildDraft(agent) : {};
  };

  const isDirty = (key) => {
    if (!drafts[key]) return false;
    const agent = agents.find((a) => a.key === key);
    if (!agent) return false;
    const original = buildDraft(agent);
    return JSON.stringify(drafts[key]) !== JSON.stringify(original);
  };

  // --- Toggle expand ---
  const handleToggle = (key) => {
    if (expandedKey === key) {
      // Collapsing — check for unsaved changes
      if (editingKey === key && isDirty(key)) {
        setModal({
          type: 'discard',
          agentKey: key,
          title: 'Discard unsaved changes?',
          message: 'You have unsaved changes. Closing will discard them.',
          confirmLabel: 'Discard',
          confirmVariant: 'danger',
          onConfirm: () => {
            setEditingKey(null);
            setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
            setExpandedKey(null);
            setModal(null);
          },
        });
        return;
      }
      setEditingKey(null);
      setExpandedKey(null);
      return;
    }

    // Expanding a different one while editing current with changes
    if (editingKey && editingKey !== key && isDirty(editingKey)) {
      setModal({
        type: 'discard',
        agentKey: editingKey,
        title: 'Discard unsaved changes?',
        message: `You have unsaved changes on ${agents.find((a) => a.key === editingKey)?.name || 'the current agent'}. Switching agents will discard them.`,
        confirmLabel: 'Discard',
        confirmVariant: 'danger',
        onConfirm: () => {
          setEditingKey(null);
          setDrafts((d) => { const n = { ...d }; delete n[editingKey]; return n; });
          setExpandedKey(key);
          setModal(null);
        },
      });
      return;
    }

    setEditingKey(null);
    setExpandedKey(key);
  };

  // --- Edit mode ---
  const handleStartEdit = (key) => {
    setModal({
      type: 'editWarn',
      agentKey: key,
      title: 'Edit agent configuration?',
      message: 'Changes affect how this AI agent responds across the portal. Overrides are stored locally and can be reset at any time.',
      confirmLabel: 'Edit Agent',
      confirmVariant: 'primary',
      onConfirm: () => {
        const agent = agents.find((a) => a.key === key);
        if (agent && !drafts[key]) {
          setDrafts((d) => ({ ...d, [key]: buildDraft(agent) }));
        }
        setEditingKey(key);
        setModal(null);
      },
    });
  };

  // --- Draft updates ---
  const handleDraftChange = (key, field, value) => {
    setDrafts((d) => ({
      ...d,
      [key]: { ...(d[key] || getDraft(key)), [field]: value },
    }));
  };

  const handleActionDraftChange = (agentKey, actionKey, text) => {
    setDrafts((d) => {
      const current = d[agentKey] || getDraft(agentKey);
      return {
        ...d,
        [agentKey]: {
          ...current,
          actionTemplates: { ...current.actionTemplates, [actionKey]: text },
        },
      };
    });
  };

  // --- Save ---
  const handleSave = (key) => {
    const agent = agents.find((a) => a.key === key);
    if (!agent) return;

    setModal({
      type: 'save',
      agentKey: key,
      title: `Save changes to ${agent.name}?`,
      message: 'These overrides will persist across page refreshes and affect all agent calls.',
      confirmLabel: 'Save',
      confirmVariant: 'primary',
      onConfirm: () => {
        const draft = getDraft(key);
        const source = getSourceAgentConfig(key);
        const override = {};

        // Only store fields that differ from source
        if (draft.model !== source.model) override.model = draft.model;
        if (draft.maxTokens !== source.maxTokens) override.maxTokens = draft.maxTokens;
        if (draft.systemPrompt !== source.systemPrompt) override.systemPrompt = draft.systemPrompt;
        if (draft.status !== source.status) override.status = draft.status;
        if (draft.name !== source.name) override.name = draft.name;

        // Action template overrides
        if (draft.actionTemplates) {
          const actionOverrides = {};
          for (const [actionKey, text] of Object.entries(draft.actionTemplates)) {
            const sourceAction = source.actions?.[actionKey];
            if (sourceAction) {
              const sourceText = extractTemplateText(sourceAction.promptTemplate);
              if (text !== sourceText) {
                actionOverrides[actionKey] = { promptTemplateText: text };
              }
            }
          }
          if (Object.keys(actionOverrides).length > 0) {
            override.actions = actionOverrides;
          }
        }

        if (Object.keys(override).length > 0) {
          saveOverride(key, override);
        } else {
          clearOverride(key);
        }

        setEditingKey(null);
        setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
        refreshAgents();
        setModal(null);
        toast('Agent configuration saved', 'success');
      },
    });
  };

  // --- Discard ---
  const handleDiscard = (key) => {
    if (!isDirty(key)) {
      setEditingKey(null);
      setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
      return;
    }
    setModal({
      type: 'discard',
      agentKey: key,
      title: 'Discard changes?',
      message: 'Any unsaved changes will be lost.',
      confirmLabel: 'Discard',
      confirmVariant: 'danger',
      onConfirm: () => {
        setEditingKey(null);
        setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
        setModal(null);
      },
    });
  };

  // --- Reset to default ---
  const handleReset = (key) => {
    const agent = agents.find((a) => a.key === key);
    setModal({
      type: 'reset',
      agentKey: key,
      title: `Reset ${agent?.name || 'agent'} to defaults?`,
      message: 'This will remove all saved overrides and restore the original source-code configuration.',
      confirmLabel: 'Reset to Default',
      confirmVariant: 'danger',
      onConfirm: () => {
        clearOverride(key);
        setEditingKey(null);
        setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
        refreshAgents();
        setModal(null);
        toast('Agent reset to default configuration', 'success');
      },
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-light text-dark-text mb-2">Agent Management</h1>
      <p className="text-sm text-secondary-text mb-6 max-w-2xl">
        Each agent is a configuration — a system prompt, knowledge files, and action definitions — assembled and sent to the AI when a user triggers an action. Click any agent to view the full configuration, or edit to customize behavior.
      </p>

      {/* Agent cards */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider">Agents</h2>
        <button className="inline-flex items-center gap-1.5 text-sm font-medium text-aa-blue hover:text-aa-blue/80 transition-colors">
          <Plus size={14} />
          Add Agent
        </button>
      </div>

      <div className="space-y-3 mb-10">
        {agents.map((agent) => {
          const stats = MOCK_STATS[agent.key] || {};
          const isOpen = expandedKey === agent.key;
          const isThisEditing = editingKey === agent.key;
          const sourceAgent = getSourceAgentConfig(agent.key);

          return (
            <div key={agent.key}>
              <AgentCard
                agent={agent}
                stats={stats}
                isOpen={isOpen}
                isDirty={isDirty(agent.key)}
                onClick={() => handleToggle(agent.key)}
              />
              {isOpen && (
                <div className="bg-white rounded-b-lg border border-t-0 border-gray-200 -mt-1" style={{ borderLeftWidth: 4, borderLeftColor: 'transparent' }}>
                  <AgentDetailPanel
                    agent={agent}
                    sourceAgent={sourceAgent}
                    isEditing={isThisEditing}
                    draft={getDraft(agent.key)}
                    onStartEdit={() => handleStartEdit(agent.key)}
                    onDraftChange={(field, value) => handleDraftChange(agent.key, field, value)}
                    onActionDraftChange={(actionKey, text) => handleActionDraftChange(agent.key, actionKey, text)}
                    onSave={() => handleSave(agent.key)}
                    onDiscard={() => handleDiscard(agent.key)}
                    onReset={() => handleReset(agent.key)}
                    hasOverride={hasOverride(agent.key)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* API Usage */}
      <h2 className="text-sm font-semibold text-secondary-text uppercase tracking-wider mb-4">API Usage</h2>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <div className="text-xs text-secondary-text mb-1">Calls (14 days)</div>
            <div className="text-2xl font-semibold text-dark-text">
              {usageData.reduce((s, d) => s + d.calls, 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-secondary-text mb-1">Tokens This Month</div>
            <div className="text-2xl font-semibold text-dark-text">1.2M</div>
          </div>
          <div>
            <div className="text-xs text-secondary-text mb-1">Est. Monthly Cost</div>
            <div className="text-2xl font-semibold text-dark-text">$18.40</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={usageData}>
            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
            <Tooltip />
            <Bar dataKey="calls" fill="#009ADE" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Warning/Confirm Modal */}
      <AgentEditWarningModal
        open={!!modal}
        title={modal?.title || ''}
        message={modal?.message || ''}
        confirmLabel={modal?.confirmLabel}
        confirmVariant={modal?.confirmVariant}
        onConfirm={modal?.onConfirm || (() => setModal(null))}
        onCancel={() => setModal(null)}
      />
    </div>
  );
}
