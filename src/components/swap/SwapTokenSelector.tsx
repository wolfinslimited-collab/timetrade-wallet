import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Check, ChevronLeft } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { UnifiedAsset } from "@/hooks/useUnifiedPortfolio";
import { getNetwork } from "@/config/networks";
import { Chain } from "@/hooks/useBlockchain";

interface SwapTokenSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: UnifiedAsset[];
  selectedAsset: UnifiedAsset | null;
  excludeAsset?: UnifiedAsset | null;
  onSelect: (asset: UnifiedAsset) => void;
  title?: string;
}

export const SwapTokenSelector = ({
  open,
  onOpenChange,
  assets,
  selectedAsset,
  excludeAsset,
  onSelect,
  title = "Select Token",
}: SwapTokenSelectorProps) => {
  const [search, setSearch] = useState("");

  // Filter: exclude selected other-side token, search by symbol/name
  const filteredAssets = assets.filter((asset) => {
    // Exclude the opposite side's selected token (same chain + symbol + contract)
    if (
      excludeAsset &&
      asset.symbol === excludeAsset.symbol &&
      asset.chain === excludeAsset.chain &&
      asset.contractAddress === excludeAsset.contractAddress
    )
      return false;

    // Only show assets on swappable chains
    const swappableChains: Chain[] = ["solana", "ethereum", "polygon", "arbitrum", "bsc"];
    if (!swappableChains.includes(asset.chain)) return false;

    if (!search) return true;
    return (
      asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
      asset.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  const getLogoUrl = (symbol: string) =>
    `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;

  const getNetworkName = (chain: Chain) => {
    try {
      return getNetwork(chain)?.name || chain;
    } catch {
      return chain;
    }
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
              placeholder="Search token name or symbol"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card border-border rounded-xl h-11"
            />
          </div>
        </div>

        {/* Token list */}
        <div className="px-4 pb-6 space-y-1 overflow-y-auto max-h-[calc(80vh-140px)]">
          {filteredAssets.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">
              No swappable tokens found
            </div>
          ) : (
            filteredAssets.map((asset, index) => {
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
                  {/* Token logo */}
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
                    {/* Chain badge */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center">
                      <span className="text-[8px] font-bold text-muted-foreground">
                        {asset.chain === "solana"
                          ? "S"
                          : asset.chain === "ethereum"
                          ? "E"
                          : asset.chain === "polygon"
                          ? "P"
                          : asset.chain === "arbitrum"
                          ? "A"
                          : asset.chain === "bsc"
                          ? "B"
                          : "?"}
                      </span>
                    </div>
                  </div>

                  {/* Token info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-sm">{asset.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {asset.name} • {getNetworkName(asset.chain)}
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      {asset.amount.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${asset.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </motion.button>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
