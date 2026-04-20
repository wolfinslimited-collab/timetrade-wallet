import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { requestFCMToken, onForegroundMessage } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useFCMToken() {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      registerNative();
    } else {
      registerWeb();
    }

    async function registerNative() {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== "granted") return;

        await PushNotifications.register();

        PushNotifications.addListener("registration", async (token) => {
          const platform = Capacitor.getPlatform() === "ios" ? "iphone" : "android";
          await supabase.from("fcm_tokens").upsert(
            { token: token.value, platform } as any,
            { onConflict: "token" }
          );
        });

        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          const title = notification.title || "Timetrade Wallet";
          const body = notification.body || "";
          toast(title, { description: body });
        });
      } catch {
        // Silent fail
      }
    }

    async function registerWeb() {
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

    // Listen for foreground messages
    if (isNative) return; // Native uses its own listener above

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