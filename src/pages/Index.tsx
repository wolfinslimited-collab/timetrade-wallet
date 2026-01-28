import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { WalletOnboarding } from "@/components/WalletOnboarding";
import { LockScreen } from "@/components/LockScreen";
import { BottomNav, NavTab } from "@/components/BottomNav";
import { WalletHeader } from "@/components/WalletHeader";
import { QuickActions } from "@/components/QuickActions";
import { PullToRefresh } from "@/components/PullToRefresh";
import { UnifiedTokenList } from "@/components/wallet/UnifiedTokenList";
import { SettingsPage } from "./SettingsPage";
import { TransactionHistoryPage } from "./TransactionHistoryPage";
import { MarketPage } from "./MarketPage";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>("wallet");
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();
  
  const { isConnected, totalBalanceUsd, isLoadingBalance, isLoadingAccounts, prices, refreshAll } = useBlockchainContext();

  // Calculate display values - compute 24h change from prices
  const displayBalance = totalBalanceUsd || 0;
  // Use a reasonable estimate for portfolio change since we don't track per-asset breakdown
  const percentChange = prices?.length ? prices.reduce((sum, p) => sum + (p.change24h || 0), 0) / prices.length : 0;
  const dollarChange = displayBalance * (percentChange / 100);
  const isPositive = percentChange >= 0;

  useEffect(() => {
    const walletCreated = localStorage.getItem("timetrade_wallet_created");
    const hasPin = localStorage.getItem("timetrade_pin");
    setHasWallet(walletCreated === "true");
    setIsLocked(walletCreated === "true" && !!hasPin);
  }, []);

  // Sync bottom-nav tab state with URL query (?tab=history), so deep links and
  // in-app navigation (e.g. after Send success) always open the correct screen.
  useEffect(() => {
    const tab = searchParams.get("tab") as NavTab | null;
    const allowedTabs: NavTab[] = ["wallet", "history", "market", "settings"];
    if (tab && allowedTabs.includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
    // If URL has no tab param, default to wallet.
    if (!tab && activeTab !== "wallet") {
      setActiveTab("wallet");
    }
  }, [searchParams, activeTab]);

  const handleOnboardingComplete = () => {
    localStorage.setItem("timetrade_wallet_created", "true");
    setHasWallet(true);
    setIsLocked(false);
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === "wallet") next.delete("tab");
        else next.set("tab", tab);
        return next;
      },
      { replace: true }
    );
  };

  const handleRefresh = useCallback(async () => {
    // Actually refetch blockchain data
    refreshAll();
    await new Promise(resolve => setTimeout(resolve, 1200));
    setRefreshKey(prev => prev + 1);
    toast({
      title: "Prices updated",
      description: "Portfolio data refreshed successfully",
    });
  }, [toast, refreshAll]);

  const formatBalance = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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
        <SettingsPage onBack={() => handleTabChange("wallet")} />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </>
    );
  }

  // Show transaction history page
  if (activeTab === "history") {
    return (
      <>
        <TransactionHistoryPage onBack={() => handleTabChange("wallet")} />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </>
    );
  }

  // Show market page
  if (activeTab === "market") {
    return (
      <>
        <MarketPage onBack={() => handleTabChange("wallet")} />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </>
    );
  }

  // Main wallet view
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-20">
      <PullToRefresh onRefresh={handleRefresh}>
        {/* Minimal Header */}
        <WalletHeader 
          onSettingsClick={() => handleTabChange("settings")}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDeleteNotification={deleteNotification}
          onClearAllNotifications={clearAll}
        />

        {/* Total Balance - Centered */}
        <div className="px-4 pt-6 pb-4 text-center">
          {(isLoadingBalance || isLoadingAccounts || !isConnected) ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Syncing wallet…</span>
            </div>
          ) : (
            <>
              <h1 className="text-5xl font-bold tracking-tight">
                {formatBalance(displayBalance)}
              </h1>
              {displayBalance > 0 && (
                <div className={cn(
                  "text-base font-medium mt-2 flex items-center justify-center gap-2",
                  isPositive ? "text-primary" : "text-destructive"
                )}>
                  <span>
                    {isPositive ? "+" : "-"}${Math.abs(dollarChange).toFixed(2)}
                  </span>
                  <span>
                    {isPositive ? "+" : ""}{percentChange.toFixed(2)}%
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Token List */}
        <div className="mt-4">
          <UnifiedTokenList key={`tokens-${refreshKey}`} />
        </div>
      </PullToRefresh>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Index;