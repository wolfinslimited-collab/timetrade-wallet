import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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

function TradeRow({ trade }: { trade: ClosedTrade }) {
  const isWin = trade.status === "win";
  const isSniper = trade.source === "sniper";

  return (
    <div
      className={cn(
        "px-4 py-3 border-b border-border/30 last:border-b-0",
        trade.isNew && "bg-primary/[0.03]"
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
              isSniper
                ? "bg-violet-500/10 text-violet-400"
                : "bg-primary/10 text-primary"
            )}
          >
            {isSniper ? "Sniper" : "Perp"}
          </span>
          {trade.side === "LONG" || trade.side === "BUY" ? (
            <ArrowUpRight className="w-3 h-3 text-success" />
          ) : (
            <ArrowDownRight className="w-3 h-3 text-destructive" />
          )}
          <span className="text-xs font-semibold text-foreground">{trade.symbol}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-2.5 h-2.5" />
          {trade.holdingTime}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          <span>${trade.entryPrice < 1 ? trade.entryPrice.toFixed(6) : trade.entryPrice.toFixed(2)}</span>
          <span className="text-muted-foreground/40">→</span>
          <span>${trade.exitPrice < 1 ? trade.exitPrice.toFixed(6) : trade.exitPrice.toFixed(2)}</span>
          <span className="text-muted-foreground/50">${trade.allocation.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold font-mono", isWin ? "text-success" : "text-destructive")}>
            {isWin ? "+" : ""}{trade.pnlPct}%
          </span>
          <span className={cn("text-[10px] font-mono", isWin ? "text-success/60" : "text-destructive/60")}>
            {isWin ? "+" : ""}${trade.pnlUsd.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export function LiveTradingFeed() {
  const [trades, setTrades] = useState<ClosedTrade[]>([]);
  const [isLive, setIsLive] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addTrade = useCallback(() => {
    const trade = genTrade();
    setTrades((prev) => {
      const updated = prev.map((t) => ({ ...t, isNew: false }));
      return [trade, ...updated].slice(0, 30);
    });
  }, []);

  useEffect(() => {
    const seed: ClosedTrade[] = [];
    for (let i = 0; i < 5; i++) {
      const t = genTrade();
      t.isNew = false;
      t.timestamp = new Date(Date.now() - (5 - i) * 45000);
      seed.push(t);
    }
    setTrades(seed);
  }, []);

  useEffect(() => {
    if (!isLive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(addTrade, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLive, addTrade]);

  const totalPnl = trades.reduce((s, t) => s + t.pnlUsd, 0);
  const wins = trades.filter((t) => t.status === "win").length;
  const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(1) : "0";

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <div className="rounded-xl bg-card border border-border/40 p-3 text-center">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Trades</p>
          <p className="text-lg font-bold font-mono text-foreground">{trades.length}</p>
        </div>
        <div className="rounded-xl bg-card border border-border/40 p-3 text-center">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Win Rate</p>
          <p className="text-lg font-bold font-mono text-success">{winRate}%</p>
        </div>
        <div className="rounded-xl bg-card border border-border/40 p-3 text-center">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">P&L</p>
          <p className={cn("text-lg font-bold font-mono", totalPnl >= 0 ? "text-success" : "text-destructive")}>
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <p className="text-xs font-semibold text-foreground">Recent Trades</p>
        <button
          onClick={() => setIsLive((v) => !v)}
          className={cn(
            "text-[10px] font-semibold px-2.5 py-1 rounded-full active:scale-95",
            isLive
              ? "bg-success/10 text-success border border-success/20"
              : "bg-secondary text-muted-foreground border border-border/40"
          )}
        >
          {isLive ? "● Live" : "Paused"}
        </button>
      </div>

      {/* Trade list - fills remaining space */}
      <div className="flex-1 min-h-0 rounded-xl bg-card border border-border/40 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
            Waiting for trades…
          </div>
        ) : (
          trades.map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
          ))
        )}
      </div>
    </div>
  );
}

export default LiveTradingFeed;
