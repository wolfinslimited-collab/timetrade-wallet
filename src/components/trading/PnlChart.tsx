import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { BarChart3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTradingApi, type EarningPoint } from "@/hooks/useTradingApi";

type Range = "hourly" | "monthly";

interface PnlChartProps {
  // kept for backward compat; no longer used (we fetch real earnings)
  trades?: any[];
}

function fmt(n: number) {
  const abs = Math.abs(n);
  const decimals = abs >= 100 ? 0 : abs >= 1 ? 2 : 4;
  return `${n < 0 ? "-" : ""}$${abs.toFixed(decimals)}`;
}

function aggregate(points: EarningPoint[], range: Range) {
  const now = new Date();
  const buckets = new Map<string, { label: string; sortKey: number; pnl: number }>();

  if (range === "hourly") {
    // Last 24 hours bucketed by hour
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now);
      d.setMinutes(0, 0, 0);
      d.setHours(d.getHours() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
      const label = `${String(d.getHours()).padStart(2, "0")}:00`;
      buckets.set(key, { label, sortKey: d.getTime(), pnl: 0 });
    }
    const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
    for (const p of points) {
      const d = new Date(p.hour_bucket);
      if (isNaN(d.getTime()) || d.getTime() < cutoff) continue;
      d.setMinutes(0, 0, 0);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
      const b = buckets.get(key);
      if (b) b.pnl += p.earning_usd || 0;
    }
  } else {
    // Last 12 months bucketed by month
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleDateString("en-US", { month: "short" });
      buckets.set(key, { label, sortKey: d.getTime(), pnl: 0 });
    }
    for (const p of points) {
      const d = new Date(p.hour_bucket);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = buckets.get(key);
      if (b) b.pnl += p.earning_usd || 0;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.sortKey - b.sortKey);
}

export function PnlChart(_props: PnlChartProps) {
  const { fetchEarnings, isAuthenticated } = useTradingApi();
  const [range, setRange] = useState<Range>("hourly");
  const [points, setPoints] = useState<EarningPoint[]>([]);
  const [totalApi, setTotalApi] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    setLoading(true);
    const days = range === "hourly" ? 1 : 365;
    fetchEarnings(days).then((res) => {
      if (!alive) return;
      setPoints(Array.isArray(res?.earnings) ? res!.earnings : []);
      setTotalApi(res?.total_usd ?? 0);
      setLoading(false);
    });

    // Light polling per spec (30s for chart)
    const id = setInterval(() => {
      fetchEarnings(days).then((res) => {
        if (!alive) return;
        setPoints(Array.isArray(res?.earnings) ? res!.earnings : []);
        setTotalApi(res?.total_usd ?? 0);
      });
    }, 30_000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [range, isAuthenticated, fetchEarnings]);

  const data = useMemo(() => aggregate(points, range), [points, range]);
  const totalLocal = useMemo(() => data.reduce((s, d) => s + d.pnl, 0), [data]);
  // Prefer API total when available, fall back to bucket sum
  const total = totalApi || totalLocal;
  const hasData = data.some((d) => d.pnl !== 0);

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BarChart3 className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-foreground leading-tight">P&amp;L Performance</p>
            <p className="text-[10px] text-muted-foreground font-medium leading-tight">
              {range === "hourly" ? "Last 24 hours" : "Last 12 months"}
            </p>
          </div>
        </div>
        <div
          className={cn(
            "px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold tabular-nums shrink-0",
            total >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}
        >
          {total >= 0 ? "+" : ""}
          {fmt(total)}
        </div>
      </div>

      {/* Toggle */}
      <div className="px-3.5 pb-2">
        <div className="inline-flex rounded-lg bg-secondary/50 p-0.5 border border-border/30">
          {(["hourly", "monthly"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[10.5px] font-semibold capitalize",
                range === r
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-32 w-full px-1 pb-2">
        {loading && !hasData ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          </div>
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={range === "hourly" ? 24 : 8}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={36}
                tickFormatter={(v) => fmt(v)}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const v = Number(payload[0].value ?? 0);
                  return (
                    <div className="bg-card border border-border/60 rounded-lg px-2 py-1.5 shadow-xl">
                      <p className="text-[10px] text-muted-foreground font-medium">{payload[0].payload.label}</p>
                      <p
                        className={cn(
                          "text-[12px] font-mono font-semibold tabular-nums",
                          v >= 0 ? "text-success" : "text-destructive"
                        )}
                      >
                        {v >= 0 ? "+" : ""}
                        {fmt(v)}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="pnl" radius={[3, 3, 3, 3]} maxBarSize={range === "hourly" ? 12 : 22}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.pnl >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                    opacity={d.pnl === 0 ? 0.15 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <p className="text-[11.5px] font-semibold text-foreground">No P&amp;L data yet</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Realized earnings will appear here {range === "hourly" ? "by the hour" : "by the month"}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
