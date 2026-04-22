import { useState, useEffect, useCallback } from "react";
import { projectASupabase } from "@/lib/externalSupabase";
import { usePlatform } from "./usePlatform";

export interface ServerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  icon: string | null;
  target_platform: string;
  created_at: string;
}

const DISMISSED_KEY = "timetrade_dismissed_notifications";

const getDismissedIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
};

export const dismissServerNotification = (id: string) => {
  const ids = getDismissedIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  }
};

export const useServerNotifications = () => {
  const platform = usePlatform();
  const [notifications, setNotifications] = useState<ServerNotification[]>([]);

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await projectASupabase
      .from("push_notifications")
      .select("id, type, title, message, icon, target_platform, created_at")
      .eq("is_active", true)
      .in("target_platform", ["all", platform])
      .order("created_at", { ascending: false });

    if (error || !data) return;

    const dismissed = getDismissedIds();
    const now = new Date();
    const filtered = (data as any[]).filter((n) => {
      if (dismissed.includes(n.id)) return false;
      if (n.expires_at && new Date(n.expires_at) < now) return false;
      return true;
    });

    setNotifications(filtered);
  }, [platform]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    const onFocus = () => fetchNotifications();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchNotifications]);

  return { notifications, refetch: fetchNotifications };
};