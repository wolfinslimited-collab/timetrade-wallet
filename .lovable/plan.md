

# Fix iPhone Push Registration + Add Mobile Debug Panel

## Real Root Cause (corrected from last plan)

The previous fix flipped `aps-environment` to `development`, but this is wrong for TestFlight. Apple's rules:

| Build type | Provisioning profile | Required `aps-environment` |
|---|---|---|
| Xcode Debug → dev iPhone | Development | `development` (sandbox APNs) |
| **TestFlight / App Store** | **Distribution (App Store)** | **`production`** |
| Ad Hoc | Distribution (Ad Hoc) | `production` |

Our CI signs with an **App Store distribution profile** but writes `aps-environment = development`. iOS detects the mismatch and **silently refuses to register for push** — the `registration` event never fires, no token reaches the JS layer, no call to `apns-to-fcm`, hence zero iOS tokens in the database and zero edge function logs.

Database confirms: 1 web token, 0 iOS tokens. `apns-to-fcm` logs: empty. The bug is upstream of any conversion logic.

## Changes

### 1. Fix the entitlement (`supabase/functions/github-build/index.ts`)

Set `aps-environment` back to `production` (lines 342 and 348). Then in the `apns-to-fcm` edge function call, set `sandbox: false` since we're now on production APNs. Firebase will return a real FCM token bound to production APNs.

### 2. Update `useFCMToken` (`src/hooks/useFCMToken.ts`)

- Pass `sandbox: false` to `apns-to-fcm` (matches production entitlement).
- Capture **every step** of the registration flow into a structured debug log (in-memory + persisted to `localStorage` under key `timetrade:push-debug`), including timestamps, permission state, registration token (truncated), errors, and the conversion response. This drives the debug panel in step 3.
- Expose the debug log array and a `clearDebugLog()` function from the hook.

Logged events: `init`, `permission-check`, `permission-result`, `register-called`, `registration-fired`, `apns-conversion-start`, `apns-conversion-success`, `apns-conversion-error`, `token-saved`, `registration-error`, `setup-error`.

### 3. Add Debug Panel to Notification Settings (`src/components/settings/NotificationSettingsSheet.tsx`)

Add a new collapsible **"Push Debug (Mobile)"** section, visible only when `Capacitor.isNativePlatform()` is true. Contents:

- **Status row**: platform (`ios`/`android`), `fcmStatus`, permission state.
- **Token row**: full token (with copy button) — currently only shows truncated.
- **Device info**: bundle ID, app version, OS version (via `@capacitor/device` if installed; otherwise UA string).
- **Event log table**: scrollable list of every step with timestamp + payload. Shows in red if step is an error.
- **Actions**:
  - "Copy Debug Report" → copies all logs + status as JSON to clipboard, so the user can paste it back to us.
  - "Re-register Token" → resets the `registeredRef` and re-runs the native registration flow (no app restart needed).
  - "Send Server Test Push" → already exists, keep it.
  - "Clear Log" → wipes the in-memory + localStorage log.

Show the panel **regardless of whether registration succeeded or failed** so it can be used to verify success too.

### 4. Optional Android note

Android currently works (it returns FCM tokens directly, no conversion). The debug panel still helps confirm tokens exist and identify Android-specific failures.

## Files to edit

| File | Change |
|---|---|
| `supabase/functions/github-build/index.ts` | `aps-environment` → `production` (lines 342, 348) |
| `src/hooks/useFCMToken.ts` | Add structured debug log; pass `sandbox: false`; expose `debugLog` + `clearDebugLog` + `reRegister` |
| `src/components/settings/NotificationSettingsSheet.tsx` | New native-only "Push Debug" section with status, full token, event log, copy/re-register/clear actions |

## After this lands

1. Trigger a **new iOS build** from Build Center (CI must redeploy with the production entitlement).
2. Install via TestFlight, open app → Settings → Notifications → grant permission.
3. Open the new **Push Debug** section. You should see events: `init` → `permission-result: granted` → `register-called` → `registration-fired (token: xxxx)` → `apns-conversion-success` → `token-saved`.
4. The `fcm_tokens` table will have a row with `platform = 'ios'`.
5. Tap "Send Server Test Push" — you should see the toast and a banner notification.
6. If anything fails, tap "Copy Debug Report" and paste it back to us — we'll see exactly which step broke instead of guessing.

