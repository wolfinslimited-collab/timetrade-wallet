import { useState, useCallback, useEffect } from "react";
import { useWebNotifications } from "./useWebNotifications";

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

// Demo notifications
const generateDemoNotifications = (): Notification[] => [
  {
    id: "1",
    type: "price_alert",
    title: "BTC Price Alert",
    message: "Bitcoin just crossed $45,000! Up 5.2% in the last hour.",
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    read: false,
    icon: "₿",
  },
  {
    id: "2",
    type: "transaction",
    title: "Transaction Confirmed",
    message: "Your transfer of 0.5 ETH has been confirmed on the network.",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    read: false,
    icon: "✓",
  },
  {
    id: "3",
    type: "security",
    title: "New Login Detected",
    message: "A new device logged into your wallet. If this wasn't you, please secure your account.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    read: true,
    icon: "🔐",
  },
  {
    id: "4",
    type: "price_alert",
    title: "ETH Below Target",
    message: "Ethereum dropped below your $2,400 price alert target.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    read: true,
    icon: "Ξ",
  },
  {
    id: "5",
    type: "transaction",
    title: "Swap Completed",
    message: "Successfully swapped 100 USDT for 0.042 ETH.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
    icon: "↔",
  },
  {
    id: "6",
    type: "security",
    title: "Backup Reminder",
    message: "It's been 30 days since you last verified your seed phrase backup.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    read: true,
    icon: "⚠",
  },
];

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>(generateDemoNotifications);
  const { 
    showPriceAlertNotification, 
    showTransactionNotification, 
    showSecurityNotification,
    showNotification: showWebNotification,
  } = useWebNotifications();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
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
    notifications,
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
