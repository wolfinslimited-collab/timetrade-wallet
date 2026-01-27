import { useState, useEffect } from "react";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { formatBalance, getChainInfo, Chain, useWalletBalance } from "@/hooks/useBlockchain";
import { getPriceForSymbol } from "@/hooks/useCryptoPrices";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Network logos as SVG components
const EthereumLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <path d="M16 0L6.5 16.5L16 22.5L25.5 16.5L16 0Z" opacity="0.6" />
    <path d="M6.5 16.5L16 32L25.5 16.5L16 22.5L6.5 16.5Z" />
  </svg>
);

const SolanaLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <path d="M7.5 21.5c.2-.2.4-.3.7-.3h18.4c.4 0 .6.5.3.8l-3.7 3.7c-.2.2-.4.3-.7.3H4.1c-.4 0-.6-.5-.3-.8l3.7-3.7z" />
    <path d="M7.5 6.3c.2-.2.4-.3.7-.3h18.4c.4 0 .6.5.3.8l-3.7 3.7c-.2.2-.4.3-.7.3H4.1c-.4 0-.6-.5-.3-.8l3.7-3.7z" />
    <path d="M22.5 13.8c-.2-.2-.4-.3-.7-.3H3.4c-.4 0-.6.5-.3.8l3.7 3.7c.2.2.4.3.7.3h18.4c.4 0 .6-.5.3-.8l-3.7-3.7z" />
  </svg>
);

const PolygonLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <path d="M21.6 13.4c-.6-.3-1.3-.3-1.8 0l-4.2 2.4-2.8 1.6-4.2 2.4c-.6.3-1.3.3-1.8 0l-3.3-1.9c-.6-.3-.9-.9-.9-1.5v-3.7c0-.6.3-1.2.9-1.5l3.2-1.8c.6-.3 1.3-.3 1.8 0l3.2 1.8c.6.3.9.9.9 1.5v2.4l2.8-1.6v-2.4c0-.6-.3-1.2-.9-1.5l-6-3.4c-.6-.3-1.3-.3-1.8 0l-6.1 3.5c-.6.3-.9.9-.9 1.5v6.9c0 .6.3 1.2.9 1.5l6 3.4c.6.3 1.3.3 1.8 0l4.2-2.4 2.8-1.6 4.2-2.4c.6-.3 1.3-.3 1.8 0l3.2 1.8c.6.3.9.9.9 1.5v3.7c0 .6-.3 1.2-.9 1.5l-3.2 1.9c-.6.3-1.3.3-1.8 0l-3.2-1.8c-.6-.3-.9-.9-.9-1.5v-2.4l-2.8 1.6v2.4c0 .6.3 1.2.9 1.5l6 3.4c.6.3 1.3.3 1.8 0l6-3.4c.6-.3.9-.9.9-1.5v-6.9c0-.6-.3-1.2-.9-1.5l-6.1-3.4z" />
  </svg>
);

const TronLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <path d="M16 2L3 9v14l13 7 13-7V9L16 2zm0 3.5l9.5 5.2v10.6L16 26.5l-9.5-5.2V10.7L16 5.5z" />
    <path d="M16 8v16l7-4V12l-7-4z" opacity="0.6" />
  </svg>
);

const USDCLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <circle cx="16" cy="16" r="14" fill="#2775CA" />
    <path d="M16 6a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z" fill="white" />
    <path d="M17.5 13.5c0-1.1-.9-1.5-2-1.7v-1.3h-1v1.2c-.3 0-.5 0-.8.1v-1.3h-1v1.3c-.3 0-.5.1-.8.1H10v1.1h.8c.4 0 .6.2.6.5v4.5c0 .3-.1.4-.4.4H10v1.1l1.7.1c.3 0 .5.1.8.1v1.3h1v-1.2c.3 0 .5 0 .8-.1v1.3h1v-1.3c1.5-.2 2.5-.7 2.5-2 0-1-.6-1.5-1.5-1.8.6-.3 1.2-.8 1.2-1.5zm-2.2 3.5c0 .9-1.3 1-2 1v-2c.7 0 2 .1 2 1zm-.4-3c0 .8-1 .9-1.6.9v-1.8c.6 0 1.6.1 1.6.9z" fill="white" />
  </svg>
);

const USDTLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <circle cx="16" cy="16" r="14" fill="#26A17B" />
    <path d="M17.9 17.9v-.1c-.1 0-.8-.1-2-.1s-1.8.1-2 .1v.1c-3.5.2-6.1.7-6.1 1.4 0 .7 2.7 1.3 6.1 1.4v4.5h4v-4.5c3.4-.2 6-.7 6-1.4 0-.7-2.6-1.2-6-1.4zm-2 2.3c-3.7 0-6.7-.5-6.7-1.1 0-.5 2.1-.9 5-1v1.6c.5 0 1.1.1 1.7.1.6 0 1.2 0 1.7-.1v-1.6c2.9.1 5 .5 5 1 0 .6-3 1.1-6.7 1.1z" fill="white" />
    <path d="M17.9 14.5v-2.7h4.4V8.5h-12v3.3h4.4v2.7c-3.9.2-6.9.9-6.9 1.8 0 1 3.4 1.8 7.6 1.8s7.6-.8 7.6-1.8c0-.9-3-1.6-6.9-1.8v-.2h1.8z" fill="white" />
  </svg>
);

// Token display configs
const TOKEN_CONFIGS: Record<string, { 
  Logo: React.FC<{ className?: string }>;
  bgColor: string;
  color: string;
}> = {
  ETH: { Logo: EthereumLogo, bgColor: 'bg-slate-800', color: '#627EEA' },
  SOL: { Logo: SolanaLogo, bgColor: 'bg-slate-900', color: '#14F195' },
  POL: { Logo: PolygonLogo, bgColor: 'bg-purple-900', color: '#8247E5' },
  MATIC: { Logo: PolygonLogo, bgColor: 'bg-purple-900', color: '#8247E5' },
  TRX: { Logo: TronLogo, bgColor: 'bg-red-900', color: '#FF0013' },
  USDC: { Logo: USDCLogo, bgColor: 'bg-blue-900', color: '#2775CA' },
  USDT: { Logo: USDTLogo, bgColor: 'bg-emerald-900', color: '#26A17B' },
};

const getTokenConfig = (symbol: string) => {
  const upper = symbol.toUpperCase();
  return TOKEN_CONFIGS[upper] || null;
};

// Fallback icon for unknown tokens
const DefaultTokenIcon = ({ symbol, className }: { symbol: string; className?: string }) => (
  <div className={cn("w-full h-full rounded-full bg-secondary flex items-center justify-center text-sm font-bold", className)}>
    {symbol.slice(0, 2).toUpperCase()}
  </div>
);

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

  return (
    <div className={cn("px-4", className)}>
      <div className="divide-y divide-border/50">
        {tokensWithValue.map((token, index) => {
          const formattedBalance = formatBalance(token.balance, token.decimals);
          const tokenConfig = getTokenConfig(token.symbol);
          const isPositive = token.change24h >= 0;
          
          return (
            <div
              key={`${token.chain}-${token.symbol}-${token.contractAddress || 'native'}-${index}`}
              className="flex items-center justify-between py-4"
            >
              <div className="flex items-center gap-3">
                {/* Token icon */}
                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                  {tokenConfig ? (
                    <div 
                      className={cn("w-full h-full flex items-center justify-center", tokenConfig.bgColor)}
                      style={{ color: tokenConfig.color }}
                    >
                      <tokenConfig.Logo className="w-6 h-6" />
                    </div>
                  ) : (
                    <DefaultTokenIcon symbol={token.symbol} />
                  )}
                </div>
                
                <div>
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
            </div>
          );
        })}
      </div>
    </div>
  );
};
