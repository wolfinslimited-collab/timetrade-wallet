import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { TrendingUp, CheckCircle, Shield, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/hooks/useNotifications";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  index: number;
}

const typeConfig: Record<NotificationType, { 
  icon: React.ElementType; 
  bgClass: string; 
  iconClass: string;
  borderClass: string;
}> = {
  price_alert: {
    icon: TrendingUp,
    bgClass: "bg-chart-1/10",
    iconClass: "text-chart-1",
    borderClass: "border-chart-1/30",
  },
  transaction: {
    icon: CheckCircle,
    bgClass: "bg-chart-2/10",
    iconClass: "text-chart-2",
    borderClass: "border-chart-2/30",
  },
  security: {
    icon: Shield,
    bgClass: "bg-destructive/10",
    iconClass: "text-destructive",
    borderClass: "border-destructive/30",
  },
  info: {
    icon: Info,
    bgClass: "bg-primary/10",
    iconClass: "text-primary",
    borderClass: "border-primary/30",
  },
};

export const NotificationItem = ({ 
  notification, 
  onMarkAsRead, 
  onDelete,
  index 
}: NotificationItemProps) => {
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onClick={handleClick}
      className={cn(
        "relative p-4 rounded-xl border transition-all cursor-pointer group",
        config.borderClass,
        notification.read 
          ? "bg-card/50 opacity-70" 
          : "bg-card shadow-sm"
      )}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary"
        />
      )}

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
        className="absolute top-3 right-3 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          config.bgClass
        )}>
          <Icon className={cn("w-5 h-5", config.iconClass)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "font-medium text-sm",
              !notification.read && "text-foreground"
            )}>
              {notification.title}
            </h4>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
