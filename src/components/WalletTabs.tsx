import { useState } from "react";
import { cn } from "@/lib/utils";
import { WalletCard } from "./WalletCard";

const tabs = ["MY WALLET", "WATCHLIST", "SMARTMONEY"] as const;
type Tab = typeof tabs[number];

const mockWallets = [
  { address: "0xb24f8a31a", balance: 12158.29, transactions: 4 },
  { address: "0x59b2d3o1", balance: 9050.00, transactions: 2 },
  { address: "0xb24c56y", balance: 6609.00, transactions: 9 },
];

const mockWatchlist = [
  { address: "0xb24f8a31a", balance: 12158.29, transactions: 4 },
  { address: "0x59b2d3o1", balance: 9050.00, transactions: 2 },
  { address: "0xb24c56y", balance: 6609.00, transactions: 9 },
  { address: "0xb24f8a31a", balance: 50993.00, transactions: 0 },
  { address: "0xb24c344", balance: 22991.00, transactions: 4 },
];

export const WalletTabs = () => {
  const [activeTab, setActiveTab] = useState<Tab>("MY WALLET");

  const wallets = activeTab === "WATCHLIST" ? mockWatchlist : mockWallets;

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
        {wallets.map((wallet, index) => (
          <WalletCard
            key={`${wallet.address}-${index}`}
            address={wallet.address}
            balance={wallet.balance}
            transactions={activeTab === "WATCHLIST" ? wallet.transactions : undefined}
            showSparkline={activeTab === "MY WALLET"}
          />
        ))}
      </div>
    </div>
  );
};
