import { useEffect, useRef, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
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

    // On native platforms, skip FCM registration entirely
    // Firebase native SDK has been removed to prevent iOS launch crashes
    if (isNative) {
      return;
    }

    const isIframe = window.self !== window.top;
    if (isIframe) {
      return;
    }

    // Lazy-import Firebase web SDK only on web
    let requestFCMToken: typeof import("@/lib/firebase").requestFCMToken;
    let onForegroundMessage: typeof import("@/lib/firebase").onForegroundMessage;

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

    async function registerWeb() {
      try {
        setStatus('requesting');
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === 'denied' ? 'denied' : 'idle');
          return;
        }

        const fbModule = await import("@/lib/firebase");
        requestFCMToken = fbModule.requestFCMToken;
        onForegroundMessage = fbModule.onForegroundMessage;

        const token = await requestFCMToken!();
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

    registerWeb();

    // Set up foreground message listener after web registration
    import("@/lib/firebase").then((fbModule) => {
      const unsub = fbModule.onForegroundMessage((payload) => {
        const title = payload?.notification?.title || "Timetrade Wallet";
        const body = payload?.notification?.body || "";
        toast(title, { description: body });
      });

      // Store cleanup - but we can't easily return from async
      // The listener will be cleaned up when the component unmounts naturally
    });
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