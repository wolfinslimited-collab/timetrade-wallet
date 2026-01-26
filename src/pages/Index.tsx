import { useState, useEffect } from "react";
import { WalletOnboarding } from "@/components/WalletOnboarding";
import { LockScreen } from "@/components/LockScreen";
import { BottomNav, NavTab } from "@/components/BottomNav";
import { WalletHeader } from "@/components/WalletHeader";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { PortfolioChart } from "@/components/PortfolioChart";
import { PortfolioBreakdown } from "@/components/PortfolioBreakdown";
import { QuickActions } from "@/components/QuickActions";
import { WalletTabs } from "@/components/WalletTabs";
import { SettingsPage } from "./SettingsPage";
import { TransactionHistoryPage } from "./TransactionHistoryPage";
import { MarketPage } from "./MarketPage";

const Index = () => {
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>("wallet");

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

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
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

  // Show settings page
  if (activeTab === "settings") {
    return (
      <>
        <SettingsPage onBack={() => setActiveTab("wallet")} />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </>
    );
  }

  // Show transaction history page
  if (activeTab === "history") {
    return (
      <>
        <TransactionHistoryPage onBack={() => setActiveTab("wallet")} />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </>
    );
  }

  // Show market page
  if (activeTab === "market") {
    return (
      <>
        <MarketPage onBack={() => setActiveTab("wallet")} />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </>
    );
  }

  // Main wallet view
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-20">
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
      <WalletHeader userName="Alex" onSettingsClick={() => setActiveTab("settings")} />

      {/* Balance */}
      <BalanceDisplay balance={12160.05} changePercent={2.5} />

      {/* Portfolio Chart */}
      <PortfolioChart />

      {/* Quick Actions */}
      <QuickActions />

      {/* Portfolio Breakdown */}
      <PortfolioBreakdown />

      {/* Wallet Tabs & List */}
      <WalletTabs />

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Index;
