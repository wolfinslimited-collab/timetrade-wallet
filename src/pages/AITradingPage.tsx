import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTradingApi } from "@/hooks/useTradingApi";
import { Button } from "@/components/ui/button";
import {
  Loader2, TrendingUp, TrendingDown, Bot, LogOut, RefreshCw,
  ArrowUpRight, ArrowDownRight, Activity, Zap,
  ArrowDown, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  const { balance, tradingStatus, earnings, tradeHistory, isLoading, fetchDashboardData, logout } = api;
  const [toggling, setToggling] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);

  const totalBalance = (balance?.usd_balance || 0) + (balance?.locked_balance || 0);
  const totalProfit = balance?.released_profit || 0;
  const earningsTotal = earnings?.total_usd || 0;
  const availableBalance = balance?.usd_balance || 0;
  const lockedBalance = balance?.locked_balance || 0;
  const isActive = !!tradingStatus?.trading_active;

  const handleToggle = async () => {
    if (isActive) {
      setToggling(true);
      try { await api.toggleTrading("stop"); } finally { setToggling(false); }
      return;
    }
    navigate("/ai-trading/start");
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const mask = (v: string) => hideBalance ? "••••••" : v;

  if (isLoading && !balance) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-32 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
            <Bot className="w-5 h-5 text-primary-foreground" />
            {isActive && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-background animate-pulse" />
            )}
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

      {/* Premium Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-xl shadow-primary/5">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.15em]">Total Portfolio</p>
            </div>
            <button
              onClick={() => setHideBalance(!hideBalance)}
              className="w-7 h-7 rounded-lg bg-background/40 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
              aria-label="Toggle balance"
            >
              {hideBalance ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-[22px] font-bold text-muted-foreground/70">$</span>
            <span className="text-[42px] font-bold font-mono text-foreground tracking-tighter leading-none tabular-nums">
              {mask(fmt(totalBalance))}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <div className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold tabular-nums",
              totalProfit >= 0 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
            )}>
              {totalProfit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {totalProfit >= 0 ? "+" : "-"}${mask(fmt(Math.abs(totalProfit)))}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">all-time P&L</span>
          </div>

          {/* Mini split: Available / Locked */}
          <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-border/30">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Available</p>
              <p className="text-[15px] font-bold font-mono text-foreground tabular-nums">${mask(fmt(availableBalance))}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">In Trades</p>
              <p className="text-[15px] font-bold font-mono text-muted-foreground tabular-nums">${mask(fmt(lockedBalance))}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2.5">
        <ActionButton label="Deposit" icon={<ArrowDown className="w-4 h-4" />} onClick={() => navigate("/ai-trading/wallet?tab=deposit")} />
        <ActionButton label="Withdraw" icon={<ArrowUpRight className="w-4 h-4" />} onClick={() => navigate("/ai-trading/wallet?tab=withdraw")} />
        <ActionButton label="Live" icon={<Activity className="w-4 h-4" />} onClick={() => navigate("/live-trades")} live />
      </div>

      {/* Trading status + CTA card */}
      <div className="rounded-2xl border border-border/40 bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center",
              isActive ? "bg-success/15" : "bg-muted"
            )}>
              <Power className={cn("w-4 h-4", isActive ? "text-success" : "text-muted-foreground")} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-foreground">{isActive ? "Bot is Running" : "Bot is Idle"}</p>
              <p className="text-[10px] text-muted-foreground font-medium">
                {isActive ? "AI is actively trading on your behalf" : "Tap below to start automated trading"}
              </p>
            </div>
          </div>
          {isActive && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-success/10">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-bold text-success uppercase tracking-wider">Live</span>
            </div>
          )}
        </div>

        <Button
          onClick={handleToggle}
          disabled={toggling}
          className={cn(
            "w-full h-12 rounded-xl text-sm font-bold",
            isActive
              ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
          )}
        >
          {toggling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isActive ? (
            <><Power className="w-4 h-4 mr-2" />Stop Trading</>
          ) : (
            <><Zap className="w-4 h-4 mr-2" />Start Trading</>
          )}
        </Button>
      </div>

      {/* Earnings highlight */}
      <div className="rounded-2xl border border-success/20 bg-gradient-to-br from-success/10 to-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">7-day Earnings</p>
            <p className={cn(
              "text-[18px] font-bold font-mono tabular-nums",
              earningsTotal > 0 ? "text-success" : "text-foreground"
            )}>
              {earningsTotal > 0 ? "+" : ""}${mask(fmt(earningsTotal))}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground font-medium">Trades</p>
          <p className="text-[15px] font-bold text-foreground tabular-nums">{tradeHistory.length}</p>
        </div>
      </div>

      {/* Recent Trades */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2.5">
          <p className="text-[11px] text-foreground font-bold uppercase tracking-wider">Recent Trades</p>
          {tradeHistory.length > 0 && (
            <button
              onClick={() => navigate("/live-trades")}
              className="text-[11px] text-primary font-semibold active:opacity-60"
            >
              View all
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          {tradeHistory.length === 0 ? (
            <div className="py-14 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
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
                  <div key={trade.id || i} className="flex items-center justify-between py-3 px-4 active:bg-secondary/30">
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
                    <p className={cn("font-mono text-[13px] font-bold tabular-nums", isProfit ? "text-success" : "text-destructive")}>
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
    className="relative flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-card border border-border/40 hover:border-primary/30 active:scale-[0.97] transition-all"
  >
    {live && (
      <span className="absolute top-2 right-2 flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
      </span>
    )}
    <div className={cn(
      "w-8 h-8 rounded-xl flex items-center justify-center",
      live ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
    )}>
      {icon}
    </div>
    <span className="text-[11px] font-semibold text-foreground">{label}</span>
  </button>
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
