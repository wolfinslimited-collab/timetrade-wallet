

# iOS Crash — Final Fix: Strip Firebase from Native iOS

## Why previous fixes did not work

Over the last 3 rounds we addressed:
1. WalletConnect (removed) — necessary, but not the crash cause
2. Firebase web SDK guarded for native — necessary, but not the crash cause
3. `FirebaseApp.configure()` added to AppDelegate.swift — necessary, but exposed a deeper issue

The build succeeds and the IPA uploads to TestFlight cleanly. The crash happens **at app launch on the device** — which means the issue is in the native runtime, specifically in the Firebase iOS SDK + APNs interaction.

## The real remaining problem

The app has these on iOS:
- `@capacitor-firebase/messaging` plugin → pulls in the full **Firebase iOS SDK 12.7** via SPM
- `aps-environment = production` entitlement
- An `App.entitlements` file with push entitlement
- A provisioning profile that may NOT have the Push Notifications capability enabled in Apple Developer portal

When iOS launches the app:
1. `FirebaseApp.configure()` runs (we added this — fine)
2. `@capacitor-firebase/messaging` plugin loads and registers the `MessagingDelegate`
3. iOS sees `aps-environment` and may auto-trigger `registerForRemoteNotifications()`
4. If the provisioning profile lacks the push entitlement, iOS throws `NSInternalInconsistencyException` → **immediate crash**

Even with the entitlement present, the Firebase SDK's `MessagingDelegate` setup requires the AppDelegate to forward APNs callbacks (`didRegisterForRemoteNotificationsWithDeviceToken`). Our minimal AppDelegate does not, and Firebase's "auto-init" can crash when it can't find a token.

## The fix: remove Firebase iOS SDK entirely from the native build

We will keep push notifications working via:
- **Web** → existing `firebase/messaging` Web SDK (already working)
- **iOS native** → no push for now (the app does not depend on push for any critical flow; FCM token registration is non-essential)

This eliminates:
- The Firebase iOS SDK dependency chain (FirebaseCore, FirebaseMessaging, GoogleUtilities)
- The APNs entitlement requirement
- The fatal launch-time crash

### Changes

**1. `package.json`**
- Remove `@capacitor-firebase/messaging`

**2. `src/hooks/useFCMToken.ts`**
- Remove the `import("@capacitor-firebase/messaging")` dynamic import
- On native platforms, set status to `'idle'` and return early — do not attempt FCM registration
- Web path remains unchanged

**3. `.github/workflows/build-ios.yml`**
- Remove the `Patch AppDelegate with Firebase init` step (no longer needed — no Firebase native SDK)
- Remove the `aps-environment` entitlement from `App.entitlements`
- Remove the `UIBackgroundModes` `remote-notification` entry from Info.plist
- Remove the GoogleService-Info.plist preservation/Xcode-target injection logic
- Keep `GoogleService-Info.plist` in the repo for now (does no harm if unreferenced)

**4. `supabase/functions/github-build/index.ts`**
- Mirror all of the above workflow changes in the edge function template

**5. `ios/App/App/GoogleService-Info.plist`**
- Leave in place; only used if Firebase native SDK is reintroduced later

### Files to edit
- `package.json`
- `src/hooks/useFCMToken.ts`
- `.github/workflows/build-ios.yml`
- `supabase/functions/github-build/index.ts`
- Re-deploy the `github-build` edge function

### Why this will work
Without `@capacitor-firebase/messaging`, the Firebase iOS SDK is never linked into the app binary. Without the `aps-environment` entitlement, iOS does not validate push capability against the provisioning profile at launch. The launch sequence becomes the standard Capacitor flow:
1. iOS loads stock `AppDelegate.swift` (no Firebase code)
2. Capacitor bridge initializes the WKWebView
3. Web bundle loads — React mounts — app runs

After this, the iOS app will boot cleanly. Push notifications can be re-added later with a proper Apple Developer push capability + AppDelegate APNs delegates if needed.

### Trade-offs
- iOS app will not receive push notifications (web/Android still get them)
- Notification center inside the app (UI) still works — only the OS-level push delivery is removed

