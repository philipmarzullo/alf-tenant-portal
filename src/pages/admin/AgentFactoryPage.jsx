import { useState, useEffect, useCallback } from 'react';
import {
  Bot, Loader2, Plus, Power, PowerOff, Pencil, X, Check,
  ChevronDown, Sparkles, Lock, Trash2,
} from 'lucide-react';
import { supabase, getFreshToken } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';
import { useUser } from '../../contexts/UserContext';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

export default function AgentFactoryPage() {
  const { tenantId } = useTenantId();
  const { isAdmin, isSuperAdmin } = useUser();
  const [workspaces, setWorkspaces] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newWorkspaceId, setNewWorkspaceId] = useState('');
  const [newKnowledgeScopes, setNewKnowledgeScopes] = useState([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [generatingPrompt, setGeneratingPrompt] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editScopes, setEditScopes] = useState([]);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    const [wsRes, agRes] = await Promise.all([
      supabase
        .from('tenant_workspaces')
        .select('id, department_key, name, is_active')
        .eq('tenant_id', tenantId)
        .order('sort_order'),
      supabase
        .from('tenant_agents')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at'),
    ]);

    setWorkspaces(wsRes.data || []);
    setAgents(agRes.data || []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { loadData(); }, [loadData]);

  function toAgentKey(name) {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  async function handleGeneratePrompt() {
    if (!newDepartment) return;
    setGeneratingPrompt(true);
    try {
      const token = await getFreshToken();
      const res = await fetch(`${BACKEND_URL}/api/tenant-workspaces/${tenantId}/agents/generate-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          department: newDepartment,
          agent_name: newName || newDepartment,
        }),
      });
      const data = await res.json();
      if (data.system_prompt) setNewPrompt(data.system_prompt);
    } catch (err) {
      console.error('[agent-factory] generate prompt error:', err);
    }
    setGeneratingPrompt(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName) return;

    setSaving('create');
    try {
      const token = await getFreshToken();
      const res = await fetch(`${BACKEND_URL}/api/tenant-workspaces/${tenantId}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newName,
          agent_key: toAgentKey(newName),
          department: newDepartment || undefined,
          workspace_id: newWorkspaceId || undefined,
          knowledge_scopes: newKnowledgeScopes.length > 0 ? newKnowledgeScopes : undefined,
          system_prompt: newPrompt || undefined,
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        setNewName('');
        setNewDepartment('');
        setNewWorkspaceId('');
        setNewKnowledgeScopes([]);
        setNewPrompt('');
        await loadData();
      } else {
        const err = await res.json();
        console.error('[agent-factory] create error:', err.error);
      }
    } catch (err) {
      console.error('[agent-factory] create exception:', err);
    }
    setSaving(null);
  }

  async function handleToggle(agentId, currentActive) {
    setSaving(agentId);
    await supabase.from('tenant_agents').update({
      is_active: !currentActive,
    }).eq('id', agentId);
    await loadData();
    setSaving(null);
  }

  function startEdit(agent) {
    setEditingId(agent.id);
    setEditName(agent.name);
    setEditPrompt(agent.system_prompt || '');
    setEditScopes(agent.knowledge_scopes || []);
  }

  async function handleSaveEdit(agentId) {
    setSaving(agentId);
    try {
      const token = await getFreshToken();
      await fetch(`${BACKEND_URL}/api/tenant-workspaces/${tenantId}/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editName,
          system_prompt: editPrompt,
          knowledge_scopes: editScopes,
        }),
      });
      setEditingId(null);
      await loadData();
    } catch (err) {
      console.error('[agent-factory] save edit error:', err);
    }
    setSaving(null);
  }

  async function handleDelete(agentId) {
    setSaving(agentId);
    try {
      const token = await getFreshToken();
      const res = await fetch(`${BACKEND_URL}/api/tenant-workspaces/${tenantId}/agents/${agentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeleteConfirmId(null);
        setExpandedId(null);
        setAgents(prev => prev.filter(a => a.id !== agentId));
      } else {
        const err = await res.json();
        console.error('[agent-factory] delete error:', err.error);
      }
    } catch (err) {
      console.error('[agent-factory] delete exception:', err);
    }
    setSaving(null);
  }

  function toggleScope(scope) {
    setNewKnowledgeScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  }

  function toggleEditScope(scope) {
    setEditScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  const departmentKeys = workspaces.map(ws => ws.department_key).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-aa-blue" />
            <h1 className="text-xl font-semibold text-dark-text">Agent Factory</h1>
          </div>
          <p className="text-sm text-secondary-text mt-1">
            Create and manage AI agents for your organization.
          </p>
        </div>
        {(isAdmin || isSuperAdmin) && !showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-aa-blue text-white rounded-lg hover:bg-aa-blue/90 transition-colors"
          >
            <Plus size={16} />
            Create Agent
          </button>
        )}
      </div>

      {/* Create agent form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg border border-gray-200 p-5 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-dark-text">Create Agent</h3>
            <button type="button" onClick={() => setShowCreate(false)} className="text-secondary-text hover:text-dark-text">
              <X size={16} />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-dark-text mb-1">Agent Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Logistics Agent"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-dark-text mb-1">Department / Workspace</label>
            <select
              value={newWorkspaceId}
              onChange={e => {
                setNewWorkspaceId(e.target.value);
                const ws = workspaces.find(w => w.id === e.target.value);
                if (ws) setNewDepartment(ws.department_key);
              }}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
            >
              <option value="">No workspace (cross-functional)</option>
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-dark-text mb-1">Knowledge Scopes</label>
            <div className="flex flex-wrap gap-2">
              {departmentKeys.map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleScope(key)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    newKnowledgeScopes.includes(key)
                      ? 'bg-aa-blue text-white border-aa-blue'
                      : 'bg-gray-50 text-secondary-text border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-secondary-text mt-1">
              Which department knowledge this agent can access.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-dark-text">System Prompt</label>
              {newDepartment && (
                <button
                  type="button"
                  onClick={handleGeneratePrompt}
                  disabled={generatingPrompt}
                  className="inline-flex items-center gap-1 text-xs text-aa-blue hover:text-aa-blue/80 transition-colors disabled:opacity-50"
                >
                  {generatingPrompt ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  Generate from template
                </button>
              )}
            </div>
            <textarea
              value={newPrompt}
              onChange={e => setNewPrompt(e.target.value)}
              rows={6}
              placeholder="Leave blank to auto-generate from company profile..."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue font-mono text-xs"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!newName || saving === 'create'}
              className="px-4 py-2 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving === 'create' && <Loader2 size={14} className="animate-spin" />}
              Create Agent
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-secondary-text hover:text-dark-text transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Agent list */}
      {agents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Bot size={32} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-sm font-medium text-dark-text mb-1">No agents configured</h3>
          <p className="text-xs text-secondary-text">
            Agents are created when your company profile is set up, or you can create them manually.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {agents.map(agent => {
            const ws = workspaces.find(w => w.id === agent.workspace_id);
            const isExpanded = expandedId === agent.id;
            const isEditing = editingId === agent.id;
            const isSaving = saving === agent.id;
            const isPlatform = agent.source !== 'tenant';

            return (
              <div key={agent.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Bot size={16} className={agent.is_active ? 'text-aa-blue' : 'text-gray-400'} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-dark-text">
                            {agent.name}
                          </span>
                          {isPlatform ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-secondary-text rounded">
                              <Lock size={9} />
                              Platform
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-aa-blue rounded">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {ws && (
                            <span className="text-xs text-secondary-text">{ws.name}</span>
                          )}
                          {!ws && (
                            <span className="text-xs text-secondary-text italic">Cross-functional</span>
                          )}
                          {agent.knowledge_scopes?.length > 0 && (
                            <span className="text-[11px] text-secondary-text">
                              · {agent.knowledge_scopes.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    {agent.is_active ? (
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    ) : (
                      <span className="text-[11px] text-secondary-text">Inactive</span>
                    )}
                    <button
                      onClick={() => handleToggle(agent.id, agent.is_active)}
                      disabled={isSaving}
                      className="p-1 text-secondary-text hover:text-dark-text transition-colors disabled:opacity-50"
                      title={agent.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {isSaving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : agent.is_active ? (
                        <Power size={14} />
                      ) : (
                        <PowerOff size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                      className="p-1 text-secondary-text hover:text-dark-text transition-colors"
                    >
                      <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Expanded detail — platform agents */}
                {isExpanded && !isEditing && isPlatform && (
                  <div className="mt-3 pt-3 border-t border-gray-100 ml-7 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-secondary-text">Agent Key</span>
                        <div className="font-mono font-medium text-dark-text mt-0.5">{agent.agent_key}</div>
                      </div>
                      <div>
                        <span className="text-secondary-text">Knowledge Scopes</span>
                        <div className="font-medium text-dark-text mt-0.5">
                          {agent.knowledge_scopes?.join(', ') || 'None'}
                        </div>
                      </div>
                      <div>
                        <span className="text-secondary-text">Operational Data</span>
                        <div className="font-medium text-dark-text mt-0.5">
                          {agent.inject_operational_context ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                      <div>
                        <span className="text-secondary-text">Model</span>
                        <div className="font-medium text-dark-text mt-0.5">
                          {agent.model || 'Default'}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-secondary-text">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Lock size={11} />
                        <span className="font-medium">Managed by Alf</span>
                      </div>
                      This agent is managed by the Alf platform. Its programming is maintained and updated automatically. Customize behavior through Knowledge Base documents and Agent Instructions.
                    </div>
                  </div>
                )}

                {/* Expanded detail — tenant agents */}
                {isExpanded && !isEditing && !isPlatform && (
                  <div className="mt-3 pt-3 border-t border-gray-100 ml-7 space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-secondary-text">Agent Key</span>
                        <div className="font-mono font-medium text-dark-text mt-0.5">{agent.agent_key}</div>
                      </div>
                      <div>
                        <span className="text-secondary-text">Knowledge Scopes</span>
                        <div className="font-medium text-dark-text mt-0.5">
                          {agent.knowledge_scopes?.join(', ') || 'None'}
                        </div>
                      </div>
                      <div>
                        <span className="text-secondary-text">Operational Data</span>
                        <div className="font-medium text-dark-text mt-0.5">
                          {agent.inject_operational_context ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                      <div>
                        <span className="text-secondary-text">Model</span>
                        <div className="font-medium text-dark-text mt-0.5">
                          {agent.model || 'Default'}
                        </div>
                      </div>
                    </div>

                    {agent.system_prompt && (
                      <div>
                        <span className="text-xs text-secondary-text">System Prompt</span>
                        <div className="mt-1 bg-gray-50 rounded-lg p-3 text-xs font-mono text-dark-text max-h-40 overflow-y-auto whitespace-pre-wrap">
                          {agent.system_prompt.slice(0, 1000)}
                          {agent.system_prompt.length > 1000 && '...'}
                        </div>
                      </div>
                    )}

                    {(isAdmin || isSuperAdmin) && (
                      <div className="flex justify-between">
                        {deleteConfirmId === agent.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-600">Delete this agent?</span>
                            <button
                              onClick={() => handleDelete(agent.id)}
                              disabled={isSaving}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2.5 py-1 text-xs text-secondary-text hover:text-dark-text transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(agent.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={12} />
                            Delete Agent
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(agent)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-aa-blue hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil size={12} />
                          Edit Agent
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit mode — only for tenant agents */}
                {isExpanded && isEditing && (
                  <div className="mt-3 pt-3 border-t border-gray-100 ml-7 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-dark-text mb-1">Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-dark-text mb-1">Knowledge Scopes</label>
                      <div className="flex flex-wrap gap-2">
                        {departmentKeys.map(key => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleEditScope(key)}
                            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                              editScopes.includes(key)
                                ? 'bg-aa-blue text-white border-aa-blue'
                                : 'bg-gray-50 text-secondary-text border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-dark-text mb-1">System Prompt</label>
                      <textarea
                        value={editPrompt}
                        onChange={e => setEditPrompt(e.target.value)}
                        rows={8}
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aa-blue/30 focus:border-aa-blue font-mono text-xs"
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-xs text-secondary-text hover:text-dark-text transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(agent.id)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-aa-blue text-white rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
