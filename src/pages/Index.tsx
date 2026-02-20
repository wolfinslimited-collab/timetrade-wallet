import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { WalletOnboarding } from "@/components/WalletOnboarding";
import { LockScreen } from "@/components/LockScreen";
import { BottomNav, NavTab } from "@/components/BottomNav";
import { WalletHeader } from "@/components/WalletHeader";
import { QuickActions } from "@/components/QuickActions";
import { PullToRefresh } from "@/components/PullToRefresh";
import { UnifiedTokenList } from "@/components/wallet/UnifiedTokenList";
import { SettingsPage } from "./SettingsPage";
import { TransactionHistoryPage } from "./TransactionHistoryPage";
import { StakingPage } from "./StakingPage";
import { NotificationsPage } from "./NotificationsPage";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getResetSignalKey, wipeAllWalletData, wipeIndexedDb } from "@/utils/walletStorage";

const Index = () => {
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>("wallet");
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
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
    // Only show lock screen in production mode
    const isProduction = import.meta.env.PROD;
    setIsLocked(isProduction && walletCreated === "true" && !!hasPin);
  }, []);

  // If another tab performs a reset, wipe this tab too so nothing can re-populate storage.
  useEffect(() => {
    let didReset = false;
    const resetKey = getResetSignalKey();

    const doReset = async () => {
      if (didReset) return;
      didReset = true;
      try {
        wipeAllWalletData();
        await wipeIndexedDb();
      } finally {
        window.location.replace(window.location.pathname);
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === resetKey) {
        void doReset();
      }
    };
    window.addEventListener("storage", onStorage);

    let bc: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel("timetrade_wallet");
        bc.onmessage = (ev) => {
          if (ev?.data?.type === "wallet_reset") void doReset();
        };
      }
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      try {
        bc?.close();
      } catch {
        // ignore
      }
    };
  }, []);

  // Sync bottom-nav tab state with URL query (?tab=history), so deep links and
  // in-app navigation (e.g. after Send success) always open the correct screen.
  useEffect(() => {
    const tab = searchParams.get("tab") as NavTab | null;
    const allowedTabs: NavTab[] = ["wallet", "history", "staking", "settings"];
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

  // Show notifications page
  if (location.pathname === "/notifications") {
    return (
      <NotificationsPage
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDelete={deleteNotification}
        onClearAll={clearAll}
      />
    );
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

  // Show staking page
  if (activeTab === "staking") {
    return (
      <>
        <StakingPage onBack={() => handleTabChange("wallet")} />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </>
    );
  }

  // Main wallet view
  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative pb-24">
      <PullToRefresh onRefresh={handleRefresh}>
        {/* Minimal Header */}
        <WalletHeader 
          onSettingsClick={() => handleTabChange("settings")}
          unreadCount={unreadCount}
        />

        {/* Total Balance */}
        <div className="px-4 pt-8 pb-2 text-center">
          {(isLoadingBalance || isLoadingAccounts || !isConnected) ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground text-sm">Syncing wallet…</span>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground text-sm mb-2">Current balance</p>
              <h1 className="text-[42px] font-bold tracking-tight leading-none">
                <span className="text-foreground">${Math.floor(displayBalance).toLocaleString()}</span>
                <span className="text-muted-foreground">.{(displayBalance % 1).toFixed(2).slice(2)}</span>
              </h1>
              {displayBalance > 0 && (
                <div className={cn(
                  "text-sm font-medium mt-3 flex items-center justify-center gap-1",
                  isPositive ? "text-success" : "text-destructive"
                )}>
                  <span>{isPositive ? "▲" : "▼"}</span>
                  <span>{Math.abs(percentChange).toFixed(2)}% (1d)</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* My Assets Section - separated background */}
        <div className="mt-6 bg-card/60 backdrop-blur-sm rounded-t-3xl border-t border-border/30 pt-5 pb-4 min-h-[40vh]">
          <div className="px-5 flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-foreground">My assets</h2>
            <button className="text-xs text-muted-foreground px-3 py-1 rounded-full border border-border hover:bg-secondary transition-colors">
              see all
            </button>
          </div>
          
          {/* Token List */}
          <UnifiedTokenList key={`tokens-${refreshKey}`} />
        </div>
      </PullToRefresh>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Index;