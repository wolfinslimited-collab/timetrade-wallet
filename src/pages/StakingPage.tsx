import { useState, useEffect } from "react";
import { ArrowLeft, Coins, Clock, TrendingUp, Wallet, Plus, Minus } from "lucide-react";
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
  { symbol: "USDT", name: "Tether USD", icon: "💵", chains: ["ethereum", "polygon", "tron"] },
  { symbol: "USDC", name: "USD Coin", icon: "💲", chains: ["ethereum", "polygon", "solana"] },
  { symbol: "DAI", name: "Dai", icon: "🪙", chains: ["ethereum", "polygon"] },
];

export const StakingPage = ({ onBack }: StakingPageProps) => {
  const [positions, setPositions] = useState<StakingPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    <div className="min-h-screen bg-background pb-24">
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
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-xs">Total Staked</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(totalStaked)}</p>
          </Card>
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs">Total Earnings</span>
            </div>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalEarnings)}</p>
          </Card>
        </div>

        {/* APY Banner */}
        <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Fixed APY Rate</p>
              <p className="text-3xl font-bold text-primary">15%</p>
            </div>
            <Coins className="w-12 h-12 text-primary/50" />
          </div>
        </Card>

        {/* Stake Button */}
        <Button 
          className="w-full h-12 text-base font-semibold"
          onClick={() => setShowStakeSheet(true)}
        >
          <Plus className="w-5 h-5 mr-2" />
          Stake Stablecoins
        </Button>

        {/* Active Positions */}
        <div>
          <h2 className="text-base font-semibold mb-3">Active Stakes</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : positions.length === 0 ? (
            <Card className="p-6 text-center bg-card border-border">
              <Coins className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No active stakes</p>
              <p className="text-xs text-muted-foreground mt-1">Start earning 15% APY today!</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {positions.map((position) => {
                const earnings = calculateEarnings(position);
                const unlockDate = new Date(position.unlock_at);
                const isUnlocked = unlockDate <= new Date();
                const daysRemaining = Math.max(0, Math.ceil((unlockDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                return (
                  <Card key={position.id} className="p-4 bg-card border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {SUPPORTED_TOKENS.find(t => t.symbol === position.token_symbol)?.icon || "💰"}
                        </span>
                        <div>
                          <p className="font-semibold">{position.token_symbol}</p>
                          <p className="text-xs text-muted-foreground capitalize">{position.chain}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        isUnlocked ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {isUnlocked ? "Unlocked" : `${daysRemaining}d remaining`}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Staked</p>
                        <p className="font-semibold">{formatCurrency(Number(position.amount))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Earned</p>
                        <p className="font-semibold text-primary">+{formatCurrency(earnings)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Unlock: {unlockDate.toLocaleDateString()}</span>
                      </div>
                      <span>{position.apy_rate}% APY</span>
                    </div>

                    <Button
                      variant={isUnlocked ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      onClick={() => handleUnstake(position)}
                      disabled={!isUnlocked}
                    >
                      <Minus className="w-4 h-4 mr-1" />
                      {isUnlocked ? "Unstake + Claim Rewards" : "Locked"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stake Sheet */}
      <Sheet open={showStakeSheet} onOpenChange={setShowStakeSheet}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Stake Stablecoins</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Token Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Select Token</label>
              <div className="grid grid-cols-3 gap-2">
                {SUPPORTED_TOKENS.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => setSelectedToken(token)}
                    className={cn(
                      "p-3 rounded-lg border transition-all text-center",
                      selectedToken.symbol === token.symbol
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl block mb-1">{token.icon}</span>
                    <span className="text-sm font-medium">{token.symbol}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Lock Duration</label>
              <div className="grid grid-cols-2 gap-2">
                {STAKING_OPTIONS.map((option) => (
                  <button
                    key={option.duration}
                    onClick={() => setSelectedDuration(option)}
                    className={cn(
                      "p-3 rounded-lg border transition-all",
                      selectedDuration.duration === option.duration
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <p className="font-medium">{option.label}</p>
                    <p className="text-xs text-primary">{option.apy}% APY</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">Amount</label>
              <Input
                type="number"
                placeholder={`Enter ${selectedToken.symbol} amount`}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="h-12 text-lg"
              />
            </div>

            {/* Earnings Preview */}
            {stakeAmount && parseFloat(stakeAmount) > 0 && (
              <Card className="p-4 bg-muted/50 border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Est. earnings after {selectedDuration.label}</span>
                  <span className="font-bold text-primary">
                    +{formatCurrency(parseFloat(stakeAmount) * (selectedDuration.apy / 100) * (selectedDuration.duration / 365))}
                  </span>
                </div>
              </Card>
            )}

            {/* Stake Button */}
            <Button
              className="w-full h-12 text-base font-semibold"
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
              Your staked tokens will be locked until the unlock date. Rewards are calculated daily at 15% APY.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
