import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

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
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate SVG arc paths for donut chart
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativePercentage = 0;
  const arcs = portfolioData.map((token) => {
    const arcLength = (token.percentage / 100) * circumference;
    const dashOffset = circumference - (cumulativePercentage / 100) * circumference;
    cumulativePercentage += token.percentage;

    return {
      ...token,
      dashArray: `${arcLength} ${circumference - arcLength}`,
      dashOffset,
    };
  });

  const displayToken = activeToken || portfolioData[0];

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
                  <span className="text-2xl">{displayToken.icon}</span>
                  <span className="text-lg font-bold mt-1">{displayToken.percentage}%</span>
                  <span className="text-xs text-muted-foreground">{displayToken.symbol}</span>
                </div>
              </div>

              {/* Token List */}
              <div className="flex-1 space-y-1 min-w-0">
                {portfolioData.map((token) => (
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

