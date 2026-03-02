import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Send, Bot, User, Copy, Check } from 'lucide-react';
import { chatWithAgent } from '../../agents/api';
import SimpleMarkdown from './SimpleMarkdown';

const InlineAgentChat = forwardRef(function InlineAgentChat(
  { agentKey, agentName, context, systemPromptSuffix },
  ref
) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const suffixRef = useRef(systemPromptSuffix);
  suffixRef.current = systemPromptSuffix;

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `I'm your SOP Expert Assistant. I can help you draft sections, review content, and follow best practices for writing SOPs. What would you like help with?`,
    }]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [agentKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text) => {
    if (!text?.trim()) return;

    const userMsg = { role: 'user', content: text.trim() };
    setMessages((prev) => {
      const updated = [...prev, userMsg];
      // Fire off API call with the updated messages
      doSend(updated);
      return updated;
    });
    setInput('');
  }, [agentKey]);

  const doSend = async (updated) => {
    setLoading(true);
    try {
      const apiMessages = updated
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(1)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await chatWithAgent(agentKey, apiMessages, null, {
        systemPromptSuffix: suffixRef.current,
      });

      const responseText = typeof response === 'string' ? response : response.text;
      setMessages((prev) => [...prev, { role: 'assistant', content: responseText }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendMessage(input);

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Expose sendMessage to parent via ref
  useImperativeHandle(ref, () => ({ sendMessage }), [sendMessage]);

  return (
    <div className="flex flex-col h-full border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-12 border-b border-gray-200 shrink-0">
        <div className="p-1 bg-aa-blue/10 rounded">
          <Bot size={14} className="text-aa-blue" />
        </div>
        <div>
          <div className="text-xs font-semibold text-dark-text">{agentName || 'SOP Expert'}</div>
          <div className="text-[10px] text-secondary-text">{context}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-aa-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={12} className="text-aa-blue" />
              </div>
            )}
            <div className={`max-w-[88%] ${msg.role === 'user' ? 'order-first' : ''}`}>
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
      <div className="border-t border-gray-200 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask the SOP Expert..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-1.5 bg-aa-blue text-white rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default InlineAgentChat;
