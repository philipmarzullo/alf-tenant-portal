import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Copy, Check, Bot } from 'lucide-react';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

export default function SalesChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Lock body scroll when chat is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Virtual keyboard detection via visualViewport API
  useEffect(() => {
    if (!open || !window.visualViewport) return;

    const vv = window.visualViewport;
    function handleResize() {
      const kbH = window.innerHeight - vv.height;
      setKeyboardHeight(kbH > 0 ? kbH : 0);
    }

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, [open]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hey — I'm Alf. I help service operations companies get their data, teams, and workflows working together in one place. What kind of operation are you running?",
      }]);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
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
  }, [input, loading, messages]);

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <>
      {/* Floating button — 56px, well above 44px min */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-alf-orange text-white rounded-full shadow-lg hover:bg-alf-orange/90 transition-all hover:scale-105 flex items-center justify-center"
          aria-label="Chat with Alf"
        >
          <Bot size={24} />
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
            ref={containerRef}
            className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-50 w-full md:w-[400px] h-[100dvh] md:h-[560px] flex flex-col overflow-hidden border border-alf-bone md:rounded-2xl bg-alf-warm-white shadow-2xl"
            style={{
              fontFamily: 'var(--font-marketing-body)',
              // Shrink for virtual keyboard on mobile
              ...(keyboardHeight > 0 ? { height: `calc(100dvh - ${keyboardHeight}px)` } : {}),
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 bg-alf-dark shrink-0 md:rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-alf-orange/20 flex items-center justify-center">
                  <Bot size={16} className="text-alf-orange" />
                </div>
                <div>
                  <div
                    className="text-sm font-medium text-white"
                    style={{ fontFamily: 'var(--font-marketing-heading)' }}
                  >
                    Ask Alf
                  </div>
                  <div className="text-[10px] text-white/50">
                    Operations Intelligence
                  </div>
                </div>
              </div>
              {/* Close — 44px min tap target */}
              <button
                onClick={() => setOpen(false)}
                className="w-11 h-11 flex items-center justify-center text-white/40 hover:text-white transition-colors -mr-1.5"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages — flex-1 scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-alf-orange/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} className="text-alf-orange" />
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
                        className="mt-1 inline-flex items-center gap-1 text-[10px] text-alf-slate hover:text-alf-dark transition-colors min-h-[44px] min-w-[44px]"
                      >
                        {copiedIdx === i ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-alf-orange/10 flex items-center justify-center shrink-0">
                    <Bot size={14} className="text-alf-orange" />
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

            {/* Input — shrink-0, text-base to prevent iOS zoom */}
            <div className="border-t border-alf-bone px-4 py-3 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about Alf..."
                  className="flex-1 px-3.5 py-2.5 text-base md:text-sm border border-alf-bone rounded-lg bg-alf-warm-white focus:outline-none focus:border-alf-orange text-alf-dark placeholder:text-alf-slate/60"
                  disabled={loading}
                />
                {/* Send — 44px tap target */}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="w-11 h-11 flex items-center justify-center bg-alf-orange text-white rounded-lg hover:bg-alf-orange/90 transition-colors disabled:opacity-40 shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
