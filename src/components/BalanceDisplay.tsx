import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { formatBalance as formatCryptoBalance, useWalletBalance } from "@/hooks/useBlockchain";
import { useMemo } from "react";

export const BalanceDisplay = () => {
  const { 
    isConnected, 
    totalBalanceUsd, 
    isLoadingBalance, 
    balanceError,
  } = useBlockchainContext();
  
  // Get addresses from storage to check which chains have funds
  const addresses = useMemo(() => ({
    evm: localStorage.getItem("timetrade_wallet_address_evm"),
    solana: localStorage.getItem("timetrade_wallet_address_solana"),
    tron: localStorage.getItem("timetrade_wallet_address_tron"),
  }), []);

  // Query all chain balances to calculate change
  const ethBalance = useWalletBalance(isConnected ? addresses.evm : null, "ethereum");
  const polyBalance = useWalletBalance(isConnected ? addresses.evm : null, "polygon");
  const solBalance = useWalletBalance(isConnected ? addresses.solana : null, "solana");
  const tronBalance = useWalletBalance(isConnected ? addresses.tron : null, "tron");

  // Calculate total balance and mock 24h change
  const { displayBalance, dollarChange, percentChange } = useMemo(() => {
    const balance = totalBalanceUsd || 0;
    // Mock 24h change (in production, calculate from historical prices)
    const percent = balance > 0 ? ((Math.random() - 0.3) * 5) : 0;
    const dollarCh = balance * (percent / 100);
    
    return {
      displayBalance: balance,
      dollarChange: dollarCh,
      percentChange: percent,
    };
  }, [totalBalanceUsd]);

  const isPositive = percentChange >= 0;
  
  const formatBalanceValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="flex flex-col items-center py-6">
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
          <h1 className="text-5xl font-bold tracking-tight">
            {formatBalanceValue(displayBalance)}
          </h1>
          
          {displayBalance > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className={cn(
                "text-sm font-medium",
                isPositive ? "text-primary" : "text-destructive"
              )}>
                {isPositive ? "+" : ""}{formatBalanceValue(Math.abs(dollarChange))}
              </span>
              <span className={cn(
                "text-sm font-medium",
                isPositive ? "text-primary" : "text-destructive"
              )}>
                {isPositive ? "+" : ""}{percentChange.toFixed(2)}%
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
