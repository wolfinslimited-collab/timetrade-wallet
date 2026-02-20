import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, CheckCheck, Trash2, TrendingUp, CheckCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import type { Notification, NotificationType } from "@/hooks/useNotifications";

interface NotificationsPageProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

type FilterType = "all" | NotificationType;

const filterTabs: { value: FilterType; label: string; icon?: React.ElementType }[] = [
  { value: "all", label: "All" },
  { value: "price_alert", label: "Prices", icon: TrendingUp },
  { value: "transaction", label: "Txns", icon: CheckCircle },
  { value: "security", label: "Security", icon: Shield },
];

export const NotificationsPage = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}: NotificationsPageProps) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredNotifications = notifications.filter((n) =>
    filter === "all" ? true : n.type === filter
  );

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Notifications</h1>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="text-xs h-8 px-2"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-xs h-8 px-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-2 overflow-x-auto scrollbar-hide">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
              filter === tab.value
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon && <tab.icon className="w-3 h-3" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {filter === "all"
                  ? "You're all caught up!"
                  : `No ${filter.replace("_", " ")} notifications`}
              </p>
            </motion.div>
          ) : (
            filteredNotifications.map((notification, index) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
                index={index}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
