import { useState, useEffect } from "react";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { formatBalance, getChainInfo, Chain, useWalletBalance } from "@/hooks/useBlockchain";
import { getPriceForSymbol } from "@/hooks/useCryptoPrices";
import { Loader2, Coins, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnifiedTokenListProps {
  className?: string;
}

// Token icon mapping for common tokens
const TOKEN_ICONS: Record<string, { icon: string; bgColor: string }> = {
  // Native coins
  ETH: { icon: '⟠', bgColor: 'bg-slate-700' },
  SOL: { icon: '◎', bgColor: 'bg-gradient-to-br from-purple-500 to-blue-500' },
  POL: { icon: '⬡', bgColor: 'bg-purple-600' },
  MATIC: { icon: '⬡', bgColor: 'bg-purple-600' },
  BTC: { icon: '₿', bgColor: 'bg-orange-500' },
  BNB: { icon: '◆', bgColor: 'bg-yellow-500' },
  TRX: { icon: '◈', bgColor: 'bg-red-500' },
  
  // Stablecoins
  USDC: { icon: '$', bgColor: 'bg-blue-500' },
  USDT: { icon: '₮', bgColor: 'bg-emerald-600' },
  DAI: { icon: '◈', bgColor: 'bg-amber-500' },
  BUSD: { icon: '$', bgColor: 'bg-yellow-500' },
  USDD: { icon: '$', bgColor: 'bg-emerald-500' },
  TUSD: { icon: '$', bgColor: 'bg-blue-400' },
  USDJ: { icon: '$', bgColor: 'bg-purple-400' },
  
  // Popular tokens
  LINK: { icon: '⬡', bgColor: 'bg-blue-600' },
  UNI: { icon: '🦄', bgColor: 'bg-pink-500' },
  AAVE: { icon: '👻', bgColor: 'bg-purple-500' },
  SHIB: { icon: '🐕', bgColor: 'bg-orange-400' },
  PEPE: { icon: '🐸', bgColor: 'bg-green-500' },
  WETH: { icon: '⟠', bgColor: 'bg-slate-600' },
  WBTC: { icon: '₿', bgColor: 'bg-orange-600' },
  ARB: { icon: '◇', bgColor: 'bg-blue-400' },
  OP: { icon: '⬟', bgColor: 'bg-red-500' },
  
  // Solana tokens
  RAY: { icon: '☀', bgColor: 'bg-purple-500' },
  SRM: { icon: '⚡', bgColor: 'bg-cyan-500' },
  BONK: { icon: '🐕', bgColor: 'bg-orange-500' },
  JUP: { icon: '🪐', bgColor: 'bg-green-600' },
  WIF: { icon: '🐶', bgColor: 'bg-amber-500' },
  
  // Tron tokens
  SUN: { icon: '☀', bgColor: 'bg-yellow-500' },
  JST: { icon: '⚖', bgColor: 'bg-blue-500' },
  WIN: { icon: '🃏', bgColor: 'bg-purple-500' },
  BTT: { icon: '🔄', bgColor: 'bg-pink-500' },
  WTRX: { icon: '◈', bgColor: 'bg-red-600' },
};

const getTokenIcon = (symbol: string): { icon: string; bgColor: string } => {
  const upperSymbol = symbol.toUpperCase();
  return TOKEN_ICONS[upperSymbol] || { icon: '🪙', bgColor: 'bg-secondary' };
};

// Address format validation is now handled by BlockchainContext - we read stored addresses directly

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

export const UnifiedTokenList = ({ className }: UnifiedTokenListProps) => {
  const { isConnected, prices, isLoadingPrices } = useBlockchainContext();
  const [tick, setTick] = useState(0);
  
  // Use state to track addresses reactively (re-reads on mount and when context changes)
  const [addresses, setAddresses] = useState(() => {
    const storedEvmAddress = localStorage.getItem('timetrade_wallet_address_evm');
    const storedSolanaAddress = localStorage.getItem('timetrade_wallet_address_solana');
    const storedTronAddress = localStorage.getItem('timetrade_wallet_address_tron');
    
    console.log('[UnifiedTokenList] Initial addresses:', { storedEvmAddress, storedSolanaAddress, storedTronAddress });
    
    return {
      evm: storedEvmAddress || null,
      solana: storedSolanaAddress || null,
      tron: storedTronAddress || null,
    };
  });

  // Re-read addresses from localStorage when connection state changes or periodically after mount
  useEffect(() => {
    const readAddresses = () => {
      const storedEvmAddress = localStorage.getItem('timetrade_wallet_address_evm');
      const storedSolanaAddress = localStorage.getItem('timetrade_wallet_address_solana');
      const storedTronAddress = localStorage.getItem('timetrade_wallet_address_tron');
      
      console.log('[UnifiedTokenList] Reading addresses:', { storedEvmAddress, storedSolanaAddress, storedTronAddress });
      
      setAddresses(prev => {
        // Only update if values changed
        if (prev.evm !== storedEvmAddress || prev.solana !== storedSolanaAddress || prev.tron !== storedTronAddress) {
          return {
            evm: storedEvmAddress || null,
            solana: storedSolanaAddress || null,
            tron: storedTronAddress || null,
          };
        }
        return prev;
      });
    };
    
    readAddresses();
    
    // Re-check after a short delay to catch async storage updates from BlockchainContext
    const timer = setTimeout(readAddresses, 1000);
    return () => clearTimeout(timer);
  }, [isConnected, tick]);

  // Poll for address changes (in case BlockchainContext updates them after initial render)
  useEffect(() => {
    const interval = setInterval(() => {
      const storedSolana = localStorage.getItem('timetrade_wallet_address_solana');
      if (storedSolana && !addresses.solana) {
        setTick(t => t + 1);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [addresses.solana]);

  // Fetch balances for all chains in parallel
  const ethBalance = useWalletBalance(addresses.evm, 'ethereum');
  const solBalance = useWalletBalance(addresses.solana, 'solana');
  const polyBalance = useWalletBalance(addresses.evm, 'polygon');
  const tronBalance = useWalletBalance(addresses.tron, 'tron');

  const isLoading = ethBalance.isLoading || solBalance.isLoading || polyBalance.isLoading || tronBalance.isLoading;

  if (!isConnected || (!addresses.evm && !addresses.solana && !addresses.tron)) {
    return null;
  }

  // Combine all tokens from all chains into unified list
  const allTokens: UnifiedToken[] = [];

  // Add Ethereum native + tokens
  if (ethBalance.data && addresses.evm) {
    const chainInfo = getChainInfo('ethereum');
    // Add native ETH
    allTokens.push({
      symbol: ethBalance.data.native.symbol,
      name: chainInfo.name,
      balance: ethBalance.data.native.balance,
      decimals: ethBalance.data.native.decimals,
      chain: 'ethereum',
      isNative: true,
      logo: chainInfo.icon,
    });
    // Add ERC-20 tokens
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

  // Add Solana native + tokens
  if (solBalance.data && addresses.solana) {
    const chainInfo = getChainInfo('solana');
    // Add native SOL
    allTokens.push({
      symbol: solBalance.data.native.symbol,
      name: chainInfo.name,
      balance: solBalance.data.native.balance,
      decimals: solBalance.data.native.decimals,
      chain: 'solana',
      isNative: true,
      logo: chainInfo.icon,
    });
    // Add SPL tokens
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

  // Add Polygon native + tokens
  if (polyBalance.data && addresses.evm) {
    const chainInfo = getChainInfo('polygon');
    // Add native POL/MATIC
    allTokens.push({
      symbol: polyBalance.data.native.symbol,
      name: chainInfo.name,
      balance: polyBalance.data.native.balance,
      decimals: polyBalance.data.native.decimals,
      chain: 'polygon',
      isNative: true,
      logo: chainInfo.icon,
    });
    // Add ERC-20 tokens on Polygon
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

  // Add Tron native + tokens
  if (tronBalance.data && addresses.tron) {
    const chainInfo = getChainInfo('tron');
    // Add native TRX
    allTokens.push({
      symbol: tronBalance.data.native.symbol,
      name: chainInfo.name,
      balance: tronBalance.data.native.balance,
      decimals: tronBalance.data.native.decimals,
      chain: 'tron',
      isNative: true,
      logo: chainInfo.icon,
    });
    // Add TRC-20 tokens
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

  // Calculate USD values and sort by value (highest first)
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
  }).filter(t => t.numericBalance > 0 && t.symbol.toUpperCase() !== 'UNKNOWN') // Only show tokens with balance, hide unknown/spam tokens
    .sort((a, b) => b.usdValue - a.usdValue); // Sort by USD value

  if (isLoading) {
    return (
      <div className={cn("px-4 py-3", className)}>
        <div className="flex items-center gap-2 mb-3">
          <Coins className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Crypto
          </h3>
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="w-16 h-4 bg-muted rounded" />
                  <div className="w-24 h-3 bg-muted rounded" />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <div className="w-12 h-4 bg-muted rounded ml-auto" />
                <div className="w-16 h-3 bg-muted rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tokensWithValue.length === 0) {
    return (
      <div className={cn("px-4 py-3", className)}>
        <div className="flex items-center gap-2 mb-3">
          <Coins className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Crypto
          </h3>
        </div>
        <div className="bg-muted/30 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">
            No tokens found across any network
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Your tokens will appear here once you have balances
          </p>
        </div>
      </div>
    );
  }

  // Network badge colors
  const getNetworkBadgeStyle = (chain: Chain) => {
    switch (chain) {
      case 'ethereum':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'solana':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'polygon':
        return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
      case 'tron':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className={cn("px-4 py-3", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Crypto
          </h3>
          {isLoadingPrices && (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {tokensWithValue.length} asset{tokensWithValue.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {tokensWithValue.map((token, index) => {
          const chainInfo = getChainInfo(token.chain);
          const formattedBalance = formatBalance(token.balance, token.decimals);
          
          return (
            <div
              key={`${token.chain}-${token.symbol}-${token.contractAddress || 'native'}-${index}`}
              className="flex items-center justify-between p-3 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
            >
            <div className="flex items-center gap-3">
              {/* Token icon with proper styling */}
              {(() => {
                const tokenStyle = getTokenIcon(token.symbol);
                return (
                  <div 
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-lg",
                      tokenStyle.bgColor
                    )}
                  >
                    {tokenStyle.icon}
                  </div>
                );
              })()}
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{token.symbol}</span>
                    {/* Network Badge */}
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border font-medium",
                      getNetworkBadgeStyle(token.chain)
                    )}>
                      {chainInfo.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      ${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {token.change24h !== 0 && (
                      <span className={cn(
                        "text-xs flex items-center gap-0.5",
                        token.change24h >= 0 ? "text-primary" : "text-destructive"
                      )}>
                        {token.change24h >= 0 ? (
                          <TrendingUp className="w-2.5 h-2.5" />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5" />
                        )}
                        {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-mono font-medium">{formattedBalance}</p>
                <p className="text-xs text-muted-foreground">
                  ${token.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
