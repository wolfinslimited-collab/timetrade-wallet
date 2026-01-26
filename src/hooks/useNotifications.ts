import { useState, useCallback } from "react";

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

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    addNotification,
  };
};
