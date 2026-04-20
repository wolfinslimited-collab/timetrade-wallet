import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ShieldCheck, Brain, ArrowRight, ChevronLeft, Check } from "lucide-react";
import { NETWORKS } from "@/config/networks";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface FeatureTourStepProps {
  onContinue: () => void;
  onBack: () => void;
}

const slides = [
  {
    key: "ai-chat",
    accent: "from-violet-500/30 to-fuchsia-500/10",
    iconBg: "from-violet-500 to-fuchsia-500",
    icon: Sparkles,
    eyebrow: "AI Assistant",
    title: "Chat with your portfolio",
    description:
      "Ask questions about your holdings, get market context, and receive personalized crypto guidance — powered by AI.",
  },
  {
    key: "ai-insights",
    accent: "from-blue-500/30 to-cyan-500/10",
    iconBg: "from-blue-500 to-cyan-500",
    icon: Brain,
    eyebrow: "Smart Insights",
    title: "AI portfolio & risk analysis",
    description:
      "Real-time risk scoring, diversification gauges, and AI-checked transactions to keep you safe before you sign.",
  },
  {
    key: "chains",
    accent: "from-emerald-500/30 to-teal-500/10",
    iconBg: "from-emerald-500 to-teal-500",
    icon: ShieldCheck,
    eyebrow: "Multi-Chain",
    title: "All your chains in one wallet",
    description:
      "Self-custody across 7 leading networks with a single seed phrase. Send, receive, and track everything in one place.",
    chains: true as const,
  },
];

export const FeatureTourStep = ({ onContinue, onBack }: FeatureTourStepProps) => {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;
  const Icon = slide.icon;

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

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="p-2 rounded-full bg-card border border-border/40 transition-transform duration-150 active:scale-90"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
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
          className="text-[13px] font-medium text-muted-foreground px-2 py-1"
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 px-6 pt-2 pb-4 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            className="h-full flex flex-col"
          >
            {/* Hero icon */}
            <div className="flex justify-center mt-2 mb-8">
              <div className="relative">
                <div className={cn("absolute inset-0 bg-gradient-to-br rounded-[28px] blur-2xl opacity-70", slide.accent)} />
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.05, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                  className={cn(
                    "relative w-24 h-24 rounded-[28px] bg-gradient-to-br flex items-center justify-center shadow-2xl",
                    slide.iconBg
                  )}
                >
                  <Icon className="w-11 h-11 text-white" strokeWidth={1.8} />
                </motion.div>
              </div>
            </div>

            {/* Eyebrow + title */}
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary text-center mb-2">
              {slide.eyebrow}
            </p>
            <h2 className="text-[26px] font-extrabold tracking-tight text-center text-foreground leading-tight px-2">
              {slide.title}
            </h2>
            <p className="text-[14px] text-muted-foreground text-center mt-3 leading-relaxed max-w-[320px] mx-auto">
              {slide.description}
            </p>

            {/* Chain showcase or feature pills */}
            {slide.chains ? (
              <div className="mt-8 grid grid-cols-4 gap-3 px-1">
                {NETWORKS.map((n, i) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.04, duration: 0.3 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-card border border-border/40 flex items-center justify-center overflow-hidden">
                      <img
                        src={`https://api.elbstream.com/logos/crypto/${n.logoSymbol}`}
                        alt={n.name}
                        className="w-7 h-7 object-contain"
                        loading="lazy"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-foreground/70 text-center leading-tight">
                      {n.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="mt-8 space-y-2.5 px-1">
                {(slide.key === "ai-chat"
                  ? [
                      "Natural-language portfolio Q&A",
                      "Live market context & token insights",
                      "Always-on, in your pocket",
                    ]
                  : [
                      "Inline transaction risk scoring",
                      "Diversification & risk ring gauges",
                      "Detect suspicious destinations",
                    ]
                ).map((line, i) => (
                  <motion.div
                    key={line}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.06, duration: 0.3 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/30"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />
                    </div>
                    <span className="text-[13.5px] font-medium text-foreground/85">{line}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div
        className="shrink-0 px-6 pb-8"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          onClick={handleNext}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-[18px] transition-transform duration-150 active:scale-[0.98]"
        >
          <span className="text-[15px] font-bold text-primary-foreground">
            {isLast ? "Get Started" : "Next"}
          </span>
          <ArrowRight className="w-4 h-4 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
};
