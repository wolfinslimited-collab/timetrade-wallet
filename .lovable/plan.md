

# Fix Push Notifications Not Received on iPhone

## Root Cause

The iOS app's push notification registration is failing silently because of two issues:

1. **APNs sandbox vs production mismatch**: The entitlements file sets `aps-environment` to `production`, but TestFlight builds use the APNs **sandbox** (development) environment. This means the device token is a sandbox token, but the `apns-to-fcm` edge function calls Firebase batchImport with `sandbox: false` (based on user input, defaulting to false). The conversion fails or returns an invalid FCM token.

2. **Silent failure in registration**: The `useFCMToken` hook catches errors but only shows toasts that may be missed. There is no persistent debug indicator showing whether registration succeeded or failed on the device.

## Changes

### 1. Fix APNs sandbox detection in `useFCMToken` (`src/hooks/useFCMToken.ts`)

When calling the `apns-to-fcm` edge function on iOS, always pass `sandbox: true` for TestFlight/debug builds. Since there is no reliable way to detect TestFlight vs App Store at runtime in a Capacitor webview, default to `sandbox: true` -- Firebase batchImport with `sandbox: true` works for both sandbox and production APNs tokens (it tries sandbox first, then production).

Change the edge function call from:
```typescript
const { data, error } = await supabase.functions.invoke('apns-to-fcm', {
  body: { apns_token: rawToken },
});
```
to:
```typescript
const { data, error } = await supabase.functions.invoke('apns-to-fcm', {
  body: { apns_token: rawToken, sandbox: true },
});
```

### 2. Add error logging in `apns-to-fcm` edge function (`supabase/functions/apns-to-fcm/index.ts`)

Add `console.log` / `console.error` statements at key points so we can see in edge function logs what is happening:
- Log the incoming APNs token (first 20 chars)
- Log the batchImport response
- Log any errors

### 3. Add fallback: if APNs-to-FCM conversion fails, still save the raw token

Currently the fallback saves the token with platform `ios-apns`, but the `fcm-push` function only queries by platform `iphone` or `ios`. Update the fallback platform to `iphone` so it is at least queryable, and add a note that FCM delivery may not work for raw APNs tokens.

### 4. Fix the iOS entitlement in `github-build` to use development for TestFlight

Change the `aps-environment` value in the entitlements from `production` to `development` since TestFlight uses the sandbox APNs gateway. When the app ships to the App Store, Apple automatically promotes it to production.

In `supabase/functions/github-build/index.ts`, change:
```
<key>aps-environment</key>
<string>production</string>
```
to:
```
<key>aps-environment</key>
<string>development</string>
```

## Files to edit

| File | Change |
|---|---|
| `src/hooks/useFCMToken.ts` | Pass `sandbox: true` to apns-to-fcm call |
| `supabase/functions/apns-to-fcm/index.ts` | Add debug logging, fix fallback |
| `supabase/functions/github-build/index.ts` | Change aps-environment to `development` |

## After this lands

A new iOS build must be triggered so the updated entitlement (`development` APNs environment) is included. After installing the new TestFlight build, the app should register the push token and you will see the `apns-to-fcm` logs in the edge function dashboard.

