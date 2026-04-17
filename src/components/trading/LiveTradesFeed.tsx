import { useLiveTrades } from "@/hooks/useLiveTrades";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowUpRight, ArrowDownRight, Activity, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const formatPrice = (n: number) => {
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  if (n === 0) return "0";
  return n.toPrecision(4);
};

export const LiveTradesFeed = () => {
  const { trades, isLoading, error } = useLiveTrades();

  return (
    <div className="px-4 py-6 space-y-4 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">Live Trades</h1>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time results from the trading hub</p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <p className="text-xs text-destructive text-center">{error}</p>
        </div>
      )}

      {isLoading && trades.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : trades.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No live trades yet. Waiting for the next signal…</p>
      ) : (
        <div className="space-y-2">
          {trades.map((trade) => {
            const isWin = trade.status === "win";
            const isSniper = trade.source === "solana-sniper";
            return (
              <Card
                key={trade.id}
                className={cn(
                  "bg-card border-border/40 overflow-hidden",
                  trade.isNew && "ring-1 ring-success/40"
                )}
              >
                <CardContent className="p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center",
                          isSniper ? "bg-primary/10" : "bg-amber-500/10"
                        )}
                      >
                        {isSniper ? (
                          <Zap className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Activity className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{trade.symbol}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {trade.source.replace("-", " ")} • {trade.side}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isWin ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />
                      )}
                      <span
                        className={cn(
                          "font-mono text-sm font-bold",
                          isWin ? "text-success" : "text-destructive"
                        )}
                      >
                        {isWin ? "+" : ""}
                        {trade.pnl_pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Entry</p>
                      <p className="text-[11px] font-mono text-foreground">${formatPrice(trade.entry_price)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Exit</p>
                      <p className="text-[11px] font-mono text-foreground">${formatPrice(trade.exit_price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">PnL</p>
                      <p
                        className={cn(
                          "text-[11px] font-mono font-semibold",
                          isWin ? "text-success" : "text-destructive"
                        )}
                      >
                        {isWin ? "+" : ""}${trade.pnl_usd.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                    <span>Held {trade.holding_time}</span>
                    <span>{format(new Date(trade.timestamp), "MMM d, HH:mm")}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
