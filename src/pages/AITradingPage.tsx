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
    <div className="px-5 pt-3 pb-32">
      {/* Top bar */}
      <div className="flex items-center justify-between h-12">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-muted-foreground" />
          <h1 className="text-[15px] font-semibold text-foreground tracking-tight">AI Trading</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchDashboardData}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-secondary/60"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4 text-muted-foreground", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={logout}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-secondary/60"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Hero — balance on background, no card */}
      <div className="pt-10 pb-8 flex flex-col items-center text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Portfolio Value
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-baseline">
            <span className="text-[24px] font-semibold text-muted-foreground/80 mr-0.5">$</span>
            <span className="text-[44px] font-semibold font-mono text-foreground tracking-tight leading-none tabular-nums">
              {mask(fmt(totalBalance))}
            </span>
          </div>
          <button
            onClick={() => setHideBalance(!hideBalance)}
            className="text-muted-foreground/60 active:text-foreground"
            aria-label="Toggle balance"
          >
            {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Single P&L line */}
        <div className="mt-3 flex items-center gap-1.5 text-[12px] font-medium tabular-nums">
          {totalProfit >= 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-success" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-destructive" />
          )}
          <span className={cn("font-semibold", totalProfit >= 0 ? "text-success" : "text-destructive")}>
            {totalProfit >= 0 ? "+" : "-"}${mask(fmt(Math.abs(totalProfit)))}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">all-time</span>
        </div>

        {/* Status merged with CTA */}
        <div className="mt-7 flex items-center gap-3">
          <Button
            onClick={handleToggle}
            disabled={toggling}
            className={cn(
              "h-11 px-7 rounded-full text-[13px] font-semibold",
              isActive
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
          >
            {toggling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isActive ? (
              "Stop Trading"
            ) : (
              <><Zap className="w-4 h-4 mr-1.5" />Start Trading</>
            )}
          </Button>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full",
              isActive ? "bg-success animate-pulse" : "bg-muted-foreground/40"
            )} />
            <span className="text-[11px] font-medium text-muted-foreground">
              {isActive ? "Bot active" : "Bot idle"}
            </span>
          </div>
        </div>
      </div>

      {/* Quiet stats row */}
      <div className="grid grid-cols-2 border-t border-border/40">
        <div className="py-4 pr-4 border-r border-border/40">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Available</p>
          <p className="text-[15px] font-semibold font-mono text-foreground tabular-nums">
            ${mask(fmt(availableBalance))}
          </p>
        </div>
        <div className="py-4 pl-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">In trades</p>
          <p className="text-[15px] font-semibold font-mono text-foreground tabular-nums">
            ${mask(fmt(lockedBalance))}
          </p>
        </div>
      </div>

      {/* Pill quick actions */}
      <div className="flex items-center justify-center gap-2 py-5 border-t border-border/40">
        <PillButton label="Deposit" icon={<ArrowDown className="w-3.5 h-3.5" />} onClick={() => navigate("/ai-trading/wallet?tab=deposit")} />
        <PillButton label="Withdraw" icon={<ArrowUpRight className="w-3.5 h-3.5" />} onClick={() => navigate("/ai-trading/wallet?tab=withdraw")} />
        <PillButton label="Live" icon={<Activity className="w-3.5 h-3.5" />} onClick={() => navigate("/live-trades")} live />
      </div>

      {/* Recent activity — flat on background */}
      <div className="border-t border-border/40 pt-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[12px] font-semibold text-foreground">Recent activity</p>
          {tradeHistory.length > 0 && (
            <button
              onClick={() => navigate("/live-trades")}
              className="text-[11px] text-muted-foreground font-medium active:text-foreground"
            >
              View all
            </button>
          )}
        </div>

        {tradeHistory.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[12px] text-muted-foreground">No activity yet</p>
            {earningsTotal > 0 && (
              <p className="text-[11px] text-success mt-2 font-medium tabular-nums">
                +${fmt(earningsTotal)} earned in 7d
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {tradeHistory.slice(0, 6).map((trade, i) => {
              const pnl = trade.pnl || 0;
              const isProfit = pnl >= 0;
              return (
                <div
                  key={trade.id || i}
                  className="flex items-center justify-between py-3 active:bg-secondary/30 -mx-2 px-2 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isProfit ? (
                      <ArrowUpRight className="w-4 h-4 text-success shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-destructive shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {trade.pair || trade.symbol || "Trade"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {trade.closed_at ? format(new Date(trade.closed_at), "MMM d • HH:mm") : "Pending"}
                      </p>
                    </div>
                  </div>
                  <p className={cn(
                    "font-mono text-[13px] font-semibold tabular-nums",
                    isProfit ? "text-success" : "text-destructive"
                  )}>
                    {isProfit ? "+" : "-"}${Math.abs(pnl).toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Reusable Pieces ── */

const PillButton = ({ label, icon, onClick, live }: {
  label: string; icon: React.ReactNode; onClick: () => void; live?: boolean;
}) => (
  <button
    onClick={onClick}
    className="relative inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-secondary/50 border border-border/40 text-foreground active:bg-secondary"
  >
    {live && (
      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
    )}
    <span className="text-muted-foreground">{icon}</span>
    <span className="text-[12px] font-semibold">{label}</span>
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
