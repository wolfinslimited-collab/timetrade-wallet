import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { useBlockchainContext } from "@/contexts/BlockchainContext";

interface TokenAllocation {
  symbol: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
  icon: string;
}

const iconForSymbol = (symbol: string) => {
  switch (symbol.toUpperCase()) {
    case "ETH":
      return "Ξ";
    case "BTC":
      return "₿";
    case "SOL":
      return "◎";
    case "MATIC":
      return "⬡";
    case "USDT":
      return "₮";
    case "USDC":
      return "◈";
    default:
      return symbol.slice(0, 1).toUpperCase();
  }
};

export const PortfolioBreakdown = () => {
  const { isConnected, balance, prices } = useBlockchainContext();
  const [activeToken, setActiveToken] = useState<TokenAllocation | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const { allocations, totalValue } = useMemo(() => {
    if (!isConnected || !balance || !prices) {
      return { allocations: [] as TokenAllocation[], totalValue: 0 };
    }

    const palette = [
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))",
    ];

    const getPrice = (symbol: string) => prices.find((p) => p.symbol === symbol)?.price ?? 0;

    const items = [
      {
        symbol: balance.native.symbol,
        name: balance.native.name ?? balance.native.symbol,
        amount:
          parseFloat(balance.native.balance) / Math.pow(10, balance.native.decimals),
        price: getPrice(balance.native.symbol),
      },
      ...balance.tokens.map((t) => ({
        symbol: t.symbol,
        name: t.name ?? t.symbol,
        amount: parseFloat(t.balance) / Math.pow(10, t.decimals),
        price: getPrice(t.symbol) || t.price || 0,
      })),
    ]
      .map((i) => ({ ...i, value: i.amount * i.price }))
      .filter((i) => Number.isFinite(i.value) && i.value > 0);

    const total = items.reduce((sum, i) => sum + i.value, 0);
    if (total <= 0) return { allocations: [] as TokenAllocation[], totalValue: 0 };

    // Top 4 + Others to keep the donut readable
    const sorted = [...items].sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 4);
    const rest = sorted.slice(4);
    const othersValue = rest.reduce((sum, i) => sum + i.value, 0);

    const built: TokenAllocation[] = top.map((t, idx) => ({
      symbol: t.symbol,
      name: t.name,
      value: t.value,
      percentage: +(t.value / total * 100).toFixed(1),
      color: palette[idx % palette.length],
      icon: iconForSymbol(t.symbol),
    }));

    if (othersValue > 0) {
      built.push({
        symbol: "Others",
        name: "Other Assets",
        value: othersValue,
        percentage: +(othersValue / total * 100).toFixed(1),
        color: "hsl(var(--muted-foreground))",
        icon: "•",
      });
    }

    // Fix rounding drift to 100% by adjusting the first slice
    const sumPct = built.reduce((s, a) => s + a.percentage, 0);
    if (built.length && sumPct !== 100) {
      built[0] = { ...built[0], percentage: +(built[0].percentage + (100 - sumPct)).toFixed(1) };
    }

    return { allocations: built, totalValue: total };
  }, [isConnected, balance, prices]);

  // Calculate SVG arc paths for donut chart
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativePercentage = 0;
  const arcs = allocations.map((token) => {
    const arcLength = (token.percentage / 100) * circumference;
    const dashOffset = circumference - (cumulativePercentage / 100) * circumference;
    cumulativePercentage += token.percentage;

    return {
      ...token,
      dashArray: `${arcLength} ${circumference - arcLength}`,
      dashOffset,
    };
  });

  const displayToken = activeToken || allocations[0] || null;

  return (
    <div className="px-6 py-4">
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Toggle Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-accent/5 transition-colors"
        >
          <span className="text-sm font-medium text-foreground">Portfolio Breakdown</span>
          <ChevronRight 
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-90"
            )} 
          />
        </button>

        {/* Expandable Content with Animation */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 border-t border-border/50">
            {allocations.length === 0 ? (
              <div className="py-10">
                <p className="text-sm font-medium">No portfolio data yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Once your wallet has assets, they’ll appear here.
                </p>
              </div>
            ) : (
            <div className="flex items-center gap-6 pt-4">
              {/* Donut Chart */}
              <div className="relative flex-shrink-0">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                  {/* Background circle */}
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth={strokeWidth}
                    opacity={0.2}
                  />
                  
                  {/* Token arcs */}
                  {arcs.map((arc) => {
                    const isActive = activeToken?.symbol === arc.symbol;
                    const isInactive = activeToken && activeToken.symbol !== arc.symbol;
                    
                    return (
                      <circle
                        key={arc.symbol}
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={arc.color}
                        strokeLinecap="round"
                        strokeWidth={isActive ? strokeWidth + 6 : strokeWidth}
                        strokeDasharray={arc.dashArray}
                        strokeDashoffset={arc.dashOffset}
                        transform={`rotate(-90 ${center} ${center})`}
                        className={cn(
                          "cursor-pointer transition-all duration-200",
                          isInactive && "opacity-35"
                        )}
                        style={{
                          filter: isActive ? `drop-shadow(0 0 8px ${arc.color})` : "none"
                        }}
                        onMouseEnter={() => setActiveToken(arc)}
                        onMouseLeave={() => setActiveToken(null)}
                        onClick={() => setActiveToken(activeToken?.symbol === arc.symbol ? null : arc)}
                      />
                    );
                  })}
                </svg>

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl">{displayToken?.icon}</span>
                  <span className="text-lg font-bold mt-1">{displayToken?.percentage}%</span>
                  <span className="text-xs text-muted-foreground">{displayToken?.symbol}</span>
                </div>
              </div>

              {/* Token List */}
              <div className="flex-1 space-y-1 min-w-0">
                {allocations.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => setActiveToken(activeToken?.symbol === token.symbol ? null : token)}
                    onMouseEnter={() => setActiveToken(token)}
                    onMouseLeave={() => setActiveToken(null)}
                    className={cn(
                      "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors",
                      activeToken?.symbol === token.symbol ? "bg-accent/10" : "hover:bg-accent/5"
                    )}
                  >
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform",
                        activeToken?.symbol === token.symbol && "scale-125"
                      )}
                      style={{ 
                        backgroundColor: token.color,
                        boxShadow: activeToken?.symbol === token.symbol ? `0 0 8px ${token.color}` : "none"
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{token.symbol}</span>
                        <span 
                          className="text-sm font-semibold transition-colors"
                          style={{ 
                            color: activeToken?.symbol === token.symbol ? token.color : "hsl(var(--foreground))" 
                          }}
                        >
                          {token.percentage}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate">{token.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ${token.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            )}

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Portfolio Value</span>
              <span className="text-lg font-bold">
                ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

