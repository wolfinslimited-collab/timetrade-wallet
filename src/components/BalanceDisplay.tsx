import { TrendingUp, TrendingDown, Loader2, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { getChainInfo, formatBalance as formatCryptoBalance } from "@/hooks/useBlockchain";

interface BalanceDisplayProps {
  balance: number;
  changePercent: number;
}

export const BalanceDisplay = ({ balance, changePercent }: BalanceDisplayProps) => {
  const { 
    isConnected, 
    totalBalanceUsd, 
    isLoadingBalance, 
    balanceError,
    selectedChain,
    balance: walletBalance,
  } = useBlockchainContext();
  
  const chainInfo = getChainInfo(selectedChain);
  
  // Use real balance if connected, otherwise use mock
  const displayBalance = isConnected ? totalBalanceUsd : balance;
  const isPositive = changePercent >= 0;
  
  const formatBalance = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value).replace('$', '');
  };

  // Get native crypto balance
  const nativeBalance = walletBalance?.native 
    ? formatCryptoBalance(walletBalance.native.balance, walletBalance.native.decimals)
    : '0';

  return (
    <div className="px-6 py-4">
      {/* Header row with label and status */}
      <div className="flex items-center gap-3 mb-2">
        <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase font-medium">
          Total Balance
        </p>
        {isConnected ? (
          <div 
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ 
              backgroundColor: `${chainInfo.color}15`,
              color: chainInfo.color,
            }}
          >
            <Wifi className="w-3 h-3" />
            <span>{chainInfo.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <WifiOff className="w-3 h-3" />
            <span>Demo</span>
          </div>
        )}
      </div>

      {/* Balance and change indicator */}
      <div className="flex items-center gap-4">
        {isLoadingBalance && isConnected ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Loading...</span>
          </div>
        ) : balanceError && isConnected ? (
          <div className="text-destructive text-sm">
            Failed to load balance
          </div>
        ) : (
          <>
            <h1 className="text-[2.75rem] font-bold tracking-tight leading-none">
              <span className="text-foreground/60">$</span>
              <span className="text-foreground">{formatBalance(displayBalance)}</span>
            </h1>
            {!isConnected && (
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
                isPositive 
                  ? "text-emerald-400 bg-emerald-500/15 border border-emerald-500/20" 
                  : "text-red-400 bg-red-500/15 border border-red-500/20"
              )}>
                <TrendingUp className="w-4 h-4" />
                <span>{isPositive ? "+" : ""}{changePercent.toFixed(1)}%</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Native balance info when connected */}
      {isConnected && !isLoadingBalance && !balanceError && (
        <p className="text-xs text-muted-foreground mt-2">
          <span 
            className="font-medium"
            style={{ color: chainInfo.color }}
          >
            {nativeBalance} {chainInfo.symbol}
          </span>
          {' '}• {chainInfo.testnetName} Testnet
        </p>
      )}
    </div>
  );
};
