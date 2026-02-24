import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Check, ChevronLeft, Loader2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { UnifiedAsset } from "@/hooks/useUnifiedPortfolio";
import { getNetwork } from "@/config/networks";
import { Chain } from "@/hooks/useBlockchain";

interface DexToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  isVerified?: boolean;
}

interface SwapTokenSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: UnifiedAsset[];
  selectedAsset: UnifiedAsset | null;
  excludeAsset?: UnifiedAsset | null;
  onSelect: (asset: UnifiedAsset) => void;
  title?: string;
  /** If provided, restricts DEX search to this chain */
  chain?: Chain;
}

export const SwapTokenSelector = ({
  open,
  onOpenChange,
  assets,
  selectedAsset,
  excludeAsset,
  onSelect,
  title = "Select Token",
  chain,
}: SwapTokenSelectorProps) => {
  const [search, setSearch] = useState("");
  const [dexTokens, setDexTokens] = useState<DexToken[]>([]);
  const [isSearchingDex, setIsSearchingDex] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Reset search when sheet closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setDexTokens([]);
    }
  }, [open]);

  // Search DEX tokens when user types (debounced)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!search || search.length < 2) {
      setDexTokens([]);
      setIsSearchingDex(false);
      return;
    }

    // Determine active chain from context
    const activeChain = chain || excludeAsset?.chain || selectedAsset?.chain;
    
    // Only search Jupiter for Solana for now
    if (activeChain && activeChain !== "solana") {
      setDexTokens([]);
      return;
    }

    setIsSearchingDex(true);

    searchTimerRef.current = setTimeout(async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase.functions.invoke("swap-quote", {
          body: {
            action: "search-tokens",
            chain: activeChain || "solana",
            query: search,
          },
        });

        if (error) throw error;
        const tokens = data?.tokens || [];

        setDexTokens(
          tokens.map((t: any) => ({
            address: t.address,
            symbol: t.symbol,
            name: t.name,
            decimals: t.decimals,
            logoURI: t.logoURI,
            isVerified: t.isVerified,
          }))
        );
      } catch (err) {
        console.error("[DEX Search] Error:", err);
        setDexTokens([]);
      } finally {
        setIsSearchingDex(false);
      }
    }, 400);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search, chain, excludeAsset?.chain, selectedAsset?.chain]);

  // Filter wallet assets
  const filteredAssets = assets.filter((asset) => {
    if (
      excludeAsset &&
      asset.symbol === excludeAsset.symbol &&
      asset.chain === excludeAsset.chain &&
      asset.contractAddress === excludeAsset.contractAddress
    )
      return false;

    const swappableChains: Chain[] = ["solana", "ethereum", "polygon", "arbitrum", "bsc"];
    if (!swappableChains.includes(asset.chain)) return false;

    if (!search) return true;
    return (
      asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
      asset.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Filter DEX tokens that are NOT already in wallet assets
  const walletAddresses = new Set(
    filteredAssets.map((a) => (a.contractAddress || a.symbol).toLowerCase())
  );
  const extraDexTokens = dexTokens.filter(
    (t) =>
      !walletAddresses.has(t.address.toLowerCase()) &&
      !walletAddresses.has(t.symbol.toLowerCase())
  );

  const getLogoUrl = (symbol: string) =>
    `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;

  const getNetworkName = (chainVal: Chain) => {
    try {
      return getNetwork(chainVal)?.name || chainVal;
    } catch {
      return chainVal;
    }
  };

  const handleSelectDexToken = (token: DexToken) => {
    // Convert DEX token to UnifiedAsset format
    const asset: UnifiedAsset = {
      symbol: token.symbol,
      name: token.name,
      balance: "0",
      decimals: token.decimals,
      amount: 0,
      price: 0,
      valueUsd: 0,
      chain: "solana" as Chain,
      isNative: false,
      contractAddress: token.address,
    };
    onSelect(asset);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[80vh] rounded-t-3xl bg-background border-border p-0"
        hideCloseButton
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-3">
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-full bg-card border border-border"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold flex-1">{title}</h2>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search token name, symbol or address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card border-border rounded-xl h-11"
            />
            {isSearchingDex && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            )}
          </div>
        </div>

        {/* Token list */}
        <div className="px-4 pb-6 space-y-1 overflow-y-auto max-h-[calc(80vh-140px)]">
          {/* Wallet assets section */}
          {filteredAssets.length > 0 && search && extraDexTokens.length > 0 && (
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium px-1 pt-2 pb-1">
              Your Tokens
            </div>
          )}
          {filteredAssets.map((asset, index) => {
            const isSelected =
              selectedAsset?.symbol === asset.symbol &&
              selectedAsset?.chain === asset.chain &&
              selectedAsset?.contractAddress === asset.contractAddress;

            return (
              <motion.button
                key={`${asset.chain}:${asset.symbol}:${asset.contractAddress || "native"}`}
                onClick={() => {
                  onSelect(asset);
                  onOpenChange(false);
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                  isSelected
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-card"
                )}
              >
                <div className="relative">
                  <img
                    src={getLogoUrl(asset.symbol)}
                    alt={asset.symbol}
                    className="w-10 h-10 rounded-full bg-card"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "";
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center">
                    <span className="text-[8px] font-bold text-muted-foreground">
                      {asset.chain === "solana" ? "S" : asset.chain === "ethereum" ? "E" : asset.chain === "polygon" ? "P" : asset.chain === "arbitrum" ? "A" : asset.chain === "bsc" ? "B" : "?"}
                    </span>
                  </div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-sm">{asset.symbol}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {asset.name} • {getNetworkName(asset.chain)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm">
                    {asset.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${asset.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
              </motion.button>
            );
          })}

          {/* DEX tokens section */}
          {extraDexTokens.length > 0 && (
            <>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium px-1 pt-3 pb-1">
                DEX Tokens
              </div>
              {extraDexTokens.map((token, index) => (
                <motion.button
                  key={`dex:${token.address}`}
                  onClick={() => handleSelectDexToken(token)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (filteredAssets.length + index) * 0.02 }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-card"
                >
                  <div className="relative">
                    <img
                      src={token.logoURI || getLogoUrl(token.symbol)}
                      alt={token.symbol}
                      className="w-10 h-10 rounded-full bg-card"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (img.src !== getLogoUrl(token.symbol)) {
                          img.src = getLogoUrl(token.symbol);
                        } else {
                          img.style.display = "none";
                        }
                      }}
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center">
                      <span className="text-[8px] font-bold text-muted-foreground">S</span>
                    </div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm">{token.symbol}</span>
                      {token.isVerified && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {token.name} • Solana
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground truncate max-w-[80px]">
                      {token.address.slice(0, 4)}...{token.address.slice(-4)}
                    </div>
                  </div>
                </motion.button>
              ))}
            </>
          )}

          {/* Empty state */}
          {filteredAssets.length === 0 && extraDexTokens.length === 0 && !isSearchingDex && (
            <div className="text-center text-muted-foreground text-sm py-12">
              {search ? "No tokens found" : "No swappable tokens found"}
            </div>
          )}

          {/* Loading state */}
          {isSearchingDex && filteredAssets.length === 0 && extraDexTokens.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching DEX tokens...
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
