import { TrendingUp, TrendingDown, Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { formatBalance as formatBalanceUtil, getChainInfo, Chain, useWalletBalance } from "@/hooks/useBlockchain";
import { getPriceForSymbol } from "@/hooks/useCryptoPrices";
import { useState, useMemo } from "react";

interface BalanceDisplayProps {
  balance?: number;
  changePercent?: number;
}

export const BalanceDisplay = ({ balance = 0, changePercent = 0 }: BalanceDisplayProps) => {
  const [hideBalance, setHideBalance] = useState(false);
  
  const { 
    isConnected, 
    prices,
    isLoadingPrices,
    derivedAccounts,
    activeAccountIndex,
    selectedChain,
  } = useBlockchainContext();

  // Get addresses for each chain
  const storedEvmAddress = localStorage.getItem('timetrade_wallet_address_evm');
  const storedSolanaAddress = localStorage.getItem('timetrade_wallet_address_solana');
  
  const evmAddress = useMemo(() => {
    if (selectedChain === 'solana') {
      return storedEvmAddress || null;
    }
    const account = derivedAccounts[activeAccountIndex];
    return account?.address || null;
  }, [selectedChain, storedEvmAddress, derivedAccounts, activeAccountIndex]);
  
  const solanaAddress = useMemo(() => {
    if (selectedChain === 'solana') {
      const account = derivedAccounts[activeAccountIndex];
      return account?.address || null;
    }
    return storedSolanaAddress || null;
  }, [selectedChain, storedSolanaAddress, derivedAccounts, activeAccountIndex]);

  // Fetch balances for all chains
  const ethBalance = useWalletBalance(evmAddress, 'ethereum');
  const solBalance = useWalletBalance(solanaAddress, 'solana');
  const polyBalance = useWalletBalance(evmAddress, 'polygon');

  // Calculate total portfolio value across all chains
  const { totalBalanceUsd, totalChange24h, isLoading } = useMemo(() => {
    const chainBalances = [
      { chain: 'ethereum' as Chain, query: ethBalance },
      { chain: 'solana' as Chain, query: solBalance },
      { chain: 'polygon' as Chain, query: polyBalance },
    ];

    const loading = chainBalances.some(c => c.query.isLoading);
    let total = 0;
    let totalPrev = 0;

    chainBalances.forEach(({ query }) => {
      const balance = query.data;
      if (!balance) return;

      // Native token
      const nativeBalance = parseFloat(balance.native.balance) / Math.pow(10, balance.native.decimals);
      const nativePrice = getPriceForSymbol(prices as any, balance.native.symbol);
      const nativePriceData = prices?.find(p => p.symbol.toUpperCase() === balance.native.symbol.toUpperCase());
      const nativeChange = nativePriceData?.change24h || 0;
      
      const nativeUsd = nativeBalance * nativePrice;
      const nativePrevUsd = nativeChange !== 0 ? nativeUsd / (1 + nativeChange / 100) : nativeUsd;
      
      total += nativeUsd;
      totalPrev += nativePrevUsd;

      // Tokens
      (balance.tokens || []).forEach((token) => {
        const tokenBalance = parseFloat(token.balance) / Math.pow(10, token.decimals);
        const tokenPrice = getPriceForSymbol(prices as any, token.symbol);
        const tokenPriceData = prices?.find(p => p.symbol.toUpperCase() === token.symbol.toUpperCase());
        const tokenChange = tokenPriceData?.change24h || 0;

        const tokenUsd = tokenBalance * tokenPrice;
        const tokenPrevUsd = tokenChange !== 0 ? tokenUsd / (1 + tokenChange / 100) : tokenUsd;

        total += tokenUsd;
        totalPrev += tokenPrevUsd;
      });
    });

    const change = totalPrev > 0 ? ((total - totalPrev) / totalPrev) * 100 : 0;

    return { totalBalanceUsd: total, totalChange24h: change, isLoading: loading };
  }, [ethBalance, solBalance, polyBalance, prices]);

  const displayBalance = isConnected ? totalBalanceUsd : balance;
  const displayChange = isConnected ? totalChange24h : changePercent;
  const isPositive = displayChange >= 0;

  const formatBalance = (value: number) => {
    if (hideBalance) return '••••••';
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="px-4 py-4">
      {/* Main Balance */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Main Wallet</p>
          {isLoading && isConnected ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground text-lg">Loading...</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono">
                ${formatBalance(displayBalance)}
              </span>
            </div>
          )}
        </div>
        
        {/* Hide balance toggle */}
        <button
          onClick={() => setHideBalance(!hideBalance)}
          className="p-2 rounded-full hover:bg-accent/10 transition-colors"
        >
          {hideBalance ? (
            <EyeOff className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Eye className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* 24h Change */}
      {!isLoading && (
        <div className={cn(
          "flex items-center gap-1 mt-1",
          isPositive ? "text-primary" : "text-destructive"
        )}>
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span className="text-sm font-medium">
            {isPositive ? "+" : ""}{displayChange.toFixed(2)}% today
          </span>
        </div>
      )}
    </div>
  );
};