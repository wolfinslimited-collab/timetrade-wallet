import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { formatBalance, getChainInfo, Chain } from "@/hooks/useBlockchain";
import { getPriceForSymbol } from "@/hooks/useCryptoPrices";
import { cn } from "@/lib/utils";
import { ChevronRight, ArrowDownLeft } from "lucide-react";

const getCryptoLogoUrl = (symbol: string): string => {
  return `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;
};

import { getNetworkLogoUrl } from "@/config/networks";

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

const FallbackIcon = ({ symbol }: { symbol: string }) => (
  <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground">
    {symbol.slice(0, 2).toUpperCase()}
  </div>
);

export const UnifiedTokenList = ({ className }: { className?: string }) => {
  const { isConnected, unifiedAssets, prices, isLoadingBalance, isLoadingPrices } = useBlockchainContext();
  const navigate = useNavigate();
  
  const [addresses, setAddresses] = useState(() => ({
    evm: localStorage.getItem('timetrade_wallet_address_evm'),
    solana: localStorage.getItem('timetrade_wallet_address_solana'),
    tron: localStorage.getItem('timetrade_wallet_address_tron'),
  }));

  useEffect(() => {
    const readAddresses = () => {
      setAddresses({
        evm: localStorage.getItem('timetrade_wallet_address_evm'),
        solana: localStorage.getItem('timetrade_wallet_address_solana'),
        tron: localStorage.getItem('timetrade_wallet_address_tron'),
      });
    };
    window.addEventListener('timetrade:account-switched', readAddresses);
    window.addEventListener('timetrade:unlocked', readAddresses);
    return () => {
      window.removeEventListener('timetrade:account-switched', readAddresses);
      window.removeEventListener('timetrade:unlocked', readAddresses);
    };
  }, []);

  const tokensWithValue = useMemo(() => {
    if (!unifiedAssets || unifiedAssets.length === 0) return [];
    return unifiedAssets
      .filter(asset => asset.amount > 0)
      .map(asset => {
        const priceData = prices?.find(p => p.symbol.toUpperCase() === asset.symbol.toUpperCase());
        const change24h = priceData?.change24h || 0;
        return {
          symbol: asset.symbol, name: asset.name, balance: asset.balance,
          decimals: asset.decimals, chain: asset.chain, isNative: asset.isNative,
          contractAddress: asset.contractAddress, numericBalance: asset.amount,
          price: asset.price, usdValue: asset.valueUsd, change24h,
        } as TokenWithValue;
      })
      .sort((a, b) => b.usdValue - a.usdValue);
  }, [unifiedAssets, prices]);

  const isLoading = isLoadingBalance || isLoadingPrices;

  if (!isConnected || (!addresses.evm && !addresses.solana && !addresses.tron)) return null;

  if (isLoading && tokensWithValue.length === 0) {
    return (
      <div className={cn("px-5", className)}>
        <div className="space-y-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between py-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="w-20 h-4 bg-muted rounded-lg" />
                  <div className="w-16 h-3 bg-muted rounded-lg" />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <div className="w-16 h-4 bg-muted rounded-lg ml-auto" />
                <div className="w-10 h-3 bg-muted rounded-lg ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tokensWithValue.length === 0) {
    return (
      <div className={cn("px-5 py-10 flex flex-col items-center justify-center", className)}>
        {/* Animated empty wallet illustration */}
        <div className="relative w-28 h-28 mb-6">
          {/* Outer pulsing ring */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 112 112">
            <circle
              cx="56" cy="56" r="52"
              fill="none"
              stroke="hsl(var(--primary) / 0.1)"
              strokeWidth="1.5"
              className="animate-[ping_3s_ease-in-out_infinite]"
              style={{ transformOrigin: 'center', opacity: 0.4 }}
            />
            <circle
              cx="56" cy="56" r="44"
              fill="none"
              stroke="hsl(var(--primary) / 0.08)"
              strokeWidth="1"
              className="animate-[ping_3s_ease-in-out_1s_infinite]"
              style={{ transformOrigin: 'center', opacity: 0.3 }}
            />
          </svg>
          {/* Central icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="animate-[pulse_4s_ease-in-out_infinite]">
              {/* Wallet body */}
              <rect x="6" y="16" width="36" height="28" rx="4" stroke="hsl(var(--primary) / 0.5)" strokeWidth="1.8" fill="hsl(var(--primary) / 0.06)" />
              {/* Wallet flap */}
              <path d="M6 22C6 19.79 7.79 18 10 18H38" stroke="hsl(var(--primary) / 0.35)" strokeWidth="1.2" strokeLinecap="round" />
              {/* Card slot accent */}
              <rect x="30" y="26" width="16" height="12" rx="3" stroke="hsl(var(--primary) / 0.4)" strokeWidth="1.5" fill="hsl(var(--primary) / 0.08)" />
              {/* Coin dot */}
              <circle cx="38" cy="32" r="2.5" fill="hsl(var(--primary) / 0.5)">
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite" />
              </circle>
              {/* Floating particles */}
              <circle cx="14" cy="10" r="1.5" fill="hsl(var(--primary) / 0.25)">
                <animate attributeName="cy" values="10;6;10" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="44" cy="8" r="1" fill="hsl(var(--primary) / 0.2)">
                <animate attributeName="cy" values="8;4;8" dur="3.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.15;0.4;0.15" dur="3.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="28" cy="6" r="1.2" fill="hsl(var(--primary) / 0.2)">
                <animate attributeName="cy" values="6;2;6" dur="2.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.1;0.35;0.1" dur="2.8s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
        </div>

        <p className="text-[16px] font-semibold text-foreground mb-1.5 tracking-tight">No assets yet</p>
        <p className="text-[13px] text-muted-foreground/70 mb-6 max-w-[240px] text-center leading-relaxed">
          Receive or import crypto to start building your portfolio
        </p>

        <button
          onClick={() => navigate("/receive")}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[13px] font-semibold active:scale-[0.97] transition-colors hover:bg-primary/15"
        >
          <ArrowDownLeft className="w-4 h-4" />
          Receive Crypto
        </button>
      </div>
    );
  }

  const handleAssetClick = (token: TokenWithValue) => {
    const params = new URLSearchParams({
      symbol: token.symbol,
      chain: token.chain,
    });
    if (token.contractAddress) params.set("contract", token.contractAddress);
    navigate(`/asset?${params.toString()}`);
  };

  return (
    <div className={cn("px-3", className)}>
      <div className="space-y-0.5">
        {tokensWithValue.map((token, index) => {
          const formattedBalance = token.numericBalance.toLocaleString(undefined, { 
            minimumFractionDigits: 0, maximumFractionDigits: 6 
          });
          const isPositive = token.change24h >= 0;
          const assetLogoUrl = getCryptoLogoUrl(token.symbol);
          const networkLogoUrl = getNetworkLogoUrl(token.chain);
          
          return (
            <button
              key={`${token.chain}-${token.symbol}-${token.contractAddress || 'native'}-${index}`}
              className="w-full flex items-center justify-between py-3.5 px-2 rounded-2xl transition-transform duration-150 active:scale-[0.98] active:bg-secondary/50 animate-fade-in-up"
              style={{ animationDelay: `${Math.min(index, 8) * 35}ms`, transform: 'translate3d(0,0,0)' }}
              onClick={() => handleAssetClick(token)}
            >
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-muted/50 flex items-center justify-center">
                    <img 
                      src={assetLogoUrl} alt={token.symbol}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden w-full h-full"><FallbackIcon symbol={token.symbol} /></div>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full border-2 border-card overflow-hidden bg-muted/80">
                    <img src={networkLogoUrl} alt={token.chain} className="w-full h-full object-contain" />
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-semibold text-foreground leading-tight">{token.name || token.symbol}</p>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    {formattedBalance} {token.symbol}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-semibold text-foreground leading-tight">
                  ${token.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={cn("text-[12px] font-medium mt-1", isPositive ? "text-success" : "text-destructive")}>
                  {isPositive ? "+" : ""}{token.change24h.toFixed(2)}%
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
