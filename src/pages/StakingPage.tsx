import { useState, useMemo } from "react";
import { ArrowLeft, Coins, Clock, TrendingUp, Wallet, Plus, Minus, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { Chain } from "@/hooks/useBlockchain";
import { UnifiedAsset } from "@/hooks/useUnifiedPortfolio";

interface StakingPageProps {
  onBack: () => void;
}

// 15% monthly rate (not annual)
const MONTHLY_RATE = 15;

const STAKING_OPTIONS = [
  { duration: 30, label: "30 Days", rate: MONTHLY_RATE },
  { duration: 90, label: "90 Days", rate: MONTHLY_RATE },
  { duration: 180, label: "180 Days", rate: MONTHLY_RATE },
  { duration: 365, label: "1 Year", rate: MONTHLY_RATE },
];

// Stablecoin metadata
const STABLECOIN_META: Record<string, { name: string; chains: string[] }> = {
  USDT: { name: "Tether USD", chains: ["ethereum", "polygon", "tron"] },
  USDC: { name: "USD Coin", chains: ["ethereum", "polygon", "solana"] },
  DAI: { name: "Dai Stablecoin", chains: ["ethereum", "polygon"] },
};

interface StablecoinEntry {
  symbol: string;
  name: string;
  chains: string[];
  balance: number;
  valueUsd: number;
  primaryChain: Chain;
  contractAddress?: string;
  decimals: number;
  isNative: boolean;
}

function formatTokenAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K`;
  if (amount >= 1) return amount.toFixed(2);
  return amount.toFixed(6);
}

const TokenLogo = ({ symbol, size = "md" }: { symbol: string; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const primarySrc = `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;
  const backupSrc = `https://cdn.jsdelivr.net/gh/ErikThiart/cryptocurrency-icons@0.18.1/128/color/${symbol.toLowerCase()}.png`;
  const finalFallbackSrc = `https://ui-avatars.com/api/?name=${symbol}&background=1a1a2e&color=fff&bold=true&size=128`;

  return (
    <img
      src={primarySrc}
      alt={symbol}
      className={cn(sizeClasses[size], "rounded-full object-cover")}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={(e) => {
        const img = e.currentTarget;
        const step = Number(img.dataset.fallbackStep || "0");

        if (step === 0) {
          img.dataset.fallbackStep = "1";
          img.src = backupSrc;
          return;
        }

        img.dataset.fallbackStep = "2";
        img.src = finalFallbackSrc;
      }}
    />
  );
};

export const StakingPage = ({ onBack }: StakingPageProps) => {
  const [showTokenSheet, setShowTokenSheet] = useState(false);
  const [showStakeSheet, setShowStakeSheet] = useState(false);
  const [selectedToken, setSelectedToken] = useState<StablecoinEntry | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(STAKING_OPTIONS[0]);
  const [stakeAmount, setStakeAmount] = useState("");
  const { toast } = useToast();

  // Get real portfolio data from blockchain context
  const { unifiedAssets, isLoadingBalance } = useBlockchainContext();

  // Build stablecoin list from real wallet data
  const stablecoinList: StablecoinEntry[] = useMemo(() => {
    const stableSymbols = Object.keys(STABLECOIN_META);
    
    const aggregated: Record<string, { 
      balance: number; 
      valueUsd: number; 
      chains: Set<string>;
      primaryAsset: UnifiedAsset | null;
    }> = {};
    
    for (const sym of stableSymbols) {
      aggregated[sym] = { balance: 0, valueUsd: 0, chains: new Set(), primaryAsset: null };
    }

    if (unifiedAssets) {
      for (const asset of unifiedAssets) {
        const sym = asset.symbol.toUpperCase();
        if (stableSymbols.includes(sym)) {
          aggregated[sym].balance += asset.amount;
          aggregated[sym].valueUsd += asset.valueUsd;
          aggregated[sym].chains.add(asset.chain);
          if (!aggregated[sym].primaryAsset || asset.amount > aggregated[sym].primaryAsset.amount) {
            aggregated[sym].primaryAsset = asset;
          }
        }
      }
    }

    return stableSymbols
      .map((sym) => {
        const agg = aggregated[sym];
        const primary = agg.primaryAsset;
        return {
          symbol: sym,
          name: STABLECOIN_META[sym].name,
          chains: agg.chains.size ? Array.from(agg.chains) : STABLECOIN_META[sym].chains,
          balance: agg.balance,
          valueUsd: agg.valueUsd,
          primaryChain: (primary?.chain || 'ethereum') as Chain,
          contractAddress: primary?.contractAddress,
          decimals: primary?.decimals ?? 6,
          isNative: primary?.isNative ?? false,
        };
      })
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [unifiedAssets]);

  const availableStablecoinList = useMemo(() => {
    return stablecoinList.filter((t) => Number.isFinite(t.balance) && t.balance > 0);
  }, [stablecoinList]);

  const handleSelectToken = (token: StablecoinEntry) => {
    setStakeAmount("");
    setSelectedDuration(STAKING_OPTIONS[0]);
    setSelectedToken(token);
    setShowTokenSheet(false);
    setShowStakeSheet(true);
  };

  const handleMaxAmount = () => {
    if (selectedToken && selectedToken.balance > 0) {
      setStakeAmount(selectedToken.balance.toString());
    }
  };

  const parsedAmount = parseFloat(stakeAmount) || 0;
  const maxBalance = selectedToken?.balance || 0;
  const isAmountValid = parsedAmount > 0 && parsedAmount <= maxBalance;
  const isOverBalance = parsedAmount > maxBalance;

  const handleStake = () => {
    toast({ 
      title: "Staking Unavailable", 
      description: "Backend has been removed. Staking functionality is disabled.",
      variant: "destructive" 
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="flex flex-col max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Staking</h1>
            <p className="text-xs text-muted-foreground">Earn 15% monthly on stablecoins</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-card/50 border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Wallet className="w-4 h-4" />
              <span className="text-xs font-medium">Total Staked</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">{formatCurrency(0)}</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Earnings</span>
            </div>
            <p className="text-2xl font-bold tracking-tight text-primary">+{formatCurrency(0)}</p>
          </Card>
        </div>

        {/* APY Card */}
        <Card className="p-5 bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border-primary/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Fixed Monthly Yield</p>
              <p className="text-4xl font-bold text-primary mt-1">15% <span className="text-lg font-medium">/month</span></p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Coins className="w-7 h-7 text-primary" />
            </div>
          </div>
        </Card>

        {/* Notice */}
        <Card className="p-4 bg-destructive/10 border-destructive/20">
          <p className="text-sm text-destructive font-medium">⚠️ Staking Disabled</p>
          <p className="text-xs text-muted-foreground mt-1">
            Backend has been removed. Staking functionality is currently unavailable.
          </p>
        </Card>

        {/* Supported Stablecoins */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Your Stablecoins</h2>
          {isLoadingBalance ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading balances...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {availableStablecoinList.length === 0 ? (
                <Card className="p-6 text-center bg-card/30 border-border/50">
                  <p className="font-medium text-muted-foreground">No stablecoins found</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    USDT/USDC/DAI with a non-zero balance will appear here.
                  </p>
                </Card>
              ) : (
                availableStablecoinList.map((token) => (
                  <Card 
                    key={token.symbol}
                    className="p-4 bg-card/50 border-border/50 hover:bg-card/80 transition-colors cursor-pointer"
                    onClick={() => handleSelectToken(token)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TokenLogo symbol={token.symbol} size="md" />
                        <div>
                          <p className="font-semibold">{token.symbol}</p>
                          <p className="text-xs text-muted-foreground">{token.name}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-semibold">{formatTokenAmount(token.balance)}</span>
                        <span className="text-xs text-primary font-medium">15% /month</span>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Stake Button - Disabled */}
        <Button 
          className="w-full h-12 text-base font-semibold rounded-xl"
          onClick={() => setShowTokenSheet(true)}
          disabled
        >
          <Plus className="w-5 h-5 mr-2" />
          Staking Unavailable
        </Button>

        {/* No Active Stakes */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Active Stakes</h2>
          <Card className="p-8 text-center bg-card/30 border-border/50">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
              <Coins className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="font-medium text-muted-foreground">No active stakes</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Backend removed - staking disabled</p>
          </Card>
        </div>
      </div>

      {/* Token Selection Sheet */}
      <Sheet open={showTokenSheet} onOpenChange={setShowTokenSheet}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Select Stablecoin</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 pb-6">
            {availableStablecoinList.map((token) => (
              <button
                key={token.symbol}
                onClick={() => handleSelectToken(token)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-card hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <TokenLogo symbol={token.symbol} />
                  <div className="text-left">
                    <p className="font-semibold">{token.symbol}</p>
                    <p className="text-xs text-muted-foreground">{token.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatTokenAmount(token.balance)}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Stake Amount Sheet */}
      <Sheet open={showStakeSheet} onOpenChange={setShowStakeSheet}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Stake {selectedToken?.symbol}</SheetTitle>
          </SheetHeader>
          
          {selectedToken && (
            <div className="space-y-6 pb-6">
              {/* Amount Input */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Amount</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    className={cn(
                      "h-14 text-xl pr-20 rounded-xl",
                      isOverBalance && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <button
                    onClick={handleMaxAmount}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    MAX
                  </button>
                </div>
                <div className="flex justify-between text-xs mt-2 px-1">
                  <span className="text-muted-foreground">
                    Balance: {formatTokenAmount(selectedToken.balance)} {selectedToken.symbol}
                  </span>
                  {isOverBalance && (
                    <span className="text-destructive">Insufficient balance</span>
                  )}
                </div>
              </div>

              {/* Duration Selection */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Lock Period</label>
                <div className="grid grid-cols-2 gap-2">
                  {STAKING_OPTIONS.map((option) => (
                    <button
                      key={option.duration}
                      onClick={() => setSelectedDuration(option)}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all text-left",
                        selectedDuration.duration === option.duration
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <p className="font-semibold">{option.label}</p>
                      <p className="text-xs text-primary font-medium">{option.rate}% /month</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stake Button */}
              <Button
                className="w-full h-14 text-lg font-semibold rounded-xl"
                disabled={true}
                onClick={handleStake}
              >
                Staking Disabled
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
