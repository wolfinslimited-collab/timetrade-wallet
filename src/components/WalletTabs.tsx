import { useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { WalletCard } from "./WalletCard";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { haptics } from "@/lib/haptics";

const tabs = ["MY WALLET", "WATCHLIST", "SMARTMONEY"] as const;
type Tab = typeof tabs[number];

// iOS-style easing matching the global page transitions
const easeIOS = [0.32, 0.72, 0, 1] as const;

const tabVariants: Variants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 16 : -16,
  }),
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.22, ease: easeIOS },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -12 : 12,
    transition: { duration: 0.16, ease: easeIOS },
  }),
};

export const WalletTabs = () => {
  const [activeTab, setActiveTab] = useState<Tab>("MY WALLET");
  const [direction, setDirection] = useState(0);
  const { isConnected, walletAddress, totalBalanceUsd, transactions } = useBlockchainContext();

  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab) return;
    const nextDir = tabs.indexOf(tab) - tabs.indexOf(activeTab);
    setDirection(nextDir);
    setActiveTab(tab);
    void haptics.selection();
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Tab Headers */}
      <div className="flex items-center gap-1 px-4 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={cn(
              "px-3 py-3 text-xs font-medium tracking-widest transition-colors duration-150 relative active:scale-[0.96]",
              activeTab === tab
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70"
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="wallet-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                transition={{ duration: 0.28, ease: easeIOS }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Wallet List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 pb-nav-safe relative">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-3"
          >
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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
