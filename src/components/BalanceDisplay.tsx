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
    <div className="px-4 py-2">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs text-muted-foreground tracking-widest uppercase">
          Total Balance
        </p>
      {isConnected ? (
          <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            <Wifi className="w-3 h-3" />
            <span>All Networks</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <WifiOff className="w-3 h-3" />
            <span>Demo</span>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-3">
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
            <h1 className="text-4xl font-bold font-mono tracking-tight">
              <span className="text-muted-foreground">$</span>
              {formatBalance(displayBalance)}
            </h1>
            {!isConnected && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium",
                isPositive 
                  ? "text-primary bg-primary/10" 
                  : "text-destructive bg-destructive/10"
              )}>
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{isPositive ? "+" : ""}{changePercent.toFixed(1)}%</span>
              </div>
            )}
          </>
        )}
      </div>
      {isConnected && !isLoadingBalance && !balanceError && (
        <p className="text-xs text-muted-foreground mt-1">
          <span className="font-medium text-foreground">
            {nativeBalance} {chainInfo.symbol}
          </span>
          {' '}• {chainInfo.testnetName}
        </p>
      )}
    </div>
  );
};
