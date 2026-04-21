import { useEffect, useRef, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { requestFCMToken, onForegroundMessage } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FCMStatus = 'idle' | 'requesting' | 'registered' | 'denied' | 'error';

export function useFCMToken() {
  const [status, setStatus] = useState<FCMStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const registeredRef = useRef(false); 
  const [tokenValue, setTokenValue] = useState<string | null>(null);

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    const isNative = Capacitor.isNativePlatform();
    const isIframe = !isNative && window.self !== window.top;

    // Skip registration in iframe preview
    if (!isNative && isIframe) {
      return;
    }

    if (isNative) {
      registerNative();
    } else {
      registerWeb();
    }

    async function registerNative() {
      try {
        setStatus('requesting');
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== "granted") {
          setStatus('denied');
          return;
        }

        PushNotifications.addListener("registration", async (token) => {
          const platform = Capacitor.getPlatform() === "ios" ? "iphone" : "android";
          toast(`Push token received (${platform})`, { description: token.value.substring(0, 20) + "..." });
          setTokenValue(token.value);
          const { error } = await supabase.from("fcm_tokens").upsert(
            { token: token.value, platform } as any,
            { onConflict: "token" }
          );
          if (error) {
            setStatus('error');
            setErrorMessage('Failed to save push token');
            toast.error("Failed to save push token", { description: error.message });
          } else {
            setStatus('registered');
            toast.success("Push notifications registered!");
          }
        });

        PushNotifications.addListener("registrationError", (err) => {
          setStatus('error');
          setErrorMessage(err?.error || 'Native push registration failed');
          toast.error("Push registration failed", { description: err?.error });
        });

        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          const title = notification.title || "Timetrade Wallet";
          const body = notification.body || "";
          toast(title, { description: body });
        });

        await PushNotifications.register();
      } catch {
        setStatus('error');
        setErrorMessage('Push notification setup failed');
        toast.error("Push notification setup failed");
      }
    }

    async function registerWeb() {
      try {
        setStatus('requesting');
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === 'denied' ? 'denied' : 'idle');
          return;
        }

        const token = await requestFCMToken();
        if (!token) {
          setStatus('error');
          setErrorMessage('Failed to get FCM token');
          toast.error("Failed to get FCM token");
          return;
        }

        setTokenValue(token);
        toast(`Web push token received`, { description: token.substring(0, 20) + "..." });

        // Determine platform
        const ua = navigator.userAgent.toLowerCase();
        let platform = "web";
        if (ua.includes("android")) platform = "android";
        else if (ua.includes("iphone") || ua.includes("ipad")) platform = "iphone";

        // Upsert token
        const { error } = await supabase.from("fcm_tokens").upsert(
          { token, platform } as any,
          { onConflict: "token" }
        );
        if (error) {
          setStatus('error');
          setErrorMessage('Failed to save push token');
          toast.error("Failed to save push token", { description: error.message });
        } else {
          setStatus('registered');
          toast.success("Web push notifications registered!");
        }
      } catch {
        setStatus('error');
        setErrorMessage('Web push setup failed');
        toast.error("Web push setup failed");
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

  const sendTestPush = useCallback(async () => {
    try {
      const res = await supabase.functions.invoke("fcm-push", {
        body: { title: "Test Push", message: "If you see this, push notifications work!", type: "info" },
      });
      if (res.error) {
        toast.error("Test push failed", { description: res.error.message });
      } else {
        toast.success("Test push sent!", { description: JSON.stringify(res.data) });
      }
    } catch (e: any) {
      toast.error("Test push error", { description: e.message });
    }
  }, []);

  return { status, errorMessage, tokenValue, sendTestPush };
}