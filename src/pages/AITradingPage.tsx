import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTradingApi } from "@/hooks/useTradingApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, TrendingUp, TrendingDown, Wallet, Lock, DollarSign, Bot,
  LogOut, RefreshCw, ArrowUpRight, ArrowDownRight, Activity, Sparkles,
  ChevronRight, Shield, Zap, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TradingOnboardingWizard, type TradingProfile } from "@/components/trading/TradingOnboardingWizard";
import { toast } from "sonner";

const TRADING_PROFILE_KEY = "timetrade_trading_profile";

/* ── Shared Cards ── */

const MetricTile = ({ label, value, icon, tint, showSign }: {
  label: string; value: number; icon: React.ReactNode; tint: string; showSign?: boolean;
}) => {
  const isProfit = value >= 0;
  const valueColor = showSign && value !== 0
    ? (isProfit ? "text-success" : "text-destructive")
    : "text-foreground";
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-4 hover:border-border/70 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", tint)}>
          {icon}
        </div>
        {showSign && value !== 0 && (
          <div className={cn(
            "px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-0.5",
            isProfit ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {isProfit ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={cn("text-lg font-bold font-mono tracking-tight tabular-nums", valueColor)}>
        {showSign && value > 0 ? "+" : ""}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
};

/* ── Auth Screens ── */

type AuthView = "login" | "signup" | "forgot";

function TradingConnect({ api }: { api: ReturnType<typeof useTradingApi> }) {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const inputClass = "w-full h-12 rounded-xl bg-secondary/50 border border-border/40 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  const switchView = (v: AuthView) => {
    setView(v);
    setEmail("");
    setPassword("");
    setReferralCode("");
    setForgotSent(false);
    setForgotError(null);
  };

  const handleLogin = () => api.authenticate(email, password);
  const handleSignup = () => api.register(email, password, referralCode || undefined);
  const handleForgot = async () => {
    setForgotLoading(true);
    setForgotError(null);
    try {
      await api.forgotPassword(email);
      setForgotSent(true);
    } catch (e: any) {
      setForgotError(e.message || "Failed to send reset email");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 min-h-[60vh]">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <Bot className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-1">
        {view === "login" ? "AI Trading" : view === "signup" ? "Create Account" : "Reset Password"}
      </h2>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-[320px]">
        {view === "login"
          ? "Sign in to access your AI trading dashboard"
          : view === "signup"
          ? "Create a new account to get started"
          : "Enter your email to receive a reset link"}
      </p>

      {(api.authError || forgotError) && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 mb-4 w-full max-w-[320px]">
          <p className="text-xs text-destructive text-center">{api.authError || forgotError}</p>
        </div>
      )}

      {view === "forgot" && forgotSent ? (
        <div className="w-full max-w-[320px] space-y-4">
          <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-4">
            <p className="text-xs text-success text-center">Password reset link sent to your email. Please check your inbox.</p>
          </div>
          <Button onClick={() => switchView("login")} variant="outline" className="w-full h-12 rounded-xl text-sm font-semibold">
            Back to Sign In
          </Button>
        </div>
      ) : (
        <>
          <div className="w-full max-w-[320px] space-y-4 mb-5">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>

            {view !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-foreground">Password</label>
                  {view === "login" && (
                    <button onClick={() => switchView("forgot")} className="text-xs text-primary font-medium">Forgot password?</button>
                  )}
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (view === "login" ? handleLogin() : handleSignup())}
                  className={inputClass}
                />
              </div>
            )}

            {view === "signup" && (
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Referral Code <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input type="text" placeholder="Enter referral code" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className={inputClass} />
              </div>
            )}
          </div>

          <Button
            onClick={view === "login" ? handleLogin : view === "signup" ? handleSignup : handleForgot}
            disabled={(view === "forgot" ? forgotLoading : api.isAuthenticating) || !email || (view !== "forgot" && !password)}
            className="w-full max-w-[320px] h-12 rounded-xl font-semibold text-sm"
          >
            {(view === "forgot" ? forgotLoading : api.isAuthenticating) ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />{view === "forgot" ? "Sending..." : view === "login" ? "Signing in..." : "Creating account..."}</>
            ) : (
              view === "login" ? "Sign In" : view === "signup" ? "Create Account" : "Send Reset Link"
            )}
          </Button>

          <p className="mt-4 text-sm text-muted-foreground">
            {view === "login" ? (
              <>Don't have an account?{" "}<button onClick={() => switchView("signup")} className="text-primary font-medium">Sign up</button></>
            ) : (
              <>Already have an account?{" "}<button onClick={() => switchView("login")} className="text-primary font-medium">Sign in</button></>
            )}
          </p>
        </>
      )}
    </div>
  );
}

/* ── Dashboard ── */

function TradingDashboard({ api }: { api: ReturnType<typeof useTradingApi> }) {
  const navigate = useNavigate();
  const { balance, tradingStatus, earnings, tradeHistory, profile, isLoading, fetchDashboardData, logout } = api;
  const [toggling, setToggling] = useState(false);

  const totalBalance = (balance?.usd_balance || 0) + (balance?.locked_balance || 0);
  const totalProfit = balance?.released_profit || 0;
  const earningsTotal = earnings?.total_usd || 0;
  const availableBalance = balance?.usd_balance || 0;

  const handleToggle = async () => {
    if (tradingStatus?.trading_active) {
      setToggling(true);
      try {
        await api.toggleTrading("stop");
      } finally {
        setToggling(false);
      }
      return;
    }
    navigate("/ai-trading/start");
  };

  if (isLoading && !balance) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 pb-32">
      {/* Header — minimal, clean */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            {tradingStatus?.trading_active && (
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-background animate-pulse" />
            )}
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-foreground leading-tight tracking-tight">AI Trading</h1>
            <p className="text-[10px] text-muted-foreground font-medium">{format(new Date(), "EEE, MMM d • HH:mm")}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={fetchDashboardData} className="w-9 h-9 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center active:scale-95 hover:bg-card transition-colors">
            <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", isLoading && "animate-spin")} />
          </button>
          <button onClick={logout} className="w-9 h-9 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center active:scale-95 hover:bg-card transition-colors">
            <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Live Trades + Wallet — prominent top access */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => navigate("/live-trades")}
          className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-r from-card via-card to-card/80 p-3.5 active:scale-[0.99] transition-transform shadow-lg shadow-black/5"
        >
          <div className="absolute inset-y-0 right-0 w-24 bg-primary/10 blur-3xl" />
          <div className="relative flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success border-2 border-background" />
              </span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[12px] font-bold text-foreground tracking-tight">Live Trades</p>
              <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Real-time activity</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => navigate("/ai-trading/wallet")}
          className="group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-r from-card via-card to-card/80 p-3.5 active:scale-[0.99] transition-transform shadow-lg shadow-black/5"
        >
          <div className="absolute inset-y-0 right-0 w-24 bg-violet-500/10 blur-3xl" />
          <div className="relative flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 text-violet-500" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[12px] font-bold text-foreground tracking-tight">Wallet</p>
              <p className="text-[9px] text-muted-foreground font-medium mt-0.5">Deposit · Withdraw</p>
            </div>
          </div>
        </button>
      </div>

      {/* Hero Portfolio — refined, premium */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-card via-card to-card/40 p-5 shadow-xl shadow-black/5">
        {/* subtle accent glow */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-violet-500/10 blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur",
                tradingStatus?.trading_active
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-muted/10 text-muted-foreground border border-border/40"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full", tradingStatus?.trading_active ? "bg-success animate-pulse" : "bg-muted-foreground/60")} />
                {tradingStatus?.trading_active ? "Active" : "Paused"}
              </div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.15em]">Portfolio</p>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-[20px] font-bold text-muted-foreground/80 font-mono">$</span>
            <p className="text-[40px] font-bold font-mono text-foreground tracking-tighter leading-none tabular-nums">
              {totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Compact PnL strip */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border",
              totalProfit >= 0 ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20"
            )}>
              {totalProfit >= 0
                ? <TrendingUp className="w-3 h-3 text-success" />
                : <TrendingDown className="w-3 h-3 text-destructive" />}
              <span className={cn("text-[11px] font-bold font-mono tabular-nums", totalProfit >= 0 ? "text-success" : "text-destructive")}>
                {totalProfit >= 0 ? "+" : ""}${Math.abs(totalProfit).toFixed(2)}
              </span>
              <span className="text-[9px] text-muted-foreground font-medium">all time</span>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border",
              earningsTotal >= 0 ? "bg-card/60 border-border/40" : "bg-destructive/5 border-destructive/20"
            )}>
              <Zap className="w-3 h-3 text-amber-500" />
              <span className={cn("text-[11px] font-bold font-mono tabular-nums", earningsTotal >= 0 ? "text-foreground" : "text-destructive")}>
                {earningsTotal >= 0 ? "+" : ""}${Math.abs(earningsTotal).toFixed(2)}
              </span>
              <span className="text-[9px] text-muted-foreground font-medium">7d</span>
            </div>
          </div>

        </div>
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-border/40 bg-card/75 p-4 shadow-xl shadow-black/5 backdrop-blur-sm">
        <div className="absolute inset-y-0 right-0 w-32 bg-primary/10 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/70 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="w-3 h-3 text-primary" />
              Trading Control
            </div>
            <h2 className="mt-3 text-[15px] font-bold tracking-tight text-foreground">
              {tradingStatus?.trading_active ? "Manage your live trading session" : "Launch your AI trading session"}
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {tradingStatus?.trading_active
                ? "The main action lives here now, separate from your balance card for a cleaner dashboard flow."
                : "A dedicated control area gives Start Trading its own clear, premium position."}
            </p>
          </div>

          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
              tradingStatus?.trading_active
                ? "border-destructive/20 bg-destructive/10"
                : "border-primary/20 bg-primary/10"
            )}
          >
            {tradingStatus?.trading_active ? (
              <Lock className="w-4 h-4 text-destructive" />
            ) : (
              <Zap className="w-4 h-4 text-primary" />
            )}
          </div>
        </div>

        <div className="relative mt-4">
          <Button
            onClick={handleToggle}
            disabled={toggling}
            className={cn(
              "w-full h-14 rounded-2xl text-sm font-bold shadow-lg",
              tradingStatus?.trading_active
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30"
            )}
          >
            {toggling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : tradingStatus?.trading_active ? (
              <><Lock className="w-4 h-4 mr-2" />Stop Trading</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" />Start Trading</>
            )}
          </Button>
        </div>
      </div>

      {/* Metrics Grid — 2x2 polished */}
      <div className="grid grid-cols-2 gap-2.5">
        <MetricTile label="Available" value={balance?.usd_balance || 0} icon={<Wallet className="w-4 h-4 text-primary" />} tint="bg-primary/10" />
        <MetricTile label="In Trading" value={balance?.locked_balance || 0} icon={<Lock className="w-4 h-4 text-amber-500" />} tint="bg-amber-500/10" />
        <MetricTile label="Realized P&L" value={totalProfit} icon={<DollarSign className="w-4 h-4 text-success" />} tint="bg-success/10" showSign />
        <MetricTile label="7-Day Earnings" value={earningsTotal} icon={<BarChart3 className="w-4 h-4 text-violet-500" />} tint="bg-violet-500/10" showSign />
      </div>

      {/* Bot Status — refined */}
      <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-11 h-11 rounded-2xl flex items-center justify-center border",
              tradingStatus?.trading_active
                ? "bg-success/10 border-success/30 shadow-lg shadow-success/10"
                : "bg-muted/5 border-border/40"
            )}>
              <Bot className={cn("w-5 h-5", tradingStatus?.trading_active ? "text-success" : "text-muted-foreground")} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-foreground">Trading Bot</p>
                {tradingStatus?.trading_active && (
                  <div className="px-1.5 py-0 rounded-md bg-success/15 text-success text-[8px] font-bold uppercase tracking-wide">Live</div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {tradingStatus?.trading_active
                  ? `${tradingStatus.mode || "Live"} mode • ${tradingStatus.strategies?.length || 0} strategies running`
                  : "Bot is idle — start trading to activate"}
              </p>
            </div>
          </div>
          <Shield className={cn("w-4 h-4 shrink-0", tradingStatus?.trading_active ? "text-success" : "text-muted-foreground/50")} />
        </div>
      </div>

      {/* Recent Trades — institutional list style */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-foreground font-bold uppercase tracking-wider">Recent Activity</p>
            {tradeHistory.length > 0 && (
              <div className="px-1.5 py-0 rounded-md bg-muted/20 text-muted-foreground text-[9px] font-bold tabular-nums">
                {tradeHistory.length}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
          {tradeHistory.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-3 border border-border/30">
                <BarChart3 className="w-5 h-5 text-muted-foreground/60" />
              </div>
              <p className="text-xs font-semibold text-foreground">No trades yet</p>
              <p className="text-[10px] text-muted-foreground mt-1">Start trading to see your activity here</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {tradeHistory.slice(0, 6).map((trade, i) => {
                const pnl = trade.pnl || 0;
                const isProfit = pnl >= 0;
                return (
                  <div key={trade.id || i} className="flex items-center justify-between py-3 px-3.5 hover:bg-muted/5 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                        isProfit
                          ? "bg-success/10 border-success/20"
                          : "bg-destructive/10 border-destructive/20"
                      )}>
                        {isProfit
                          ? <ArrowUpRight className="w-4 h-4 text-success" />
                          : <ArrowDownRight className="w-4 h-4 text-destructive" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-foreground truncate tracking-tight">
                          {trade.pair || trade.symbol || "Trade"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {trade.closed_at ? format(new Date(trade.closed_at), "MMM d • HH:mm") : "Pending"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-mono text-[13px] font-bold tabular-nums", isProfit ? "text-success" : "text-destructive")}>
                        {isProfit ? "+" : ""}${Math.abs(pnl).toFixed(2)}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">
                        {isProfit ? "Profit" : "Loss"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

/* ── Main Page ── */

interface AITradingPageProps {
  onBack?: () => void;
}

export const AITradingPage = ({ onBack }: AITradingPageProps) => {
  const api = useTradingApi();

  if (api.isCheckingSession) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {api.isAuthenticated ? <TradingDashboard api={api} /> : <TradingConnect api={api} />}
    </div>
  );
};

export default AITradingPage;
