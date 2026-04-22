import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, SlidersHorizontal, Check, Wallet, ArrowDownLeft, XCircle } from "lucide-react";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { getNetworkLogoUrl, NETWORKS } from "@/config/networks";
import { Chain } from "@/hooks/useBlockchain";
import { BottomNav } from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { getChainInfo } from "@/hooks/useBlockchain";

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
};


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
    <div className="h-full w-full flex flex-col relative overflow-hidden">
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

        {/* Network filter dropdown — animated */}
        <AnimatePresence>
          {showFilter && (
            <motion.div
              key="filter-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1, transition: { duration: 0.22, ease: "easeOut" } }}
              exit={{ height: 0, opacity: 0, transition: { duration: 0.18, ease: "easeIn" } }}
              className="overflow-hidden border-t border-border/20"
            >
              <div className="px-4 pb-3 pt-3">
                <div className="flex flex-wrap gap-2">
                  {availableChains.map((chain) => {
                    const isActive = selectedNetworks.has(chain);
                    return (
                      <motion.button
                        key={chain}
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileTap={{ scale: 0.93 }}
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
                      </motion.button>
                    );
                  })}
                  {hasActiveFilter && (
                    <motion.button
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={clearFilter}
                      className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      Clear
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Token List */}
      <div className="flex-1 min-h-0 pt-2 pb-nav-safe overflow-y-auto overflow-x-hidden">
        {isLoading && tokensWithValue.length === 0 ? (
          <div className="px-4 space-y-1 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: i * 0.08 } }}
                className="flex items-center justify-between py-4 animate-pulse"
              >
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
              </motion.div>
            ))}
          </div>
        ) : tokensWithValue.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-20 flex flex-col items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-muted-foreground/50" />
            </div>
            {hasActiveFilter ? (
              <>
                <p className="text-[15px] font-semibold text-foreground mb-1">No assets on selected networks</p>
                <p className="text-[12px] text-muted-foreground mb-5">Try clearing your filter to see all assets</p>
                <button
                  onClick={clearFilter}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full border border-border text-[13px] font-medium text-muted-foreground active:scale-[0.97] hover:bg-secondary"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Clear filter
                </button>
              </>
            ) : (
              <>
                {/* Animated wallet icon */}
                <div className="relative w-20 h-20 mb-4">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--primary) / 0.1)" strokeWidth="1.2" className="animate-[ping_3s_ease-in-out_infinite]" style={{ transformOrigin: 'center', opacity: 0.4 }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg width="40" height="40" viewBox="0 0 56 56" fill="none" className="animate-[pulse_4s_ease-in-out_infinite]">
                      <rect x="6" y="16" width="36" height="28" rx="4" stroke="hsl(var(--primary) / 0.5)" strokeWidth="1.8" fill="hsl(var(--primary) / 0.06)" />
                      <rect x="30" y="26" width="16" height="12" rx="3" stroke="hsl(var(--primary) / 0.4)" strokeWidth="1.5" fill="hsl(var(--primary) / 0.08)" />
                      <circle cx="38" cy="32" r="2.5" fill="hsl(var(--primary) / 0.5)">
                        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite" />
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
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            className="px-4 space-y-1"
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            {tokensWithValue.map((token, index) => {
              const formattedBalance = token.amount.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 8,
              });
              const isPositive = token.change24h >= 0;
              const networkName = NETWORK_NAMES[token.chain] || token.chain;

              return (
                <motion.button
                  key={`${token.chain}-${token.symbol}-${token.contractAddress || "native"}-${index}`}
                  variants={itemVariants}
                  className="w-full flex items-center justify-between py-3.5 hover:bg-card/50 transition-colors rounded-xl px-2 -mx-2"
                  onClick={() => handleAssetClick(token)}
                  whileTap={{ scale: 0.97 }}
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
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>

      <BottomNav activeTab="wallet" onTabChange={(tab) => navigate(`/?tab=${tab}`)} />
    </div>
  );
};
