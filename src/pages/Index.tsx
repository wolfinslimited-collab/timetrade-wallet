import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { WalletOnboarding } from "@/components/WalletOnboarding";
import { LockScreen } from "@/components/LockScreen";
import { BottomNav, NavTab } from "@/components/BottomNav";
import { WalletHeader } from "@/components/WalletHeader";
import { QuickActions } from "@/components/QuickActions";
import { PullToRefresh } from "@/components/PullToRefresh";
import { UnifiedTokenList } from "@/components/wallet/UnifiedTokenList";
import { SettingsPage } from "./SettingsPage";
import { StakingPage } from "./StakingPage";
import { TransactionHistoryPage } from "./TransactionHistoryPage";
import { AITradingPage } from "./AITradingPage";

import { NotificationsPage } from "./NotificationsPage";

import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { AppUpdateBanner } from "@/components/AppUpdateBanner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getResetSignalKey, wipeAllWalletData, wipeIndexedDb } from "@/utils/walletStorage";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [isLocked, setIsLocked] = useState(() => {
    return sessionStorage.getItem("timetrade_unlocked") !== "true";
  });
  const [activeTab, setActiveTab] = useState<NavTab>("wallet");
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll,
  } = useNotifications();
  
  const { isConnected, totalBalanceUsd, isLoadingBalance, isLoadingAccounts, prices, refreshAll } = useBlockchainContext();

  const displayBalance = totalBalanceUsd || 0;
  const percentChange = prices?.length ? prices.reduce((sum, p) => sum + (p.change24h || 0), 0) / prices.length : 0;
  const dollarChange = displayBalance * (percentChange / 100);
  const isPositive = percentChange >= 0;
  const hiddenTabs = useMemo<NavTab[]>(() => ["trading", "staking"], []);

  useEffect(() => {
    const walletCreated = localStorage.getItem("timetrade_wallet_created");
    const hasPin = localStorage.getItem("timetrade_pin");
    
    if (walletCreated === "true") {
      const accountsStr = localStorage.getItem("timetrade_user_accounts");
      let hasAccounts = false;
      if (accountsStr) {
        try {
          const parsed = JSON.parse(accountsStr);
          hasAccounts = Array.isArray(parsed) && parsed.length > 0;
        } catch { hasAccounts = false; }
      }
      if (!hasAccounts) {
        wipeAllWalletData();
        wipeIndexedDb();
        setHasWallet(false);
        setIsLocked(false);
        return;
      }
    }
    
    setHasWallet(walletCreated === "true");
    const isProduction = import.meta.env.PROD;
    const alreadyUnlocked = sessionStorage.getItem("timetrade_unlocked") === "true";
    setIsLocked(isProduction && walletCreated === "true" && !!hasPin && !alreadyUnlocked);
  }, []);


  useEffect(() => {
    let didReset = false;
    const resetKey = getResetSignalKey();
    const isDev = import.meta.env.DEV;

    const doReset = async () => {
      if (didReset) return;
      didReset = true;
      try {
        wipeAllWalletData();
        await wipeIndexedDb();
      } finally {
        // Soft reset state only (no route navigation / hard refresh)
        setHasWallet(false);
        setIsLocked(false);
        setActiveTab("wallet");
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key !== resetKey) return;
      if (!e.newValue || e.newValue === e.oldValue) return;
      void doReset();
    };

    const onWalletReset = () => {
      void doReset();
    };

    window.addEventListener("timetrade:wallet-reset", onWalletReset as EventListener);

    // In dev/preview, skip cross-tab reset listeners to avoid unwanted route refresh loops.
    // Keep full cross-tab sync behavior for production builds.
    let bc: BroadcastChannel | null = null;
    if (!isDev) {
      window.addEventListener("storage", onStorage);
      try {
        if ("BroadcastChannel" in window) {
          bc = new BroadcastChannel("timetrade_wallet");
          bc.onmessage = (ev) => {
            if (ev?.data?.type !== "wallet_reset") return;
            void doReset();
          };
        }
      } catch {
        // ignore
      }
    }

    return () => {
      window.removeEventListener("timetrade:wallet-reset", onWalletReset as EventListener);
      if (!isDev) {
        window.removeEventListener("storage", onStorage);
        try {
          bc?.close();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab") as NavTab | null;
    const allowedTabs: NavTab[] = ["wallet", "history", "staking", "trading", "ai", "settings"];
    if (tab && allowedTabs.includes(tab) && tab !== activeTab) setActiveTab(tab);
    if (!tab && activeTab !== "wallet") setActiveTab("wallet");
  }, [searchParams, activeTab]);

  const handleOnboardingComplete = () => {
    localStorage.setItem("timetrade_wallet_created", "true");
    sessionStorage.setItem("timetrade_unlocked", "true");
    setHasWallet(true);
    setIsLocked(false);
  };

  const handleUnlock = () => {
    sessionStorage.setItem("timetrade_unlocked", "true");
    setIsLocked(false);
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "wallet") next.delete("tab");
      else next.set("tab", tab);
      return next;
    }, { replace: true });
  };

  const handleRefresh = useCallback(async () => {
    refreshAll();
    await new Promise(resolve => setTimeout(resolve, 1200));
    setRefreshKey(prev => prev + 1);
  }, [refreshAll]);

  if (hasWallet === null) {
    return (
      <div className="h-full w-full bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasWallet) return <WalletOnboarding onComplete={handleOnboardingComplete} />;

  const isDev = import.meta.env.DEV;
  if (isLocked && !isDev) return <LockScreen onUnlock={handleUnlock} />;

  const currentView = location.pathname === "/notifications" ? "notifications" : activeTab;

  if (currentView === "notifications") {
    return (
      <NotificationsPage notifications={notifications} unreadCount={unreadCount}
        onMarkAsRead={markAsRead} onMarkAllAsRead={markAllAsRead}
        onDelete={deleteNotification} onClearAll={clearAll} />
    );
  }

  if (currentView === "settings") {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <SettingsPage onBack={() => handleTabChange("wallet")} />
        </div>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} hiddenTabs={hiddenTabs} />
      </div>
    );
  }

  if (currentView === "history") {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <TransactionHistoryPage onBack={() => handleTabChange("wallet")} />
        </div>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} hiddenTabs={hiddenTabs} />
      </div>
    );
  }

  if (currentView === "staking") {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <StakingPage onBack={() => handleTabChange("wallet")} />
        </div>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} hiddenTabs={hiddenTabs} />
      </div>
    );
  }

  if (currentView === "trading") {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <AITradingPage onBack={() => handleTabChange("wallet")} />
        </div>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} hiddenTabs={hiddenTabs} />
      </div>
    );
  }


  return (
    <div className="flex flex-col flex-1 w-full relative overflow-hidden">
      <AppUpdateBanner />
      <WalletHeader 
        onSettingsClick={() => handleTabChange("settings")}
        unreadCount={unreadCount}
      />

      <div className="flex-1 overflow-y-auto pb-nav-safe -webkit-overflow-scrolling-touch" style={{ WebkitOverflowScrolling: 'touch' }}>
        <PullToRefresh onRefresh={handleRefresh}>
          {/* Balance Section */}
          <div className="px-6 pt-8 pb-6 text-center">
            {(isLoadingBalance || isLoadingAccounts || !isConnected) ? (
              <div className="flex items-center justify-center gap-2 py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Loading portfolio…</span>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground text-[13px] font-medium mb-3">Total Balance</p>
                <h1 className="text-[42px] font-extrabold tracking-tight leading-none">
                  <span className="text-foreground">${Math.floor(displayBalance).toLocaleString()}</span>
                  <span className="text-foreground/30 font-bold">.{(displayBalance % 1).toFixed(2).slice(2)}</span>
                </h1>
                {displayBalance > 0 && percentChange !== 0 && (
                  <div className={cn(
                    "text-[13px] font-semibold mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                    isPositive 
                      ? "text-success bg-success/10 border border-success/20" 
                      : "text-destructive bg-destructive/10 border border-destructive/20"
                  )}>
                    <span>{isPositive ? "↑" : "↓"}</span>
                    <span>{isPositive ? "+" : ""}{dollarChange.toFixed(2)} ({Math.abs(percentChange).toFixed(2)}%)</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quick Actions */}
          <QuickActions />

          {/* Token List */}
          <div className="mt-6 mx-4 bg-card rounded-3xl border border-border/40 pt-5 pb-3">
            <div className="px-5 flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold text-foreground">Assets</h2>
              <button 
                onClick={() => navigate("/assets")}
                className="text-[12px] text-primary font-semibold active:opacity-70"
              >
                View All
              </button>
            </div>
            <UnifiedTokenList key={`tokens-${refreshKey}`} />
          </div>
        </PullToRefresh>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} hiddenTabs={hiddenTabs} />
    </div>
  );
};

export default Index;
