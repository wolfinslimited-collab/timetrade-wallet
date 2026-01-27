import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { getChainInfo, formatBalance as formatCryptoBalance, useWalletBalance } from "@/hooks/useBlockchain";
import { NetworkIndicators } from "./NetworkIndicators";
import { useMemo } from "react";

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

  // Get addresses from storage to check which chains have funds
  const addresses = useMemo(() => ({
    evm: localStorage.getItem("timetrade_wallet_address_evm"),
    solana: localStorage.getItem("timetrade_wallet_address_solana"),
    tron: localStorage.getItem("timetrade_wallet_address_tron"),
  }), []);

  // Query all chain balances to determine which are active
  const ethBalance = useWalletBalance(isConnected ? addresses.evm : null, "ethereum");
  const polyBalance = useWalletBalance(isConnected ? addresses.evm : null, "polygon");
  const solBalance = useWalletBalance(isConnected ? addresses.solana : null, "solana");
  const tronBalance = useWalletBalance(isConnected ? addresses.tron : null, "tron");

  // Determine which networks have balances (are "active")
  const activeNetworks = useMemo(() => {
    const active: string[] = [];
    
    const hasBalance = (data: typeof ethBalance.data) => {
      if (!data) return false;
      const nativeBal = parseFloat(data.native?.balance || '0');
      const hasNative = nativeBal > 0;
      const hasTokens = (data.tokens || []).some(t => parseFloat(t?.balance || '0') > 0);
      return hasNative || hasTokens;
    };
    
    if (hasBalance(ethBalance.data)) active.push('ethereum');
    if (hasBalance(polyBalance.data)) active.push('polygon');
    if (hasBalance(solBalance.data)) active.push('solana');
    if (hasBalance(tronBalance.data)) active.push('tron');
    
    return active;
  }, [ethBalance.data, polyBalance.data, solBalance.data, tronBalance.data]);
  
  const formatBalanceValue = (value: number) => {
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
          <NetworkIndicators activeNetworks={activeNetworks} showAll={true} />
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="opacity-50">✧</span>
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
              {formatBalanceValue(displayBalance)}
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
