import { useState, useMemo } from 'react';
import {
  Pencil,
  FileText,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Lock,
  RotateCcw,
  Save,
  X,
} from 'lucide-react';
import { classifyTemplate, extractTemplateText } from '../../agents/overrides';

const TABS = [
  { key: 'prompt', label: 'System Prompt', icon: FileText },
  { key: 'actions', label: 'Actions', icon: Zap },
  { key: 'knowledge', label: 'Knowledge Modules', icon: BookOpen },
];

const AVAILABLE_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-haiku-4-20250514',
];

/**
 * Expanded detail/edit panel for a single agent.
 * Props:
 *   agent       - the merged agent config (with key)
 *   sourceAgent - the original source-code config (for reset comparison)
 *   isEditing   - boolean
 *   draft       - current draft state (mirrors editable fields)
 *   onStartEdit - callback to enter edit mode
 *   onDraftChange - (field, value) => void
 *   onActionDraftChange - (actionKey, text) => void
 *   onSave      - callback
 *   onDiscard   - callback
 *   onReset     - callback
 *   hasOverride  - boolean, whether localStorage override exists
 */
export default function AgentDetailPanel({
  agent,
  sourceAgent,
  isEditing,
  draft,
  onStartEdit,
  onDraftChange,
  onActionDraftChange,
  onSave,
  onDiscard,
  onReset,
  hasOverride: isModified,
}) {
  const [activeTab, setActiveTab] = useState('prompt');
  const [expandedActions, setExpandedActions] = useState(new Set());

  const actionAnalysis = useMemo(() => {
    const result = {};
    if (agent.actions) {
      for (const [key, action] of Object.entries(agent.actions)) {
        result[key] = classifyTemplate(action.promptTemplate);
      }
    }
    return result;
  }, [agent.actions]);

  const toggleAction = (key) => {
    setExpandedActions((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const actionCount = agent.actions ? Object.keys(agent.actions).length : 0;
  const kmCount = agent.knowledgeModules?.length || 0;

  return (
    <div className="border-t border-gray-100">
      {/* Header bar */}
      <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="text-xs text-secondary-text">
            <span className="font-semibold uppercase tracking-wider">Model</span>
            {isEditing ? (
              <select
                value={draft.model}
                onChange={(e) => onDraftChange('model', e.target.value)}
                className="ml-2 text-xs border border-gray-300 rounded px-2 py-1 text-dark-text"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <span className="ml-2 text-dark-text">{agent.model}</span>
            )}
          </div>

          <span className="text-gray-300">·</span>

          <div className="text-xs text-secondary-text">
            <span className="font-semibold uppercase tracking-wider">Max Tokens</span>
            {isEditing ? (
              <input
                type="number"
                value={draft.maxTokens || ''}
                onChange={(e) => onDraftChange('maxTokens', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="default"
                className="ml-2 w-20 text-xs border border-gray-300 rounded px-2 py-1 text-dark-text"
              />
            ) : (
              <span className="ml-2 text-dark-text">{agent.maxTokens || 'default'}</span>
            )}
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={onStartEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-aa-blue border border-aa-blue/30 rounded-lg hover:bg-aa-blue/5 transition-colors"
          >
            <Pencil size={12} />
            Edit Agent
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="px-5 flex gap-1 border-b border-gray-100">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          let label = tab.label;
          if (tab.key === 'actions') label = `Actions (${actionCount})`;
          if (tab.key === 'knowledge') label = `Knowledge Modules (${kmCount})`;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? 'border-aa-blue text-aa-blue'
                  : 'border-transparent text-secondary-text hover:text-dark-text'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="px-5 py-4">
        {activeTab === 'prompt' && (
          <SystemPromptTab
            agent={agent}
            isEditing={isEditing}
            draft={draft}
            onDraftChange={onDraftChange}
          />
        )}
        {activeTab === 'actions' && (
          <ActionsTab
            agent={agent}
            isEditing={isEditing}
            draft={draft}
            actionAnalysis={actionAnalysis}
            expandedActions={expandedActions}
            toggleAction={toggleAction}
            onActionDraftChange={onActionDraftChange}
          />
        )}
        {activeTab === 'knowledge' && <KnowledgeTab agent={agent} />}
      </div>

      {/* Edit mode footer */}
      {isEditing && (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            {isModified && (
              <button
                onClick={onReset}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                <RotateCcw size={12} />
                Reset to Default
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDiscard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary-text hover:text-dark-text hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={12} />
              Discard
            </button>
            <button
              onClick={onSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-aa-blue hover:bg-aa-blue/90 rounded-lg transition-colors"
            >
              <Save size={12} />
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Tab: System Prompt ---

function SystemPromptTab({ agent, isEditing, draft, onDraftChange }) {
  if (isEditing) {
    return (
      <textarea
        value={draft.systemPrompt}
        onChange={(e) => onDraftChange('systemPrompt', e.target.value)}
        className="w-full h-96 text-xs font-mono text-dark-text bg-white border border-gray-300 rounded-lg p-3 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
        spellCheck={false}
      />
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 text-xs text-secondary-text font-mono leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre-wrap">
      {agent.systemPrompt}
    </div>
  );
}

// --- Tab: Actions ---

function ActionsTab({
  agent,
  isEditing,
  draft,
  actionAnalysis,
  expandedActions,
  toggleAction,
  onActionDraftChange,
}) {
  if (!agent.actions) return <EmptyMessage text="No actions defined." />;

  return (
    <div className="space-y-2">
      {Object.entries(agent.actions).map(([key, action]) => {
        const isOpen = expandedActions.has(key);
        const analysis = actionAnalysis[key] || { type: 'unknown' };
        const draftText = draft.actionTemplates?.[key];

        return (
          <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
            <div
              onClick={() => toggleAction(key)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
            >
              {isOpen ? (
                <ChevronDown size={12} className="text-secondary-text" />
              ) : (
                <ChevronRight size={12} className="text-secondary-text" />
              )}
              <Zap size={12} className="text-aa-blue" />
              <div className="flex-1">
                <span className="text-xs font-medium text-dark-text">{action.label}</span>
                <span className="text-xs text-secondary-text ml-2">({key})</span>
              </div>
              <TemplateTypeBadge type={analysis.type} />
            </div>

            {isOpen && (
              <div className="px-4 pb-3 border-t border-gray-100">
                <div className="text-xs text-secondary-text mt-2 mb-2">{action.description}</div>

                <div className="text-[10px] font-semibold text-secondary-text uppercase tracking-wider mb-1.5">
                  Prompt Template
                </div>

                {analysis.type === 'simple' && isEditing ? (
                  <textarea
                    value={draftText !== undefined ? draftText : analysis.text}
                    onChange={(e) => onActionDraftChange(key, e.target.value)}
                    className="w-full h-32 text-xs font-mono text-dark-text bg-white border border-gray-300 rounded-lg p-2.5 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
                    spellCheck={false}
                  />
                ) : (
                  <div className="relative">
                    {analysis.type !== 'simple' && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-secondary-text">
                        <Lock size={10} />
                        Read-only
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-lg p-2.5 text-xs font-mono text-secondary-text leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {analysis.type === 'simple' ? analysis.text : analysis.text}
                    </div>
                  </div>
                )}

                {analysis.type === 'complex' && (
                  <p className="text-[10px] text-secondary-text mt-1.5 italic">
                    This template contains logic (loops, conditionals, or data transforms) and cannot be edited as text. Modify the source code directly.
                  </p>
                )}
                {analysis.type === 'passthrough' && (
                  <p className="text-[10px] text-secondary-text mt-1.5 italic">
                    Pass-through template — forwards user input directly to the agent.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Tab: Knowledge Modules ---

function KnowledgeTab({ agent }) {
  if (!agent.knowledgeModules?.length) {
    return <EmptyMessage text="No knowledge modules loaded — awaiting process mapping." />;
  }

  return (
    <div className="space-y-2">
      {agent.knowledgeModules.map((km) => (
        <div key={km} className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 rounded-lg">
          <BookOpen size={13} className="text-secondary-text shrink-0" />
          <span className="text-xs text-dark-text">{km}</span>
        </div>
      ))}
    </div>
  );
}

// --- Helpers ---

function TemplateTypeBadge({ type }) {
  const config = {
    simple: { label: 'Editable', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    complex: { label: 'Complex', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
    passthrough: { label: 'Pass-through', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
    unknown: { label: 'Unknown', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  };
  const c = config[type] || config.unknown;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  );
}

function EmptyMessage({ text }) {
  return <div className="text-xs text-secondary-text italic py-4">{text}</div>;
}
