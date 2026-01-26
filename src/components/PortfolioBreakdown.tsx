import { useState } from "react";
import { cn } from "@/lib/utils";

interface TokenAllocation {
  symbol: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
  icon: string;
}

const portfolioData: TokenAllocation[] = [
  { symbol: "ETH", name: "Ethereum", value: 5840.25, percentage: 48.0, color: "hsl(231, 54%, 56%)", icon: "Ξ" },
  { symbol: "BTC", name: "Bitcoin", value: 3648.12, percentage: 30.0, color: "hsl(33, 95%, 54%)", icon: "₿" },
  { symbol: "SOL", name: "Solana", value: 1216.04, percentage: 10.0, color: "hsl(263, 70%, 58%)", icon: "◎" },
  { symbol: "USDT", name: "Tether", value: 972.83, percentage: 8.0, color: "hsl(160, 84%, 39%)", icon: "₮" },
  { symbol: "Others", name: "Other Assets", value: 482.81, percentage: 4.0, color: "hsl(220, 14%, 50%)", icon: "•" },
];

const totalValue = portfolioData.reduce((sum, token) => sum + token.value, 0);

export const PortfolioBreakdown = () => {
  const [activeToken, setActiveToken] = useState<TokenAllocation | null>(null);

  // Calculate SVG arc paths for donut chart
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativePercentage = 0;
  const arcs = portfolioData.map((token) => {
    const startAngle = (cumulativePercentage / 100) * 360 - 90;
    const arcLength = (token.percentage / 100) * circumference;
    const dashOffset = circumference - (cumulativePercentage / 100) * circumference;
    cumulativePercentage += token.percentage;

    return {
      ...token,
      dashArray: `${arcLength} ${circumference - arcLength}`,
      dashOffset,
      rotation: startAngle,
    };
  });

  const displayToken = activeToken || portfolioData[0];

  return (
    <div className="px-6 py-4">
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Portfolio Breakdown</h3>

        <div className="flex items-center gap-6">
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
              {arcs.map((arc, index) => (
                <circle
                  key={arc.symbol}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={activeToken?.symbol === arc.symbol ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={arc.dashArray}
                  strokeDashoffset={arc.dashOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${center} ${center})`}
                  className="transition-all duration-300 cursor-pointer"
                  style={{ 
                    opacity: activeToken && activeToken.symbol !== arc.symbol ? 0.4 : 1,
                  }}
                  onMouseEnter={() => setActiveToken(arc)}
                  onMouseLeave={() => setActiveToken(null)}
                  onClick={() => setActiveToken(activeToken?.symbol === arc.symbol ? null : arc)}
                />
              ))}
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl">{displayToken.icon}</span>
              <span className="text-lg font-bold mt-1">{displayToken.percentage}%</span>
              <span className="text-xs text-muted-foreground">{displayToken.symbol}</span>
            </div>
          </div>

          {/* Token List */}
          <div className="flex-1 space-y-2 min-w-0">
            {portfolioData.map((token) => (
              <button
                key={token.symbol}
                onClick={() => setActiveToken(activeToken?.symbol === token.symbol ? null : token)}
                onMouseEnter={() => setActiveToken(token)}
                onMouseLeave={() => setActiveToken(null)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left",
                  activeToken?.symbol === token.symbol 
                    ? "bg-accent" 
                    : "hover:bg-accent/50"
                )}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: token.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{token.symbol}</span>
                    <span className="text-sm font-semibold">{token.percentage}%</span>
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

        {/* Total */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Portfolio Value</span>
          <span className="text-lg font-bold">
            ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};
