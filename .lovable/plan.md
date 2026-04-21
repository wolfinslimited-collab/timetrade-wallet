

# iOS App Crash — Root Cause Analysis and Fix

## Problem
The app crashes immediately on launch on iOS. Based on the codebase analysis, there are two high-probability crash sources:

1. **`@reown/appkit` (WalletConnect) uses `require()` at module scope** — The `WalletConnectContext.tsx` file calls `require('@reown/appkit/react')` at the top level. While wrapped in a try/catch, `@reown/appkit` internally accesses browser-only APIs (WebSocket, window globals, IndexedDB) that may crash the WKWebView before the catch can fire. Additionally, `require()` is a CommonJS call in a Vite ESM build — Vite transforms it, but the resulting module initialization can trigger fatal errors in WKWebView.

2. **Firebase web SDK initialization in native context** — `src/lib/firebase.ts` calls `initializeApp()` unconditionally at import time. The web Firebase Messaging SDK (`getMessaging`) uses Service Workers which are not available in WKWebView. While `getMessaging()` is deferred, the `initializeApp()` at module scope could interact badly with the native Firebase iOS SDK that `@capacitor-firebase/messaging` already provides, causing a duplicate initialization crash.

## Changes

### 1. Guard WalletConnectContext for native platforms
**File:** `src/contexts/WalletConnectContext.tsx`

Replace the `require()` block with a native platform check. If running on Capacitor native, skip the entire `@reown/appkit` initialization:

```typescript
import { Capacitor } from "@capacitor/core";

let appKitInitialized = false;
// ... default stubs ...

if (!Capacitor.isNativePlatform()) {
  try {
    const appkit = require('@reown/appkit/react');
    // ... rest of initialization
  } catch (error) {
    console.warn('WalletConnect initialization failed:', error);
  }
}
```

### 2. Guard Firebase web SDK initialization for native platforms
**File:** `src/lib/firebase.ts`

Wrap `initializeApp()` so it only runs on web. On native, the Capacitor Firebase plugin handles everything:

```typescript
import { Capacitor } from "@capacitor/core";

let app: any = null;

if (!Capacitor.isNativePlatform()) {
  app = initializeApp(firebaseConfig);
}
```

All exported functions (`getFirebaseMessaging`, `requestFCMToken`, `onForegroundMessage`) already return null on failure, so they will gracefully no-op on native.

### 3. Add `npm install --legacy-peer-deps` to iOS workflow
**File:** `.github/workflows/build-ios.yml`

The `npm install` step should use `--legacy-peer-deps` to match the previous fix for the barcode-scanner dependency conflict (even though it was removed, other peer conflicts may appear):

```yaml
- name: Install dependencies
  run: npm install --legacy-peer-deps
```

## Summary of files to edit
- `src/contexts/WalletConnectContext.tsx` — wrap `require()` block in native platform check
- `src/lib/firebase.ts` — skip `initializeApp` on native platforms
- `.github/workflows/build-ios.yml` — add `--legacy-peer-deps` flag

## Technical Details
The crash is a hard native crash (iOS shows "Crashed" dialog), not a JavaScript error. This points to module-level initialization code that triggers fatal WKWebView errors before React even mounts. Both `@reown/appkit` and Firebase web SDK perform heavy initialization at import time with browser-only APIs that are incompatible with the native iOS WebView context.

