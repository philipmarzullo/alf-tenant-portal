import { useState, useRef, useEffect } from 'react';
import { X, Send, Copy, Check } from 'lucide-react';
import AlfMark from '../shared/AlfMark';

const ALF_AVATAR = '/alf-avatar.png';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

export default function SalesChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hi, I'm Alf. I can tell you about our operations intelligence platform — what it does, how the tiers work, or how it might fit your operation. What would you like to know?",
      }]);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

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
      // Build API messages (skip the initial greeting)
      const apiMessages = updated
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(1)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(`${BACKEND_URL}/api/sales-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || 'Sorry, I couldn\'t generate a response. Please try again.';
      setMessages((prev) => [...prev, { role: 'assistant', content: text }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: err.message === 'Too many messages. Please try again later.'
          ? err.message
          : 'Sorry, I\'m having trouble connecting right now. Please try again in a moment, or reach out to support@alfpro.ai.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-alf-orange rounded-full shadow-lg hover:bg-alf-orange/90 transition-all hover:scale-105 flex items-center justify-center p-1.5"
          aria-label="Chat with Alf"
        >
          <img src={ALF_AVATAR} alt="Alf" className="w-full h-full object-contain brightness-0 invert" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <>
          {/* Backdrop (mobile) */}
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setOpen(false)}
          />

          <div
            className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-50 w-full md:w-[400px] h-[100dvh] md:h-[560px] md:rounded-2xl bg-alf-warm-white shadow-2xl flex flex-col overflow-hidden border border-alf-bone"
            style={{ fontFamily: "var(--font-marketing-body)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 bg-alf-dark shrink-0 md:rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-alf-orange/20 flex items-center justify-center p-1">
                  <img src={ALF_AVATAR} alt="Alf" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div
                    className="text-sm font-medium text-white"
                    style={{ fontFamily: "var(--font-marketing-heading)" }}
                  >
                    Ask Alf
                  </div>
                  <div className="text-[10px] text-white/50">
                    Operations Intelligence
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-white/40 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-alf-orange/10 flex items-center justify-center shrink-0 mt-0.5 p-0.5">
                      <img src={ALF_AVATAR} alt="Alf" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-alf-orange text-white'
                          : 'bg-white text-alf-dark border border-alf-bone'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    {msg.role === 'assistant' && i > 0 && (
                      <button
                        onClick={() => handleCopy(msg.content, i)}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] text-alf-slate hover:text-alf-dark transition-colors"
                      >
                        {copiedIdx === i ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-alf-orange/10 flex items-center justify-center shrink-0 p-0.5">
                    <img src={ALF_AVATAR} alt="Alf" className="w-full h-full object-contain" />
                  </div>
                  <div className="bg-white border border-alf-bone rounded-xl px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-alf-orange/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-alf-orange/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-alf-orange/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-alf-bone px-4 py-3 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about Alf..."
                  className="flex-1 px-3 py-2 text-sm border border-alf-bone rounded-lg bg-alf-warm-white focus:outline-none focus:border-alf-orange text-alf-dark placeholder:text-alf-slate/60"
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="p-2 bg-alf-orange text-white rounded-lg hover:bg-alf-orange/90 transition-colors disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
