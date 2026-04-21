import { useState } from "react";
import { Brain, Loader2, TrendingUp, AlertTriangle, Shield, ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedAsset } from "@/hooks/useUnifiedPortfolio";
import { motion, AnimatePresence } from "framer-motion";

interface PortfolioInsightsData {
  risk_level: "Low" | "Medium" | "High";
  diversification_score: number;
  concentration_warning: boolean;
  insight_text: string;
  recommendations: string[];
}

interface AIPortfolioInsightsProps {
  assets: UnifiedAsset[];
  totalValue: number;
}

/* ── SVG Ring Gauge ── */
const RingGauge = ({ value, max = 100, size = 72, stroke = 5, color }: {
  value: number; max?: number; size?: number; stroke?: number; color: string;
}) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="hsl(var(--border) / 0.2)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
      />
    </svg>
  );
};

/* ── Risk Badge ── */
const RiskBadge = ({ level }: { level: "Low" | "Medium" | "High" }) => {
  const config = {
    Low: { icon: ShieldCheck, color: "text-success", bg: "bg-success/10", border: "border-success/20" },
    Medium: { icon: Shield, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
    High: { icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
  }[level];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold", config.bg, config.border, config.color)}>
      <Icon className="w-3.5 h-3.5" />
      {level} Risk
    </div>
  );
};

export const AIPortfolioInsights = ({ assets, totalValue }: AIPortfolioInsightsProps) => {
  const [insights, setInsights] = useState<PortfolioInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);

  const fetchInsights = async () => {
    if (assets.length === 0 || totalValue <= 0) return;
    setIsLoading(true);
    setError(null);
    setHasRequested(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("portfolio-insights", {
        body: {
          assets: assets.map(a => ({ symbol: a.symbol, chain: a.chain, valueUsd: a.valueUsd })),
          totalValue,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) {
        if (data.error === "AI credits exhausted" || data.error === "Rate limited") {
          setError(data.error === "Rate limited" ? "AI rate limited — try again shortly" : "AI credits exhausted — top up in Settings → Workspace → Usage");
        } else {
          setError("Could not load AI insights");
        }
        return;
      }
      setInsights(data);
    } catch (e) {
      setError("Could not load AI insights");
      console.error("Portfolio insights error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── CTA: Tap to analyze ── */
  if (!hasRequested) {
    return (
      <div className="px-4 pb-3">
        <motion.button
          onClick={fetchInsights}
          className="w-full bg-card/50 backdrop-blur-sm border border-border/30 rounded-2xl p-4 flex items-center gap-3 hover:border-foreground/10 transition-all"
          whileTap={{ scale: 0.97 }}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-foreground" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">AI Portfolio Insights</p>
            <p className="text-[11px] text-muted-foreground">Tap to analyze your portfolio</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
        </motion.button>
      </div>
    );
  }

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="px-4 pb-3">
        <InsightsLoadingSkeleton />
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="px-4 pb-3">
        <div className="bg-card/50 border border-border/30 rounded-2xl p-5 text-center space-y-2">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button onClick={fetchInsights} className="text-xs text-foreground/60 hover:text-foreground flex items-center gap-1 mx-auto">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const riskColor = {
    Low: "hsl(var(--success))",
    Medium: "hsl(38 92% 50%)",
    High: "hsl(var(--destructive))",
  }[insights.risk_level];

  const divColor = insights.diversification_score >= 60
    ? "hsl(var(--success))"
    : insights.diversification_score >= 35
      ? "hsl(38 92% 50%)"
      : "hsl(var(--destructive))";

  return (
    <div className="px-4 pb-3">
      <AnimatePresence>
        <motion.div
          className="bg-card/50 backdrop-blur-sm border border-border/30 rounded-2xl overflow-hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-foreground" />
              </div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AI Insights</h4>
            </div>
            <button onClick={fetchInsights} className="p-1.5 rounded-full hover:bg-foreground/5 transition-colors">
              <RefreshCw className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>

          {/* Visual Gauges */}
          <div className="flex items-center justify-around px-4 py-3">
            {/* Risk Gauge */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <RingGauge
                  value={insights.risk_level === "Low" ? 25 : insights.risk_level === "Medium" ? 55 : 85}
                  color={riskColor}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-bold" style={{ color: riskColor }}>
                    {insights.risk_level === "Low" ? "LOW" : insights.risk_level === "Medium" ? "MED" : "HIGH"}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk</span>
            </div>

            {/* Divider */}
            <div className="w-px h-14 bg-border/30" />

            {/* Diversification Gauge */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <RingGauge value={insights.diversification_score} color={divColor} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-foreground">{insights.diversification_score}</span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Diversity</span>
            </div>
          </div>

          {/* Warning badge + Risk badge row */}
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
            <RiskBadge level={insights.risk_level} />
            {insights.concentration_warning && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-[11px] text-amber-400 font-medium">
                <AlertTriangle className="w-3 h-3" />
                Concentrated
              </div>
            )}
          </div>

          {/* Recommendations as compact chips */}
          {insights.recommendations?.length > 0 && (
            <div className="px-4 pb-4 space-y-1.5">
              {insights.recommendations.slice(0, 3).map((rec, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-2 px-3 py-2 rounded-xl bg-foreground/[0.03] border border-border/20"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }}
                >
                  <TrendingUp className="w-3 h-3 mt-0.5 text-success shrink-0" />
                  <span className="text-[11px] text-muted-foreground leading-snug">{rec}</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="px-4 pb-3">
            <p className="text-[9px] text-muted-foreground/40 text-center">
              AI analysis · Not financial advice
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
