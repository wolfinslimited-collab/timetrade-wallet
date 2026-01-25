import { BottomNav } from "@/components/BottomNav";
import { WalletHeader } from "@/components/WalletHeader";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { PortfolioChart } from "@/components/PortfolioChart";
import { QuickActions } from "@/components/QuickActions";
import { WalletTabs } from "@/components/WalletTabs";

const Index = () => {
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
