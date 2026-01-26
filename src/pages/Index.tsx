import { useState, useEffect } from "react";
import { WalletOnboarding } from "@/components/WalletOnboarding";
import { LockScreen } from "@/components/LockScreen";
import { BottomNav } from "@/components/BottomNav";
import { WalletHeader } from "@/components/WalletHeader";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { PortfolioChart } from "@/components/PortfolioChart";
import { QuickActions } from "@/components/QuickActions";
import { WalletTabs } from "@/components/WalletTabs";

const Index = () => {
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    // Check if wallet exists in localStorage
    const walletCreated = localStorage.getItem("timetrade_wallet_created");
    const hasPin = localStorage.getItem("timetrade_pin");
    setHasWallet(walletCreated === "true");
    // Only show lock screen if wallet exists and has PIN
    setIsLocked(walletCreated === "true" && !!hasPin);
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem("timetrade_wallet_created", "true");
    setHasWallet(true);
    setIsLocked(false); // Don't show lock screen right after onboarding
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  // Loading state
  if (hasWallet === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show onboarding if no wallet
  if (!hasWallet) {
    return <WalletOnboarding onComplete={handleOnboardingComplete} />;
  }

  // Show lock screen if locked
  if (isLocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  // Main wallet view
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      {/* Status bar simulation */}
      <div className="flex items-center justify-between px-6 py-2 text-xs text-muted-foreground">
        <span className="font-medium">9:41</span>
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            <div className="w-1 h-2 bg-foreground rounded-sm" />
            <div className="w-1 h-2.5 bg-foreground rounded-sm" />
            <div className="w-1 h-3 bg-foreground rounded-sm" />
            <div className="w-1 h-3.5 bg-foreground rounded-sm" />
          </div>
          <span className="ml-1">📶</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Header */}
      <WalletHeader userName="Alex" />

      {/* Balance */}
      <BalanceDisplay balance={12160.05} changePercent={2.5} />

      {/* Portfolio Chart */}
      <PortfolioChart />

      {/* Quick Actions */}
      <QuickActions />

      {/* Wallet Tabs & List */}
      <WalletTabs />

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Index;
