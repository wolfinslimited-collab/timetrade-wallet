import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const SUGGESTIONS = [
  "What is gas fee?",
  "Explain staking",
  "How to stay safe in crypto?",
  "What are stablecoins?",
];

export const AIChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { unifiedAssets, totalBalanceUsd } = useBlockchainContext();

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  useEffect(scrollToBottom, [messages]);

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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-md mx-auto">
      {/* Header */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Your crypto knowledge companion</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-3 pb-4 scrollbar-hide">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Ask me anything about crypto</p>
              <p className="text-xs text-muted-foreground/60 mt-1">I can help with transactions, tokens, and more</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs p-3 rounded-xl bg-card border border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border/50 rounded-bl-md"
              )}>
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about crypto..."
            disabled={isLoading}
            className="flex-1 h-12 rounded-2xl bg-card border border-border/50 px-4 text-sm focus:outline-none focus:border-primary/50 disabled:opacity-50 placeholder:text-muted-foreground/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
