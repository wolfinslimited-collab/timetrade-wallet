import { useState } from "react";
import { cn } from "@/lib/utils";
import { WalletCard } from "./WalletCard";
import { useBlockchainContext } from "@/contexts/BlockchainContext";

const tabs = ["MY WALLET", "WATCHLIST", "SMARTMONEY"] as const;
type Tab = typeof tabs[number];

export const WalletTabs = () => {
  const [activeTab, setActiveTab] = useState<Tab>("MY WALLET");
  const { isConnected, walletAddress, totalBalanceUsd, transactions } = useBlockchainContext();

  return (
    <div className="flex-1 flex flex-col">
      {/* Tab Headers */}
      <div className="flex items-center gap-1 px-4 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 py-3 text-xs font-medium tracking-widest transition-all duration-200 relative",
              activeTab === tab
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70"
            )}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Wallet List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3 pb-24">
        {activeTab === "WATCHLIST" && (
          <h2 className="text-2xl font-bold tracking-tight mb-4">WATCHLIST</h2>
        )}

        {activeTab === "MY WALLET" ? (
          isConnected && walletAddress ? (
            <WalletCard
              address={walletAddress}
              balance={totalBalanceUsd}
              transactions={transactions?.length}
              showSparkline
            />
          ) : (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-medium">No wallet connected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create or import a wallet to see your address here.
              </p>
            </div>
          )
        ) : activeTab === "WATCHLIST" ? (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium">Watchlist is empty</p>
            <p className="text-xs text-muted-foreground mt-1">Add addresses to track later.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium">SmartMoney</p>
            <p className="text-xs text-muted-foreground mt-1">Coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};
