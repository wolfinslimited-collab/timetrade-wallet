import { useState, useEffect } from "react";
import { Shield, Settings, Layers } from "lucide-react";
import { NotificationCenter } from "./notifications/NotificationCenter";
import { AccountSwitcherSheet } from "./wallet/AccountSwitcherSheet";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { useWalletAvatar } from "@/hooks/useWalletAvatar";
import type { Notification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface WalletHeaderProps {
  onSettingsClick?: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAllNotifications: () => void;
}

export const WalletHeader = ({ 
  onSettingsClick,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAllNotifications,
}: WalletHeaderProps) => {
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const { isConnected, derivedAccounts, activeAccountIndex, walletAddress } = useBlockchainContext();
  
  // Get wallet name from localStorage (set during onboarding) - refresh on account switch
  const [walletName, setWalletName] = useState("Wallet");
  useEffect(() => {
    const loadName = () => {
      const stored = localStorage.getItem("timetrade_wallet_name");
      if (stored) setWalletName(stored);
    };
    loadName();
    
    // Re-read name when account switches
    window.addEventListener('timetrade:account-switched', loadName);
    return () => window.removeEventListener('timetrade:account-switched', loadName);
  }, []);
  
  // Get avatar from wallet address
  const { avatarUrl, placeholderColors } = useWalletAvatar(walletAddress);

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-border"
              style={!avatarUrl ? { background: `linear-gradient(135deg, ${placeholderColors.from}, ${placeholderColors.to})` } : undefined}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={walletName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-white">{walletName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            {/* Online indicator */}
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
              isConnected ? "bg-primary" : "bg-muted-foreground"
            )} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground tracking-widest uppercase">{walletName.toUpperCase()}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary border border-border">
                <Shield className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-medium text-primary uppercase tracking-wide">Protected</span>
              </div>
              {isConnected && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Live</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Account Switcher Button */}
          <button
            onClick={() => setShowAccountSwitcher(true)}
            className={cn(
              "relative p-2 rounded-full border transition-colors",
              "bg-card border-border hover:bg-secondary text-muted-foreground"
            )}
          >
            <Layers className="w-5 h-5" />
            {derivedAccounts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {activeAccountIndex + 1}
              </span>
            )}
          </button>
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onDelete={onDeleteNotification}
            onClearAll={onClearAllNotifications}
          />
          <button 
            onClick={onSettingsClick}
            className="p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <AccountSwitcherSheet
        open={showAccountSwitcher}
        onOpenChange={setShowAccountSwitcher}
      />
    </>
  );
};
