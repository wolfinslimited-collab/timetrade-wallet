

# Fix iPhone Push Notifications

## Problem
iPhone receives nothing because (1) no iOS device has ever registered an FCM token (DB has only 1 `web` token), and (2) the iOS app uses `@capacitor/push-notifications` which returns an **APNS token**, not the **FCM token** that `fcm-push` requires.

## Solution
Add the Capacitor Firebase Messaging plugin so iOS produces real FCM tokens, and make the registration hook prefer it on native. Also harden the backend to auto-clean invalid tokens.

## Changes

### 1. Add Firebase Messaging plugin
- Install `@capacitor-firebase/messaging` (works alongside existing `@capacitor/push-notifications`)
- This plugin bridges APNS ↔ FCM on iOS so we get a Firebase token usable by `fcm-push`

### 2. Update `src/hooks/useFCMToken.ts` — native flow
- On native iOS/Android: request permission via `FirebaseMessaging.requestPermissions()`
- Call `FirebaseMessaging.getToken()` → real FCM token
- Save with `platform: "iphone"` or `"android"` and `onConflict: "token"`
- Listen to `tokenReceived` event for token refresh
- Listen to `notificationReceivedEvent` for foreground toasts
- Keep `@capacitor/push-notifications` only for the iOS APNS permission prompt (FirebaseMessaging delegates to it under the hood, so we can remove the duplicate path)

### 3. iOS build workflow (`.github/workflows/build-ios.yml` + `supabase/functions/github-build/index.ts`)
- Already adds `aps-environment = production` and `remote-notification` background mode ✅
- Add a step that copies `GoogleService-Info.plist` into the Xcode target's "Copy Bundle Resources" (currently it sits in the folder but isn't always added to the target by `cap add ios`) — required for `FirebaseApp.configure()` to find credentials
- Verify `@capacitor-firebase/messaging` Pod gets installed via `npx cap sync ios`

### 4. Backend hardening (`supabase/functions/fcm-push/index.ts`)
- Add `apns` config to the FCM payload so iOS shows alerts when app is backgrounded:
  ```ts
  apns: {
    payload: { aps: { sound: "default", "content-available": 1 } }
  }
  ```
- Expand invalid-token cleanup to also delete on `INVALID_ARGUMENT` and `NOT_FOUND` errors (the current APNS-token-as-FCM-token rows will be auto-purged on first send)
- Return `failedDetails` array in response so admin UI can show why a send failed

### 5. Admin UI feedback (`src/pages/AdminNotificationsPage.tsx`)
- Show breakdown after send: `Sent: X • Failed: Y` and per-platform counts
- Add a small "Registered Devices" section that queries `fcm_tokens` grouped by platform so the admin can see at a glance whether an iPhone is even registered

### 6. Cleanup of bad token
- One-time SQL migration to delete the existing stale web token if you want a clean slate (optional — safe because it'll just re-register on next visit)

## What you'll need to do after this ships
1. Pull the repo locally
2. Run `npm install` and `npx cap sync ios`
3. Rebuild via the **Build Center** (the CI workflow update will handle entitlements + plist resource on the cloud build)
4. Install the new `.ipa` on your iPhone via TestFlight
5. Open the app → accept the notification permission prompt → wait for the "Push notifications registered!" toast
6. Verify a new row appears in `fcm_tokens` with `platform = 'iphone'` and a token starting with something like `c1A2b3...` (long FCM token, not the short APNS hex)
7. Send a test notification from `/admin/notifications` — it should arrive on the iPhone within ~2 seconds

## Files Touched
- `package.json` — add `@capacitor-firebase/messaging`
- `src/hooks/useFCMToken.ts` — switch native path to FirebaseMessaging plugin
- `supabase/functions/fcm-push/index.ts` — add APNS payload, expand cleanup, return details
- `supabase/functions/github-build/index.ts` — add GoogleService-Info.plist resource step
- `.github/workflows/build-ios.yml` — same step (mirrored)
- `src/pages/AdminNotificationsPage.tsx` — registered-devices panel + per-platform send result

