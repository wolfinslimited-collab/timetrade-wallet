import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { formatBalance, getChainInfo, Chain, useWalletBalance } from "@/hooks/useBlockchain";
import { getPriceForSymbol } from "@/hooks/useCryptoPrices";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnifiedTokenListProps {
  className?: string;
}

interface TokenItem {
  id: string;
  symbol: string;
  name: string;
  balance: string;
  formattedBalance: string;
  usdValue: number;
  price: number;
  change24h: number;
  chain: Chain;
  chainIcon: string;
  chainColor: string;
  isNative: boolean;
  logo?: string;
}

export const UnifiedTokenList = ({ className }: UnifiedTokenListProps) => {
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
  
  const evmAddress = (() => {
    if (selectedChain === 'solana') {
      return storedEvmAddress || null;
    }
    const account = derivedAccounts[activeAccountIndex];
    return account?.address || null;
  })();
  
  const solanaAddress = (() => {
    if (selectedChain === 'solana') {
      const account = derivedAccounts[activeAccountIndex];
      return account?.address || null;
    }
    return storedSolanaAddress || null;
  })();

  // Fetch balances for all chains
  const ethBalance = useWalletBalance(evmAddress, 'ethereum');
  const solBalance = useWalletBalance(solanaAddress, 'solana');
  const polyBalance = useWalletBalance(evmAddress, 'polygon');

  if (!isConnected || (!evmAddress && !solanaAddress)) {
    return null;
  }

  const chainBalances = [
    { chain: 'ethereum' as Chain, query: ethBalance, address: evmAddress },
    { chain: 'solana' as Chain, query: solBalance, address: solanaAddress },
    { chain: 'polygon' as Chain, query: polyBalance, address: evmAddress },
  ].filter(c => c.address);

  const isLoading = chainBalances.some(c => c.query.isLoading);

  // Build unified token list from all chains
  const allTokens: TokenItem[] = [];

  chainBalances.forEach(({ chain, query }) => {
    const balance = query.data;
    if (!balance) return;

    const chainInfo = getChainInfo(chain);

    // Add native token
    const nativeBalance = parseFloat(balance.native.balance) / Math.pow(10, balance.native.decimals);
    const nativePrice = getPriceForSymbol(prices as any, balance.native.symbol);
    const nativePriceData = prices?.find(p => p.symbol.toUpperCase() === balance.native.symbol.toUpperCase());
    
    allTokens.push({
      id: `${chain}-native`,
      symbol: balance.native.symbol,
      name: balance.native.name || chainInfo.name,
      balance: balance.native.balance,
      formattedBalance: formatBalance(balance.native.balance, balance.native.decimals),
      usdValue: nativeBalance * nativePrice,
      price: nativePrice,
      change24h: nativePriceData?.change24h || 0,
      chain,
      chainIcon: chainInfo.icon,
      chainColor: chainInfo.color,
      isNative: true,
    });

    // Add ERC-20/SPL tokens
    (balance.tokens || []).forEach((token, idx) => {
      const tokenBalance = parseFloat(token.balance) / Math.pow(10, token.decimals);
      const tokenPrice = getPriceForSymbol(prices as any, token.symbol);
      const tokenPriceData = prices?.find(p => p.symbol.toUpperCase() === token.symbol.toUpperCase());

      allTokens.push({
        id: `${chain}-${token.contractAddress || idx}`,
        symbol: token.symbol,
        name: token.name || token.symbol,
        balance: token.balance,
        formattedBalance: formatBalance(token.balance, token.decimals),
        usdValue: tokenBalance * tokenPrice,
        price: tokenPrice,
        change24h: tokenPriceData?.change24h || 0,
        chain,
        chainIcon: chainInfo.icon,
        chainColor: chainInfo.color,
        isNative: false,
        logo: token.logo,
      });
    });
  });

  // Sort by USD value (highest first)
  allTokens.sort((a, b) => b.usdValue - a.usdValue);

  const getTokenIcon = (token: TokenItem) => {
    if (token.logo) return token.logo;
    
    const iconMap: Record<string, string> = {
      'ETH': 'Ξ',
      'SOL': '◎',
      'POL': '⬡',
      'MATIC': '⬡',
      'BTC': '₿',
      'USDT': '₮',
      'USDC': '$',
    };
    
    return iconMap[token.symbol.toUpperCase()] || token.symbol.slice(0, 1).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className={cn("px-4 py-6", className)}>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading assets...</span>
        </div>
      </div>
    );
  }

  if (allTokens.length === 0) {
    return (
      <div className={cn("px-4 py-6", className)}>
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">No assets found</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Your tokens will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1", className)}>
      {/* Token header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">
          Tokens
        </span>
        {isLoadingPrices && (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Token list */}
      <div className="space-y-1 px-4 pb-4">
        {allTokens.map((token) => (
          <div
            key={token.id}
            className="flex items-center justify-between p-3 bg-card rounded-xl border border-border hover:bg-accent/5 transition-colors cursor-pointer"
          >
            {/* Left: Icon + Info */}
            <div className="flex items-center gap-3">
              {/* Token icon with chain badge */}
              <div className="relative">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium"
                  style={{ 
                    backgroundColor: `${token.chainColor}15`,
                    color: token.chainColor,
                  }}
                >
                  {getTokenIcon(token)}
                </div>
                {/* Chain badge */}
                <div 
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] border-2 border-background"
                  style={{ backgroundColor: token.chainColor }}
                >
                  <span className="text-white drop-shadow-sm">{token.chainIcon}</span>
                </div>
              </div>
              
              {/* Token name and price change */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{token.symbol}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{token.name}</span>
                  {token.price > 0 && token.change24h !== 0 && (
                    <span className={cn(
                      "text-xs flex items-center gap-0.5",
                      token.change24h >= 0 ? "text-primary" : "text-destructive"
                    )}>
                      {token.change24h >= 0 ? (
                        <TrendingUp className="w-2.5 h-2.5" />
                      ) : (
                        <TrendingDown className="w-2.5 h-2.5" />
                      )}
                      {Math.abs(token.change24h).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Balance + USD */}
            <div className="text-right">
              <p className="font-mono font-medium">{token.formattedBalance}</p>
              <p className="text-xs text-muted-foreground">
                ${token.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
