import { useState, useEffect } from "react";
import { useTradingApi } from "@/hooks/useTradingApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Wallet, Lock, DollarSign, Bot, LogOut, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

/* ── Shared Cards ── */

const BalanceCard = ({ label, value, icon, iconBg, showSign }: {
  label: string; value: number; icon: React.ReactNode; iconBg: string; showSign?: boolean;
}) => (
  <Card className="bg-card border-border/40">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", iconBg)}>{icon}</div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      </div>
      <p className={cn("text-lg font-bold font-mono", showSign && value !== 0 ? (value > 0 ? "text-success" : "text-destructive") : "text-foreground")}>
        {showSign && value > 0 ? "+" : ""}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </CardContent>
  </Card>
);

const PnLCard = ({ label, value }: { label: string; value: number }) => {
  const isProfit = value >= 0;
  return (
    <Card className="bg-card border-border/40">
      <CardContent className="p-4">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">{label}</p>
        <div className="flex items-center gap-1.5">
          {value !== 0 && (isProfit ? <TrendingUp className="w-3.5 h-3.5 text-success" /> : <TrendingDown className="w-3.5 h-3.5 text-destructive" />)}
          <span className={cn("text-lg font-bold font-mono", value === 0 ? "text-muted-foreground" : isProfit ? "text-success" : "text-destructive")}>
            {isProfit && value > 0 ? "+" : ""}${value.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

/* ── Login Screen ── */

function TradingConnect({ api }: { api: ReturnType<typeof useTradingApi> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = () => {
    if (isSignUp) {
      api.register(email, password, displayName);
    } else {
      api.authenticate(email, password);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 min-h-[60vh]">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <Bot className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-1">AI Trading</h2>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-[280px]">
        {isSignUp ? "Create your Timetrade account" : "Sign in to access your AI trading dashboard"}
      </p>

      {api.authError && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 mb-4 w-full max-w-[320px]">
          <p className="text-xs text-destructive text-center">{api.authError}</p>
        </div>
      )}

      <div className="w-full max-w-[320px] space-y-3 mb-4">
        {isSignUp && (
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full h-12 rounded-xl bg-secondary/50 border border-border/40 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-12 rounded-xl bg-secondary/50 border border-border/40 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="w-full h-12 rounded-xl bg-secondary/50 border border-border/40 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={api.isAuthenticating || !email || !password}
        className="w-full max-w-[320px] h-12 rounded-xl font-semibold text-sm"
      >
        {api.isAuthenticating ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" />{isSignUp ? "Creating account..." : "Signing in..."}</>
        ) : (
          isSignUp ? "Create Account" : "Sign In"
        )}
      </Button>

      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-4 text-sm text-muted-foreground"
      >
        {isSignUp ? (
          <>Already have an account? <span className="text-primary font-medium">Sign in</span></>
        ) : (
          <>Don't have an account? <span className="text-primary font-medium">Sign up</span></>
        )}
      </button>
    </div>
  );
}

/* ── Dashboard ── */

function TradingDashboard({ api }: { api: ReturnType<typeof useTradingApi> }) {
  const { balance, tradingStatus, earnings, tradeHistory, profile, isLoading, fetchDashboardData, logout } = api;
  const [toggling, setToggling] = useState(false);

  const totalBalance = (balance?.usd_balance || 0) + (balance?.locked_balance || 0);
  const totalProfit = balance?.released_profit || 0;
  const earningsTotal = earnings?.total_usd || 0;

  const handleToggle = async () => {
    setToggling(true);
    try {
      if (tradingStatus?.trading_active) {
        await api.toggleTrading("stop");
      } else {
        await api.toggleTrading("start", balance?.usd_balance || 0);
      }
    } finally {
      setToggling(false);
    }
  };

  if (isLoading && !balance) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchDashboardData} className="w-8 h-8 rounded-xl bg-card border border-border/40 flex items-center justify-center active:scale-95">
            <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", isLoading && "animate-spin")} />
          </button>
          <button onClick={logout} className="w-8 h-8 rounded-xl bg-card border border-border/40 flex items-center justify-center active:scale-95">
            <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-3">
        <BalanceCard label="Total Balance" value={totalBalance} icon={<DollarSign className="w-4 h-4 text-emerald-500" />} iconBg="bg-emerald-500/10" />
        <BalanceCard label="Available" value={balance?.usd_balance || 0} icon={<Wallet className="w-4 h-4 text-primary" />} iconBg="bg-primary/10" />
        <BalanceCard label="In Trading" value={balance?.locked_balance || 0} icon={<Lock className="w-4 h-4 text-amber-500" />} iconBg="bg-amber-500/10" />
        <BalanceCard label="Total Profit" value={totalProfit} icon={<TrendingUp className="w-4 h-4 text-success" />} iconBg="bg-success/10" showSign />
      </div>

      {/* Trading Status + Toggle */}
      <Card className="bg-card border-border/40 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/5 pointer-events-none" />
        <CardContent className="p-4 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", tradingStatus?.trading_active ? "bg-success/10" : "bg-muted/10")}>
                <Bot className={cn("w-4 h-4", tradingStatus?.trading_active ? "text-success" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">AI Trading Bot</p>
                <p className="text-[10px] text-muted-foreground">
                  {tradingStatus?.trading_active ? `Mode: ${tradingStatus.mode}` : "Inactive"}
                </p>
              </div>
            </div>
            <div className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-semibold",
              tradingStatus?.trading_active
                ? "bg-success/10 text-success border border-success/20"
                : "bg-muted/10 text-muted-foreground border border-border/40"
            )}>
              {tradingStatus?.trading_active ? "Active" : "Stopped"}
            </div>
          </div>
          <Button
            onClick={handleToggle}
            disabled={toggling}
            variant={tradingStatus?.trading_active ? "destructive" : "default"}
            className="w-full h-10 rounded-xl text-xs font-semibold"
          >
            {toggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : tradingStatus?.trading_active ? "Stop Trading" : "Start Trading"}
          </Button>
        </CardContent>
      </Card>

      {/* Earnings Summary */}
      <div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2.5">7-Day Earnings</p>
        <PnLCard label="Total" value={earningsTotal} />
      </div>

      {/* Recent Trades */}
      <div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2.5">Recent Trades</p>
        <div className="space-y-1">
          {tradeHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No trades recorded yet</p>
          ) : (
            tradeHistory.slice(0, 10).map((trade, i) => {
              const pnl = trade.pnl || 0;
              const isProfit = pnl >= 0;
              return (
                <div key={trade.id || i} className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-secondary/30">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isProfit ? "bg-success/10" : "bg-destructive/10")}>
                      {isProfit ? <ArrowUpRight className="w-3.5 h-3.5 text-success" /> : <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{trade.pair || trade.symbol || "Trade"}</p>
                      <p className="text-[10px] text-muted-foreground">{trade.closed_at ? format(new Date(trade.closed_at), "MMM d, HH:mm") : ""}</p>
                    </div>
                  </div>
                  <span className={cn("font-mono text-xs font-semibold", isProfit ? "text-success" : "text-destructive")}>
                    {isProfit ? "+" : ""}${pnl.toFixed(2)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Profile */}
      {profile && (
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">Profile</p>
            <div className="space-y-1.5">
              {profile.wallet_address && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Wallet</span>
                  <span className="text-xs text-foreground font-mono">{profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}</span>
                </div>
              )}
              {profile.display_name && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <span className="text-xs text-foreground font-medium">{profile.display_name}</span>
                </div>
              )}
              {profile.referral_code && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Referral</span>
                  <span className="text-xs text-foreground font-mono">{profile.referral_code}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
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
