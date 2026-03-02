import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Copy, Check, MessageSquareText } from 'lucide-react';
import { chatWithAgent } from '../../agents/api';
import SimpleMarkdown from '../../components/shared/SimpleMarkdown';

const STARTERS = [
  'Which sites have the highest overtime ratios this month?',
  'Give me a labor budget vs actual summary across all sites.',
  'Are there any quality score drops I should worry about?',
  'Summarize safety incidents and trends over the last 3 months.',
  'What are the top 5 sites by revenue, and how do their costs compare?',
  'Show me work ticket backlog by priority and category.',
];

export default function AnalyticsChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "I'm the Analytics Agent. I can help you understand your operational metrics — labor, quality, timekeeping, safety, and more. Ask me anything about your data.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
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

      const response = await chatWithAgent('analytics', apiMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleStarter = (text) => {
    setInput(text);
    // Trigger send on next tick so input state is updated
    setTimeout(() => {
      setInput('');
      const userMsg = { role: 'user', content: text };
      setMessages(prev => [...prev, userMsg]);
      setLoading(true);
      const apiMessages = [{ role: 'user', content: text }];
      chatWithAgent('analytics', apiMessages)
        .then(response => setMessages(prev => [...prev, { role: 'assistant', content: response }]))
        .catch(err => setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]))
        .finally(() => setLoading(false));
    }, 0);
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Header */}
      <div className="mb-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-aa-blue/10 rounded-lg">
            <MessageSquareText size={20} className="text-aa-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-dark-text">Analytics Chat</h1>
            <p className="text-sm text-secondary-text">
              Ask questions about your operational data across all domains.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-gray-200 px-6 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-aa-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={16} className="text-aa-blue" />
              </div>
            )}
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
              <div
                className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
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
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                <User size={16} className="text-secondary-text" />
              </div>
            )}
          </div>
        ))}

        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 ml-11">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => handleStarter(s)}
                className="px-3 py-1.5 text-xs text-aa-blue bg-aa-blue/5 border border-aa-blue/20 rounded-full hover:bg-aa-blue/10 transition-colors text-left"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-aa-blue/10 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-aa-blue" />
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3">
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
      <div className="mt-3 shrink-0">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about overtime trends, quality scores, labor utilization..."
            className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue bg-white"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-3 bg-aa-blue text-white rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
