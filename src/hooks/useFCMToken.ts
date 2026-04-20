import { useEffect } from "react";
import { requestFCMToken, onForegroundMessage } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useFCMToken() {
  useEffect(() => {
    async function register() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const token = await requestFCMToken();
        if (!token) return;

        // Determine platform
        const ua = navigator.userAgent.toLowerCase();
        let platform = "web";
        if (ua.includes("android")) platform = "android";
        else if (ua.includes("iphone") || ua.includes("ipad")) platform = "iphone";

        // Upsert token
        await supabase.from("fcm_tokens").upsert(
          { token, platform } as any,
          { onConflict: "token" }
        );
      } catch {
        // Silent fail
      }
    }

    register();

    // Listen for foreground messages
    const unsub = onForegroundMessage((payload) => {
      const title = payload?.notification?.title || "Timetrade Wallet";
      const body = payload?.notification?.body || "";
      toast(title, { description: body });
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);
}