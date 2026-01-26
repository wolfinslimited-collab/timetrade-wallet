import { Shield, Settings } from "lucide-react";
import { NotificationCenter } from "./notifications/NotificationCenter";
import type { Notification } from "@/hooks/useNotifications";

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
  return (
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
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">[ HELLO {userName.toUpperCase()} ]</p>
          <div className="insurance-badge mt-1">
            <Shield className="w-3 h-3 text-primary" />
            <span className="text-primary">Insured</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
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
  );
};
