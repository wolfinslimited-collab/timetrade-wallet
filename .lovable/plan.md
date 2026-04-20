
Fix notification delivery by addressing the receiver side, not the sender side.

What’s happening now

- The backend sender is working: test sends return success and report sent: 1.
- The database currently has only 1 registered push token, and it is platform = web.
- There are no iPhone tokens registered, so iOS devices cannot receive anything yet.
- The current web preview runs inside an iframe, which cannot properly enable browser push notifications, so sending from preview does not prove web push is working for the active session.
- Native notification state is currently misleading: the app marks native notifications as granted before confirming real OS permission and token registration.
- The iOS build pipeline recreates the native iOS project on every build, but it only restores the Google config file; it does not explicitly preserve or enforce push entitlements/capabilities each time.

Implementation plan

1. Make push registration state real and visible
- Refactor `useFCMToken` so it exposes actual states: `idle`, `requesting`, `granted`, `denied`, `registered`, `error`.
- Only mark notifications as enabled after a token is successfully received and saved.
- Add native listeners for `registrationError` and surface the real error instead of silently failing.

2. Fix the native notification settings flow
- Update `useWebNotifications` so native no longer pretends permission is granted by default.
- Update `NotificationSettingsSheet` to show true native status:
  - waiting for permission
  - permission denied
  - token registered
  - registration failed
- Keep web preview clearly labeled as preview-only so users understand why browser push is not available there.

3. Fix web push behavior
- Prevent the app from treating iframe preview as a valid push environment.
- Keep browser permission + FCM token registration only for published/real browser contexts.
- Ensure foreground web messages still show an in-app toast, while background messages continue through `firebase-messaging-sw.js`.
- Add clearer UI feedback when the current browser session has no registered token.

4. Fix iOS native registration path
- Harden `useFCMToken` native flow to:
  - call native permission APIs
  - register with the native plugin
  - save the returned token
  - report failures in UI
- Verify platform mapping stays consistent with backend filtering (`iphone`).

5. Make the iOS build pipeline preserve push capability on every build
- Update `supabase/functions/github-build/index.ts` so the recreated iOS project also gets:
  - an entitlements file with APNs capability
  - Xcode project wiring for `CODE_SIGN_ENTITLEMENTS`
  - required `Info.plist` push/background entries where needed
- Keep this automated because the CI job deletes and recreates `ios/` every build.

6. Add delivery diagnostics to the sender
- Improve `supabase/functions/fcm-push/index.ts` logging so each send records:
  - token count by platform
  - success/failure totals
  - provider error payloads for failed tokens
- Move the embedded Firebase service account out of source code and into backend secrets.

7. End-to-end verification
- Web:
  - open the published app
  - enable notifications there
  - confirm a `web` token exists for the current session
  - send a test notification and verify foreground/background behavior
- iOS:
  - install a fresh native build
  - confirm permission prompt appears on first run
  - confirm an `iphone` token is inserted into `fcm_tokens`
  - send a test notification with the app backgrounded and verify delivery

Technical notes

- The main failure is client registration, not the send endpoint.
- Preview push on web is expected to fail because the app is running inside an iframe.
- iOS currently shows no registered token in the database, which means either permission, native registration, or build-time APNs setup is failing before token save.
- The current hardcoded Firebase private key in `fcm-push` is a security risk and should be replaced with secrets during the fix.
