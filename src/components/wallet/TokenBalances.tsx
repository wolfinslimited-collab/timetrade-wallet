import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { formatBalance, getChainInfo } from "@/hooks/useBlockchain";
import { useCryptoPrices, getPriceForSymbol } from "@/hooks/useCryptoPrices";
import { Loader2, Coins, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenBalancesProps {
  className?: string;
}

export const TokenBalances = ({ className }: TokenBalancesProps) => {
  const { 
    isConnected, 
    balance, 
    isLoadingBalance, 
    balanceError,
    selectedChain,
  } = useBlockchainContext();

  const chainInfo = getChainInfo(selectedChain);

  // Get token symbols for price fetching (including native + tokens like USDC)
  const tokenSymbols = balance?.tokens?.map(t => t.symbol) || [];
  const allSymbols = [...new Set([chainInfo.symbol, 'USDC', 'USDT', ...tokenSymbols])];
  
  // Fetch live prices
  const { data: prices, isLoading: isLoadingPrices } = useCryptoPrices(allSymbols);

  if (!isConnected) {
    return null;
  }

  if (isLoadingBalance) {
    return (
      <div className={cn("px-4 py-3", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading tokens...</span>
        </div>
      </div>
    );
  }

  if (balanceError) {
    return null;
  }

  const tokens = balance?.tokens || [];
  const tokenType = selectedChain === 'solana' ? 'SPL' : 'ERC-20';

  if (tokens.length === 0) {
    return (
      <div className={cn("px-4 py-3", className)}>
        <div className="flex items-center gap-2 mb-3">
          <Coins className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Token Holdings
          </h3>
        </div>
        <div className="bg-muted/30 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">
            No {tokenType} tokens found on {chainInfo.name}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {selectedChain === 'solana' 
              ? 'Your SPL tokens (like USDC) will appear here'
              : 'Your ERC-20 tokens will appear here'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("px-4 py-3", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Token Holdings
          </h3>
          {isLoadingPrices && (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {tokens.length} token{tokens.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {tokens.map((token, index) => {
          const formattedBalance = formatBalance(token.balance, token.decimals);
          const numericBalance = parseFloat(token.balance) / Math.pow(10, token.decimals);
          const price = getPriceForSymbol(prices, token.symbol);
          const usdValue = numericBalance * price;
          const priceData = prices?.find(p => p.symbol.toUpperCase() === token.symbol.toUpperCase());
          const change24h = priceData?.change24h || 0;

          return (
            <div
              key={`${token.contractAddress}-${index}`}
              className="flex items-center justify-between p-3 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{ 
                    backgroundColor: `${chainInfo.color}15`,
                  }}
                >
                  {token.logo || '🪙'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{token.symbol}</span>
                    {token.contractAddress && (
                      <a
                        href={`${balance?.explorerUrl}/token/${token.contractAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{token.name}</span>
                    {price > 0 && change24h !== 0 && (
                      <span className={cn(
                        "text-xs flex items-center gap-0.5",
                        change24h >= 0 ? "text-primary" : "text-destructive"
                      )}>
                        {change24h >= 0 ? (
                          <TrendingUp className="w-2.5 h-2.5" />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5" />
                        )}
                        {Math.abs(change24h).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono font-medium">{formattedBalance}</p>
                {price > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
