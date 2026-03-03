import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, Loader2, CheckCircle, Clock, ArrowRight, Inbox,
  Play, Check, XCircle, ChevronDown, Bot, CalendarClock,
  Send, User, Copy, FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useTenantId } from '../contexts/TenantIdContext';
import { useTenantPortal } from '../contexts/TenantPortalContext';
import { chatWithAgent } from '../agents/api';
import SimpleMarkdown from '../components/shared/SimpleMarkdown';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     className: 'bg-amber-50 text-amber-700', icon: Clock },
  in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700',   icon: ArrowRight },
  completed:   { label: 'Completed',   className: 'bg-green-50 text-green-700', icon: CheckCircle },
};

const SOURCE_LABELS = {
  agent_output:    { label: 'Agent', icon: Bot },
  manual_trigger:  { label: 'Manual', icon: ClipboardCheck },
  scheduled:       { label: 'Scheduled', icon: CalendarClock },
};

function dueLabel(due) {
  if (!due) return null;
  const now = new Date();
  const d = new Date(due);
  const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: 'Overdue', className: 'text-red-600' };
  if (diffDays === 0) return { text: 'Due today', className: 'text-amber-600' };
  if (diffDays === 1) return { text: 'Due tomorrow', className: 'text-amber-600' };
  return { text: `Due in ${diffDays} days`, className: 'text-secondary-text' };
}

// ── Embedded Agent Chat ─────────────────────────────────────────────
function TaskAgentChat({ agentKey, agentName, tasks, sops = [] }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const sopsRef = useRef(sops);
  sopsRef.current = sops;

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `I'm your ${agentName}. I can see your current tasks and help you prioritize, draft responses, or work through any item on your list. What do you need help with?`,
    }]);
  }, [agentKey, agentName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function buildSuffix() {
    const parts = [];

    // SOP context
    const sopList = sopsRef.current;
    if (sopList?.length) {
      parts.push('The user is responsible for the following management procedures:');
      sopList.forEach((sop, i) => {
        const title = sop.structured_content?.title || sop.file_name || 'Untitled SOP';
        const dept = sop.department || '';
        const text = (sop.extracted_text || '').slice(0, 500);
        parts.push(`${i + 1}. ${title}${dept ? ` (${dept})` : ''}${text ? ` — ${text}` : ''}`);
      });
      parts.push('');
      parts.push('Help them execute these procedures. When they ask about a process, reference the specific steps from the assigned SOP. Identify which steps you (the agent) can automate vs. which require human action.');
      parts.push('');
    }

    // Task context
    const taskList = tasksRef.current;
    if (taskList?.length) {
      parts.push(`The user's current task queue:`);
      taskList.forEach((t, i) => {
        parts.push(`${i + 1}. [${t.status}] ${t.title}${t.description ? ` — ${t.description}` : ''}${t.due_date ? ` (Due: ${new Date(t.due_date).toLocaleDateString()})` : ''}`);
      });
      parts.push('');
      parts.push('Help them complete, prioritize, or understand these tasks. Give specific, actionable guidance. If they ask about a task, reference it by name.');
    }

    if (!parts.length) return 'The user has no pending tasks or assigned procedures.';
    return parts.join('\n');
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = updated
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(1)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await chatWithAgent(agentKey, apiMessages, null, {
        systemPromptSuffix: buildSuffix(),
      });
      const text = typeof response === 'string' ? response : response.text;
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text, idx) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col" style={{ height: '400px' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="p-1.5 bg-aa-blue/10 rounded-lg">
          <Bot size={16} className="text-aa-blue" />
        </div>
        <div>
          <div className="text-sm font-medium text-dark-text">{agentName}</div>
          <div className="text-xs text-secondary-text">Knows your tasks & procedures</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-aa-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={12} className="text-aa-blue" />
              </div>
            )}
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-first' : ''}`}>
              <div
                className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-aa-blue text-white ml-auto'
                    : 'bg-gray-50 text-dark-text'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <SimpleMarkdown content={msg.content} />
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
              {msg.role === 'assistant' && i > 0 && (
                <button
                  onClick={() => handleCopy(msg.content, i)}
                  className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-secondary-text hover:text-dark-text transition-colors"
                >
                  {copiedIdx === i ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy</>}
                </button>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                <User size={12} className="text-secondary-text" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-aa-blue/10 flex items-center justify-center shrink-0">
              <Bot size={12} className="text-aa-blue" />
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your tasks..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-2 bg-aa-blue text-white rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────
export default function MyWorkPage() {
  const { currentUser } = useUser();
  const { tenantId } = useTenantId();
  const { workspaces, getWorkspacePath } = useTenantPortal();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [sops, setSops] = useState([]);
  const [sopsLoading, setSopsLoading] = useState(true);
  const [expandedSopId, setExpandedSopId] = useState(null);

  const loadTasks = useCallback(async () => {
    if (!currentUser?.id || !tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tenant_user_tasks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', currentUser.id)
      .neq('status', 'completed')
      .neq('status', 'dismissed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error) setTasks(data || []);
    setLoading(false);
  }, [currentUser?.id, tenantId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Fetch user's assigned SOPs
  const loadSops = useCallback(async () => {
    if (!currentUser?.id || !tenantId) return;
    setSopsLoading(true);
    const { data, error } = await supabase
      .from('tenant_user_sops')
      .select('document_id, tenant_documents(id, file_name, department, extracted_text, structured_content, doc_type)')
      .eq('tenant_id', tenantId)
      .eq('user_id', currentUser.id);

    if (!error && data) {
      setSops(data.map(row => row.tenant_documents).filter(Boolean));
    }
    setSopsLoading(false);
  }, [currentUser?.id, tenantId]);

  useEffect(() => { loadSops(); }, [loadSops]);

  async function updateStatus(taskId, newStatus) {
    setUpdating(taskId);
    const updates = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = currentUser.id;
    }
    await supabase.from('tenant_user_tasks').update(updates).eq('id', taskId);
    await loadTasks();
    setUpdating(null);
    setExpandedId(null);
  }

  const userWorkspace = currentUser?.department_key
    ? workspaces.find(ws => ws.department_key === currentUser.department_key)
    : null;

  // Find the agent linked to the user's workspace
  const { agents } = useTenantPortal();
  const workspaceAgent = userWorkspace
    ? agents.find(a => a.workspace_id === userWorkspace.id)
    : null;
  const agentKey = workspaceAgent?.agent_key || 'ops';
  const agentName = workspaceAgent?.name || (userWorkspace ? `${userWorkspace.name} Assistant` : 'My Work Assistant');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-dark-text">My Work</h1>
        <p className="text-sm text-secondary-text mt-1">
          Your tasks and assignments
        </p>
      </div>

      {/* Quick links */}
      {userWorkspace && (
        <button
          onClick={() => navigate(getWorkspacePath(userWorkspace.department_key))}
          className="flex items-center gap-3 w-full p-4 bg-white rounded-lg border border-gray-200 hover:border-aa-blue/30 transition-colors text-left"
        >
          <ClipboardCheck size={20} className="text-aa-blue" />
          <div className="flex-1">
            <div className="text-sm font-medium text-dark-text">{userWorkspace.name}</div>
            <div className="text-xs text-secondary-text">Go to your workspace</div>
          </div>
          <ArrowRight size={16} className="text-secondary-text" />
        </button>
      )}

      {/* My Procedures — assigned SOPs */}
      {sopsLoading ? (
        <div className="flex items-center gap-2 text-sm text-secondary-text py-4">
          <Loader2 size={14} className="animate-spin" /> Loading procedures...
        </div>
      ) : sops.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-dark-text mb-2">
            My Procedures
            <span className="ml-2 text-xs font-normal text-secondary-text">
              ({sops.length} assigned)
            </span>
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {sops.map(sop => {
              const title = sop.structured_content?.title || sop.file_name || 'Untitled SOP';
              const dept = sop.department;
              const role = sop.structured_content?.sop_role;
              const isExpanded = expandedSopId === sop.id;
              const previewText = sop.extracted_text || sop.structured_content?.summary || '';

              return (
                <button
                  key={sop.id}
                  onClick={() => setExpandedSopId(isExpanded ? null : sop.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText size={16} className="text-aa-blue shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-dark-text truncate">{title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {role && (
                            <span className="text-xs text-secondary-text">{role}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {dept && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                          {dept}
                        </span>
                      )}
                      <ChevronDown size={14} className={`text-secondary-text transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  {isExpanded && previewText && (
                    <div className="mt-3 ml-7 text-xs text-secondary-text leading-relaxed whitespace-pre-wrap border-t border-gray-100 pt-3">
                      {previewText.slice(0, 800)}
                      {previewText.length > 800 && '...'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Two-column layout: tasks + agent */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Tasks — 3 cols */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="text-aa-blue animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Inbox size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium text-dark-text">No pending tasks</p>
              <p className="text-xs text-secondary-text mt-1">
                Tasks from agent outputs and SOP workflows will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => {
                const style = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                const StatusIcon = style.icon;
                const source = SOURCE_LABELS[task.source_type];
                const SourceIcon = source?.icon;
                const due = dueLabel(task.due_date);
                const isExpanded = expandedId === task.id;
                const isUpdating = updating === task.id;

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-lg border transition-colors ${
                      isExpanded ? 'border-aa-blue/30 shadow-sm' : 'border-gray-200'
                    }`}
                  >
                    {/* Task header — clickable */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : task.id)}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-dark-text">{task.title}</div>
                          {!isExpanded && task.description && (
                            <p className="text-xs text-secondary-text mt-1 line-clamp-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {source && (
                              <span className="inline-flex items-center gap-1 text-xs text-secondary-text">
                                <SourceIcon size={11} />
                                {source.label}
                              </span>
                            )}
                            {due && (
                              <span className={`text-xs font-medium ${due.className}`}>{due.text}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${style.className}`}>
                            <StatusIcon size={12} />
                            {style.label}
                          </span>
                          <ChevronDown size={14} className={`text-secondary-text transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail + actions */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                        {task.description && (
                          <p className="text-sm text-secondary-text">{task.description}</p>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          {task.status === 'pending' && (
                            <button
                              onClick={() => updateStatus(task.id, 'in_progress')}
                              disabled={isUpdating}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                            >
                              <Play size={12} /> Start Working
                            </button>
                          )}
                          {(task.status === 'pending' || task.status === 'in_progress') && (
                            <button
                              onClick={() => updateStatus(task.id, 'completed')}
                              disabled={isUpdating}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                            >
                              <Check size={12} /> Mark Complete
                            </button>
                          )}
                          <button
                            onClick={() => updateStatus(task.id, 'dismissed')}
                            disabled={isUpdating}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-50 text-secondary-text hover:bg-gray-100 transition-colors disabled:opacity-50"
                          >
                            <XCircle size={12} /> Dismiss
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

        {/* Agent chat — 2 cols, always visible */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6">
            <TaskAgentChat agentKey={agentKey} agentName={agentName} tasks={tasks} sops={sops} />
          </div>
        </div>
      </div>
    </div>
  );
}
