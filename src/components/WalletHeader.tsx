import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AccountSwitcherSheet } from "./wallet/AccountSwitcherSheet";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { cn } from "@/lib/utils";

interface WalletHeaderProps {
  onSettingsClick?: () => void;
  unreadCount: number;
}

export const WalletHeader = ({ 
  onSettingsClick,
  unreadCount,
}: WalletHeaderProps) => {
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [walletName, setWalletName] = useState("Wallet");
  const navigate = useNavigate();

  useEffect(() => {
    const readName = () => {
      const name = localStorage.getItem("timetrade_wallet_name") || "Wallet";
      setWalletName(name);
    };
    readName();
    window.addEventListener("timetrade:account-switched", readName);
    return () => window.removeEventListener("timetrade:account-switched", readName);
  }, []);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3">
        {/* Wallet name pill - moved to left */}
        <button
          onClick={() => setShowAccountSwitcher(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 border border-border/50 backdrop-blur-sm"
        >
          <div className="w-4 h-4 rounded-full bg-foreground/80 flex items-center justify-center">
            <span className="text-[8px] font-bold text-background">B</span>
          </div>
          <span className="text-sm text-foreground/80 font-medium">
            {walletName}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {/* Notification bell - navigates to /notifications route */}
        <button
          onClick={() => navigate("/notifications")}
          className="relative p-2 rounded-full bg-card border border-border hover:border-foreground/30 transition-colors"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
              >
                <span className="text-xs font-bold text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </header>

      <AccountSwitcherSheet
        open={showAccountSwitcher}
        onOpenChange={setShowAccountSwitcher}
      />
    </>
  );
};
