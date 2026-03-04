import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, Loader2, CheckCircle, Clock, ArrowRight, Inbox,
  Play, Check, XCircle, ChevronDown, Bot, CalendarClock,
  Send, User, Copy, FileText, Mail, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getFreshToken } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useTenantId } from '../contexts/TenantIdContext';
import { useTenantPortal } from '../contexts/TenantPortalContext';
import { chatWithAgent } from '../agents/api';
import SimpleMarkdown from '../components/shared/SimpleMarkdown';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

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

// ── Email Compose Modal ──────────────────────────────────────────────
function EmailComposeModal({ task, tenantId, onClose, onSent }) {
  const agentOutput = task.agent_output || {};
  const outputText = agentOutput.text || '';

  // Parse Subject: and To: from agent output
  const subjectMatch = outputText.match(/^Subject:\s*(.+)$/m);
  const toMatch = outputText.match(/^To:\s*(.+)$/m);
  const initialSubject = subjectMatch?.[1]?.trim() || task.title || '';
  const initialTo = toMatch?.[1]?.trim() || '';

  // Strip metadata lines from body
  const bodyText = outputText
    .replace(/^Subject:\s*.+$/m, '')
    .replace(/^To:\s*.+$/m, '')
    .replace(/^\[DRAFT\]\s*/m, '')
    .replace(/^\[PENDING REVIEW\]\s*/m, '')
    .trim();

  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(bodyText);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const wasEdited = body !== bodyText;

  async function handleSend() {
    if (!to.trim() || !subject.trim() || !body.trim()) return;
    setSending(true);
    setError(null);

    try {
      const token = await getFreshToken();
      const res = await fetch(`${BACKEND_URL}/api/integrations/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tenantId,
          to: to.split(',').map(e => e.trim()).filter(Boolean),
          subject,
          body: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6;">${body.replace(/\n/g, '<br>')}</div>`,
          taskId: task.id,
          agentKey: agentOutput.agent_key || null,
          actionKey: task.source_reference_id || null,
          wasEdited,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'SCOPE_REQUIRED') {
          setError('Email permissions need updating. Please reconnect Microsoft 365 in Connections.');
        } else {
          setError(data.error || 'Failed to send email');
        }
        return;
      }

      onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-teal-600" />
              <h3 className="text-sm font-semibold text-dark-text">Send via Email</h3>
            </div>
            <button onClick={onClose} className="text-secondary-text hover:text-dark-text">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-3">
            <div>
              <label className="block text-xs font-medium text-dark-text mb-1">To</label>
              <input
                type="text"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-aa-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-text mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-aa-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-text mb-1">Body</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={10}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-aa-blue leading-relaxed"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600">
                <XCircle size={14} />
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-secondary-text hover:text-dark-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!to.trim() || !subject.trim() || !body.trim() || sending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send Email
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Page ───────────────────────────────────────────────────────
export default function MyWorkPage() {
  const { currentUser } = useUser();
  const { tenantId } = useTenantId();
  const { workspaces, getWorkspacePath, hasCapability } = useTenantPortal();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [sops, setSops] = useState([]);
  const [sopsLoading, setSopsLoading] = useState(true);
  const [expandedSopId, setExpandedSopId] = useState(null);
  const [composingTaskId, setComposingTaskId] = useState(null);
  const canSendEmail = hasCapability('can_send_email');

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
                          {canSendEmail && task.source_type === 'agent_output' && (
                            <button
                              onClick={() => setComposingTaskId(task.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                            >
                              <Mail size={12} /> Send via Email
                            </button>
                          )}
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

      {/* Email compose modal */}
      {composingTaskId && (() => {
        const task = tasks.find(t => t.id === composingTaskId);
        if (!task) return null;
        return (
          <EmailComposeModal
            task={task}
            tenantId={tenantId}
            onClose={() => setComposingTaskId(null)}
            onSent={() => {
              setComposingTaskId(null);
              loadTasks();
            }}
          />
        );
      })()}
    </div>
  );
}
