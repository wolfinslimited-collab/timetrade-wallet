import { useState } from "react";
import { Shield, Settings, Wallet, Loader2, Users } from "lucide-react";
import { NotificationCenter } from "./notifications/NotificationCenter";
import { ConnectWalletSheet } from "./wallet/ConnectWalletSheet";
import { AccountSwitcherSheet } from "./wallet/AccountSwitcherSheet";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import type { Notification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface WalletHeaderProps {
  userName: string;
  avatarUrl?: string;
  onSettingsClick?: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onClearAllNotifications: () => void;
}

export const WalletHeader = ({ 
  userName, 
  avatarUrl, 
  onSettingsClick,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onClearAllNotifications,
}: WalletHeaderProps) => {
  const [showConnectWallet, setShowConnectWallet] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const { isConnected, isLoadingBalance, derivedAccounts, activeAccountIndex } = useBlockchainContext();

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden border border-border">
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-semibold">{userName.charAt(0)}</span>
              )}
            </div>
            {/* Online indicator */}
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
              isConnected ? "bg-primary" : "bg-muted-foreground"
            )} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground tracking-widest uppercase">[ HELLO {userName.toUpperCase()} ]</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="insurance-badge">
                <Shield className="w-3 h-3 text-primary" />
                <span className="text-primary">Insured</span>
              </div>
              {isConnected && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Multi-Chain
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Account Switcher Button */}
          {derivedAccounts.length > 0 && (
            <button
              onClick={() => setShowAccountSwitcher(true)}
              className={cn(
                "relative p-2 rounded-full border transition-colors",
                "bg-card border-border hover:bg-secondary text-muted-foreground"
              )}
            >
              <Users className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {activeAccountIndex + 1}
              </span>
            </button>
          )}
          <button
            onClick={() => setShowConnectWallet(true)}
            className={cn(
              "p-2 rounded-full border transition-colors",
              isConnected 
                ? "bg-primary/10 border-primary/30 text-primary" 
                : "bg-card border-border hover:bg-secondary text-muted-foreground"
            )}
          >
            {isLoadingBalance ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Wallet className="w-5 h-5" />
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

      <ConnectWalletSheet 
        open={showConnectWallet} 
        onOpenChange={setShowConnectWallet} 
      />
      
      <AccountSwitcherSheet
        open={showAccountSwitcher}
        onOpenChange={setShowAccountSwitcher}
      />
    </>
  );
};
