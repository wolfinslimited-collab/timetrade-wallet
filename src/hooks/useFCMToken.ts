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

    if (!isNative && isIframe) {
      return;
    }

    if (isNative) {
      registerNative();
    } else {
      registerWeb();
    }

    async function saveToken(token: string, platform: string) {
      setTokenValue(token);
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
        toast.success("Push notifications registered!");
      }
    }

    async function registerNative() {
      try {
        setStatus('requesting');
        
        // Add a timeout so we don't hang forever if plugin isn't available
        const timeoutMs = 15000;
        const timeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
          Promise.race([
            promise,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms)),
          ]);

        let FirebaseMessaging: any;
        try {
          const mod = await timeout(import("@capacitor-firebase/messaging"), 5000);
          FirebaseMessaging = mod.FirebaseMessaging;
        } catch {
          setStatus('error');
          setErrorMessage('Firebase Messaging plugin not available. Rebuild the app.');
          return;
        }

        const permResult: any = await timeout(FirebaseMessaging.requestPermissions(), timeoutMs);
        if (permResult?.receive !== "granted") {
          setStatus('denied');
          return;
        }

        const platform = Capacitor.getPlatform() === "ios" ? "iphone" : "android";

        // Get the real FCM token (bridges APNS→FCM on iOS)
        const result: any = await timeout(FirebaseMessaging.getToken(), timeoutMs);
        const token = result?.token;
        if (token) {
          toast(`FCM token received (${platform})`, { description: token.substring(0, 20) + "..." });
          await saveToken(token, platform);
        }

        // Listen for token refresh
        FirebaseMessaging.addListener("tokenReceived", async (event) => {
          await saveToken(event.token, platform);
        });

        // Foreground notifications
        FirebaseMessaging.addListener("notificationReceived", (event) => {
          const title = event.notification?.title || "Timetrade Wallet";
          const body = event.notification?.body || "";
          toast(title, { description: body });
        });
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

        const ua = navigator.userAgent.toLowerCase();
        let platform = "web";
        if (ua.includes("android")) platform = "android";
        else if (ua.includes("iphone") || ua.includes("ipad")) platform = "iphone";

        toast(`Web push token received`, { description: token.substring(0, 20) + "..." });
        await saveToken(token, platform);
      } catch {
        setStatus('error');
        setErrorMessage('Web push setup failed');
        toast.error("Web push setup failed");
      }
    }

    if (isNative) return;

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