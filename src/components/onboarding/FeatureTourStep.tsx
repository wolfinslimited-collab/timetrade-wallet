import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { NETWORKS } from "@/config/networks";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface FeatureTourStepProps {
  onContinue: () => void;
  onBack: () => void;
}

type Slide = {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  hero: "ai-chat" | "ai-insights" | "chains";
};

const slides: Slide[] = [
  {
    key: "ai-chat",
    eyebrow: "AI Assistant",
    title: "Chat with your\nportfolio",
    description: "Ask anything about your holdings, get live market context, and personalized crypto guidance — powered by AI.",
    hero: "ai-chat",
  },
  {
    key: "ai-insights",
    eyebrow: "Smart Insights",
    title: "AI risk &\ndiversification",
    description: "Real-time risk scoring, diversification gauges, and AI-checked transactions to keep you safe before you sign.",
    hero: "ai-insights",
  },
  {
    key: "chains",
    eyebrow: "Multi-Chain",
    title: "All your chains,\none wallet",
    description: "Self-custody across 7 leading networks with a single seed phrase. Send, receive, and track everything in one place.",
    hero: "chains",
  },
];

/* ---------------- Hero illustrations (compact, no scroll) ---------------- */

const AIChatHero = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/25 via-fuchsia-500/10 to-transparent blur-3xl" />
    <div className="relative w-full max-w-[280px] mx-auto space-y-2.5">
      {/* Incoming bubble */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        className="flex justify-start"
      >
        <div className="max-w-[78%] bg-card border border-border/40 px-3.5 py-2.5 rounded-2xl rounded-tl-md">
          <p className="text-[12.5px] text-foreground/85 leading-snug">
            How is my portfolio doing today?
          </p>
        </div>
      </motion.div>
      {/* AI bubble */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        className="flex justify-end"
      >
        <div className="max-w-[82%] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white px-3.5 py-2.5 rounded-2xl rounded-tr-md shadow-lg shadow-fuchsia-500/20">
          <p className="text-[12.5px] leading-snug">
            You're up <span className="font-bold">+4.2%</span> today. ETH leads gains; BTC steady.
          </p>
        </div>
      </motion.div>
      {/* Typing */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.3 }}
        className="flex justify-start"
      >
        <div className="bg-card border border-border/40 px-3 py-2 rounded-2xl rounded-tl-md flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-foreground/50"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  </div>
);

const AIInsightsHero = () => {
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/25 via-cyan-500/10 to-transparent blur-3xl" />
      <div className="relative flex items-center gap-5">
        {[
          { label: "Risk", value: 28, color: "hsl(142 76% 50%)", from: 0.62 },
          { label: "Diversity", value: 74, color: "hsl(217 91% 60%)", from: 0.18 },
        ].map((g, i) => (
          <motion.div
            key={g.label}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.1, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="flex flex-col items-center"
          >
            <div className="relative w-[96px] h-[96px]">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} stroke="hsl(var(--border))" strokeWidth="7" fill="none" opacity="0.4" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={g.color}
                  strokeWidth="7"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  initial={{ strokeDashoffset: circ }}
                  animate={{ strokeDashoffset: circ * (1 - g.value / 100) }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[20px] font-extrabold text-foreground tabular-nums leading-none">{g.value}</span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">/100</span>
              </div>
            </div>
            <span className="mt-2 text-[11px] font-semibold text-foreground/75">{g.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const ChainsHero = () => {
  // Pick 6 networks for a 3x2 hero grid (compact, no scroll)
  const visible = NETWORKS.slice(0, 6);
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent blur-3xl" />
      <div className="relative grid grid-cols-3 gap-x-5 gap-y-4">
        {visible.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, scale: 0.7, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.05, duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="w-14 h-14 rounded-[18px] bg-card border border-border/40 flex items-center justify-center shadow-lg shadow-black/30">
              <img
                src={`https://api.elbstream.com/logos/crypto/${n.logoSymbol}`}
                alt={n.name}
                className="w-9 h-9 object-contain rounded-[6px]"
                loading="lazy"
              />
            </div>
            <span className="text-[10px] font-semibold text-foreground/70 leading-tight text-center max-w-[60px] truncate">
              {n.name}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

/* ---------------- Main step ---------------- */

export const FeatureTourStep = ({ onContinue, onBack }: FeatureTourStepProps) => {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const handleNext = () => {
    haptics.selection();
    if (isLast) {
      haptics.impact("medium");
      onContinue();
    } else {
      setIndex(index + 1);
    }
  };

  const handleBack = () => {
    haptics.selection();
    if (index === 0) onBack();
    else setIndex(index - 1);
  };

  const renderHero = () => {
    switch (slide.hero) {
      case "ai-chat":
        return <AIChatHero />;
      case "ai-insights":
        return <AIInsightsHero />;
      case "chains":
        return <ChainsHero />;
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background overflow-hidden">
      {/* Header — fixed */}
      <div
        className="shrink-0 px-5 pt-3 pb-2 flex items-center justify-between"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
      >
        <button
          onClick={handleBack}
          className="w-9 h-9 rounded-full bg-card border border-border/40 flex items-center justify-center transition-transform duration-150 active:scale-90"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5 text-foreground/80" />
        </button>
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-border"
              )}
            />
          ))}
        </div>
        <button
          onClick={() => {
            haptics.selection();
            onContinue();
          }}
          className="text-[13px] font-medium text-muted-foreground px-2 py-1 min-w-[36px] text-right"
        >
          Skip
        </button>
      </div>

      {/* Hero — flex, no scroll */}
      <div className="flex-1 min-h-0 px-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={`hero-${slide.key}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="w-full h-full flex items-center justify-center"
          >
            {renderHero()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Text — fixed footer area, no scroll */}
      <div className="shrink-0 px-7 pb-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={`text-${slide.key}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="text-center"
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary mb-1.5">
              {slide.eyebrow}
            </p>
            <h2 className="text-[26px] font-extrabold tracking-tight text-foreground leading-[1.1] whitespace-pre-line">
              {slide.title}
            </h2>
            <p className="text-[13.5px] text-muted-foreground mt-2.5 leading-snug max-w-[300px] mx-auto">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA — fixed bottom */}
      <div
        className="shrink-0 px-6 pt-3 pb-6"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          onClick={handleNext}
          className="w-full rounded-2xl bg-primary px-5 py-[16px] transition-transform duration-150 active:scale-[0.98] shadow-lg shadow-primary/25"
        >
          <span className="text-[15px] font-bold text-primary-foreground">
            {isLast ? "Get Started" : "Continue"}
          </span>
        </button>
      </div>
    </div>
  );
};
