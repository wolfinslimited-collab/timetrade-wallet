
Goal: fix iOS push registration so the device actually receives a token instead of staying stuck on `requesting`.

What the logs show
- Permission is working on iOS: `permission-result = granted`.
- The app calls `PushNotifications.register()`.
- After that, neither `registration` nor `registrationError` ever fires.
- That means the failure is happening in the native iOS layer before the token reaches React.

What I found in the code
- `useFCMToken()` is mounted in multiple places:
  - `src/App.tsx`
  - `src/pages/NotificationsPage.tsx`
  - `src/components/settings/NotificationSettingsSheet.tsx`
- Because each hook instance has its own local `registeredRef`, the app is repeatedly re-initializing push registration. That explains the many repeated `init` and `register-called` events in your log.
- The web/native JS flow is mostly correct, but the repo does not show the native iOS app delegate / entitlement wiring that Capacitor requires for iOS push callbacks.
- Capacitor’s iOS docs require:
  - Push Notifications capability enabled
  - APNs entitlement (`aps-environment`)
  - `AppDelegate.swift` methods forwarding:
    - `didRegisterForRemoteNotificationsWithDeviceToken`
    - `didFailToRegisterForRemoteNotificationsWithError`
- Capacitor’s Firebase guide also requires iOS native Firebase Messaging setup, not just `GoogleService-Info.plist`.

Exact problem
```text
This is not mainly a React bug.
Your iOS app is granting notification permission, but the native app never returns an APNs registration callback.
So the JS layer waits forever and times out.
```

Implementation plan

1. Make push registration a single shared instance
- Refactor `useFCMToken` into a single app-level source of truth so registration runs once only.
- Keep the active registration logic at the top of the app.
- Update `NotificationsPage` and `NotificationSettingsSheet` to consume shared push state instead of starting their own registration flows.
- Result: no more repeated `init/register-called` loops and cleaner debugging.

2. Improve native registration diagnostics in the app
- Add more explicit statuses for:
  - permission granted but waiting for native callback
  - native callback missing
  - APNs token received
  - APNs-to-FCM conversion started/finished
- Show a clearer iOS-specific error message when registration never returns:
  - “iOS native push callback not received. This usually means missing iOS push capability, APNs entitlement, or AppDelegate forwarding.”

3. Fix the iOS native bridge requirements
- Update the iOS native project to include the required Capacitor push callback forwarding in `AppDelegate.swift`.
- Ensure the iOS target has Push Notifications capability enabled.
- Ensure the app has the correct `aps-environment` entitlement.
- Ensure the iOS target includes `GoogleService-Info.plist`.
- Ensure Firebase Messaging is linked for the iOS app target, as required by Capacitor’s iOS Firebase push setup.

4. Keep the existing APNs-to-FCM conversion flow, but only after native registration works
- Preserve the current logic in `src/hooks/useFCMToken.ts`:
  - get APNs token on iOS
  - send it to `apns-to-fcm`
  - save final token to `fcm_tokens`
- Add stricter handling so fallback APNs token storage only happens after a real `registration` event, never on timeout.

5. Prevent false retries from the UI
- Update the debug retry action so it does not stack multiple listeners or repeated blind `register()` calls.
- On retry, reset the shared registration state cleanly before attempting again.

Files to update
- `src/hooks/useFCMToken.ts`
- `src/App.tsx`
- `src/pages/NotificationsPage.tsx`
- `src/components/settings/NotificationSettingsSheet.tsx`
- Native iOS app files after sync/opening the native project:
  - `AppDelegate.swift`
  - app entitlements
  - iOS target capabilities / package configuration

Expected result
- iOS no longer gets stuck on `requesting`.
- Only one registration attempt happens per app launch.
- The app receives either:
  - a real APNs token and converts it to FCM, or
  - a real native error event
- The debug panel shows the real failure stage instead of timing out silently.

Technical details
```text
Current behavior
permission granted
-> register() called
-> no registration callback
-> timeout

Fixed behavior
single registration flow
-> iOS native callback received
-> APNs token captured
-> APNs converted to FCM
-> token saved
-> status = registered
```

Important note for native iOS
- If the native iOS project is missing push capability / entitlements / AppDelegate forwarding, no JavaScript-only fix can solve this completely.
- After native changes, the project will need to be synced into the iOS app and rebuilt so the native configuration takes effect.
