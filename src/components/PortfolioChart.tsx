import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useBlockchainContext } from "@/contexts/BlockchainContext";

type PortfolioAsset = {
  symbol: string;
  amount: number;
  price?: number;
  valueUsd?: number;
};

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export const PortfolioChart = () => {
  const {
    isConnected,
    prices,
    totalBalanceUsd,
    isLoadingBalance,
    isLoadingPrices,
    unifiedAssets,
  } = useBlockchainContext();

  const data = useMemo(() => {
    const assets = (unifiedAssets ?? []) as PortfolioAsset[];
    if (!isConnected || !prices || assets.length === 0) return [];

    // Estimate 24h-ago portfolio value using real 24h price changes (assumes holdings unchanged).
    const getPrice = (symbol: string) =>
      prices.find((p) => p.symbol === symbol)?.price ?? 0;
    const getChange = (symbol: string) => prices.find((p) => p.symbol === symbol)?.change24h ?? 0;
    const prevFactor = (symbol: string) => {
      const ch = getChange(symbol);
      const f = 1 + ch / 100;
      return Number.isFinite(f) && f > 0 ? f : 1;
    };

    let prevTotal = 0;

    for (const a of assets) {
      const symbol = a.symbol?.toUpperCase?.() ? a.symbol.toUpperCase() : a.symbol;
      const amount = Number(a.amount);
      if (!symbol || !Number.isFinite(amount) || amount <= 0) continue;

      const priceNow = getPrice(symbol) || a.price || 0;
      prevTotal += amount * (priceNow / prevFactor(symbol));
    }

    return [
      { t: "24H", total: Math.max(0, prevTotal) },
      { t: "NOW", total: Math.max(0, totalBalanceUsd) },
    ];
  }, [isConnected, prices, totalBalanceUsd, unifiedAssets]);

  const isLoading = isConnected && (isLoadingBalance || isLoadingPrices);
  const hasChartData = data.length > 0;

  return (
    <div className="relative px-4 py-2 h-48">
      <div className="h-full rounded-xl border border-border bg-card overflow-hidden">
        {!isConnected ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Connect a wallet to see your portfolio</p>
          </div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Loading chart…</p>
          </div>
        ) : !hasChartData ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground">No chart data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientPortfolio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis hide domain={["dataMin - 50", "dataMax + 50"]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-card border border-border rounded-lg p-2 shadow-xl">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="font-mono">{formatUsd(Number(payload[0]?.value ?? 0))}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#gradientPortfolio)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
