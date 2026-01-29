import { useState, useEffect } from "react";
import { ArrowLeft, Coins, Clock, TrendingUp, Wallet, Plus, Minus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
}

const STAKING_OPTIONS = [
  { duration: 30, label: "30 Days", apy: 15 },
  { duration: 90, label: "90 Days", apy: 15 },
  { duration: 180, label: "180 Days", apy: 15 },
  { duration: 365, label: "1 Year", apy: 15 },
];

const SUPPORTED_TOKENS = [
  { symbol: "USDT", name: "Tether USD", chains: ["ethereum", "polygon", "tron"], balance: 0 },
  { symbol: "USDC", name: "USD Coin", chains: ["ethereum", "polygon", "solana"], balance: 0 },
  { symbol: "DAI", name: "Dai Stablecoin", chains: ["ethereum", "polygon"], balance: 0 },
];

const TokenLogo = ({ symbol, size = "md" }: { symbol: string; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const logoUrl = `https://cryptologos.cc/logos/${getLogoName(symbol)}.png`;

  return (
    <img
      src={logoUrl}
      alt={symbol}
      className={cn(sizeClasses[size], "rounded-full object-contain bg-card")}
      onError={(e) => {
        e.currentTarget.src = `https://ui-avatars.com/api/?name=${symbol}&background=1a1a2e&color=fff&bold=true&size=128`;
      }}
    />
  );
};

const getLogoName = (symbol: string): string => {
  const logoMap: Record<string, string> = {
    USDT: "tether-usdt-logo",
    USDC: "usd-coin-usdc-logo",
    DAI: "multi-collateral-dai-dai-logo",
  };
  return logoMap[symbol] || symbol.toLowerCase();
};

export const StakingPage = ({ onBack }: StakingPageProps) => {
  const [positions, setPositions] = useState<StakingPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTokenSheet, setShowTokenSheet] = useState(false);
  const [showStakeSheet, setShowStakeSheet] = useState(false);
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]);
  const [selectedDuration, setSelectedDuration] = useState(STAKING_OPTIONS[0]);
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const { toast } = useToast();

  const walletAddress = localStorage.getItem("timetrade_wallet_address_evm") || "";

  useEffect(() => {
    fetchPositions();
  }, [walletAddress]);

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

  const calculateEarnings = (position: StakingPosition) => {
    const stakedAt = new Date(position.staked_at).getTime();
    const now = Date.now();
    const daysStaked = (now - stakedAt) / (1000 * 60 * 60 * 24);
    const dailyRate = position.apy_rate / 365 / 100;
    return position.amount * dailyRate * daysStaked;
  };

  const totalStaked = positions.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalEarnings = positions.reduce((sum, p) => sum + calculateEarnings(p), 0);

  const handleSelectToken = (token: typeof SUPPORTED_TOKENS[0]) => {
    setSelectedToken(token);
    setShowTokenSheet(false);
    setShowStakeSheet(true);
  };

  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    setIsStaking(true);
    try {
      const unlockDate = new Date();
      unlockDate.setDate(unlockDate.getDate() + selectedDuration.duration);

      const { error } = await supabase.from("staking_positions").insert({
        wallet_address: walletAddress.toLowerCase(),
        token_symbol: selectedToken.symbol,
        chain: selectedToken.chains[0],
        amount: amount,
        apy_rate: selectedDuration.apy,
        unlock_at: unlockDate.toISOString(),
      });

      if (error) throw error;

      toast({ title: "Staking successful!", description: `Staked ${amount} ${selectedToken.symbol} for ${selectedDuration.label}` });
      setShowStakeSheet(false);
      setStakeAmount("");
      fetchPositions();
    } catch (err) {
      console.error("Staking error:", err);
      toast({ title: "Staking failed", description: "Please try again", variant: "destructive" });
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
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Staking</h1>
            <p className="text-xs text-muted-foreground">Earn 15% APY on stablecoins</p>
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
            <p className="text-2xl font-bold tracking-tight">{formatCurrency(totalStaked)}</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Earnings</span>
            </div>
            <p className="text-2xl font-bold tracking-tight text-primary">+{formatCurrency(totalEarnings)}</p>
          </Card>
        </div>

        {/* APY Card */}
        <Card className="p-5 bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border-primary/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Fixed Annual Yield</p>
              <p className="text-4xl font-bold text-primary mt-1">15% <span className="text-lg font-medium">APY</span></p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Coins className="w-7 h-7 text-primary" />
            </div>
          </div>
        </Card>

        {/* Supported Stablecoins */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Supported Stablecoins</h2>
          <div className="space-y-2">
            {SUPPORTED_TOKENS.map((token) => (
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">15% APY</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Stake Button */}
        <Button 
          className="w-full h-12 text-base font-semibold rounded-xl"
          onClick={() => setShowTokenSheet(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Stake Stablecoins
        </Button>

        {/* Active Positions */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Active Stakes</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : positions.length === 0 ? (
            <Card className="p-8 text-center bg-card/30 border-border/50">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Coins className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-muted-foreground">No active stakes</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Start earning 15% APY today</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {positions.map((position) => {
                const earnings = calculateEarnings(position);
                const unlockDate = new Date(position.unlock_at);
                const isUnlocked = unlockDate <= new Date();
                const daysRemaining = Math.max(0, Math.ceil((unlockDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                return (
                  <Card key={position.id} className="p-4 bg-card/50 border-border/50">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <TokenLogo symbol={position.token_symbol} size="md" />
                        <div>
                          <p className="font-semibold">{position.token_symbol}</p>
                          <p className="text-xs text-muted-foreground capitalize">{position.chain}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium",
                        isUnlocked 
                          ? "bg-primary/20 text-primary" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {isUnlocked ? "Unlocked" : `${daysRemaining}d left`}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Staked</p>
                        <p className="font-semibold">{formatCurrency(Number(position.amount))}</p>
                      </div>
                      <div className="bg-primary/10 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Earned</p>
                        <p className="font-semibold text-primary">+{formatCurrency(earnings)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 px-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{unlockDate.toLocaleDateString()}</span>
                      </div>
                      <span className="font-medium">{position.apy_rate}% APY</span>
                    </div>

                    <Button
                      variant={isUnlocked ? "default" : "outline"}
                      size="sm"
                      className="w-full rounded-lg"
                      onClick={() => handleUnstake(position)}
                      disabled={!isUnlocked}
                    >
                      <Minus className="w-4 h-4 mr-1.5" />
                      {isUnlocked ? "Unstake + Claim" : "Locked"}
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
            {SUPPORTED_TOKENS.map((token) => (
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
                  <p className="text-primary font-semibold">15% APY</p>
                  <p className="text-xs text-muted-foreground">{token.chains.length} chains</p>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Stake Configuration Sheet */}
      <Sheet open={showStakeSheet} onOpenChange={setShowStakeSheet}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-3">
              <TokenLogo symbol={selectedToken.symbol} size="md" />
              <span>Stake {selectedToken.symbol}</span>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-5 pb-6">
            {/* Duration Selection */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-3 block">Lock Duration</label>
              <div className="grid grid-cols-2 gap-2">
                {STAKING_OPTIONS.map((option) => (
                  <button
                    key={option.duration}
                    onClick={() => setSelectedDuration(option)}
                    className={cn(
                      "p-4 rounded-xl border transition-all text-left",
                      selectedDuration.duration === option.duration
                        ? "border-primary bg-primary/10"
                        : "border-border/50 bg-card/30 hover:border-primary/30"
                    )}
                  >
                    <p className="font-semibold">{option.label}</p>
                    <p className="text-sm text-primary">{option.apy}% APY</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-3 block">Amount</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="h-14 text-xl font-semibold pr-20 rounded-xl bg-card/30 border-border/50"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <TokenLogo symbol={selectedToken.symbol} size="sm" />
                  <span className="font-medium text-muted-foreground">{selectedToken.symbol}</span>
                </div>
              </div>
            </div>

            {/* Earnings Preview */}
            {stakeAmount && parseFloat(stakeAmount) > 0 && (
              <Card className="p-4 bg-primary/5 border-primary/20 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Estimated earnings</span>
                  <span className="font-bold text-primary text-lg">
                    +{formatCurrency(parseFloat(stakeAmount) * (selectedDuration.apy / 100) * (selectedDuration.duration / 365))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">After {selectedDuration.label}</p>
              </Card>
            )}

            {/* Stake Button */}
            <Button
              className="w-full h-14 text-base font-semibold rounded-xl"
              onClick={handleStake}
              disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0}
            >
              {isStaking ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Coins className="w-5 h-5 mr-2" />
                  Stake {selectedToken.symbol}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Tokens locked until unlock date. Rewards calculated daily at 15% APY.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};