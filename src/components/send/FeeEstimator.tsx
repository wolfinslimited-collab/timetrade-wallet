import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fuel, Clock, TrendingUp, TrendingDown, Minus, Info, RefreshCw, Zap, AlertCircle, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { getChainInfo } from "@/hooks/useBlockchain";
import { useLiveFeeEstimation, LiveFeeData } from "@/hooks/useLiveFeeEstimation";
import { isEvmChain } from "@/hooks/useTransactionSigning";

export type GasSpeed = "slow" | "standard" | "fast" | "instant";

interface GasOption {
  label: string;
  icon: React.ElementType;
  priority: string;
}

export const gasOptions: Record<GasSpeed, GasOption> = {
  slow: { 
    label: "Eco", 
    icon: TrendingDown, 
    priority: "Low priority"
  },
  standard: { 
    label: "Standard", 
    icon: Minus, 
    priority: "Market rate"
  },
  fast: { 
    label: "Fast", 
    icon: TrendingUp, 
    priority: "High priority"
  },
  instant: { 
    label: "Instant", 
    icon: Zap, 
    priority: "Maximum priority"
  },
};

interface FeeEstimatorProps {
  baseGasLimit: number;
  tokenSymbol: string;
  tokenPrice: number;
  selectedSpeed: GasSpeed;
  onSpeedChange: (speed: GasSpeed) => void;
  onFeeDataUpdate?: (feeData: LiveFeeData | null) => void;
  disabled?: boolean;
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `~${seconds}s`;
  return `~${Math.round(seconds / 60)}m`;
};

export const FeeEstimator = ({
  baseGasLimit,
  tokenSymbol,
  tokenPrice,
  selectedSpeed,
  onSpeedChange,
  onFeeDataUpdate,
  disabled = false,
}: FeeEstimatorProps) => {
  const { gasEstimate, isLoadingGas, gasError, selectedChain, isTestnet, refreshAll } = useBlockchainContext();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Use live RPC fee estimation for EVM chains
  const { feeData: liveFeeData, isLoading: isLoadingLive, error: liveError, refresh: refreshLive, isLive } = 
    useLiveFeeEstimation(selectedChain, isTestnet, isEvmChain(selectedChain));

  const chainInfo = getChainInfo(selectedChain);

  // Notify parent of fee data updates
  useEffect(() => {
    onFeeDataUpdate?.(liveFeeData);
  }, [liveFeeData, onFeeDataUpdate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refreshLive(),
      new Promise((r) => setTimeout(r, 500)),
    ]);
    refreshAll();
    setIsRefreshing(false);
  };

  // Determine network congestion based on live or fallback data
  const networkCongestion = useMemo(() => {
    const baseGas = liveFeeData?.baseFeePerGasGwei || 
      (gasEstimate?.medium?.gasPrice ? parseFloat(gasEstimate.medium.gasPrice) : 20);
    
    if (baseGas < 15) return "low";
    if (baseGas < 50) return "medium";
    return "high";
  }, [liveFeeData, gasEstimate]);

  // Calculate fees using live RPC data or fallback to Tatum API
  const feeCalculations = useMemo(() => {
    const results: Record<GasSpeed, { 
      gwei: number; 
      maxFee: number;
      priorityFee: number;
      eth: number; 
      usd: number; 
      time: string;
      isEIP1559: boolean;
    }> = {} as any;

    if (liveFeeData && isEvmChain(selectedChain)) {
      // Use live RPC data
      (Object.keys(gasOptions) as GasSpeed[]).forEach((speed) => {
        const tier = liveFeeData[speed];
        const effectiveGas = liveFeeData.isEIP1559 ? tier.maxFee : tier.gasPrice;
        const eth = (effectiveGas * baseGasLimit) / 1e9;
        const usd = eth * tokenPrice;
        
        results[speed] = { 
          gwei: tier.gasPrice,
          maxFee: tier.maxFee,
          priorityFee: tier.priorityFee,
          eth, 
          usd, 
          time: formatTime(tier.estimatedTime),
          isEIP1559: liveFeeData.isEIP1559,
        };
      });
    } else {
      // Fallback to Tatum API data
      const slowGas = gasEstimate?.slow?.gasPrice ? parseFloat(gasEstimate.slow.gasPrice) : 10;
      const mediumGas = gasEstimate?.medium?.gasPrice ? parseFloat(gasEstimate.medium.gasPrice) : 20;
      const fastGas = gasEstimate?.fast?.gasPrice ? parseFloat(gasEstimate.fast.gasPrice) : 30;

      const slowTime = gasEstimate?.slow?.estimatedTime || 300;
      const mediumTime = gasEstimate?.medium?.estimatedTime || 60;
      const fastTime = gasEstimate?.fast?.estimatedTime || 15;

      const gasMap: Record<GasSpeed, { gwei: number; time: number }> = {
        slow: { gwei: slowGas, time: slowTime },
        standard: { gwei: mediumGas, time: mediumTime },
        fast: { gwei: fastGas, time: fastTime },
        instant: { gwei: fastGas * 1.5, time: Math.max(5, fastTime / 2) },
      };

      (Object.keys(gasOptions) as GasSpeed[]).forEach((speed) => {
        const { gwei, time } = gasMap[speed];
        const eth = (gwei * baseGasLimit) / 1e9;
        const usd = eth * tokenPrice;
        results[speed] = { 
          gwei, 
          maxFee: gwei,
          priorityFee: gwei * 0.1,
          eth, 
          usd, 
          time: formatTime(time),
          isEIP1559: false,
        };
      });
    }
    
    return results;
  }, [liveFeeData, gasEstimate, baseGasLimit, tokenPrice, selectedChain]);

  const selectedFee = feeCalculations[selectedSpeed];
  const congestionColors = {
    low: "text-emerald-500",
    medium: "text-amber-500",
    high: "text-destructive",
  };

  const hasLiveData = isLive || (!!gasEstimate && !gasError);
  const isAnyLoading = isLoadingGas || isLoadingLive || isRefreshing;

  // Time since last update
  const lastUpdateText = useMemo(() => {
    if (!liveFeeData?.lastUpdated) return null;
    const seconds = Math.floor((Date.now() - liveFeeData.lastUpdated.getTime()) / 1000);
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  }, [liveFeeData?.lastUpdated]);

  return (
    <div className="space-y-3">
      {/* Header with Network Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Network Fee</span>
          {isLive && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              LIVE
            </span>
          )}
          {liveFeeData?.isEIP1559 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
              EIP-1559
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={cn(
                "w-2 h-2 rounded-full",
                networkCongestion === "low" && "bg-emerald-500",
                networkCongestion === "medium" && "bg-amber-500",
                networkCongestion === "high" && "bg-destructive"
              )}
            />
            <span className={cn("text-xs capitalize", congestionColors[networkCongestion])}>
              {networkCongestion}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={disabled || isAnyLoading}
            className="p-1 rounded-full hover:bg-secondary transition-colors disabled:opacity-50"
            title="Refresh gas prices"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", isAnyLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {(gasError || liveError) && !hasLiveData && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-amber-500">Using estimated fees (live data unavailable)</span>
        </div>
      )}

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
                  {fee.time}
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
            <p className="font-semibold">{selectedFee.eth.toFixed(6)} {chainInfo.symbol}</p>
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
                  {/* Base Fee (EIP-1559) */}
                  {selectedFee.isEIP1559 && liveFeeData && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Base Fee
                      </span>
                      <span className="font-mono">{liveFeeData.baseFeePerGasGwei.toFixed(2)} Gwei</span>
                    </div>
                  )}

                  {/* Max Fee */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      {selectedFee.isEIP1559 ? "Max Fee" : "Gas Price"}
                    </span>
                    <span className="font-mono">{selectedFee.maxFee.toFixed(2)} Gwei</span>
                  </div>

                  {/* Priority Fee (EIP-1559) */}
                  {selectedFee.isEIP1559 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Priority Fee
                      </span>
                      <span className="font-mono">{selectedFee.priorityFee.toFixed(2)} Gwei</span>
                    </div>
                  )}

                  {/* Gas Limit */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Gas Limit
                    </span>
                    <span className="font-mono">{baseGasLimit.toLocaleString()}</span>
                  </div>

                  {/* Network */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Network
                    </span>
                    <span className="font-mono">{chainInfo.name} {chainInfo.testnetName}</span>
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
        {isLive ? (
          <>Live gas prices from RPC • Updated {lastUpdateText}</>
        ) : (
          <>Estimated gas prices • {chainInfo.name} {chainInfo.testnetName}</>
        )}
      </p>
    </div>
  );
};

// Export helper to get fee
export const calculateFee = (
  baseGasLimit: number,
  baseFeeGwei: number,
  tokenPrice: number
) => {
  const eth = (baseFeeGwei * baseGasLimit) / 1e9;
  const usd = eth * tokenPrice;
  return { gwei: baseFeeGwei, eth, usd };
};
