import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, User, Send, Copy, Check, Loader2, BarChart3 } from 'lucide-react';
import { getAgent } from '../../agents/registry';
import { getFreshToken } from '../../lib/supabase';
import useHomeSummary from '../../hooks/useHomeSummary';
import { useRBAC } from '../../contexts/RBACContext';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
const TENANT_ID = import.meta.env.VITE_TENANT_ID;

export default function AnalyticsChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const { data: summary, loading: summaryLoading } = useHomeSummary();
  const { metricTier, allowedDomains } = useRBAC();

  useEffect(() => {
    const domainList = allowedDomains.length
      ? allowedDomains.join(', ')
      : 'your operational data';
    setMessages([{
      role: 'assistant',
      content: `I'm the Analytics Agent. I have access to your operational dashboard data across ${domainList} domains. Ask me anything — completion rates, trends, comparisons across sites, or anomalies in your metrics.`,
    }]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildDataContext = useCallback(() => {
    if (!summary) return 'No dashboard data is currently available.';

    const parts = ['Current Dashboard Data Summary:'];

    const hero = summary.hero;
    if (hero && typeof hero === 'object') {
      parts.push('\nOverall Metrics:');
      Object.entries(hero).forEach(([key, val]) => {
        if (val != null) parts.push(`  ${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`);
      });
    }

    const domains = summary.domains || {};
    Object.entries(domains).forEach(([domain, data]) => {
      if (!allowedDomains.includes(domain)) return;
      parts.push(`\n${domain.charAt(0).toUpperCase() + domain.slice(1)} Domain:`);
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([k, v]) => {
          if (v != null) parts.push(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
        });
      }
    });

    if (summary.attentionItems?.length) {
      parts.push('\nAttention Items:');
      summary.attentionItems.forEach((item) => {
        parts.push(`  - [${item.severity || 'info'}] ${item.title}: ${item.detail || ''}`);
      });
    }

    return parts.join('\n');
  }, [summary, allowedDomains]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const agent = getAgent('analytics');
      if (!agent) throw new Error('Analytics agent not configured');

      const token = await getFreshToken();
      if (!token) throw new Error('Not authenticated');

      const dataContext = buildDataContext();
      const augmentedSystem = `${agent.systemPrompt}\n\n---\n\n${dataContext}\n\nUser's metric access tier: ${metricTier}\nAccessible domains: ${allowedDomains.join(', ')}`;

      const apiMessages = updated
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(1)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(`${BACKEND_URL}/api/claude`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: agent.model,
          max_tokens: 2048,
          system: augmentedSystem,
          messages: apiMessages,
          agent_key: 'analytics',
          tenant_id: TENANT_ID,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `API error: ${response.status}`);
      }

      const result = await response.json();
      const reply = result.content?.[0]?.text || 'No response generated.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-aa-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-6">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="p-2 bg-aa-blue/10 rounded-lg">
          <BarChart3 size={18} className="text-aa-blue" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-dark-text">Analytics Chat</h1>
          <p className="text-xs text-secondary-text">
            Ask questions about your operational data
            {summary?.hero ? ' — live data loaded' : ''}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-aa-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={16} className="text-aa-blue" />
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-aa-blue text-white ml-auto'
                      : 'bg-gray-50 text-dark-text border border-gray-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                {msg.role === 'assistant' && i > 0 && (
                  <button
                    onClick={() => handleCopy(msg.content, i)}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-secondary-text hover:text-dark-text transition-colors"
                  >
                    {copiedIdx === i ? (
                      <><Check size={10} /> Copied</>
                    ) : (
                      <><Copy size={10} /> Copy</>
                    )}
                  </button>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={16} className="text-secondary-text" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-aa-blue/10 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-aa-blue" />
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
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
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your operational data..."
            className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue focus:ring-1 focus:ring-aa-blue/20"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-aa-blue text-white rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
