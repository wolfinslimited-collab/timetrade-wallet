import { useState, useEffect } from "react";
import { Brain, Loader2, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedAsset } from "@/hooks/useUnifiedPortfolio";

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
          assets: assets.map(a => ({
            symbol: a.symbol,
            chain: a.chain,
            valueUsd: a.valueUsd,
          })),
          totalValue,
        },
      });

      if (fnError) throw fnError;
      setInsights(data);
    } catch (e) {
      setError("Could not load AI insights");
      console.error("Portfolio insights error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasRequested) {
    return (
      <div className="px-4 pb-3">
        <button
          onClick={fetchInsights}
          className="w-full bg-card/50 border border-border/30 rounded-2xl p-4 flex items-center gap-3 hover:border-primary/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">AI Portfolio Insights</p>
            <p className="text-xs text-muted-foreground">Tap to analyze this asset in your portfolio</p>
          </div>
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 pb-3">
        <div className="bg-card/50 border border-border/30 rounded-2xl p-6 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing portfolio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pb-3">
        <div className="bg-card/50 border border-border/30 rounded-2xl p-4">
          <p className="text-sm text-muted-foreground text-center">{error}</p>
          <button onClick={fetchInsights} className="text-xs text-primary mt-2 mx-auto block">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const isHigh = insights.risk_level === "High";
  const isMedium = insights.risk_level === "Medium";

  return (
    <div className="px-4 pb-3">
      <div className="bg-card/50 border border-border/30 rounded-2xl p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AI Insights</h4>
        </div>

        {/* Metrics row */}
        <div className="flex gap-2">
          <div className={cn(
            "flex-1 rounded-xl p-3 text-center",
            isHigh ? "bg-destructive/10" : isMedium ? "bg-amber-500/10" : "bg-success/10"
          )}>
            <p className="text-[10px] text-muted-foreground uppercase">Risk</p>
            <p className={cn(
              "text-sm font-bold",
              isHigh ? "text-destructive" : isMedium ? "text-amber-500" : "text-success"
            )}>
              {insights.risk_level}
            </p>
          </div>
          <div className="flex-1 rounded-xl p-3 text-center bg-primary/5">
            <p className="text-[10px] text-muted-foreground uppercase">Diversification</p>
            <p className="text-sm font-bold text-primary">{insights.diversification_score}/100</p>
          </div>
        </div>

        {/* Concentration warning */}
        {insights.concentration_warning && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">Portfolio is highly concentrated</p>
          </div>
        )}

        {/* Insight text */}
        <p className="text-sm text-muted-foreground leading-relaxed">{insights.insight_text}</p>

        {/* Recommendations */}
        {insights.recommendations?.length > 0 && (
          <div className="space-y-1.5">
            {insights.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/50 text-center pt-1">
          AI analysis is informational only. Not financial advice.
        </p>
      </div>
    </div>
  );
};
