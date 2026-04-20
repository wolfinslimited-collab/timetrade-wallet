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

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const mask = (v: string) => (hideBalance ? "••••••" : v);
  const pnlPct = totalBalance > 0 ? (totalProfit / totalBalance) * 100 : 0;

  if (isLoading && !balance) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 pb-32">
      {/* Top header */}
      <div className="flex items-center justify-between h-12 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div className="leading-tight">
            <h1 className="text-[15px] font-semibold text-foreground tracking-tight">AI Trading</h1>
            <p className="text-[10px] text-muted-foreground font-medium">Autonomous portfolio bot</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn onClick={fetchDashboardData} ariaLabel="Refresh">
            <RefreshCw className={cn("w-4 h-4 text-muted-foreground", isLoading && "animate-spin")} />
          </IconBtn>
          <IconBtn onClick={logout} ariaLabel="Sign out">
            <LogOut className="w-4 h-4 text-muted-foreground" />
          </IconBtn>
        </div>
      </div>

      {/* Premium hero surface */}
      <div className="relative overflow-hidden rounded-[28px] border border-border/50 bg-gradient-to-br from-primary/[0.08] via-card to-card p-6">
        {/* soft glow */}
        <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Total Portfolio
            </p>
            <button
              onClick={() => setHideBalance(!hideBalance)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-background/40 border border-border/40 text-muted-foreground active:bg-background/70"
              aria-label="Toggle balance"
            >
              {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="mt-3 flex items-baseline">
            <span className="text-[22px] font-semibold text-foreground/70 mr-1">$</span>
            <span className="text-[42px] font-bold font-mono text-foreground tracking-tight leading-none tabular-nums">
              {mask(fmt(totalBalance))}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums",
                totalProfit >= 0
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {totalProfit >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {totalProfit >= 0 ? "+" : "-"}${mask(fmt(Math.abs(totalProfit)))}
            </div>
            <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
              {totalProfit >= 0 ? "+" : ""}
              {pnlPct.toFixed(2)}% all-time
            </span>
          </div>

          {/* Control row */}
          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={handleToggle}
              disabled={toggling}
              className={cn(
                "h-12 flex-1 rounded-2xl text-[14px] font-semibold shadow-lg",
                isActive
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive/20"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
              )}
            >
              {toggling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isActive ? (
                "Stop Trading"
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-1.5" />
                  Start Trading
                </>
              )}
            </Button>
            <div
              className={cn(
                "h-12 px-3.5 rounded-2xl flex items-center gap-2 border",
                isActive
                  ? "bg-success/10 border-success/30"
                  : "bg-secondary/40 border-border/50"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isActive ? "bg-success animate-pulse" : "bg-muted-foreground/40"
                )}
              />
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  isActive ? "text-success" : "text-muted-foreground"
                )}
              >
                {isActive ? "LIVE" : "IDLE"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatCard label="Available" value={`$${mask(fmt(availableBalance))}`} />
        <StatCard label="In Trades" value={`$${mask(fmt(lockedBalance))}`} />
        <StatCard
          label="7d Earnings"
          value={`${earningsTotal >= 0 ? "+" : "-"}$${mask(fmt(Math.abs(earningsTotal)))}`}
          accent={earningsTotal > 0 ? "success" : earningsTotal < 0 ? "destructive" : undefined}
        />
      </div>

      {/* Quick actions */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <ActionTile
          label="Deposit"
          icon={<ArrowDown className="w-4 h-4" />}
          onClick={() => navigate("/ai-trading/wallet?tab=deposit")}
        />
        <ActionTile
          label="Withdraw"
          icon={<ArrowUpRight className="w-4 h-4" />}
          onClick={() => navigate("/ai-trading/wallet?tab=withdraw")}
        />
        <ActionTile
          label="Live"
          icon={<Activity className="w-4 h-4" />}
          onClick={() => navigate("/live-trades")}
          live
        />
      </div>

      {/* Recent activity */}
      <div className="mt-5">
        <div className="flex items-center justify-between px-1 mb-2">
          <div>
            <p className="text-[13px] font-semibold text-foreground">Recent Activity</p>
            <p className="text-[10px] text-muted-foreground font-medium">Latest bot trades</p>
          </div>
          {tradeHistory.length > 0 && (
            <button
              onClick={() => navigate("/live-trades")}
              className="text-[11px] text-primary font-semibold active:text-primary/70"
            >
              View all
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden">
          {tradeHistory.length === 0 ? (
            <div className="py-12 px-4 flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-full bg-secondary/60 flex items-center justify-center mb-3">
                <Activity className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-[13px] font-semibold text-foreground">No trades yet</p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px]">
                Start the bot to see your AI-executed trades appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {tradeHistory.slice(0, 6).map((trade, i) => {
                const pnl = trade.pnl || 0;
                const isProfit = pnl >= 0;
                return (
                  <div
                    key={trade.id || i}
                    className="flex items-center justify-between px-3.5 py-3 active:bg-secondary/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          isProfit ? "bg-success/10" : "bg-destructive/10"
                        )}
                      >
                        {isProfit ? (
                          <ArrowUpRight className="w-4 h-4 text-success" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">
                          {trade.pair || trade.symbol || "Trade"}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground font-medium">
                          {trade.closed_at
                            ? format(new Date(trade.closed_at), "MMM d • HH:mm")
                            : "Pending"}
                        </p>
                      </div>
                    </div>
                    <p
                      className={cn(
                        "font-mono text-[13px] font-bold tabular-nums",
                        isProfit ? "text-success" : "text-destructive"
                      )}
                    >
                      {isProfit ? "+" : "-"}${Math.abs(pnl).toFixed(2)}
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

const IconBtn = ({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary/40 border border-border/40 active:bg-secondary"
  >
    {children}
  </button>
);

const StatCard = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "success" | "destructive";
}) => (
  <div className="rounded-2xl border border-border/40 bg-card/40 px-3 py-3">
    <p className="text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
      {label}
    </p>
    <p
      className={cn(
        "text-[13px] font-bold font-mono tabular-nums truncate",
        accent === "success" && "text-success",
        accent === "destructive" && "text-destructive",
        !accent && "text-foreground"
      )}
    >
      {value}
    </p>
  </div>
);

const ActionTile = ({
  label,
  icon,
  onClick,
  live,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  live?: boolean;
}) => (
  <button
    onClick={onClick}
    className="relative flex flex-col items-center justify-center gap-1.5 h-[68px] rounded-2xl bg-card/60 border border-border/40 active:bg-secondary/60"
  >
    {live && (
      <span className="absolute top-2 right-2 flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
    )}
    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
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
