import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Sparkles } from "lucide-react";
import { AccountSwitcherSheet } from "./wallet/AccountSwitcherSheet";

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
      <header className="flex items-center justify-between px-5 py-4">
        {/* AI button */}
        <button
          onClick={() => navigate("/ai-chat")}
          className="w-10 h-10 rounded-xl bg-card border border-border/50 flex items-center justify-center active:scale-95 active:opacity-80"
        >
          <Sparkles className="w-[20px] h-[20px] text-primary" />
        </button>

        {/* Wallet pill */}
        <button
          onClick={() => setShowAccountSwitcher(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-card border border-border/50 active:opacity-80"
        >
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-[13px] text-foreground font-semibold">
            {walletName}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {/* Bell */}
        <button
          onClick={() => navigate("/notifications")}
          className="relative w-10 h-10 rounded-xl bg-card border border-border/50 flex items-center justify-center active:scale-95 active:opacity-80"
        >
          <Bell className="w-[20px] h-[20px] text-foreground/70" />
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary rounded-full flex items-center justify-center px-1">
              <span className="text-[10px] font-bold text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </div>
          )}
        </button>
      </header>

      <AccountSwitcherSheet
        open={showAccountSwitcher}
        onOpenChange={setShowAccountSwitcher}
      />
    </>
  );
};
