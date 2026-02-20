import { useState, useEffect } from "react";
import { User, Bell, ChevronDown } from "lucide-react";
import { NotificationCenter } from "./notifications/NotificationCenter";
import { AccountSwitcherSheet } from "./wallet/AccountSwitcherSheet";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
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
  const { walletAddress } = useBlockchainContext();

  const formatAddress = (addr: string | null) => {
    if (!addr) return "0x0000...00";
    return `${addr.slice(0, 7)}...${addr.slice(-2)}`;
  };

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3">
        {/* User avatar button */}
        <button
          onClick={() => setShowAccountSwitcher(true)}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <User className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
        </button>

        {/* Wallet address pill */}
        <button
          onClick={() => setShowAccountSwitcher(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 border border-border/50 backdrop-blur-sm"
        >
          <div className="w-4 h-4 rounded-full bg-primary/80 flex items-center justify-center">
            <span className="text-[8px] font-bold text-primary-foreground">B</span>
          </div>
          <span className="text-sm text-foreground/80 font-mono">
            {formatAddress(walletAddress)}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {/* Notification bell */}
        <NotificationCenter
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onDelete={onDeleteNotification}
          onClearAll={onClearAllNotifications}
        />
      </header>

      <AccountSwitcherSheet
        open={showAccountSwitcher}
        onOpenChange={setShowAccountSwitcher}
      />
    </>
  );
};
