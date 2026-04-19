import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTradingApi } from "@/hooks/useTradingApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, TrendingUp, TrendingDown, Wallet, Lock, Bot,
  LogOut, RefreshCw, ArrowUpRight, ArrowDownRight, Activity,
  ChevronRight, Zap, BarChart3, Plus, ArrowDown, Power,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TradingOnboardingWizard, type TradingProfile } from "@/components/trading/TradingOnboardingWizard";
import { toast } from "sonner";

const TRADING_PROFILE_KEY = "timetrade_trading_profile";

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
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-foreground leading-tight tracking-tight">AI Trading</h1>
            <p className="text-[10px] text-muted-foreground font-medium">{format(new Date(), "EEE, MMM d • HH:mm")}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={fetchDashboardData} className="w-9 h-9 rounded-xl bg-card border border-border/40 flex items-center justify-center active:scale-95 transition-transform" aria-label="Refresh">
            <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", isLoading && "animate-spin")} />
          </button>
          <button onClick={logout} className="w-9 h-9 rounded-xl bg-card border border-border/40 flex items-center justify-center active:scale-95 transition-transform" aria-label="Sign out">
            <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Hero Balance — clean, single focal point */}
      <div className="rounded-3xl border border-border/40 bg-card p-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Total Balance</p>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold",
            tradingStatus?.trading_active
              ? "bg-success/10 text-success"
              : "bg-muted text-muted-foreground"
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", tradingStatus?.trading_active ? "bg-success animate-pulse" : "bg-muted-foreground/60")} />
            {tradingStatus?.trading_active ? "Trading" : "Paused"}
          </div>
        </div>

        <p className="text-[38px] font-bold font-mono text-foreground tracking-tighter leading-none tabular-nums mt-2">
          ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>

        <div className={cn(
          "inline-flex items-center gap-1 mt-3 text-[12px] font-semibold tabular-nums",
          totalProfit >= 0 ? "text-success" : "text-destructive"
        )}>
          {totalProfit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {totalProfit >= 0 ? "+" : ""}${Math.abs(totalProfit).toFixed(2)}
          <span className="text-muted-foreground font-normal ml-1">all-time P&L</span>
        </div>

        {/* Quick action row */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <ActionButton label="Deposit" icon={<ArrowDown className="w-4 h-4" />} onClick={() => navigate("/ai-trading/wallet?tab=deposit")} />
          <ActionButton label="Withdraw" icon={<ArrowUpRight className="w-4 h-4" />} onClick={() => navigate("/ai-trading/wallet?tab=withdraw")} />
          <ActionButton label="Live" icon={<Activity className="w-4 h-4" />} onClick={() => navigate("/live-trades")} live />
        </div>
      </div>

      {/* Primary CTA — Start / Stop trading */}
      <Button
        onClick={handleToggle}
        disabled={toggling}
        className={cn(
          "w-full h-14 rounded-2xl text-sm font-semibold",
          tradingStatus?.trading_active
            ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            : "bg-primary hover:bg-primary/90 text-primary-foreground"
        )}
      >
        {toggling ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : tradingStatus?.trading_active ? (
          <><Power className="w-4 h-4 mr-2" />Stop Trading</>
        ) : (
          <><Zap className="w-4 h-4 mr-2" />Start Trading</>
        )}
      </Button>

      {/* Stat row — 3 compact tiles */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Available" value={availableBalance} />
        <StatTile label="In Trades" value={balance?.locked_balance || 0} muted />
        <StatTile label="7d Earnings" value={earningsTotal} highlight />
      </div>

      {/* Recent Trades */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2.5">
          <p className="text-[11px] text-foreground font-semibold uppercase tracking-wider">Recent Trades</p>
          {tradeHistory.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-medium tabular-nums">{tradeHistory.length} total</span>
          )}
        </div>
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          {tradeHistory.length === 0 ? (
            <div className="py-12 text-center px-4">
              <div className="w-11 h-11 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-5 h-5 text-muted-foreground/60" />
              </div>
              <p className="text-[13px] font-semibold text-foreground">No trades yet</p>
              <p className="text-[11px] text-muted-foreground mt-1">Start trading to see your activity here</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {tradeHistory.slice(0, 6).map((trade, i) => {
                const pnl = trade.pnl || 0;
                const isProfit = pnl >= 0;
                return (
                  <div key={trade.id || i} className="flex items-center justify-between py-3 px-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                        isProfit ? "bg-success/10" : "bg-destructive/10"
                      )}>
                        {isProfit
                          ? <ArrowUpRight className="w-4 h-4 text-success" />
                          : <ArrowDownRight className="w-4 h-4 text-destructive" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">
                          {trade.pair || trade.symbol || "Trade"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {trade.closed_at ? format(new Date(trade.closed_at), "MMM d • HH:mm") : "Pending"}
                        </p>
                      </div>
                    </div>
                    <p className={cn("font-mono text-[13px] font-semibold tabular-nums", isProfit ? "text-success" : "text-destructive")}>
                      {isProfit ? "+" : ""}${Math.abs(pnl).toFixed(2)}
                    </p>
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

/* ── Reusable Pieces ── */

const ActionButton = ({ label, icon, onClick, live }: {
  label: string; icon: React.ReactNode; onClick: () => void; live?: boolean;
}) => (
  <button
    onClick={onClick}
    className="relative flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-secondary/60 border border-border/40 hover:bg-secondary active:scale-[0.97] transition-all"
  >
    {live && (
      <span className="absolute top-2 right-2 flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
      </span>
    )}
    <div className="text-foreground">{icon}</div>
    <span className="text-[11px] font-semibold text-foreground">{label}</span>
  </button>
);

const StatTile = ({ label, value, muted, highlight }: {
  label: string; value: number; muted?: boolean; highlight?: boolean;
}) => (
  <div className="rounded-2xl border border-border/40 bg-card p-3">
    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">{label}</p>
    <p className={cn(
      "text-[15px] font-bold font-mono tabular-nums tracking-tight",
      muted ? "text-muted-foreground" : highlight && value > 0 ? "text-success" : "text-foreground"
    )}>
      {highlight && value > 0 ? "+" : ""}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </p>
  </div>
);

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
