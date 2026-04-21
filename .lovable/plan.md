

## Fix Notification System End-to-End

### Root Causes Identified

1. **Web preview (iframe)**: Registration is intentionally skipped — this is correct behavior, not a bug. Notifications cannot work in the Lovable preview iframe.
2. **Published web**: Only 1 stale web token exists in the database. The published app at `timetrade-wallet.lovable.app` should work but needs fresh token registration.
3. **iOS native**: Zero iPhone tokens registered. The APNs entitlements injection was added to the CI script but needs a fresh build to take effect. Additionally, `@capacitor/push-notifications` may not be installed as a dependency.

### Plan

#### 1. Ensure Capacitor push-notifications plugin is installed
- Verify `@capacitor/push-notifications` is in `package.json`. If missing, add it as a dependency.

#### 2. Add visible debug feedback during development
- Update `useFCMToken` to show a toast when registration succeeds or fails (only in development or when explicitly enabled), so you can immediately see what happened on the device after app launch.
- Add a temporary debug line in `NotificationSettingsSheet` that shows the current `fcmStatus` and `errorMessage` values so you can see the exact state on-device.

#### 3. Handle stale/expired web tokens
- Update the `fcm-push` edge function to log the FCM API error response body for each failed token (currently it silently increments `failed` counter). This will reveal if the existing web token is expired/unregistered.

#### 4. Verify iOS build includes push capability
- The entitlements injection was already added to `github-build`. Trigger a fresh iOS build after these changes to confirm APNs entitlements are applied.
- Ensure `Info.plist` includes `UIBackgroundModes` with `remote-notification` (already in CI script).

#### 5. Add a manual "Test Push" button in NotificationSettingsSheet
- Add a button that calls `fcm-push` with a test payload targeting the current platform. This lets you verify the full loop (registration → send → receive) directly from the device.

### Files to modify
- `package.json` — verify/add `@capacitor/push-notifications` dependency
- `src/hooks/useFCMToken.ts` — add debug toasts for registration success/failure
- `src/components/settings/NotificationSettingsSheet.tsx` — show FCM status details and add "Send Test" button
- `supabase/functions/fcm-push/index.ts` — log detailed error responses for failed sends

### What will NOT work (by design)
- Notifications in the Lovable preview iframe — this is expected and correct
- iOS push without a fresh native build that includes APNs entitlements

