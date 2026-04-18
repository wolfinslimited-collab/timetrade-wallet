import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { TradingOnboardingWizard, type TradingProfile } from "@/components/trading/TradingOnboardingWizard";
import { useTradingApi } from "@/hooks/useTradingApi";
import { toast } from "sonner";

const TRADING_PROFILE_KEY = "timetrade_trading_profile";

const AITradingOnboardingPage = () => {
  const navigate = useNavigate();
  const api = useTradingApi();
  

  const availableBalance = api.balance?.usd_balance || 0;

  // Guard: if not authenticated or already trading, bounce back
  useEffect(() => {
    if (api.isCheckingSession) return;
    if (!api.isAuthenticated) {
      navigate("/?tab=trading", { replace: true });
      return;
    }
    if (api.tradingStatus?.trading_active) {
      navigate("/?tab=trading", { replace: true });
    }
  }, [api.isCheckingSession, api.isAuthenticated, api.tradingStatus?.trading_active, navigate]);

  const handleComplete = async (profile: TradingProfile) => {
    setSubmitting(true);
    try {
      localStorage.setItem(TRADING_PROFILE_KEY, JSON.stringify(profile));
      await api.toggleTrading("start", profile.allocatedAmount);
      toast.success("Trading started", {
        description: `$${profile.allocatedAmount.toFixed(2)} allocated to AI agents.`,
      });
      navigate("/?tab=trading", { replace: true });
    } catch (e: any) {
      toast.error("Failed to start", { description: e?.message || "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (api.isCheckingSession || !api.isAuthenticated) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border/40">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Back"
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-bold text-foreground tracking-tight leading-tight">Start Trading</h1>
          <p className="text-[10px] text-muted-foreground font-medium">Configure your AI trading session</p>
        </div>
      </div>

      <div className="px-4 py-4 pb-32">
        <TradingOnboardingWizard
          balance={availableBalance}
          onComplete={handleComplete}
          onCancel={() => navigate(-1)}
        />
      </div>
    </div>
  );
};

export default AITradingOnboardingPage;
