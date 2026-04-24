import { useEffect, useRef, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { projectASupabase } from "@/lib/externalSupabase";
import { toast } from "sonner";

export type FCMStatus = 'idle' | 'requesting' | 'registered' | 'denied' | 'error';

export interface PushDebugEntry {
  ts: string;
  event: string;
  payload?: string;
  isError?: boolean;
}

const STORAGE_KEY = 'timetrade:push-debug';

function loadDebugLog(): PushDebugEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistDebugLog(entries: PushDebugEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-100))); } catch {}
}

export function useFCMToken(options?: { disabled?: boolean }) {
  const [status, setStatus] = useState<FCMStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const registeredRef = useRef(false); 
  const [tokenValue, setTokenValue] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<PushDebugEntry[]>(loadDebugLog);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addDebug = useCallback((event: string, payload?: string, isError?: boolean) => {
    const entry: PushDebugEntry = { ts: new Date().toISOString(), event, payload, isError };
    setDebugLog(prev => {
      const next = [...prev, entry].slice(-100);
      persistDebugLog(next);
      return next;
    });
  }, []);

  const clearDebugLog = useCallback(() => {
    setDebugLog([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  useEffect(() => {
    if (options?.disabled) return;
    if (registeredRef.current) return;
    registeredRef.current = true;

    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    addDebug('init', `native=${isNative} platform=${platform}`);

    // Timeout: if still 'requesting' after 15s, mark as error
    timeoutRef.current = setTimeout(() => {
      setStatus(prev => {
        if (prev === 'requesting') {
          const msg = 'Push registration timed out after 15s. The registration callback was never received.';
          setErrorMessage(msg);
          addDebug('timeout', msg, true);
          return 'error';
        }
        return prev;
      });
    }, 15000);

    async function saveToken(token: string, platform: string) {
      setTokenValue(token);
      // Clear timeout on successful token receipt
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      // Try insert first; if token already exists (duplicate), just treat as success
      const { error } = await projectASupabase.from("fcm_tokens").insert(
        { token, platform } as any
      );
      if (error && error.code === '23505') {
        // Duplicate token — already registered, treat as success
        setStatus('registered');
        addDebug('token-already-exists', `platform=${platform} token=${token.substring(0, 20)}...`);
      } else if (error) {
        setStatus('error');
        setErrorMessage('Failed to save push token');
        addDebug('token-save-error', error.message, true);
      } else {
        setStatus('registered');
        addDebug('token-saved', `platform=${platform} token=${token.substring(0, 20)}...`);
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
          addDebug('permission-check', `current=${receive}`);
          if (receive === 'prompt' || receive === 'prompt-with-rationale') {
            const req = await PushNotifications.requestPermissions();
            receive = req.receive;
          }
          addDebug('permission-result', receive);
          if (receive !== 'granted') {
            setStatus(receive === 'denied' ? 'denied' : 'idle');
            return;
          }

          // Listen BEFORE register() so we don't miss the event
          await PushNotifications.addListener('registration', async (token) => {
            const capPlatform = Capacitor.getPlatform(); // 'ios' or 'android'
            const rawToken = token.value;
            addDebug('registration-fired', `platform=${capPlatform} token=${rawToken.substring(0, 20)}...`);

            // Android: token.value is already an FCM registration token
            if (capPlatform === 'android') {
              await saveToken(rawToken, 'android');
              return;
            }

            // iOS: token.value is an APNs device token (hex string)
            // Convert it to an FCM registration token via our edge function
            try {
              addDebug('apns-conversion-start', rawToken.substring(0, 20));
              const { data, error } = await projectASupabase.functions.invoke('apns-to-fcm', {
                body: { apns_token: rawToken, sandbox: false },
              });
              if (error) {
                addDebug('apns-conversion-error', `invoke error: ${error.message}`, true);
                throw error;
              }
              const fcmToken = (data as { fcm_token?: string } | null)?.fcm_token;
              if (!fcmToken) {
                addDebug('apns-conversion-error', `No fcm_token in response: ${JSON.stringify(data)}`, true);
                throw new Error('No fcm_token returned from apns-to-fcm');
              }
              addDebug('apns-conversion-success', fcmToken.substring(0, 20));
              await saveToken(fcmToken, 'ios');
            } catch (e: any) {
              // Fall back to storing the raw APNs token so the device is at least known
              await saveToken(rawToken, 'iphone');
              setErrorMessage(e?.message || 'APNs->FCM conversion failed');
            }
          });

          await PushNotifications.addListener('registrationError', (err) => {
            setStatus('error');
            const msg = err?.error || 'Push registration error';
            setErrorMessage(msg);
            addDebug('registration-error', msg, true);
            if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
          });

          await PushNotifications.addListener('pushNotificationReceived', (notification) => {
            const title = notification.title || "Timetrade Wallet";
            const body = notification.body || "";
            toast(title, { description: body });
          });

          addDebug('register-called');
          await PushNotifications.register();
        } catch (e: any) {
          setStatus('error');
          const msg = e?.message || 'Native push setup failed';
          setErrorMessage(msg);
          addDebug('setup-error', msg, true);
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

        addDebug('web-token-received', token.substring(0, 20) + "...");
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
  }, [options?.disabled]);

  const sendTestPush = useCallback(async () => {
    try {
      const res = await projectASupabase.functions.invoke("fcm-push", {
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

  const reRegister = useCallback(() => {
    registeredRef.current = false;
    setStatus('idle');
    setErrorMessage(null);
    setTokenValue(null);
    addDebug('manual-re-register');
    // Force re-run by toggling a dummy state — but since registeredRef is checked in useEffect,
    // we need to remount. Instead just re-run inline for native.
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      (async () => {
        try {
          setStatus('requesting');
          const { PushNotifications } = await import("@capacitor/push-notifications");
          addDebug('re-register-called');
          await PushNotifications.register();
        } catch (e: any) {
          addDebug('re-register-error', e?.message, true);
        }
      })();
    }
  }, [addDebug]);

  return { status, errorMessage, tokenValue, sendTestPush, debugLog, clearDebugLog, reRegister };
}