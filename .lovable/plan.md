

## Fix: Web Notification Permission Handling in Iframe Context

### Problem
The Notification API's `requestPermission()` is blocked by browsers when called from a cross-origin iframe (the Lovable preview). This causes the "Permission Denied" state. The notifications WILL work on the published domain.

### Changes

**1. Update `NotificationSettingsSheet.tsx`**
- Detect iframe context (`window.self !== window.top`)
- When in iframe: show an info banner explaining notifications must be enabled from the published app URL, not the preview
- When NOT in iframe (published app): show the normal enable/test flow as-is
- Always show server notification settings (price alerts, transactions, security toggles) since those work everywhere

**2. Update `useWebNotifications.ts`**
- Add iframe detection to `requestPermission()` — return early with a descriptive state instead of silently failing
- Add an `isIframe` flag to the return value so UI can adapt

**3. Improve the Settings notification section**
- Split into two sections: "In-App Notifications" (always works, powered by server polling) and "Browser Push Notifications" (requires published domain)
- Make it clear that in-app notifications from the admin panel work regardless of browser permission

### For iOS and Android native push
This requires Firebase Cloud Messaging (FCM) + `@capacitor/push-notifications` plugin — a separate larger effort. The current server polling system already delivers notifications inside the app on all platforms.

### Files touched
- `src/hooks/useWebNotifications.ts` — add iframe detection
- `src/components/settings/NotificationSettingsSheet.tsx` — iframe-aware UI with clear guidance

