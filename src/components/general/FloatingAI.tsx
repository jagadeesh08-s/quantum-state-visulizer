import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain, Send, AlertCircle, X, Copy, Check, ChevronDown,
  Trash2, Sparkles, Code2, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

/* ───────────────────────── types ───────────────────────── */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/* ───────────────── copy-to-clipboard button ───────────── */
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all duration-200 backdrop-blur-sm z-10"
      title="Copy code"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

/* ───────────── markdown renderer with code blocks ─────── */
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      code({ node, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');
        // Check if it's an inline code or block code
        const isInline = !match && !codeString.includes('\n');

        if (isInline) {
          return (
            <code
              className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono text-[0.85em] border border-cyan-500/20"
              {...props}
            >
              {children}
            </code>
          );
        }

        return (
          <div className="relative group my-3 rounded-lg overflow-hidden border border-white/10">
            {/* Language badge */}
            {match && (
              <div className="flex items-center justify-between px-4 py-1.5 bg-[#1e1e2e] border-b border-white/5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/80">
                  {match[1]}
                </span>
              </div>
            )}
            <CopyButton text={codeString} />
            <SyntaxHighlighter
              style={oneDark}
              language={match ? match[1] : 'text'}
              PreTag="div"
              customStyle={{
                margin: 0,
                padding: '16px',
                fontSize: '13px',
                borderRadius: 0,
                background: '#1a1a2e',
              }}
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        );
      },
      p({ children }) {
        return <p className="mb-2 leading-relaxed text-sm text-gray-200">{children}</p>;
      },
      h1({ children }) {
        return <h1 className="text-lg font-bold mb-2 text-white mt-3">{children}</h1>;
      },
      h2({ children }) {
        return <h2 className="text-base font-bold mb-2 text-white mt-3">{children}</h2>;
      },
      h3({ children }) {
        return <h3 className="text-sm font-bold mb-1.5 text-white mt-2">{children}</h3>;
      },
      ul({ children }) {
        return <ul className="list-disc list-inside mb-2 space-y-1 text-sm text-gray-200">{children}</ul>;
      },
      ol({ children }) {
        return <ol className="list-decimal list-inside mb-2 space-y-1 text-sm text-gray-200">{children}</ol>;
      },
      li({ children }) {
        return <li className="text-sm text-gray-200">{children}</li>;
      },
      blockquote({ children }) {
        return (
          <blockquote className="border-l-3 border-cyan-400/50 pl-3 my-2 text-gray-300 italic bg-cyan-500/5 py-1 rounded-r">
            {children}
          </blockquote>
        );
      },
      table({ children }) {
        return (
          <div className="my-2 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm text-gray-200">{children}</table>
          </div>
        );
      },
      th({ children }) {
        return <th className="px-3 py-2 bg-[#1a1a2e] text-left text-xs font-semibold text-cyan-300 border-b border-white/10">{children}</th>;
      },
      td({ children }) {
        return <td className="px-3 py-2 border-b border-white/5 text-xs">{children}</td>;
      },
      strong({ children }) {
        return <strong className="font-semibold text-cyan-300">{children}</strong>;
      },
      em({ children }) {
        return <em className="italic text-purple-300">{children}</em>;
      },
      a({ href, children }) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors">
            {children}
          </a>
        );
      },
      hr() {
        return <hr className="my-3 border-white/10" />;
      },
    }}
  >
    {content}
  </ReactMarkdown>
);

/* ────────────────── suggestion chips ──────────────────── */
const SUGGESTIONS = [
  { icon: '⚛️', text: 'What is quantum entanglement?' },
  { icon: '🌀', text: 'Explain superposition with code' },
  { icon: '🔬', text: 'How does a quantum computer work?' },
  { icon: '🧮', text: 'Write a Qiskit Bell state circuit' },
  { icon: '📊', text: "Explain Grover's algorithm step by step" },
  { icon: '🔐', text: 'Quantum key distribution explained' },
];

/* ════════════════════ MAIN COMPONENT ═════════════════════ */
export const FloatingAI: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── auto-scroll ── */
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isAtBottom) scrollToBottom();
  }, [messages, isAtBottom, scrollToBottom]);

  const handleScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setIsAtBottom(atBottom);
  };

  /* ── auto-resize textarea ── */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [question]);

  /* ── ask the backend ── */
  const askQuestion = async () => {
    const q = question.trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: q,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tutor/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to get AI response');

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get AI response';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  /* ── keyboard shortcut ── */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  /* ════════════════════════ RENDER ════════════════════════ */
  return (
    <>
      {/* ── Floating Trigger ── */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-cyan-500/30 transition-all duration-300 border-2 border-white/20 backdrop-blur-sm"
        >
          <Brain className="h-6 w-6 text-white" />
        </Button>
      </motion.div>

      {/* ── Pulse ring ── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 z-40 pointer-events-none"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="h-14 w-14 rounded-full bg-gradient-to-r from-cyan-500/30 to-purple-600/30 blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sidebar Overlay ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* backdrop */}
            <motion.div
              className="fixed inset-0 z-[998] bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* sidebar panel */}
            <motion.div
              className="fixed top-0 right-0 bottom-0 z-[999] flex flex-col"
              style={{ width: 'min(520px, 92vw)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="flex flex-col h-full bg-gradient-to-b from-[#0d0d1a] via-[#111127] to-[#0d0d1a] border-l border-white/10 shadow-2xl shadow-black/50">
                {/* ─── Header ─── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-transparent backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
                      <Brain className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-white text-base tracking-tight">AI Quantum Assistant</h2>
                      <p className="text-[11px] text-cyan-400/70 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Powered by Gemini
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearChat}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                      title="Clear chat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* ─── Chat Area ─── */}
                <div
                  ref={chatContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#ffffff20 transparent' }}
                >
                  {/* Welcome state */}
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-white/5 mb-5">
                        <Brain className="h-10 w-10 text-cyan-400 mx-auto" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">Quantum AI Assistant</h3>
                      <p className="text-sm text-gray-400 max-w-xs mb-6">
                        Ask anything about quantum computing, get code examples, and explore quantum concepts.
                      </p>

                      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                        {SUGGESTIONS.map((s) => (
                          <button
                            key={s.text}
                            onClick={() => { setQuestion(s.text); textareaRef.current?.focus(); }}
                            className="flex items-start gap-2 text-left px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-cyan-500/30 text-xs text-gray-300 hover:text-white transition-all duration-200 group"
                          >
                            <span className="text-base mt-0.5 group-hover:scale-110 transition-transform">{s.icon}</span>
                            <span className="leading-snug">{s.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[92%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                            ? 'bg-gradient-to-r from-cyan-600/80 to-purple-600/80 text-white border border-cyan-500/20'
                            : 'bg-white/[0.04] text-gray-200 border border-white/[0.06]'
                          }`}
                      >
                        {msg.role === 'user' ? (
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 mt-0.5 text-cyan-200 shrink-0" />
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          </div>
                        ) : (
                          <div className="ai-response">
                            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-white/5">
                              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                              <span className="text-[11px] font-medium text-cyan-400/80">Gemini Response</span>
                              <CopyButton text={msg.content} />
                            </div>
                            <MarkdownRenderer content={msg.content} />
                          </div>
                        )}
                        <div className="text-[10px] text-gray-500 mt-1.5 text-right">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                          <span className="text-[11px] font-medium text-cyan-400/80">Thinking</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* error */}
                  {error && (
                    <Alert className="border-red-500/20 bg-red-500/10">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-300 text-xs">{error}</AlertDescription>
                    </Alert>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Scroll-to-bottom FAB */}
                <AnimatePresence>
                  {!isAtBottom && messages.length > 2 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={scrollToBottom}
                      className="absolute bottom-36 left-1/2 -translate-x-1/2 p-2 rounded-full bg-cyan-500/90 text-white shadow-lg hover:bg-cyan-400 transition-colors z-10"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* ─── Input Area ─── */}
                <div className="px-4 py-3 border-t border-white/10 bg-[#0d0d1a]/80 backdrop-blur-xl">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 relative">
                      <textarea
                        ref={textareaRef}
                        placeholder="Ask about quantum computing, paste code, or request examples..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        rows={1}
                        className="w-full resize-none rounded-xl bg-white/[0.05] border border-white/10 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 text-sm text-white placeholder:text-gray-500 px-4 py-3 pr-10 outline-none transition-all duration-200 font-mono"
                        style={{ maxHeight: '160px' }}
                      />
                      <Code2 className="absolute right-3 top-3 h-4 w-4 text-gray-600 pointer-events-none" />
                    </div>
                    <Button
                      onClick={askQuestion}
                      disabled={!question.trim() || isLoading}
                      className="h-11 w-11 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-purple-500/20 transition-all duration-200"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 text-white" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1.5 text-center">
                    Press <kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-500 text-[9px]">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-white/5 text-gray-500 text-[9px]">Shift+Enter</kbd> for new line · Paste code directly
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingAI;