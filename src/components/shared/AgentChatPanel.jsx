import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Copy, Check, FileEdit, ShieldCheck, Zap, MessageSquarePlus, Upload, CheckCircle, XCircle, Mail } from 'lucide-react';
import { chatWithAgent } from '../../agents/api';
import { supabase } from '../../lib/supabase';
import { useTenantId } from '../../contexts/TenantIdContext';
import { useUser } from '../../contexts/UserContext';
import { useTenantPortal } from '../../contexts/TenantPortalContext';
import { buildDocumentPath } from '../../utils/storagePaths';
import SimpleMarkdown from './SimpleMarkdown';

const MODE_BADGE = {
  draft: { label: 'Draft Mode', icon: FileEdit, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  review: { label: 'Review Required', icon: ShieldCheck, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  automated: { label: 'Automated', icon: Zap, color: 'bg-green-50 text-green-700 border-green-200' },
};

export default function AgentChatPanel({ open, onClose, agentKey, agentName, context, systemPromptSuffix }) {
  const { tenantId } = useTenantId();
  const { currentUser, isAdmin } = useUser();
  const { hasCapability } = useTenantPortal();
  const canSendEmail = hasCapability('can_send_email');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [skillModes, setSkillModes] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  // Teach Agent
  const [showTeach, setShowTeach] = useState(false);
  const [teachText, setTeachText] = useState('');
  const [teachFile, setTeachFile] = useState(null);
  const [teachSubmitting, setTeachSubmitting] = useState(false);
  const [teachResult, setTeachResult] = useState(null);
  const teachFileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMessages([{
        role: 'assistant',
        content: `I'm the ${agentName}. I can answer questions about ${context || 'this workspace'}. How can I help?`,
      }]);
      setSkillModes(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, agentName, context]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = updated
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(1)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await chatWithAgent(agentKey, apiMessages, null, {
        systemPromptSuffix,
        includeExecutionContext: true,
      });

      // Handle object response with execution context
      const text = typeof response === 'string' ? response : response.text;
      if (typeof response === 'object' && response.execution_context) {
        setSkillModes(response.execution_context.skills);
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: text }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleTeachSubmit = async () => {
    if (!teachText.trim()) return;
    setTeachSubmitting(true);
    setTeachResult(null);

    try {
      let fileFields = {};
      if (teachFile) {
        const { extractText } = await import('../../utils/docExtractor.js');
        const result = await extractText(teachFile);
        const fileType = teachFile.name.split('.').pop().toLowerCase();
        const storagePath = buildDocumentPath(tenantId, 'instructions', teachFile.name);
        const { error: uploadErr } = await supabase.storage
          .from('tenant-documents')
          .upload(storagePath, teachFile);
        if (uploadErr) throw uploadErr;
        fileFields = {
          file_name: teachFile.name,
          file_type: fileType,
          file_size: teachFile.size,
          storage_path: storagePath,
          extracted_text: result.text || null,
        };
      }

      const autoApprove = isAdmin || currentUser?.role === 'platform_owner';
      const { error: insertErr } = await supabase
        .from('agent_instructions')
        .insert({
          tenant_id: tenantId,
          agent_key: agentKey,
          instruction_text: teachText.trim(),
          source: autoApprove ? 'platform' : 'tenant',
          status: autoApprove ? 'approved' : 'pending',
          created_by: currentUser.id,
          ...(autoApprove ? { reviewed_by: currentUser.id, reviewed_at: new Date().toISOString() } : {}),
          ...fileFields,
        });

      if (insertErr) throw insertErr;

      setTeachResult(autoApprove ? 'approved' : 'success');
      setTeachText('');
      setTeachFile(null);
      setTimeout(() => { setTeachResult(null); setShowTeach(false); }, 2500);
    } catch (err) {
      setTeachResult('error');
      setTimeout(() => setTeachResult(null), 3000);
    }
    setTeachSubmitting(false);
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (!open) return null;

  // Determine the dominant execution mode for badge display
  const dominantMode = skillModes?.length
    ? skillModes.every(s => s.mode === 'automated') ? 'automated'
      : skillModes.some(s => s.mode === 'draft') ? 'draft'
      : 'review'
    : null;
  const badge = dominantMode ? MODE_BADGE[dominantMode] : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-screen w-full md:w-[420px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-aa-blue/10 rounded">
              <Bot size={16} className="text-aa-blue" />
            </div>
            <div>
              <div className="text-sm font-semibold text-dark-text">{agentName}</div>
              <div className="text-[11px] text-secondary-text">{context}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canSendEmail && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-teal-50 text-teal-600">
                <Mail size={9} />
                Email
              </span>
            )}
            {badge && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.color}`}>
                <badge.icon size={10} />
                {badge.label}
              </span>
            )}
            <button
              onClick={() => setShowTeach(!showTeach)}
              className={`p-1 transition-colors ${showTeach ? 'text-aa-blue' : 'text-gray-400 hover:text-gray-600'}`}
              title="Teach this agent"
            >
              <MessageSquarePlus size={18} />
            </button>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Teach Agent inline form */}
        {showTeach && (
          <div className="border-b border-gray-200 px-4 py-3 space-y-2 bg-sky-50/50 shrink-0">
            <div className="text-xs font-semibold text-dark-text">Teach this Agent</div>
            <textarea
              value={teachText}
              onChange={(e) => setTeachText(e.target.value)}
              rows={2}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue resize-none bg-white"
              placeholder='e.g., "Always greet by name" or "Stop suggesting overtime"'
            />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-[11px] text-secondary-text cursor-pointer hover:text-dark-text transition-colors">
                <Upload size={12} />
                {teachFile ? teachFile.name : 'Attach file'}
                <input
                  ref={teachFileRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => { if (e.target.files[0]) setTeachFile(e.target.files[0]); e.target.value = ''; }}
                  className="hidden"
                />
              </label>
              {teachFile && (
                <button onClick={() => setTeachFile(null)} className="text-gray-400 hover:text-red-500">
                  <X size={12} />
                </button>
              )}
              <button
                onClick={handleTeachSubmit}
                disabled={teachSubmitting || !teachText.trim()}
                className="ml-auto px-3 py-1 bg-aa-blue text-white text-xs font-medium rounded-lg hover:bg-aa-blue/90 disabled:opacity-40 transition-colors"
              >
                {teachSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
            {teachResult === 'approved' && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle size={12} /> Instruction added and active
              </div>
            )}
            {teachResult === 'success' && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle size={12} /> Instruction submitted for review
              </div>
            )}
            {teachResult === 'error' && (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <XCircle size={12} /> Failed to submit
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-aa-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={14} className="text-aa-blue" />
                </div>
              )}
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
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
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-secondary-text hover:text-dark-text transition-colors"
                  >
                    {copiedIdx === i ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                  </button>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={14} className="text-secondary-text" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-aa-blue/10 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-aa-blue" />
              </div>
              <div className="bg-gray-50 rounded-lg px-3.5 py-2.5">
                <div className="flex items-center gap-1.5">
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
        <div className="border-t border-gray-200 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Ask ${agentName}...`}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-2 bg-aa-blue text-white rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
