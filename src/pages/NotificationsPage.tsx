import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, CheckCheck, Trash2, TrendingUp, CheckCircle, Shield, Bug, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import type { Notification, NotificationType } from "@/hooks/useNotifications";
import { Capacitor } from "@capacitor/core";
import { useFCMToken } from "@/hooks/useFCMToken";
import { toast } from "sonner";

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
  const [showDebug, setShowDebug] = useState(false);
  const lastTapRef = useRef(0);

  const { status: fcmStatus, errorMessage: fcmError, tokenValue, debugLog, clearDebugLog, reRegister } = useFCMToken();

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      setShowDebug(prev => !prev);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, []);

  const filteredNotifications = notifications.filter((n) =>
    filter === "all" ? true : n.type === filter
  );

  return (
    <div className="h-full flex flex-col w-full">
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
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3" onClick={handleDoubleTap}>
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

        {/* Hidden Push Debug Panel — revealed by double-tap */}
        {showDebug && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="flex items-center gap-2 p-4 border-b border-border">
              <Bug className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Push Debug</span>
              <span className="text-xs text-muted-foreground">({debugLog.length} events)</span>
              <button onClick={() => setShowDebug(false)} className="ml-auto text-xs text-muted-foreground">Hide</button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="text-muted-foreground">Platform</div>
                <div>{Capacitor.getPlatform()}</div>
                <div className="text-muted-foreground">FCM Status</div>
                <div className={cn(fcmStatus === 'registered' && 'text-green-500', fcmStatus === 'error' && 'text-destructive')}>{fcmStatus}</div>
              </div>

              {tokenValue && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Token</p>
                  <div className="bg-muted/50 rounded-lg p-2 text-[10px] font-mono break-all max-h-20 overflow-y-auto">
                    {tokenValue}
                  </div>
                </div>
              )}

              {fcmError && (
                <div className="text-xs text-destructive bg-destructive/5 rounded-lg p-2 break-all">
                  {fcmError}
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Event Log</p>
                <div className="bg-muted/50 rounded-lg max-h-48 overflow-y-auto">
                  {debugLog.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">No events yet</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {debugLog.map((entry, i) => (
                        <div key={i} className={cn("px-2 py-1.5 text-[10px] font-mono", entry.isError && "text-destructive bg-destructive/5")}>
                          <span className="text-muted-foreground">{entry.ts.substring(11, 19)}</span>{" "}
                          <span className="font-semibold">{entry.event}</span>
                          {entry.payload && <span className="ml-1 opacity-70">{entry.payload}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                  const report = JSON.stringify({ fcmStatus, fcmError, tokenValue, platform: Capacitor.getPlatform(), log: debugLog }, null, 2);
                  navigator.clipboard.writeText(report).then(() => toast.success("Debug report copied"));
                }}>
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={reRegister}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Retry
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={clearDebugLog}>
                  Clear
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
