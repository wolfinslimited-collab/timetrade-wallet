import { useState, useEffect } from "react";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { formatBalance, getChainInfo, Chain, useWalletBalance } from "@/hooks/useBlockchain";
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

const isLikelyEvmAddress = (address: string | null | undefined) => {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
};

const isLikelySolanaAddress = (address: string | null | undefined) => {
  if (!address) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
};

const isLikelyTronAddress = (address: string | null | undefined) => {
  if (!address) return false;
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address.trim());
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
  const { isConnected, prices, isLoadingPrices } = useBlockchainContext();
  
  const [addresses, setAddresses] = useState(() => {
    const primaryAddress = localStorage.getItem('timetrade_wallet_address');
    const storedEvmAddress = localStorage.getItem('timetrade_wallet_address_evm');
    const storedSolanaAddress = localStorage.getItem('timetrade_wallet_address_solana');
    const storedTronAddress = localStorage.getItem('timetrade_wallet_address_tron');
    
    return {
      evm: storedEvmAddress || (isLikelyEvmAddress(primaryAddress) ? primaryAddress!.trim() : null),
      solana: storedSolanaAddress || (isLikelySolanaAddress(primaryAddress) ? primaryAddress!.trim() : null),
      tron: storedTronAddress || (isLikelyTronAddress(primaryAddress) ? primaryAddress!.trim() : null),
    };
  });

  useEffect(() => {
    const readAddresses = () => {
      const primaryAddress = localStorage.getItem('timetrade_wallet_address');
      const storedEvmAddress = localStorage.getItem('timetrade_wallet_address_evm');
      const storedSolanaAddress = localStorage.getItem('timetrade_wallet_address_solana');
      const storedTronAddress = localStorage.getItem('timetrade_wallet_address_tron');
      
      setAddresses({
        evm: storedEvmAddress || (isLikelyEvmAddress(primaryAddress) ? primaryAddress!.trim() : null),
        solana: storedSolanaAddress || (isLikelySolanaAddress(primaryAddress) ? primaryAddress!.trim() : null),
        tron: storedTronAddress || (isLikelyTronAddress(primaryAddress) ? primaryAddress!.trim() : null),
      });
    };
    
    readAddresses();
    const interval = setInterval(readAddresses, 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const ethBalance = useWalletBalance(addresses.evm, 'ethereum');
  const solBalance = useWalletBalance(addresses.solana, 'solana');
  const polyBalance = useWalletBalance(addresses.evm, 'polygon');
  const tronBalance = useWalletBalance(addresses.tron, 'tron');

  const isLoading = ethBalance.isLoading || solBalance.isLoading || polyBalance.isLoading || tronBalance.isLoading;

  if (!isConnected || (!addresses.evm && !addresses.solana && !addresses.tron)) {
    return null;
  }

  const allTokens: UnifiedToken[] = [];

  // Add Ethereum
  if (ethBalance.data && addresses.evm) {
    const chainInfo = getChainInfo('ethereum');
    allTokens.push({
      symbol: ethBalance.data.native.symbol,
      name: chainInfo.name,
      balance: ethBalance.data.native.balance,
      decimals: ethBalance.data.native.decimals,
      chain: 'ethereum',
      isNative: true,
      logo: chainInfo.icon,
    });
    for (const token of ethBalance.data.tokens || []) {
      allTokens.push({
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        decimals: token.decimals,
        chain: 'ethereum',
        isNative: false,
        contractAddress: token.contractAddress,
        logo: token.logo,
      });
    }
  }

  // Add Solana
  if (solBalance.data && addresses.solana) {
    const chainInfo = getChainInfo('solana');
    allTokens.push({
      symbol: solBalance.data.native.symbol,
      name: chainInfo.name,
      balance: solBalance.data.native.balance,
      decimals: solBalance.data.native.decimals,
      chain: 'solana',
      isNative: true,
      logo: chainInfo.icon,
    });
    for (const token of solBalance.data.tokens || []) {
      allTokens.push({
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        decimals: token.decimals,
        chain: 'solana',
        isNative: false,
        contractAddress: token.contractAddress,
        logo: token.logo,
      });
    }
  }

  // Add Polygon
  if (polyBalance.data && addresses.evm) {
    const chainInfo = getChainInfo('polygon');
    allTokens.push({
      symbol: polyBalance.data.native.symbol,
      name: chainInfo.name,
      balance: polyBalance.data.native.balance,
      decimals: polyBalance.data.native.decimals,
      chain: 'polygon',
      isNative: true,
      logo: chainInfo.icon,
    });
    for (const token of polyBalance.data.tokens || []) {
      allTokens.push({
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        decimals: token.decimals,
        chain: 'polygon',
        isNative: false,
        contractAddress: token.contractAddress,
        logo: token.logo,
      });
    }
  }

  // Add Tron
  if (tronBalance.data && addresses.tron) {
    const chainInfo = getChainInfo('tron');
    allTokens.push({
      symbol: tronBalance.data.native.symbol,
      name: chainInfo.name,
      balance: tronBalance.data.native.balance,
      decimals: tronBalance.data.native.decimals,
      chain: 'tron',
      isNative: true,
      logo: chainInfo.icon,
    });
    for (const token of tronBalance.data.tokens || []) {
      allTokens.push({
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        decimals: token.decimals,
        chain: 'tron',
        isNative: false,
        contractAddress: token.contractAddress,
        logo: token.logo,
      });
    }
  }

  const tokensWithValue = allTokens.map(token => {
    const numericBalance = parseFloat(token.balance) / Math.pow(10, token.decimals);
    const price = getPriceForSymbol(prices as any, token.symbol);
    const usdValue = numericBalance * price;
    const priceData = prices?.find(p => p.symbol.toUpperCase() === token.symbol.toUpperCase());
    const change24h = priceData?.change24h || 0;
    
    return {
      ...token,
      numericBalance,
      price,
      usdValue,
      change24h,
    };
  }).filter(t => t.numericBalance > 0 && t.symbol.toUpperCase() !== 'UNKNOWN')
    .sort((a, b) => b.usdValue - a.usdValue);

  if (isLoading) {
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

  const [selectedAsset, setSelectedAsset] = useState<TokenWithValue | null>(null);
  const [showAssetDetail, setShowAssetDetail] = useState(false);

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
            const formattedBalance = formatBalance(token.balance, token.decimals);
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
