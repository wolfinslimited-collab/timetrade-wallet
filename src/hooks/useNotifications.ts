import { useState, useCallback, useEffect } from "react";
import { useWebNotifications } from "./useWebNotifications";
import { useServerNotifications, dismissServerNotification, type ServerNotification } from "./useServerNotifications";

export type NotificationType = "price_alert" | "transaction" | "security" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { notifications: serverNotifications } = useServerNotifications();
  const { 
    showPriceAlertNotification, 
    showTransactionNotification, 
    showSecurityNotification,
    showNotification: showWebNotification,
  } = useWebNotifications();

  // Merge server notifications into the list
  const mergedNotifications: Notification[] = [
    ...serverNotifications.map((sn: ServerNotification): Notification => ({
      id: `server_${sn.id}`,
      type: (sn.type as NotificationType) || "info",
      title: sn.title,
      message: sn.message,
      timestamp: new Date(sn.created_at),
      read: false,
      icon: sn.icon || undefined,
    })),
    ...notifications,
  ];

  const unreadCount = mergedNotifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    if (id.startsWith("server_")) {
      dismissServerNotification(id.replace("server_", ""));
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const addNotification = useCallback((
    notification: Omit<Notification, "id" | "timestamp" | "read">,
    showPush = true
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);

    // Also show as web push notification if enabled
    if (showPush) {
      if (notification.type === "security") {
        showSecurityNotification(notification.title, notification.message);
      } else {
        showWebNotification({
          title: notification.title,
          body: notification.message,
        });
      }
    }

    return newNotification;
  }, [showSecurityNotification, showWebNotification]);

  // Helper to add price alert notification
  const addPriceAlertNotification = useCallback((
    symbol: string,
    currentPrice: number,
    targetPrice: number,
    condition: 'above' | 'below'
  ) => {
    const direction = condition === 'above' ? '📈' : '📉';
    const verb = condition === 'above' ? 'crossed above' : 'dropped below';
    
    const notification = addNotification({
      type: "price_alert",
      title: `${symbol} Price Alert`,
      message: `${symbol} has ${verb} $${targetPrice.toLocaleString()}! Current: $${currentPrice.toLocaleString()}`,
      icon: direction,
    }, false);

    // Show web push
    showPriceAlertNotification(symbol, currentPrice, condition, targetPrice);

    return notification;
  }, [addNotification, showPriceAlertNotification]);

  // Helper to add transaction notification
  const addTransactionNotification = useCallback((
    type: 'received' | 'sent' | 'confirmed' | 'failed',
    amount: string,
    symbol: string,
    address?: string
  ) => {
    let title: string;
    let icon: string;

    switch (type) {
      case 'received':
        title = `Received ${amount} ${symbol}`;
        icon = '💰';
        break;
      case 'sent':
        title = `Sent ${amount} ${symbol}`;
        icon = '📤';
        break;
      case 'confirmed':
        title = `Transaction Confirmed`;
        icon = '✅';
        break;
      case 'failed':
        title = `Transaction Failed`;
        icon = '❌';
        break;
    }

    const notification = addNotification({
      type: "transaction",
      title,
      message: address 
        ? `${type === 'received' ? 'From' : 'To'} ${address.slice(0, 8)}...${address.slice(-6)}`
        : `Your ${amount} ${symbol} transfer was ${type}`,
      icon,
    }, false);

    // Show web push
    showTransactionNotification(
      type,
      amount,
      symbol,
      type === 'received' ? address : undefined,
      type === 'sent' ? address : undefined
    );

    return notification;
  }, [addNotification, showTransactionNotification]);

  return {
    notifications: mergedNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    addNotification,
    addPriceAlertNotification,
    addTransactionNotification,
  };
};
