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
      <header className="flex items-center justify-between px-5 py-3">
        {/* AI button */}
        <button
          onClick={() => navigate("/ai-chat")}
          className="w-10 h-10 rounded-full bg-card/80 border border-border/40 flex items-center justify-center active:scale-95"
        >
          <Sparkles className="w-[18px] h-[18px] text-foreground" />
        </button>

        {/* Wallet pill */}
        <button
          onClick={() => setShowAccountSwitcher(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-card/60 border border-border/40"
        >
          <span className="text-[13px] text-foreground/80 font-semibold tracking-wide">
            {walletName}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>

        {/* Bell */}
        <button
          onClick={() => navigate("/notifications")}
          className="relative w-10 h-10 rounded-full bg-card/80 border border-border/40 flex items-center justify-center active:scale-95"
        >
          <Bell className="w-[18px] h-[18px] text-foreground" />
          {unreadCount > 0 && (
            <div className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-[9px] font-bold text-destructive-foreground">
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