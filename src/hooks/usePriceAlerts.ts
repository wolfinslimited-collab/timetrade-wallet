import { useState, useCallback, useEffect } from "react";

export type AlertCondition = "above" | "below";

export interface PriceAlert {
  id: string;
  tokenId: string;
  tokenSymbol: string;
  tokenIcon: string;
  targetPrice: number;
  condition: AlertCondition;
  currentPrice: number;
  createdAt: Date;
  triggered: boolean;
}

const STORAGE_KEY = "timetrade_price_alerts";

export const usePriceAlerts = () => {
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((a: PriceAlert) => ({
        ...a,
        createdAt: new Date(a.createdAt),
      }));
    }
    return [];
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  const addAlert = useCallback((alert: Omit<PriceAlert, "id" | "createdAt" | "triggered">) => {
    const newAlert: PriceAlert = {
      ...alert,
      id: Date.now().toString(),
      createdAt: new Date(),
      triggered: false,
    };
    setAlerts((prev) => [newAlert, ...prev]);
    return newAlert;
  }, []);

  const deleteAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearTriggered = useCallback(() => {
    setAlerts((prev) => prev.filter((a) => !a.triggered));
  }, []);

  const getAlertsForToken = useCallback((tokenId: string) => {
    return alerts.filter((a) => a.tokenId === tokenId);
  }, [alerts]);

  return {
    alerts,
    addAlert,
    deleteAlert,
    clearTriggered,
    getAlertsForToken,
  };
};
