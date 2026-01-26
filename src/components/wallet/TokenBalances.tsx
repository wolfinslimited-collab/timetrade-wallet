import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { formatBalance, getChainInfo } from "@/hooks/useBlockchain";
import { Loader2, Coins, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenBalancesProps {
  className?: string;
}

// Mock USD prices for tokens (in production, fetch from price API)
const TOKEN_PRICES: Record<string, number> = {
  ETH: 3245.67,
  MATIC: 0.85,
  LINK: 14.50,
  USDC: 1.00,
  USDT: 1.00,
  WETH: 3245.67,
  WMATIC: 0.85,
  DAI: 1.00,
};

export const TokenBalances = ({ className }: TokenBalancesProps) => {
  const { 
    isConnected, 
    balance, 
    isLoadingBalance, 
    balanceError,
    selectedChain,
  } = useBlockchainContext();

  const chainInfo = getChainInfo(selectedChain);

  // Only show for EVM chains (Ethereum and Polygon)
  const isEVMChain = selectedChain === 'ethereum' || selectedChain === 'polygon';

  if (!isConnected || !isEVMChain) {
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
            No ERC-20 tokens found on {chainInfo.testnetName}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Get testnet tokens from a faucet to see them here
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
        </div>
        <span className="text-xs text-muted-foreground">
          {tokens.length} token{tokens.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {tokens.map((token, index) => {
          const formattedBalance = formatBalance(token.balance, token.decimals);
          const numericBalance = parseFloat(token.balance) / Math.pow(10, token.decimals);
          const price = TOKEN_PRICES[token.symbol] || 0;
          const usdValue = numericBalance * price;

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
                  <span className="text-xs text-muted-foreground">{token.name}</span>
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
