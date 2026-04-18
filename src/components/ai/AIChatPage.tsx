import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, Zap, Shield, TrendingUp, MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const SUGGESTIONS = [
  { icon: Zap, label: "What is gas fee?", color: "from-amber-500/20 to-orange-500/20 border-amber-500/20" },
  { icon: TrendingUp, label: "How to spot scam tokens?", color: "from-emerald-500/20 to-green-500/20 border-emerald-500/20" },
  { icon: Shield, label: "How to stay safe?", color: "from-blue-500/20 to-cyan-500/20 border-blue-500/20" },
  { icon: MessageCircle, label: "What are stablecoins?", color: "from-purple-500/20 to-pink-500/20 border-purple-500/20" },
];

export const AIChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { unifiedAssets, totalBalanceUsd } = useBlockchainContext();

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  useEffect(scrollToBottom, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const getPortfolioContext = () => {
    if (!unifiedAssets?.length) return undefined;
    return {
      totalValue: totalBalanceUsd || 0,
      assets: unifiedAssets.slice(0, 10).map(a => ({ symbol: a.symbol, chain: a.chain })),
      chainCount: new Set(unifiedAssets.map(a => a.chain)).size,
    };
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          portfolioContext: getPortfolioContext(),
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${resp.status})`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || raw.trim() === "" || !raw.startsWith("data: ")) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      console.error("AI chat error:", e);
      setMessages(prev => [...prev, { role: "assistant", content: `Sorry, I couldn't process your request. ${e.message || "Please try again."}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, unifiedAssets, totalBalanceUsd]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
        {/* Empty state */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center justify-center h-full gap-5 py-8"
          >
            {/* Animated orb */}
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-primary/10">
                <Sparkles className="w-9 h-9 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-3xl bg-primary/5 animate-pulse" />
            </div>

            <div className="text-center space-y-1.5">
              <h2 className="text-lg font-semibold text-foreground">How can I help?</h2>
              <p className="text-sm text-muted-foreground max-w-[240px]">
                Ask me anything about crypto, blockchain, or your portfolio
              </p>
            </div>

            {/* Suggestion cards */}
            <div className="grid grid-cols-2 gap-2.5 w-full max-w-sm mt-2">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.3 }}
                  onClick={() => sendMessage(s.label)}
                  className={cn(
                    "flex items-start gap-2.5 p-3.5 rounded-2xl border text-left",
                    "bg-gradient-to-br backdrop-blur-sm",
                    "hover:scale-[1.02] active:scale-[0.98] transition-all duration-200",
                    s.color
                  )}
                >
                  <s.icon className="w-4 h-4 text-foreground/70 mt-0.5 shrink-0" />
                  <span className="text-xs font-medium text-foreground/80 leading-snug">{s.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={cn(
                "flex gap-2.5 mb-4",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 mt-1 border border-primary/10">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[78%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed",
                msg.role === "user"
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-br-lg shadow-lg shadow-primary/10"
                  : "bg-card/80 border border-border/50 rounded-bl-lg backdrop-blur-sm"
              )}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:bg-secondary/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-xs [&_pre]:bg-secondary/40 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/30">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-secondary/80 flex items-center justify-center shrink-0 mt-1 border border-border/30">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2.5 mb-4"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card/80 border border-border/50 rounded-2xl rounded-bl-lg px-4 py-3.5 backdrop-blur-sm">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input area */}
      <div className="relative px-4 pb-4 pt-2">
        {/* Top fade gradient */}
        <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />

        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end gap-2 bg-card/80 border border-border/50 rounded-2xl p-1.5 backdrop-blur-xl focus-within:border-primary/30 transition-colors duration-200">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about crypto..."
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent px-3 py-2.5 text-sm resize-none focus:outline-none disabled:opacity-50 placeholder:text-muted-foreground/40 max-h-[120px] leading-relaxed"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200",
                input.trim() && !isLoading
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105 active:scale-95"
                  : "bg-secondary/50 text-muted-foreground/30"
              )}
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
