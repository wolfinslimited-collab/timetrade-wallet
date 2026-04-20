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

        await PushNotifications.register();

        PushNotifications.addListener("registration", async (token) => {
          const platform = Capacitor.getPlatform() === "ios" ? "iphone" : "android";
          const { error } = await supabase.from("fcm_tokens").upsert(
            { token: token.value, platform } as any,
            { onConflict: "token" }
          );
          if (error) {
            setStatus('error');
            setErrorMessage('Failed to save push token');
          } else {
            setStatus('registered');
          }
        });

        PushNotifications.addListener("registrationError", (err) => {
          setStatus('error');
          setErrorMessage(err?.error || 'Native push registration failed');
        });

        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          const title = notification.title || "Timetrade Wallet";
          const body = notification.body || "";
          toast(title, { description: body });
        });
      } catch {
        setStatus('error');
        setErrorMessage('Push notification setup failed');
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
          return;
        }

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
        } else {
          setStatus('registered');
        }
      } catch {
        setStatus('error');
        setErrorMessage('Web push setup failed');
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

  return { status, errorMessage };
}