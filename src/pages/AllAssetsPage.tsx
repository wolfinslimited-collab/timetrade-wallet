import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, SlidersHorizontal, Check } from "lucide-react";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { getNetworkLogoUrl, NETWORKS } from "@/config/networks";
import { Chain } from "@/hooks/useBlockchain";
import { BottomNav } from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { getChainInfo } from "@/hooks/useBlockchain";

const getCryptoLogoUrl = (symbol: string) =>
  `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;

const FallbackIcon = ({ symbol }: { symbol: string }) => (
  <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">
    {symbol.slice(0, 2).toUpperCase()}
  </div>
);

// Network display names from config
const NETWORK_NAMES: Record<string, string> = Object.fromEntries(
  NETWORKS.map((n) => [n.id, n.name])
);

export const AllAssetsPage = () => {
  const navigate = useNavigate();
  const { unifiedAssets, prices, isLoadingBalance, isLoadingPrices } = useBlockchainContext();
  const [showFilter, setShowFilter] = useState(false);
  const [selectedNetworks, setSelectedNetworks] = useState<Set<string>>(new Set());

  // All chains that actually have balances
  const availableChains = useMemo(() => {
    const chains = new Set<string>();
    (unifiedAssets || []).forEach((a) => chains.add(a.chain));
    return Array.from(chains);
  }, [unifiedAssets]);

  const toggleNetwork = (chain: string) => {
    setSelectedNetworks((prev) => {
      const next = new Set(prev);
      if (next.has(chain)) next.delete(chain);
      else next.add(chain);
      return next;
    });
  };

  const clearFilter = () => setSelectedNetworks(new Set());

  const tokensWithValue = useMemo(() => {
    if (!unifiedAssets || unifiedAssets.length === 0) return [];
    let filtered = unifiedAssets.filter((a) => a.amount > 0);
    if (selectedNetworks.size > 0) {
      filtered = filtered.filter((a) => selectedNetworks.has(a.chain));
    }
    return filtered
      .map((asset) => {
        const priceData = prices?.find(
          (p) => p.symbol.toUpperCase() === asset.symbol.toUpperCase()
        );
        return {
          ...asset,
          change24h: priceData?.change24h || 0,
        };
      })
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [unifiedAssets, prices, selectedNetworks]);

  const isLoading = isLoadingBalance || isLoadingPrices;
  const hasActiveFilter = selectedNetworks.size > 0;

  const handleAssetClick = (asset: typeof tokensWithValue[0]) => {
    const params = new URLSearchParams({ symbol: asset.symbol, chain: asset.chain });
    if (asset.contractAddress) params.set("contract", asset.contractAddress);
    navigate(`/asset?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl border-b border-border/20">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">All Assets</h1>
          </div>

          {/* Filter button */}
          <button
            onClick={() => setShowFilter((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
              hasActiveFilter
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {hasActiveFilter ? `${selectedNetworks.size} Network${selectedNetworks.size > 1 ? "s" : ""}` : "Filter"}
          </button>
        </div>

        {/* Network filter dropdown */}
        {showFilter && (
          <div className="px-4 pb-3 border-t border-border/20 pt-3">
            <div className="flex flex-wrap gap-2">
              {availableChains.map((chain) => {
                const isActive = selectedNetworks.has(chain);
                return (
                  <button
                    key={chain}
                    onClick={() => toggleNetwork(chain)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <img
                      src={getNetworkLogoUrl(chain as Chain)}
                      alt={chain}
                      className="w-3.5 h-3.5 object-contain rounded-full"
                    />
                    {NETWORK_NAMES[chain] || chain}
                    {isActive && <Check className="w-3 h-3 ml-0.5" />}
                  </button>
                );
              })}
              {hasActiveFilter && (
                <button
                  onClick={clearFilter}
                  className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Token List */}
      <div className="flex-1 pt-2">
        {isLoading && tokensWithValue.length === 0 ? (
          <div className="px-4 space-y-1 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="space-y-2">
                    <div className="w-20 h-4 bg-muted rounded" />
                    <div className="w-28 h-3 bg-muted rounded" />
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="w-14 h-4 bg-muted rounded ml-auto" />
                  <div className="w-10 h-3 bg-muted rounded ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : tokensWithValue.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {hasActiveFilter ? "No assets on selected networks" : "No assets found"}
            </p>
          </div>
        ) : (
          <div className="px-4 space-y-1">
            {tokensWithValue.map((token, index) => {
              const formattedBalance = token.amount.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 8,
              });
              const formattedUsd = token.valueUsd.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              const isPositive = token.change24h >= 0;
              const networkName = NETWORK_NAMES[token.chain] || token.chain;

              return (
                <button
                  key={`${token.chain}-${token.symbol}-${token.contractAddress || "native"}-${index}`}
                  className="w-full flex items-center justify-between py-3.5 hover:bg-card/50 transition-colors rounded-xl px-2 -mx-2"
                  onClick={() => handleAssetClick(token)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-card border border-border/30">
                        <img
                          src={getCryptoLogoUrl(token.symbol)}
                          alt={token.symbol}
                          className="w-full h-full object-contain p-1.5"
                          onError={(e) => {
                            const t = e.target as HTMLImageElement;
                            t.style.display = "none";
                            t.nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                        <div className="hidden w-full h-full">
                          <FallbackIcon symbol={token.symbol} />
                        </div>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background overflow-hidden bg-card">
                        <img
                          src={getNetworkLogoUrl(token.chain as Chain)}
                          alt={token.chain}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{token.name || token.symbol}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {token.symbol} • {networkName} • ${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formattedBalance}</p>
                    <p className={cn("text-xs mt-0.5", isPositive ? "text-success" : "text-destructive")}>
                      {isPositive ? "▲" : "▼"} {Math.abs(token.change24h).toFixed(2)}%
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav activeTab="wallet" onTabChange={(tab) => navigate(`/?tab=${tab}`)} />
    </div>
  );
};
