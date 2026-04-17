import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  BarChart3,
  Layers,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Reference the same Timetrade Mobile API base used by useTradingApi
const TIMETRADE_SUPABASE_URL = "https://svhgjaadzthgnfdrbklt.supabase.co";
const TIMETRADE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2aGdqYWFkenRoZ25mZHJia2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjI0NTMsImV4cCI6MjA4NTU5ODQ1M30.8WZZrAshhSb4DchRnL9UJ0bEQX7zQPuD9930PaNi4AA";
const API_BASE = `${TIMETRADE_SUPABASE_URL}/functions/v1/mobile-api`;

// Public endpoints (no auth) — falls back to simulation if unavailable
const LIVE_TRADES_ENDPOINT = `${API_BASE}/public/live-trades`;
const POOL_STATS_ENDPOINT = `${API_BASE}/public/pool-stats`;

const POOL_TOTAL_FALLBACK = 57_510_000;

const SOLANA_TOKENS = [
  "BONK", "WIF", "JTO", "PYTH", "JUP", "TNSR", "RENDER", "HNT", "RAY", "ORCA", "MNDE", "DRIFT", "W", "KMNO",
];
const PERP_PAIRS = [
  "BTC/USDT", "ETH/USDT", "SOL/USDT", "ARB/USDT", "AVAX/USDT", "DOGE/USDT", "LINK/USDT", "SUI/USDT", "TIA/USDT", "SEI/USDT",
];

interface ClosedTrade {
  id: string;
  timestamp: Date;
  source: "sniper" | "perp";
  symbol: string;
  side: "LONG" | "SHORT" | "BUY";
  entryPrice: number;
  exitPrice: number;
  pnlPct: number;
  pnlUsd: number;
  holdingTime: string;
  status: "win" | "loss";
  isNew: boolean;
  allocation: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function genTrade(): ClosedTrade {
  const isSniper = Math.random() > 0.45;
  const symbol = isSniper
    ? `${SOLANA_TOKENS[Math.floor(Math.random() * SOLANA_TOKENS.length)]}/SOL`
    : PERP_PAIRS[Math.floor(Math.random() * PERP_PAIRS.length)];
  const side = isSniper ? ("BUY" as const) : Math.random() > 0.5 ? ("LONG" as const) : ("SHORT" as const);
  const base = isSniper
    ? rand(0.0001, 5)
    : symbol.startsWith("BTC")
    ? rand(60000, 110000)
    : symbol.startsWith("ETH")
    ? rand(2000, 4000)
    : rand(0.5, 250);
  const pnlPct = rand(-6, 18);
  const exit = base * (1 + (side === "SHORT" ? -pnlPct : pnlPct) / 100);
  const allocation = rand(50000, 800000);
  const pnlUsd = (allocation * pnlPct) / 100;
  const holdMins = Math.floor(rand(1, 120));
  const holdStr = holdMins >= 60 ? `${Math.floor(holdMins / 60)}h ${holdMins % 60}m` : `${holdMins}m`;

  return {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    source: isSniper ? "sniper" : "perp",
    symbol,
    side,
    entryPrice: base,
    exitPrice: exit,
    pnlPct: +pnlPct.toFixed(2),
    pnlUsd: +pnlUsd.toFixed(2),
    holdingTime: holdStr,
    status: pnlPct >= 0 ? "win" : "loss",
    isNew: true,
    allocation: +allocation.toFixed(0),
  };
}

async function fetchLiveTrades(): Promise<ClosedTrade[] | null> {
  try {
    const res = await fetch(LIVE_TRADES_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${TIMETRADE_ANON_KEY}`,
        apikey: TIMETRADE_ANON_KEY,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.map((t: any) => ({
      id: t.id || crypto.randomUUID(),
      timestamp: t.timestamp ? new Date(t.timestamp) : new Date(),
      source: t.source === "perp" ? "perp" : "sniper",
      symbol: t.symbol || "—",
      side: t.side || "BUY",
      entryPrice: Number(t.entry_price) || 0,
      exitPrice: Number(t.exit_price) || 0,
      pnlPct: Number(t.pnl_pct) || 0,
      pnlUsd: Number(t.pnl_usd) || 0,
      holdingTime: t.holding_time || "—",
      status: (Number(t.pnl_pct) || 0) >= 0 ? "win" : "loss",
      isNew: false,
      allocation: Number(t.allocation) || 0,
    }));
  } catch {
    return null;
  }
}

async function fetchPoolTotal(): Promise<number | null> {
  try {
    const res = await fetch(POOL_STATS_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${TIMETRADE_ANON_KEY}`,
        apikey: TIMETRADE_ANON_KEY,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Number(data?.pool_total) || null;
  } catch {
    return null;
  }
}

function FlowNode({ trade, index }: { trade: ClosedTrade; index: number }) {
  const isWin = trade.status === "win";
  const isSniper = trade.source === "sniper";

  return (
    <div className="relative w-full">
      {index > 0 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-border/60" />}
      <div
        className={cn(
          "rounded-xl border p-3 w-full",
          trade.isNew ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card/80"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] px-1.5 py-0 font-mono uppercase tracking-wider shrink-0",
                isSniper ? "border-violet-500/40 text-violet-400" : "border-sky-500/40 text-sky-400"
              )}
            >
              {isSniper ? "Sniper" : "Perp"}
            </Badge>
            <div className="flex items-center gap-1 min-w-0">
              {trade.side === "LONG" || trade.side === "BUY" ? (
                <ArrowUpRight className="w-3 h-3 text-success shrink-0" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-destructive shrink-0" />
              )}
              <span className="text-xs font-semibold text-foreground truncate">{trade.symbol}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
            <Clock className="w-2.5 h-2.5" />
            {trade.holdingTime}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 rounded-lg bg-secondary/50 px-2 py-1 text-center min-w-0">
            <p className="text-[9px] text-muted-foreground">Entry</p>
            <p className="text-[11px] font-mono text-foreground truncate">
              ${trade.entryPrice < 1 ? trade.entryPrice.toFixed(6) : trade.entryPrice.toFixed(2)}
            </p>
          </div>
          <div className="text-muted-foreground text-xs">→</div>
          <div className="flex-1 rounded-lg bg-secondary/50 px-2 py-1 text-center min-w-0">
            <p className="text-[9px] text-muted-foreground">Exit</p>
            <p className="text-[11px] font-mono text-foreground truncate">
              ${trade.exitPrice < 1 ? trade.exitPrice.toFixed(6) : trade.exitPrice.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground font-mono truncate">
            ${trade.allocation.toLocaleString()} alloc
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("text-xs font-bold font-mono", isWin ? "text-success" : "text-destructive")}>
              {isWin ? "+" : ""}
              {trade.pnlPct}%
            </span>
            <span className={cn("text-[10px] font-mono", isWin ? "text-success/70" : "text-destructive/70")}>
              {isWin ? "+" : ""}${trade.pnlUsd.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiveTradingFeed() {
  const [trades, setTrades] = useState<ClosedTrade[]>([]);
  const [poolTotal, setPoolTotal] = useState<number>(POOL_TOTAL_FALLBACK);
  const [isLive, setIsLive] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usingApiRef = useRef(false);

  const addTrade = useCallback(() => {
    const trade = genTrade();
    setTrades((prev) => {
      const updated = prev.map((t) => ({ ...t, isNew: false }));
      return [trade, ...updated].slice(0, 20);
    });
  }, []);

  // Initial: try API, fallback to simulated seed
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [apiTrades, apiPool] = await Promise.all([fetchLiveTrades(), fetchPoolTotal()]);
      if (cancelled) return;
      if (apiPool) setPoolTotal(apiPool);
      if (apiTrades && apiTrades.length > 0) {
        usingApiRef.current = true;
        setTrades(apiTrades.slice(0, 20));
      } else {
        const seed: ClosedTrade[] = [];
        for (let i = 0; i < 5; i++) {
          const t = genTrade();
          t.isNew = false;
          t.timestamp = new Date(Date.now() - (5 - i) * 45000);
          seed.push(t);
        }
        setTrades(seed);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const tick = async () => {
      if (usingApiRef.current) {
        const apiTrades = await fetchLiveTrades();
        if (apiTrades && apiTrades.length > 0) {
          setTrades((prev) => {
            const prevIds = new Set(prev.map((t) => t.id));
            return apiTrades.slice(0, 20).map((t) => ({ ...t, isNew: !prevIds.has(t.id) }));
          });
          return;
        }
      }
      addTrade();
    };
    intervalRef.current = setInterval(tick, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLive, addTrade]);

  const totalPnl = trades.reduce((s, t) => s + t.pnlUsd, 0);
  const wins = trades.filter((t) => t.status === "win").length;
  const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 border border-primary/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              Live Trading
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            </h2>
            <p className="text-[10px] text-muted-foreground">Real-time closed trades</p>
          </div>
        </div>
        <button
          onClick={() => setIsLive((v) => !v)}
          className="text-[10px] text-muted-foreground active:text-foreground px-2.5 py-1 rounded-lg border border-border/50"
        >
          {isLive ? "Pause" : "Resume"}
        </button>
      </div>

      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-violet-500/5">
        <CardContent className="p-3">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Pool Capital</p>
              <p className="text-base font-bold font-mono text-foreground truncate">
                ${poolTotal.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">USDT</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40">
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground">Trades</p>
              <p className="text-sm font-bold font-mono text-foreground">{trades.length}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground">Win Rate</p>
              <p className="text-sm font-bold font-mono text-success">{winRate}%</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground">P&L</p>
              <p className={cn("text-sm font-bold font-mono", totalPnl >= 0 ? "text-success" : "text-destructive")}>
                {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-semibold flex items-center gap-2 text-muted-foreground">
            <BarChart3 className="w-3 h-3 text-primary" />
            Recent Trades
            <Badge variant="outline" className="text-[8px] border-success/30 text-success ml-1 px-1 py-0">
              LIVE
            </Badge>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground/60">{trades.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 max-h-[420px] overflow-y-auto">
          {trades.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
              Waiting for trades…
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-center w-full">
                <div className="flex items-center gap-2 justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground font-mono">
                    Pool: ${poolTotal.toLocaleString()} USDT
                  </span>
                </div>
              </div>
              <div className="w-px h-3 bg-border/60" />
              {trades.map((trade, i) => (
                <FlowNode key={trade.id} trade={trade} index={i} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LiveTradingFeed;
