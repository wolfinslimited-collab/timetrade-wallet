

## Fix Push Notifications (iOS Native + Web)

### Problem 1: iPhone stuck on "Setting up notifications..."
The native registration code calls `PushNotifications.register()` **before** adding the `registration` event listener. On iOS, the token can arrive instantly, so the event fires before the listener exists — the token is silently lost and the status stays stuck on `requesting`.

### Problem 2: Web token expired
The existing web token in the database is stale (FCM returns `UNREGISTERED`). The cleanup code correctly deletes it, but a fresh token needs to be registered by visiting the published app.

### Fix

**File: `src/hooks/useFCMToken.ts`**
- Move all three `addListener` calls (`registration`, `registrationError`, `pushNotificationReceived`) **before** the `PushNotifications.register()` call
- This ensures the token event is captured even if it fires immediately

This is the only code change needed. After deploying, the user needs to:
1. Build a fresh iOS IPA (to pick up the fix)
2. Open the published web app to re-register a fresh web token

### Technical Details

```
BEFORE (broken):
  PushNotifications.register()      ← token fires here, no listener yet
  addListener("registration", ...)  ← too late

AFTER (fixed):
  addListener("registration", ...)  ← listener ready
  addListener("registrationError")
  addListener("pushNotificationReceived")
  PushNotifications.register()      ← token fires, listener catches it
```

