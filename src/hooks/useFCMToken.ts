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

    // Native (iOS/Android) path: use @capacitor/push-notifications
    // This plugin DOES NOT pull in Firebase iOS SDK — it talks directly to APNs/FCM
    // and is safe at app launch.
    if (isNative) {
      (async () => {
        try {
          setStatus('requesting');
          const { PushNotifications } = await import("@capacitor/push-notifications");

          const perm = await PushNotifications.checkPermissions();
          let receive = perm.receive;
          if (receive === 'prompt' || receive === 'prompt-with-rationale') {
            const req = await PushNotifications.requestPermissions();
            receive = req.receive;
          }
          if (receive !== 'granted') {
            setStatus(receive === 'denied' ? 'denied' : 'idle');
            return;
          }

          // Listen BEFORE register() so we don't miss the event
          await PushNotifications.addListener('registration', async (token) => {
            const platform = Capacitor.getPlatform(); // 'ios' or 'android'
            const rawToken = token.value;

            // Android: token.value is already an FCM registration token
            if (platform === 'android') {
              await saveToken(rawToken, 'android');
              return;
            }

            // iOS: token.value is an APNs device token (hex string)
            // Convert it to an FCM registration token via our edge function
            try {
              const { data, error } = await supabase.functions.invoke('apns-to-fcm', {
                body: { apns_token: rawToken, sandbox: true },
              });
              if (error) throw error;
              const fcmToken = (data as { fcm_token?: string } | null)?.fcm_token;
              if (!fcmToken) throw new Error('No fcm_token returned from apns-to-fcm');
              await saveToken(fcmToken, 'ios');
            } catch (e: any) {
              // Fall back to storing the raw APNs token so the device is at least known
              await saveToken(rawToken, 'iphone');
              setErrorMessage(e?.message || 'APNs->FCM conversion failed');
            }
          });

          await PushNotifications.addListener('registrationError', (err) => {
            setStatus('error');
            setErrorMessage(err?.error || 'Push registration error');
          });

          await PushNotifications.addListener('pushNotificationReceived', (notification) => {
            const title = notification.title || "Timetrade Wallet";
            const body = notification.body || "";
            toast(title, { description: body });
          });

          await PushNotifications.register();
        } catch (e: any) {
          setStatus('error');
          setErrorMessage(e?.message || 'Native push setup failed');
        }
      })();
      return;
    }

    const isIframe = window.self !== window.top;
    if (isIframe) {
      return;
    }

    // Lazy-import Firebase web SDK only on web
    let requestFCMToken: typeof import("@/lib/firebase").requestFCMToken;
    let onForegroundMessage: typeof import("@/lib/firebase").onForegroundMessage;

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