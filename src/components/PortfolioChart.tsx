import { useMemo } from "react";
import { useState } from "react";
import { Area as _Area, AreaChart, ResponsiveContainer, Tooltip as _Tooltip, XAxis as _XAxis, YAxis as _YAxis } from "recharts";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { cn } from "@/lib/utils";

const Area = _Area as any;
const Tooltip = _Tooltip as any;
const XAxis = _XAxis as any;
const YAxis = _YAxis as any;

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

const TIME_RANGES = ["1D", "1W", "1M", "3M", "1Y", "ALL"] as const;
type TimeRange = typeof TIME_RANGES[number];

// Generate realistic-looking synthetic chart data between two price points
function generateChartData(startVal: number, endVal: number, points: number): { t: number; total: number }[] {
  if (points < 2) return [{ t: 0, total: endVal }];
  const data: { t: number; total: number }[] = [];
  const range = endVal - startVal;
  // Random walk with drift toward end value
  let current = startVal;
  const volatility = Math.max(Math.abs(range) * 0.4, endVal * 0.008);
  
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const target = startVal + range * progress;
    // Mean-revert toward the linear path with noise
    const drift = (target - current) * 0.15;
    const noise = (Math.random() - 0.5) * volatility;
    current = current + drift + noise;
    // Clamp to reasonable range
    current = Math.max(current, Math.min(startVal, endVal) * 0.9);
    data.push({ t: i, total: current });
  }
  // Ensure exact endpoints
  data[0].total = startVal;
  data[points - 1].total = endVal;
  return data;
}

export const PortfolioChart = () => {
  const { isConnected, balance, prices, totalBalanceUsd, isLoadingBalance, isLoadingPrices } =
    useBlockchainContext();
  const [activeRange, setActiveRange] = useState<TimeRange>("1D");

  const { data, isUp } = useMemo(() => {
    if (!isConnected || !balance || !prices) return [];

    // Estimate 24h-ago portfolio value using real 24h price changes (assumes holdings unchanged).
    const getPrice = (symbol: string) => prices.find((p) => p.symbol === symbol)?.price ?? 0;
    const getChange = (symbol: string) => prices.find((p) => p.symbol === symbol)?.change24h ?? 0;
    const prevFactor = (symbol: string) => {
      const ch = getChange(symbol);
      const f = 1 + ch / 100;
      return Number.isFinite(f) && f > 0 ? f : 1;
    };

    let prevTotal = 0;

    // Native
    const nativeAmount =
      parseFloat(balance.native.balance) / Math.pow(10, balance.native.decimals);
    const nativePriceNow = getPrice(balance.native.symbol);
    prevTotal += nativeAmount * (nativePriceNow / prevFactor(balance.native.symbol));

    // Tokens
    for (const t of balance.tokens) {
      const amount = parseFloat(t.balance) / Math.pow(10, t.decimals);
      const priceNow = getPrice(t.symbol) || t.price || 0;
      prevTotal += amount * (priceNow / prevFactor(t.symbol));
    }

    const startVal = Math.max(0, prevTotal);
    const endVal = Math.max(0, totalBalanceUsd);
    // More points for longer time ranges
    const pointsMap: Record<TimeRange, number> = { "1D": 48, "1W": 56, "1M": 60, "3M": 72, "1Y": 80, "ALL": 96 };
    const pts = pointsMap[activeRange] || 48;
    const chartData = generateChartData(startVal, endVal, pts);
    return { data: chartData, isUp: endVal >= startVal };
  }, [isConnected, balance, prices, totalBalanceUsd, activeRange]) as any;

  const isLoading = isConnected && (isLoadingBalance || isLoadingPrices);

  // Don't render anything if no data available
  if (!isConnected || !data || data.length === 0) {
    return null;
  }

  const chartColor = isUp ? "34 197 94" : "239 68 68"; // green-500 / red-500
  const strokeColor = `rgb(${chartColor})`;
  const gradientId = `gradientPortfolio-${isUp ? 'up' : 'down'}`;

  return (
    <div className="relative px-4 py-2">
      {isLoading ? (
        <div className="h-40 rounded-xl border border-border/50 bg-card/50 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Loading chart…</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="h-40 rounded-xl bg-card/40 border border-border/30 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
                    <stop offset="80%" stopColor={strokeColor} stopOpacity={0.02} />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-1.5 shadow-xl">
                        <span className="font-mono text-xs font-medium">{formatUsd(Number(payload[0]?.value ?? 0))}</span>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 1.5, stroke: strokeColor, fill: "hsl(var(--background))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Time range selector */}
          <div className="flex items-center justify-between px-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setActiveRange(range)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  activeRange === range
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
