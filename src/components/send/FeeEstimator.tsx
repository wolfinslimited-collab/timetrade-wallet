import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fuel, Clock, TrendingUp, TrendingDown, Minus, Info, RefreshCw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type GasSpeed = "slow" | "standard" | "fast" | "instant";

interface GasOption {
  label: string;
  icon: React.ElementType;
  time: string;
  multiplier: number;
  priority: string;
}

export const gasOptions: Record<GasSpeed, GasOption> = {
  slow: { 
    label: "Eco", 
    icon: TrendingDown, 
    time: "~10 min", 
    multiplier: 0.7,
    priority: "Low priority"
  },
  standard: { 
    label: "Standard", 
    icon: Minus, 
    time: "~3 min", 
    multiplier: 1,
    priority: "Market rate"
  },
  fast: { 
    label: "Fast", 
    icon: TrendingUp, 
    time: "~30 sec", 
    multiplier: 1.4,
    priority: "High priority"
  },
  instant: { 
    label: "Instant", 
    icon: Zap, 
    time: "~10 sec", 
    multiplier: 2,
    priority: "Maximum priority"
  },
};

interface NetworkStatus {
  congestion: "low" | "medium" | "high";
  baseFee: number; // in gwei
  lastUpdated: Date;
}

interface FeeEstimatorProps {
  baseGasLimit: number;
  tokenSymbol: string;
  tokenPrice: number;
  selectedSpeed: GasSpeed;
  onSpeedChange: (speed: GasSpeed) => void;
  disabled?: boolean;
}

// Simulate network status updates
const generateNetworkStatus = (): NetworkStatus => {
  const congestionLevel = Math.random();
  let congestion: "low" | "medium" | "high";
  let baseFee: number;
  
  if (congestionLevel < 0.4) {
    congestion = "low";
    baseFee = 15 + Math.random() * 10;
  } else if (congestionLevel < 0.75) {
    congestion = "medium";
    baseFee = 30 + Math.random() * 20;
  } else {
    congestion = "high";
    baseFee = 60 + Math.random() * 40;
  }
  
  return {
    congestion,
    baseFee,
    lastUpdated: new Date(),
  };
};

export const FeeEstimator = ({
  baseGasLimit,
  tokenSymbol,
  tokenPrice,
  selectedSpeed,
  onSpeedChange,
  disabled = false,
}: FeeEstimatorProps) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(generateNetworkStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Auto-refresh network status
  useEffect(() => {
    const interval = setInterval(() => {
      setNetworkStatus(generateNetworkStatus());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((r) => setTimeout(r, 500));
    setNetworkStatus(generateNetworkStatus());
    setIsRefreshing(false);
  };

  const feeCalculations = useMemo(() => {
    const baseGwei = networkStatus.baseFee;
    const results: Record<GasSpeed, { gwei: number; eth: number; usd: number }> = {} as any;
    
    (Object.keys(gasOptions) as GasSpeed[]).forEach((speed) => {
      const gwei = baseGwei * gasOptions[speed].multiplier;
      const eth = (gwei * baseGasLimit) / 1e9;
      const usd = eth * tokenPrice;
      results[speed] = { gwei, eth, usd };
    });
    
    return results;
  }, [networkStatus.baseFee, baseGasLimit, tokenPrice]);

  const selectedFee = feeCalculations[selectedSpeed];
  const congestionColors = {
    low: "text-emerald-500",
    medium: "text-amber-500",
    high: "text-destructive",
  };

  return (
    <div className="space-y-3">
      {/* Header with Network Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Network Fee</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={cn(
                "w-2 h-2 rounded-full",
                networkStatus.congestion === "low" && "bg-emerald-500",
                networkStatus.congestion === "medium" && "bg-amber-500",
                networkStatus.congestion === "high" && "bg-destructive"
              )}
            />
            <span className={cn("text-xs capitalize", congestionColors[networkStatus.congestion])}>
              {networkStatus.congestion}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={disabled || isRefreshing}
            className="p-1 rounded-full hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Speed Selector Grid */}
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(gasOptions) as GasSpeed[]).map((speed) => {
          const option = gasOptions[speed];
          const fee = feeCalculations[speed];
          const Icon = option.icon;
          const isSelected = selectedSpeed === speed;

          return (
            <motion.button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              disabled={disabled}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "relative p-3 rounded-xl border transition-all text-center",
                isSelected
                  ? "bg-primary/10 border-primary shadow-sm"
                  : "bg-card border-border hover:border-primary/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="selectedSpeed"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", duration: 0.3 }}
                />
              )}
              <div className="relative z-10">
                <div className="flex items-center justify-center mb-1">
                  <Icon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                </div>
                <p className={cn("text-xs font-medium", isSelected && "text-primary")}>
                  {option.label}
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {option.time}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Selected Fee Display */}
      <motion.div
        layout
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Fuel className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Estimated Fee</p>
              <p className="text-xs text-muted-foreground">{gasOptions[selectedSpeed].priority}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">{selectedFee.eth.toFixed(6)} ETH</p>
            <p className="text-xs text-muted-foreground">
              ≈ ${selectedFee.usd.toFixed(2)}
            </p>
          </div>
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border">
                <div className="pt-3 space-y-2">
                  {/* Gas Price */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Gas Price
                    </span>
                    <span className="font-mono">{selectedFee.gwei.toFixed(2)} Gwei</span>
                  </div>

                  {/* Gas Limit */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Gas Limit
                    </span>
                    <span className="font-mono">{baseGasLimit.toLocaleString()}</span>
                  </div>

                  {/* Base Fee */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Base Fee
                    </span>
                    <span className="font-mono">{networkStatus.baseFee.toFixed(2)} Gwei</span>
                  </div>

                  {/* Max Fee */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Max Fee
                    </span>
                    <span className="font-mono">{(selectedFee.gwei * 1.2).toFixed(2)} Gwei</span>
                  </div>
                </div>

                {/* Fee Range */}
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Fee Range (all speeds)</p>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Min</p>
                      <p className="text-sm font-medium text-emerald-500">
                        ${feeCalculations.slow.usd.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex-1 mx-3 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-destructive" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Max</p>
                      <p className="text-sm font-medium text-destructive">
                        ${feeCalculations.instant.usd.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Network Info */}
      <p className="text-[10px] text-center text-muted-foreground">
        Gas prices update every 15 seconds • Last updated {networkStatus.lastUpdated.toLocaleTimeString()}
      </p>
    </div>
  );
};

// Export helper to get fee
export const calculateFee = (
  baseGasLimit: number,
  baseFeeGwei: number,
  speed: GasSpeed,
  tokenPrice: number
) => {
  const gwei = baseFeeGwei * gasOptions[speed].multiplier;
  const eth = (gwei * baseGasLimit) / 1e9;
  const usd = eth * tokenPrice;
  return { gwei, eth, usd };
};
