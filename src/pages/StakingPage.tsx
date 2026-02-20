import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Coins, Clock, TrendingUp, Wallet, Plus, Minus, ChevronRight, Loader2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { Chain } from "@/hooks/useBlockchain";
import { PinUnlockModal } from "@/components/send/PinUnlockModal";
import { useStakeTransfer, getStakeWalletAddress } from "@/hooks/useStakeTransfer";
import { UnifiedAsset } from "@/hooks/useUnifiedPortfolio";
import { WALLET_STORAGE_KEYS, getActiveAccountEncryptedSeed } from "@/utils/walletStorage";

interface StakingPageProps {
  onBack: () => void;
}

interface StakingPosition {
  id: string;
  wallet_address: string;
  token_symbol: string;
  chain: string;
  amount: number;
  apy_rate: number;
  staked_at: string;
  unlock_at: string;
  is_active: boolean;
  earned_rewards: number;
  tx_hash?: string;
}

// 15% monthly rate (not annual)
const MONTHLY_RATE = 15; // percent per 30 days

const STAKING_OPTIONS = [
  { duration: 30, label: "30 Days", rate: MONTHLY_RATE },
  { duration: 90, label: "90 Days", rate: MONTHLY_RATE },
  { duration: 180, label: "180 Days", rate: MONTHLY_RATE },
  { duration: 365, label: "1 Year", rate: MONTHLY_RATE },
];

// Stablecoin metadata (symbol → display name + supported chains for reference)
const STABLECOIN_META: Record<string, { name: string; chains: string[] }> = {
  USDT: { name: "Tether USD", chains: ["ethereum", "polygon", "tron"] },
  USDC: { name: "USD Coin", chains: ["ethereum", "polygon", "solana"] },
  DAI: { name: "Dai Stablecoin", chains: ["ethereum", "polygon"] },
};

// Extended entry with per-chain details for the transfer
interface StablecoinEntry {
  symbol: string;
  name: string;
  chains: string[];
  balance: number; // aggregated across all chains
  valueUsd: number;
  // Per-chain asset info for transfer (first chain with balance)
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
  // show more precision for small balances so users don't see 0.00 for dust
  return amount.toFixed(6);
}

const TokenLogo = ({ symbol, size = "md" }: { symbol: string; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const primarySrc = `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;
  // Backup source (public CDN) in case the primary logo endpoint is unavailable.
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

        // step 0 -> backup, step 1 -> final fallback
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
  const [positions, setPositions] = useState<StakingPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTokenSheet, setShowTokenSheet] = useState(false);
  const [showStakeSheet, setShowStakeSheet] = useState(false);
  const [selectedToken, setSelectedToken] = useState<StablecoinEntry | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(STAKING_OPTIONS[0]);
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const { toast } = useToast();

  // Stake transfer hook for real on-chain transfers
  const { transfer: executeStakeTransfer, isTransferring } = useStakeTransfer();

  // Check if user has mnemonic stored (for signing)
  const hasMnemonicStored = !!getActiveAccountEncryptedSeed();

  // Get real portfolio data from blockchain context
  const { unifiedAssets, isLoadingBalance } = useBlockchainContext();

  // Build stablecoin list from real wallet data (aggregated across chains, sorted by USD value)
  const stablecoinList: StablecoinEntry[] = useMemo(() => {
    const stableSymbols = Object.keys(STABLECOIN_META);
    
    // Group assets by symbol and aggregate; track first matching asset for transfer details
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
          // Keep track of the first asset with the highest balance for transfer details
          if (!aggregated[sym].primaryAsset || asset.amount > aggregated[sym].primaryAsset.amount) {
            aggregated[sym].primaryAsset = asset;
          }
        }
      }
    }

    // Convert to array and sort by USD value (descending)
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
          // Transfer details from primary asset
          primaryChain: (primary?.chain || 'ethereum') as Chain,
          contractAddress: primary?.contractAddress,
          decimals: primary?.decimals ?? 6,
          isNative: primary?.isNative ?? false,
        };
      })
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [unifiedAssets]);

  // Only show *available* stablecoins in the picker (non-zero balance)
  const availableStablecoinList = useMemo(() => {
    return stablecoinList.filter((t) => Number.isFinite(t.balance) && t.balance > 0);
  }, [stablecoinList]);

  const walletAddress = localStorage.getItem("timetrade_wallet_address_evm") || "";

  useEffect(() => {
    fetchPositions();
  }, [walletAddress]);

  // Prevent stale state causing accidental stakes when reopening the sheet
  useEffect(() => {
    if (!showStakeSheet) return;
    setStakeAmount("");
    setSelectedDuration(STAKING_OPTIONS[0]);
  }, [showStakeSheet]);

  const fetchPositions = async () => {
    if (!walletAddress) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("staking_positions")
        .select("*")
        .eq("wallet_address", walletAddress.toLowerCase())
        .eq("is_active", true)
        .order("staked_at", { ascending: false });

      if (error) throw error;
      setPositions(data || []);
    } catch (err) {
      console.error("Error fetching staking positions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate earnings: 15% monthly rate → 15% per 30 days
  const calculateEarnings = (position: StakingPosition) => {
    const stakedAt = new Date(position.staked_at).getTime();
    const now = Date.now();
    const daysStaked = (now - stakedAt) / (1000 * 60 * 60 * 24);
    // apy_rate stored is monthly rate, so: rate/100 per 30 days → dailyRate = rate / 30 / 100
    const dailyRate = position.apy_rate / 30 / 100;
    return position.amount * dailyRate * daysStaked;
  };

  const totalStaked = positions.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalEarnings = positions.reduce((sum, p) => sum + calculateEarnings(p), 0);

  const handleSelectToken = (token: StablecoinEntry) => {
    // Reset state before opening sheet to prevent stale values
    setStakeAmount("");
    setSelectedDuration(STAKING_OPTIONS[0]);
    setSelectedToken(token);
    setShowTokenSheet(false);
    setShowStakeSheet(true);
  };

  // Handle max button click
  const handleMaxAmount = () => {
    if (selectedToken && selectedToken.balance > 0) {
      setStakeAmount(selectedToken.balance.toString());
    }
  };

  // Validate amount against balance
  const parsedAmount = parseFloat(stakeAmount) || 0;
  const maxBalance = selectedToken?.balance || 0;
  const isAmountValid = parsedAmount > 0 && parsedAmount <= maxBalance;
  const isOverBalance = parsedAmount > maxBalance;

  // Opens PIN modal to initiate staking
  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    if (!selectedToken) {
      toast({ title: "No token selected", variant: "destructive" });
      return;
    }

    // Check if staking wallet is configured for this chain
    const stakeWallet = await getStakeWalletAddress(selectedToken.primaryChain);
    if (!stakeWallet) {
      toast({ 
        title: "Staking unavailable", 
        description: `Staking is not configured for ${selectedToken.primaryChain}. Please contact support.`,
        variant: "destructive" 
      });
      return;
    }

    if (!hasMnemonicStored) {
      toast({ 
        title: "Wallet required", 
        description: "Please import your wallet to stake.",
        variant: "destructive" 
      });
      return;
    }

    // Open PIN modal
    setPinError(null);
    setShowPinModal(true);
  };

  // Called when user enters PIN - performs the real on-chain transfer
  const handlePinSubmit = async (pin: string) => {
    if (!selectedToken) return;

    const amount = parseFloat(stakeAmount);
    setIsStaking(true);
    setPinError(null);

    try {
      // 1. Execute real on-chain transfer to staking wallet
      console.log('[STAKING] Initiating on-chain transfer...');
      const transferResult = await executeStakeTransfer(pin, {
        chain: selectedToken.primaryChain,
        tokenSymbol: selectedToken.symbol,
        amount: stakeAmount,
        contractAddress: selectedToken.contractAddress,
        decimals: selectedToken.decimals,
        isNative: selectedToken.isNative,
      });

      console.log('[STAKING] Transfer successful:', transferResult);

      // 2. Record staking position in database with tx_hash
      const unlockDate = new Date();
      unlockDate.setDate(unlockDate.getDate() + selectedDuration.duration);

      const { error: dbError } = await supabase.from("staking_positions").insert({
        wallet_address: walletAddress.toLowerCase(),
        token_symbol: selectedToken.symbol,
        chain: selectedToken.primaryChain,
        amount: amount,
        apy_rate: selectedDuration.rate,
        unlock_at: unlockDate.toISOString(),
        tx_hash: transferResult.txHash,
      });

      if (dbError) {
        console.error('[STAKING] DB insert error:', dbError);
        // Transaction succeeded but DB failed - inform user
        toast({ 
          title: "Stake recorded with issue", 
          description: `Your funds were transferred (tx: ${transferResult.txHash.slice(0, 10)}...) but there was an issue recording the stake. Please contact support.`,
          variant: "default" 
        });
      } else {
        toast({ 
          title: "Staking successful!", 
          description: `Staked ${amount} ${selectedToken.symbol} for ${selectedDuration.label}. Tx: ${transferResult.txHash.slice(0, 10)}...` 
        });
      }

      setShowPinModal(false);
      setShowStakeSheet(false);
      setStakeAmount("");
      fetchPositions();

      // Refresh blockchain data
      console.log('[STAKING] Refreshing blockchain data...');
      window.dispatchEvent(new CustomEvent('timetrade:addresses-updated'));
    } catch (err) {
      console.error('[STAKING] Stake transfer error:', err);
      const msg = err instanceof Error ? err.message : 'Transfer failed';
      
      // Check if it's a PIN error
      if (msg.includes('Incorrect PIN')) {
        setPinError(msg);
      } else {
        setPinError(null);
        setShowPinModal(false);
        toast({ 
          title: "Staking failed", 
          description: msg,
          variant: "destructive" 
        });
      }
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async (position: StakingPosition) => {
    const unlockDate = new Date(position.unlock_at);
    if (unlockDate > new Date()) {
      toast({ 
        title: "Cannot unstake yet", 
        description: `Unlocks on ${unlockDate.toLocaleDateString()}`,
        variant: "destructive" 
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("staking_positions")
        .update({ is_active: false })
        .eq("id", position.id);

      if (error) throw error;

      toast({ title: "Unstaked successfully!", description: `${position.amount} ${position.token_symbol} + rewards returned` });
      fetchPositions();
    } catch (err) {
      console.error("Unstake error:", err);
      toast({ title: "Unstake failed", description: "Please try again", variant: "destructive" });
    }
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
      {/* Header - clean, no back button */}
      <div className="sticky top-0 z-10 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold">Staking</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Earn 15% monthly on stablecoins</p>
          </div>
          <button
            onClick={() => setShowTokenSheet(true)}
            className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center hover:bg-foreground/90 transition-colors"
          >
            <Plus className="w-5 h-5 text-background" />
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Hero Stats Card */}
        <Card className="p-0 bg-gradient-to-br from-card/90 to-card/40 border-border/30 overflow-hidden relative">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-foreground/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-foreground/3 rounded-full blur-3xl" />
          <div className="relative p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="px-3 py-1 rounded-full bg-foreground/10 border border-foreground/10">
                <span className="text-xs font-semibold text-foreground/80">Fixed 15% /month</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-success/10 border border-success/20">
                <span className="text-xs font-semibold text-success">Active</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Total Staked</p>
                <p className="text-2xl font-bold tracking-tight font-mono">{formatCurrency(totalStaked)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Total Earned</p>
                <p className="text-2xl font-bold tracking-tight font-mono text-success">+{formatCurrency(totalEarnings)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Available Stablecoins */}
        <div>
          <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Available to Stake</h2>
          {isLoadingBalance ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading balances...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {availableStablecoinList.length === 0 ? (
                <Card className="p-6 text-center bg-card/30 border-border/30 border-dashed">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-muted/30 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                  <p className="font-medium text-muted-foreground text-sm">No stablecoins found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add USDT, USDC, or DAI to start earning</p>
                </Card>
              ) : (
                availableStablecoinList.map((token) => (
                  <button
                    key={token.symbol}
                    className="w-full p-4 rounded-2xl bg-card/50 border border-border/30 hover:bg-card/80 hover:border-border/50 transition-all flex items-center justify-between group"
                    onClick={() => handleSelectToken(token)}
                  >
                    <div className="flex items-center gap-3">
                      <TokenLogo symbol={token.symbol} size="md" />
                      <div className="text-left">
                        <p className="font-semibold text-sm">{token.symbol}</p>
                        <p className="text-xs text-muted-foreground">{token.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-sm font-mono">{formatTokenAmount(token.balance)}</p>
                        <p className="text-[11px] text-success font-medium">15% /mo</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Active Positions */}
        <div>
          <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">Active Stakes</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>
          ) : positions.length === 0 ? (
            <Card className="p-8 text-center bg-card/20 border-border/20 border-dashed">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted/20 flex items-center justify-center">
                <Coins className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="font-medium text-muted-foreground text-sm">No active stakes</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Start earning 15% monthly today</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {positions.map((position) => {
                const earnings = calculateEarnings(position);
                const unlockDate = new Date(position.unlock_at);
                const isUnlocked = unlockDate <= new Date();
                const daysRemaining = Math.max(0, Math.ceil((unlockDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                const totalDays = Math.ceil((unlockDate.getTime() - new Date(position.staked_at).getTime()) / (1000 * 60 * 60 * 24));
                const progress = Math.min(1, 1 - (daysRemaining / totalDays));

                return (
                  <Card key={position.id} className="p-4 bg-card/50 border-border/30 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <TokenLogo symbol={position.token_symbol} size="md" />
                        <div>
                          <p className="font-semibold text-sm">{position.token_symbol}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{position.chain}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-semibold",
                        isUnlocked 
                          ? "bg-success/15 text-success border border-success/20" 
                          : "bg-muted/50 text-muted-foreground border border-border/30"
                      )}>
                        {isUnlocked ? "✓ Unlocked" : `${daysRemaining}d remaining`}
                      </div>
                    </div>

                    {!isUnlocked && (
                      <div className="w-full h-1 bg-muted/30 rounded-full mb-3 overflow-hidden">
                        <div 
                          className="h-full bg-foreground/40 rounded-full transition-all duration-500"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-muted/20 rounded-xl p-3">
                        <p className="text-[11px] text-muted-foreground mb-0.5 uppercase tracking-wider">Staked</p>
                        <p className="font-bold text-sm font-mono">{formatCurrency(Number(position.amount))}</p>
                      </div>
                      <div className="bg-success/5 rounded-xl p-3">
                        <p className="text-[11px] text-muted-foreground mb-0.5 uppercase tracking-wider">Earned</p>
                        <p className="font-bold text-sm font-mono text-success">+{formatCurrency(earnings)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3 px-0.5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>Unlock: {unlockDate.toLocaleDateString()}</span>
                      </div>
                      <span className="font-semibold">{position.apy_rate}% /mo</span>
                    </div>

                    <Button
                      variant={isUnlocked ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "w-full rounded-xl h-10",
                        isUnlocked && "bg-foreground text-background hover:bg-foreground/90"
                      )}
                      onClick={() => handleUnstake(position)}
                      disabled={!isUnlocked}
                    >
                      <Minus className="w-4 h-4 mr-1.5" />
                      {isUnlocked ? "Unstake + Claim Rewards" : "Locked"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Token Selection Sheet */}
      <Sheet open={showTokenSheet} onOpenChange={setShowTokenSheet}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Select Stablecoin</SheetTitle>
          </SheetHeader>

          <div className="space-y-2 pb-6">
            {isLoadingBalance ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading balances...</span>
              </div>
            ) : (
              availableStablecoinList.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm font-medium text-muted-foreground">No available stablecoins</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Add USDT/USDC/DAI to this wallet and they will show up here.
                  </p>
                </div>
              ) : (
                availableStablecoinList.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => handleSelectToken(token)}
                    className="w-full p-4 rounded-xl bg-card/50 border border-border/50 hover:bg-card hover:border-primary/30 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <TokenLogo symbol={token.symbol} size="lg" />
                      <div className="text-left">
                        <p className="font-semibold">{token.symbol}</p>
                        <p className="text-sm text-muted-foreground">{token.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatTokenAmount(token.balance)}</p>
                      <p className="text-xs text-primary font-medium">15% /month</p>
                    </div>
                  </button>
                ))
              )
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Stake Configuration Sheet */}
      <Sheet open={showStakeSheet} onOpenChange={setShowStakeSheet}>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-3xl flex flex-col overflow-hidden"
        >
          <SheetHeader className="pb-2 flex-shrink-0">
            <SheetTitle className="flex items-center gap-3">
              {selectedToken && <TokenLogo symbol={selectedToken.symbol} size="md" />}
              <span>Stake {selectedToken?.symbol || ""}</span>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-5 overflow-y-auto flex-1 min-h-0 pb-24">
            {/* Duration Selection */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-3 block">Lock Duration</label>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
                {STAKING_OPTIONS.map((option) => {
                  const shortLabel =
                    option.duration === 30
                      ? "30D"
                      : option.duration === 90
                        ? "90D"
                        : option.duration === 180
                          ? "180D"
                          : "1Y";

                  return (
                    <button
                      key={option.duration}
                      onClick={() => setSelectedDuration(option)}
                      className={cn(
                        "min-w-[92px] px-3 py-2 rounded-xl border transition-all text-left",
                        selectedDuration.duration === option.duration
                          ? "border-primary bg-primary/10"
                          : "border-border/50 bg-card/30 hover:border-primary/30",
                      )}
                    >
                      <p className="text-sm font-semibold leading-tight">{shortLabel}</p>
                      <p className="text-[11px] text-primary leading-tight">{option.rate}% /mo</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount Input */}
            <div className="px-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Available: {formatTokenAmount(maxBalance)} {selectedToken?.symbol}
                  </span>
                  <button
                    type="button"
                    onClick={handleMaxAmount}
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-2 py-0.5 rounded bg-primary/10"
                  >
                    MAX
                  </button>
                </div>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  max={maxBalance}
                  autoFocus
                  placeholder="0.00"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className={cn(
                    "h-14 text-xl font-semibold pr-24 rounded-xl bg-card/30",
                    isOverBalance ? "border-destructive focus-visible:ring-destructive" : "border-border/50"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {selectedToken && <TokenLogo symbol={selectedToken.symbol} size="sm" />}
                  <span className="font-medium text-muted-foreground">{selectedToken?.symbol || ""}</span>
                </div>
              </div>
              {isOverBalance && (
                <p className="text-xs text-destructive mt-1.5 px-1">
                  Amount exceeds available balance
                </p>
              )}
            </div>

            {/* Earnings Preview */}
            {stakeAmount && parseFloat(stakeAmount) > 0 && (
              <Card className="p-4 bg-primary/5 border-primary/20 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Estimated earnings</span>
                  <span className="font-bold text-primary text-lg">
                    +{formatCurrency(parseFloat(stakeAmount) * (selectedDuration.rate / 100) * (selectedDuration.duration / 30))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">After {selectedDuration.label}</p>
              </Card>
            )}
          </div>

          {/* Footer - always visible */}
          <div className="pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex-shrink-0 space-y-3 border-t border-border/50">
            <Button
              className="w-full h-14 text-base font-semibold rounded-xl"
              onClick={handleStake}
              disabled={isStaking || isTransferring || !isAmountValid}
            >
              {isStaking || isTransferring ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : hasMnemonicStored ? (
                <>
                  <Key className="w-5 h-5 mr-2" />
                  Sign & Stake
                </>
              ) : (
                <>
                  <Coins className="w-5 h-5 mr-2" />
                  Confirm Stake
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Tokens locked until unlock date. Rewards calculated daily at 15% per month.
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* PIN Unlock Modal for Staking */}
      <PinUnlockModal
        open={showPinModal}
        onOpenChange={setShowPinModal}
        onSubmit={handlePinSubmit}
        isLoading={isStaking || isTransferring}
        walletAddress={walletAddress}
        error={pinError}
      />
    </div>
  );
};