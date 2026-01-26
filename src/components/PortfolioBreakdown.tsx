import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

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
      <motion.div 
        className="bg-card rounded-2xl border border-border p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
        >
          <h3 className="text-sm font-semibold text-muted-foreground">Portfolio Breakdown</h3>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >

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
              
              {/* Token arcs with animation */}
              {arcs.map((arc, index) => {
                const isActive = activeToken?.symbol === arc.symbol;
                const isInactive = activeToken && activeToken.symbol !== arc.symbol;
                
                return (
                  <motion.circle
                    key={arc.symbol}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={arc.color}
                    strokeLinecap="round"
                    strokeDasharray={arc.dashArray}
                    strokeDashoffset={arc.dashOffset}
                    transform={`rotate(-90 ${center} ${center})`}
                    className="cursor-pointer"
                    initial={{ 
                      strokeWidth: strokeWidth,
                      opacity: 0,
                      strokeDashoffset: circumference 
                    }}
                    animate={{ 
                      strokeWidth: isActive ? strokeWidth + 6 : strokeWidth,
                      opacity: isInactive ? 0.35 : 1,
                      strokeDashoffset: arc.dashOffset,
                      filter: isActive ? "drop-shadow(0 0 8px " + arc.color + ")" : "none"
                    }}
                    transition={{ 
                      strokeWidth: { duration: 0.2, ease: "easeOut" },
                      opacity: { duration: 0.2, ease: "easeOut" },
                      strokeDashoffset: { duration: 0.8, delay: index * 0.1, ease: "easeOut" },
                      filter: { duration: 0.2 }
                    }}
                    onMouseEnter={() => setActiveToken(arc)}
                    onMouseLeave={() => setActiveToken(null)}
                    onClick={() => setActiveToken(activeToken?.symbol === arc.symbol ? null : arc)}
                    whileHover={{ scale: 1.02 }}
                    style={{ transformOrigin: "center" }}
                  />
                );
              })}
            </svg>

            {/* Center content with animation */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={displayToken.symbol}
                  initial={{ opacity: 0, scale: 0.8, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -5 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex flex-col items-center"
                >
                  <motion.span 
                    className="text-2xl"
                    animate={{ 
                      textShadow: activeToken 
                        ? `0 0 12px ${displayToken.color}` 
                        : "none" 
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {displayToken.icon}
                  </motion.span>
                  <span className="text-lg font-bold mt-1">{displayToken.percentage}%</span>
                  <span className="text-xs text-muted-foreground">{displayToken.symbol}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Token List */}
          <div className="flex-1 space-y-2 min-w-0">
            {portfolioData.map((token, index) => (
              <motion.button
                key={token.symbol}
                onClick={() => setActiveToken(activeToken?.symbol === token.symbol ? null : token)}
                onMouseEnter={() => setActiveToken(token)}
                onMouseLeave={() => setActiveToken(null)}
                initial={{ opacity: 0, x: 20 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  backgroundColor: activeToken?.symbol === token.symbol 
                    ? "hsl(var(--accent) / 0.2)" 
                    : "transparent"
                }}
                transition={{ 
                  opacity: { duration: 0.3, delay: index * 0.05 },
                  x: { duration: 0.3, delay: index * 0.05 },
                  backgroundColor: { duration: 0.2 }
                }}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-lg text-left"
                )}
              >
                <motion.div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: token.color }}
                  animate={{ 
                    scale: activeToken?.symbol === token.symbol ? 1.3 : 1,
                    boxShadow: activeToken?.symbol === token.symbol 
                      ? `0 0 8px ${token.color}` 
                      : "none"
                  }}
                  transition={{ duration: 0.2 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{token.symbol}</span>
                    <motion.span 
                      className="text-sm font-semibold"
                      animate={{ 
                        color: activeToken?.symbol === token.symbol 
                          ? token.color 
                          : "hsl(var(--foreground))" 
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      {token.percentage}%
                    </motion.span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate">{token.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ${token.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Total */}
        <motion.div 
          className="mt-4 pt-4 border-t border-border flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <span className="text-sm text-muted-foreground">Total Portfolio Value</span>
          <span className="text-lg font-bold">
            ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
