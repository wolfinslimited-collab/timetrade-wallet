import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Trash2, TrendingUp, CheckCircle, Shield } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationItem } from "./NotificationItem";
import type { Notification, NotificationType } from "@/hooks/useNotifications";

interface NotificationCenterProps {
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

export const NotificationCenter = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}: NotificationCenterProps) => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredNotifications = notifications.filter((n) => 
    filter === "all" ? true : n.type === filter
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-full bg-card border border-border hover:border-primary/30 transition-colors">
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
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-background">
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold">Notifications</SheetTitle>
            <div className="flex items-center gap-2">
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
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mt-3 pb-1 overflow-x-auto scrollbar-hide">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                  filter === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon && <tab.icon className="w-3 h-3" />}
                {tab.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[calc(100vh-140px)]">
          <AnimatePresence mode="popLayout">
            {filteredNotifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
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
      </SheetContent>
    </Sheet>
  );
};
