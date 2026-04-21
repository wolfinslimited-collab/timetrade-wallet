import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2, Wallet } from "lucide-react";
import { TradingOnboardingWizard, type TradingProfile } from "@/components/trading/TradingOnboardingWizard";
import { useTradingApi } from "@/hooks/useTradingApi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const TRADING_PROFILE_KEY = "timetrade_trading_profile";

const AITradingOnboardingPage = () => {
  const navigate = useNavigate();
  const api = useTradingApi();

  const availableBalance = api.balance?.usd_balance || 0;
  const balanceLoaded = api.balance !== null;
  const hasBalance = availableBalance > 0;

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
    try {
      localStorage.setItem(TRADING_PROFILE_KEY, JSON.stringify(profile));
      await api.toggleTrading("start", profile.allocatedAmount);
      toast.success("Trading started", {
        description: `$${profile.allocatedAmount.toFixed(2)} allocated to AI agents.`,
      });
      navigate("/?tab=trading", { replace: true });
    } catch (e: any) {
      toast.error("Failed to start", { description: e?.message || "Please try again." });
    }
  };

  if (api.isCheckingSession || !api.isAuthenticated || !balanceLoaded) {
    return (
      <div className="min-h-full bg-background p-4">
        <GenericCardSkeleton />
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
        {!hasBalance ? (
          <div className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold text-foreground">Insufficient Balance</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You need available USD balance to start AI trading. Deposit funds to your trading wallet first.
              </p>
              <p className="text-xs text-muted-foreground font-mono pt-1">
                Available: ${availableBalance.toFixed(2)}
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => navigate("/?tab=trading")} className="w-full">
                Go to Trading Dashboard
              </Button>
              <Button variant="ghost" onClick={() => api.fetchDashboardData()} className="w-full text-muted-foreground hover:bg-transparent hover:text-foreground">
                Refresh Balance
              </Button>
            </div>
          </div>
        ) : (
          <TradingOnboardingWizard
            balance={availableBalance}
            onComplete={handleComplete}
            onCancel={() => navigate(-1)}
          />
        )}
      </div>
    </div>
  );
};

export default AITradingOnboardingPage;
