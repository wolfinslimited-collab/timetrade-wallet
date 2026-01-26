import { useState, useCallback, useEffect } from 'react';

export type WebNotificationPermission = 'granted' | 'denied' | 'default';

interface WebNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: Record<string, unknown>;
  onClick?: () => void;
}

const STORAGE_KEY = 'timetrade_push_notifications';

interface PushSettings {
  enabled: boolean;
  priceAlerts: boolean;
  transactions: boolean;
  security: boolean;
}

const defaultSettings: PushSettings = {
  enabled: false,
  priceAlerts: true,
  transactions: true,
  security: true,
};

export function useWebNotifications() {
  const [permission, setPermission] = useState<WebNotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [settings, setSettings] = useState<PushSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore parse errors
    }
    return defaultSettings;
  });

  // Check support and current permission on mount
  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission as WebNotificationPermission);
    }
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  /**
   * Request permission to show notifications
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Web Notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as WebNotificationPermission);
      
      if (result === 'granted') {
        setSettings(prev => ({ ...prev, enabled: true }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [isSupported]);

  /**
   * Show a web notification
   */
  const showNotification = useCallback((options: WebNotificationOptions): Notification | null => {
    if (!isSupported || permission !== 'granted' || !settings.enabled) {
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge,
        tag: options.tag,
        requireInteraction: options.requireInteraction,
        silent: options.silent,
        data: options.data,
      });

      if (options.onClick) {
        notification.onclick = () => {
          window.focus();
          options.onClick?.();
          notification.close();
        };
      }

      // Auto-close after 5 seconds if not requiring interaction
      if (!options.requireInteraction) {
        setTimeout(() => notification.close(), 5000);
      }

      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return null;
    }
  }, [isSupported, permission, settings.enabled]);

  /**
   * Show a price alert notification
   */
  const showPriceAlertNotification = useCallback((
    symbol: string,
    price: number,
    condition: 'above' | 'below',
    targetPrice: number,
    onClick?: () => void
  ) => {
    if (!settings.priceAlerts) return null;

    const direction = condition === 'above' ? '📈' : '📉';
    const verb = condition === 'above' ? 'crossed above' : 'dropped below';
    
    return showNotification({
      title: `${direction} ${symbol} Price Alert`,
      body: `${symbol} has ${verb} $${targetPrice.toLocaleString()}! Current price: $${price.toLocaleString()}`,
      tag: `price-alert-${symbol}`,
      icon: '/favicon.ico',
      onClick,
    });
  }, [settings.priceAlerts, showNotification]);

  /**
   * Show a transaction notification
   */
  const showTransactionNotification = useCallback((
    type: 'received' | 'sent' | 'confirmed' | 'failed',
    amount: string,
    symbol: string,
    from?: string,
    to?: string,
    onClick?: () => void
  ) => {
    if (!settings.transactions) return null;

    let title: string;
    let body: string;
    let icon = '✓';

    switch (type) {
      case 'received':
        title = `💰 Received ${amount} ${symbol}`;
        body = from ? `From ${from.slice(0, 8)}...${from.slice(-6)}` : 'Incoming transaction received';
        break;
      case 'sent':
        title = `📤 Sent ${amount} ${symbol}`;
        body = to ? `To ${to.slice(0, 8)}...${to.slice(-6)}` : 'Transaction sent successfully';
        break;
      case 'confirmed':
        title = `✅ Transaction Confirmed`;
        body = `Your ${amount} ${symbol} transfer has been confirmed`;
        break;
      case 'failed':
        title = `❌ Transaction Failed`;
        body = `Your ${amount} ${symbol} transfer failed`;
        icon = '✗';
        break;
    }

    return showNotification({
      title,
      body,
      tag: `transaction-${Date.now()}`,
      icon: '/favicon.ico',
      onClick,
    });
  }, [settings.transactions, showNotification]);

  /**
   * Show a security notification
   */
  const showSecurityNotification = useCallback((
    title: string,
    message: string,
    onClick?: () => void
  ) => {
    if (!settings.security) return null;

    return showNotification({
      title: `🔐 ${title}`,
      body: message,
      tag: `security-${Date.now()}`,
      requireInteraction: true,
      icon: '/favicon.ico',
      onClick,
    });
  }, [settings.security, showNotification]);

  /**
   * Update notification settings
   */
  const updateSettings = useCallback((updates: Partial<PushSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Disable all notifications
   */
  const disableNotifications = useCallback(() => {
    setSettings(prev => ({ ...prev, enabled: false }));
  }, []);

  return {
    isSupported,
    permission,
    settings,
    requestPermission,
    showNotification,
    showPriceAlertNotification,
    showTransactionNotification,
    showSecurityNotification,
    updateSettings,
    disableNotifications,
  };
}
