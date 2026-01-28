import { useState, useEffect, useMemo } from "react";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { formatBalance, getChainInfo, Chain } from "@/hooks/useBlockchain";
import { getPriceForSymbol } from "@/hooks/useCryptoPrices";
import { cn } from "@/lib/utils";
import { AssetDetailSheet } from "./AssetDetailSheet";

// Get crypto logo URL from external API
const getCryptoLogoUrl = (symbol: string): string => {
  return `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;
};

// Get network logo URL
const getNetworkLogoUrl = (chain: Chain): string => {
  const symbols: Record<Chain, string> = {
    ethereum: "eth",
    polygon: "matic",
    solana: "sol",
    tron: "trx",
    bitcoin: "btc",
  };
  return `https://api.elbstream.com/logos/crypto/${symbols[chain]}`;
};

interface UnifiedToken {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  chain: Chain;
  isNative: boolean;
  contractAddress?: string;
  logo?: string;
}

interface TokenWithValue extends UnifiedToken {
  numericBalance: number;
  price: number;
  usdValue: number;
  change24h: number;
}

// Fallback icon for failed image loads
const FallbackIcon = ({ symbol }: { symbol: string }) => (
  <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">
    {symbol.slice(0, 2).toUpperCase()}
  </div>
);

export const UnifiedTokenList = ({ className }: { className?: string }) => {
  // Use unified assets from context - NO DUPLICATE QUERIES
  const { isConnected, unifiedAssets, prices, isLoadingBalance, isLoadingPrices } = useBlockchainContext();
  
  // All hooks MUST be at the top, before any conditional returns
  const [selectedAsset, setSelectedAsset] = useState<TokenWithValue | null>(null);
  const [showAssetDetail, setShowAssetDetail] = useState(false);
  
  // Read addresses from localStorage only once on mount, and on account switch events
  const [addresses, setAddresses] = useState(() => ({
    evm: localStorage.getItem('timetrade_wallet_address_evm'),
    solana: localStorage.getItem('timetrade_wallet_address_solana'),
    tron: localStorage.getItem('timetrade_wallet_address_tron'),
  }));

  // Listen for account switch events instead of polling
  useEffect(() => {
    const readAddresses = () => {
      setAddresses({
        evm: localStorage.getItem('timetrade_wallet_address_evm'),
        solana: localStorage.getItem('timetrade_wallet_address_solana'),
        tron: localStorage.getItem('timetrade_wallet_address_tron'),
      });
    };
    
    // Listen for custom events when accounts switch
    window.addEventListener('timetrade:account-switched', readAddresses);
    window.addEventListener('timetrade:unlocked', readAddresses);
    
    return () => {
      window.removeEventListener('timetrade:account-switched', readAddresses);
      window.removeEventListener('timetrade:unlocked', readAddresses);
    };
  }, []);

  // Transform unified assets to token format for display
  const tokensWithValue = useMemo(() => {
    if (!unifiedAssets || unifiedAssets.length === 0) return [];
    
    // Map unified assets to display format
    // unifiedAssets now include chain info directly from the balance source
    return unifiedAssets
      .filter(asset => asset.amount > 0)
      .map(asset => {
        const priceData = prices?.find(p => p.symbol.toUpperCase() === asset.symbol.toUpperCase());
        const change24h = priceData?.change24h || 0;
        
        return {
          symbol: asset.symbol,
          name: asset.name,
          balance: asset.balance,
          decimals: asset.decimals,
          chain: asset.chain, // Use chain directly from unified asset
          isNative: asset.isNative,
          contractAddress: asset.contractAddress,
          numericBalance: asset.amount,
          price: asset.price,
          usdValue: asset.valueUsd,
          change24h,
        } as TokenWithValue;
      })
      .sort((a, b) => b.usdValue - a.usdValue);
  }, [unifiedAssets, prices]);

  const isLoading = isLoadingBalance || isLoadingPrices;

  if (!isConnected || (!addresses.evm && !addresses.solana && !addresses.tron)) {
    return null;
  }

  if (isLoading && tokensWithValue.length === 0) {
    return (
      <div className={cn("px-4", className)}>
        <div className="space-y-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between py-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="w-20 h-4 bg-muted rounded" />
                  <div className="w-16 h-3 bg-muted rounded" />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <div className="w-14 h-4 bg-muted rounded ml-auto" />
                <div className="w-10 h-3 bg-muted rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tokensWithValue.length === 0) {
    return (
      <div className={cn("px-4 py-8 text-center", className)}>
        <p className="text-sm text-muted-foreground">
          No tokens found
        </p>
      </div>
    );
  }

  const handleAssetClick = (token: TokenWithValue) => {
    setSelectedAsset(token);
    setShowAssetDetail(true);
  };

  // Get address for selected chain
  const getAddressForChain = (chain: Chain): string | null => {
    if (chain === 'solana') return addresses.solana;
    if (chain === 'tron') return addresses.tron;
    return addresses.evm;
  };

  return (
    <>
      <div className={cn("px-4", className)}>
        <div className="divide-y divide-border/50">
          {tokensWithValue.map((token, index) => {
            const formattedBalance = token.numericBalance.toLocaleString(undefined, { 
              minimumFractionDigits: 0, 
              maximumFractionDigits: 6 
            });
            const isPositive = token.change24h >= 0;
            const assetLogoUrl = getCryptoLogoUrl(token.symbol);
            const networkLogoUrl = getNetworkLogoUrl(token.chain);
            
            return (
              <button
                key={`${token.chain}-${token.symbol}-${token.contractAddress || 'native'}-${index}`}
                className="w-full flex items-center justify-between py-4 hover:bg-muted/30 transition-colors rounded-lg -mx-2 px-2"
                onClick={() => handleAssetClick(token)}
              >
                <div className="flex items-center gap-3">
                  {/* Token icon with network badge */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary">
                      <img 
                        src={assetLogoUrl}
                        alt={token.symbol}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden w-full h-full">
                        <FallbackIcon symbol={token.symbol} />
                      </div>
                    </div>
                    {/* Network Badge */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background overflow-hidden bg-secondary">
                      <img 
                        src={networkLogoUrl}
                        alt={token.chain}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                  
                  <div className="text-left">
                    <p className="font-medium">{token.name || token.symbol}</p>
                    <p className="text-sm text-muted-foreground">
                      {formattedBalance} {token.symbol}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-medium">
                    ${token.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className={cn(
                    "text-sm",
                    isPositive ? "text-primary" : "text-destructive"
                  )}>
                    {isPositive ? "+" : ""}{token.change24h !== 0 ? `$${Math.abs(token.usdValue * token.change24h / 100).toFixed(2)}` : "$0.00"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Asset Detail Sheet */}
      <AssetDetailSheet
        open={showAssetDetail}
        onOpenChange={setShowAssetDetail}
        asset={selectedAsset}
        address={selectedAsset ? getAddressForChain(selectedAsset.chain) : null}
      />
    </>
  );
};
