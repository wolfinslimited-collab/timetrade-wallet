import { useState, useEffect, useCallback, useMemo } from "react";
import { WalletOnboarding } from "@/components/WalletOnboarding";
import { LockScreen } from "@/components/LockScreen";
import { BottomNav, NavTab } from "@/components/BottomNav";
import { WalletHeader } from "@/components/WalletHeader";
import { QuickActions } from "@/components/QuickActions";
import { PullToRefresh } from "@/components/PullToRefresh";
import { NetworkBalanceChart } from "@/components/dashboard/NetworkBalanceChart";
import { NetworkBalanceList } from "@/components/dashboard/NetworkBalanceList";
import { DashboardTabs, DashboardTab } from "@/components/dashboard/DashboardTabs";
import { UnifiedTokenList } from "@/components/wallet/UnifiedTokenList";
import { SettingsPage } from "./SettingsPage";
import { TransactionHistoryPage } from "./TransactionHistoryPage";
import { MarketPage } from "./MarketPage";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { useWalletBalance, Chain } from "@/hooks/useBlockchain";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>("wallet");
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>("wallet");
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();
  
  const { isConnected, totalBalanceUsd, isLoadingBalance } = useBlockchainContext();

  // Get addresses from storage
  const [addresses, setAddresses] = useState(() => ({
    evm: localStorage.getItem("timetrade_wallet_address_evm"),
    solana: localStorage.getItem("timetrade_wallet_address_solana"),
    tron: localStorage.getItem("timetrade_wallet_address_tron"),
  }));

  // Re-read addresses periodically
  useEffect(() => {
    const readAddresses = () => {
      setAddresses({
        evm: localStorage.getItem("timetrade_wallet_address_evm"),
        solana: localStorage.getItem("timetrade_wallet_address_solana"),
        tron: localStorage.getItem("timetrade_wallet_address_tron"),
      });
    };
    readAddresses();
    const interval = setInterval(readAddresses, 1000);
    return () => clearInterval(interval);
  }, []);

  // Query all chain balances
  const ethBalance = useWalletBalance(isConnected ? addresses.evm : null, "ethereum");
  const polyBalance = useWalletBalance(isConnected ? addresses.evm : null, "polygon");
  const solBalance = useWalletBalance(isConnected ? addresses.solana : null, "solana");
  const tronBalance = useWalletBalance(isConnected ? addresses.tron : null, "tron");

  // Calculate network balances for chart and list
  const networkBalances = useMemo(() => {
    const calculateUsdValue = (data: any): number => {
      if (!data) return 0;
      // Get native balance in decimal
      const nativeBalance = parseFloat(data.native?.balance || "0") / Math.pow(10, data.native?.decimals || 18);
      // For now, use approximate prices (in production, use actual price data)
      const prices: Record<string, number> = {
        ETH: 3500,
        POL: 0.5,
        SOL: 150,
        TRX: 0.12,
      };
      const nativeValue = nativeBalance * (prices[data.native?.symbol] || 0);
      
      // Add token values
      let tokenValue = 0;
      for (const token of data.tokens || []) {
        const tokenBalance = parseFloat(token.balance) / Math.pow(10, token.decimals);
        // Stablecoins
        if (token.symbol === "USDC" || token.symbol === "USDT") {
          tokenValue += tokenBalance;
        }
      }
      
      return nativeValue + tokenValue;
    };

    return [
      {
        chain: "ethereum" as Chain,
        address: addresses.evm,
        balance: calculateUsdValue(ethBalance.data),
        change24h: (Math.random() - 0.3) * 5,
      },
      {
        chain: "polygon" as Chain,
        address: addresses.evm,
        balance: calculateUsdValue(polyBalance.data),
        change24h: (Math.random() - 0.3) * 5,
      },
      {
        chain: "solana" as Chain,
        address: addresses.solana,
        balance: calculateUsdValue(solBalance.data),
        change24h: (Math.random() - 0.3) * 5,
      },
      {
        chain: "tron" as Chain,
        address: addresses.tron,
        balance: calculateUsdValue(tronBalance.data),
        change24h: (Math.random() - 0.3) * 5,
      },
    ];
  }, [ethBalance.data, polyBalance.data, solBalance.data, tronBalance.data, addresses]);

  // Calculate total and change
  const { displayBalance, percentChange } = useMemo(() => {
    const balance = totalBalanceUsd || 0;
    const percent = balance > 0 ? ((Math.random() - 0.3) * 5) : 0;
    return { displayBalance: balance, percentChange: percent };
  }, [totalBalanceUsd]);

  const isPositive = percentChange >= 0;

  useEffect(() => {
    const walletCreated = localStorage.getItem("timetrade_wallet_created");
    const hasPin = localStorage.getItem("timetrade_pin");
    setHasWallet(walletCreated === "true");
    setIsLocked(walletCreated === "true" && !!hasPin);
  }, []);

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
  };

  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshKey(prev => prev + 1);
    toast({
      title: "Prices updated",
      description: "Portfolio data refreshed successfully",
    });
  }, [toast]);

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
      <PullToRefresh onRefresh={handleRefresh}>
        {/* Minimal Header */}
        <WalletHeader 
          userName="Alex" 
          onSettingsClick={() => setActiveTab("settings")}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDeleteNotification={deleteNotification}
          onClearAllNotifications={clearAll}
        />

        {/* Total Balance */}
        <div className="px-4 pt-2">
          <p className="text-xs text-muted-foreground tracking-widest uppercase">TOTAL BALANCE</p>
          {isLoadingBalance && isConnected ? (
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-3 mt-1">
              <h1 className="text-4xl font-bold tracking-tight">
                {formatBalance(displayBalance)}
              </h1>
              {displayBalance > 0 && (
                <span className={cn(
                  "text-sm font-semibold flex items-center gap-0.5",
                  isPositive ? "text-primary" : "text-destructive"
                )}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositive ? "+" : ""}{percentChange.toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Network Balance Chart */}
        <div className="mt-4">
          <NetworkBalanceChart 
            key={`chart-${refreshKey}`}
            networkBalances={networkBalances.map(n => ({ chain: n.chain, balance: n.balance }))} 
          />
        </div>

        {/* Dashboard Tabs */}
        <DashboardTabs activeTab={dashboardTab} onTabChange={setDashboardTab} />

        {/* Content based on tab */}
        {dashboardTab === "wallet" && (
          <NetworkBalanceList 
            key={`list-${refreshKey}`}
            networks={networkBalances} 
          />
        )}

        {dashboardTab === "watchlist" && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">Your watchlist is empty</p>
            <p className="text-xs text-muted-foreground mt-1">Add tokens to track their prices</p>
          </div>
        )}

        {dashboardTab === "smartmoney" && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">Smart Money tracking coming soon</p>
            <p className="text-xs text-muted-foreground mt-1">Follow whale wallets and copy trades</p>
          </div>
        )}

        {/* Quick Actions - only show in wallet tab */}
        {dashboardTab === "wallet" && (
          <div className="mt-4">
            <QuickActions />
          </div>
        )}
      </PullToRefresh>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default Index;