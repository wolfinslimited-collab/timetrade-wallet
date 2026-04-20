

## Fix Push Notifications on Native (iOS/Android)

Two problems:

1. **"Not Supported" error in Settings**: The `useWebNotifications` hook checks `'Notification' in window`, which returns `false` inside Capacitor's WKWebView on iOS. The notification settings sheet then shows the "Not Supported" error. On native platforms, push notifications are handled by Firebase Cloud Messaging (FCM) via the native layer, not the browser Notification API -- so this check is wrong for native.

2. **No permission prompt on app startup**: The `useFCMToken` hook calls `Notification.requestPermission()` which also fails silently inside WKWebView. On native iOS/Android, the permission prompt must go through Capacitor's native push notification plugin, not the browser API.

### Plan

**Step 1: Update `useWebNotifications` to treat native platforms as supported**

In `src/hooks/useWebNotifications.ts`, import `Capacitor` and check `Capacitor.isNativePlatform()`. If native, set `isSupported = true` and skip the `'Notification' in window` check. For permission status on native, default to `'granted'` (since FCM handles the native permission flow separately).

**Step 2: Update `NotificationSettingsSheet` for native context**

In `src/components/settings/NotificationSettingsSheet.tsx`, detect native platform using `Capacitor.isNativePlatform()`. On native:
- Skip the "Not Supported" and "Preview Mode" warnings entirely
- Show the notification type toggles directly (price alerts, transactions, security)
- The "Enable" button should use FCM token registration flow instead of browser `Notification.requestPermission()`

**Step 3: Request native push permission on app startup**

Update `src/hooks/useFCMToken.ts` to handle native platforms properly:
- On native (Capacitor), use `@capacitor/push-notifications` plugin's `requestPermissions()` and `register()` methods to get the native APNs/FCM token
- On web, keep the existing browser Notification API flow
- Install `@capacitor/push-notifications` as a dependency
- Call the native permission request early in the app lifecycle so the iOS permission dialog appears on first launch

**Step 4: Update `useFCMToken` to register native tokens**

When running on native:
- Use `PushNotifications.requestPermissions()` then `PushNotifications.register()`
- Listen for `registration` event to get the native device token
- Upsert the native token to the `fcm_tokens` table with the correct platform
- Listen for `pushNotificationReceived` (foreground) to show in-app toasts
- Skip the Firebase web SDK messaging entirely on native (it does not work in WKWebView)

### Technical Details

- `@capacitor/push-notifications` provides the native bridge for APNs (iOS) and FCM (Android)
- On iOS, the native token from APNs is automatically forwarded to FCM if `GoogleService-Info.plist` is configured (already present in the project)
- On Android, `google-services.json` is already in the project
- The `useFCMToken` hook already runs in `AnimatedRoutes` (App.tsx), so it will trigger on startup
- The web Firebase SDK path (`firebase/messaging`) remains for browser-only usage

