

# Fix QR Scanner — Native Camera on iOS/Android, Reliable Web Fallback

## Why it's broken in 3 places

| Surface | Real cause |
|---|---|
| **iOS TestFlight** | Capacitor's `WKWebView` does **not** expose `navigator.mediaDevices.getUserMedia` to the web layer, and `Info.plist` has no `NSCameraUsageDescription`. So `html5-qrcode` correctly reports *"Camera streaming not supported by the browser."* |
| **Android APK** | `WebView` also blocks `getUserMedia` until `WebChromeClient.onPermissionRequest` grants `VIDEO_CAPTURE` (Capacitor doesn't do this). Even with the manifest permission, the JS API stays unavailable. |
| **Lovable preview / web** | The preview iframe is cross-origin sandboxed without `allow="camera"`, and the current code starts the camera inside a `setTimeout` — outside the user-gesture chain, which WebKit silently denies. |

Stacking patches onto `html5-qrcode` will never work on native — the WebView simply does not have a camera stream API. The fix is to **use a native scanner on iOS/Android** and keep a **web-only fallback**.

## The Fix

### 1. Add the native scanner plugin
Add `@capacitor-mlkit/barcode-scanning` (industry standard, MIT-friendly, used by Trust Wallet / Phantom-class apps). On iOS/Android it opens the **native camera** via AVFoundation / CameraX — no WebView permission games, no `getUserMedia` needed.

### 2. Rewrite `src/components/send/QRScannerModal.tsx` as a hybrid

```text
isNativePlatform()?
  ├─ YES → call BarcodeScanner.requestPermissions() then BarcodeScanner.scan()
  │         (full-screen native camera UI takes over, returns the decoded string)
  └─ NO  → use html5-qrcode as today, but:
            • detect missing navigator.mediaDevices early and show a clear message
            • start getUserMedia synchronously on mount (no setTimeout)
            • show a "Tap to enable camera" button as user-gesture fallback
              when permissions API reports prompt/denied
```

### 3. Inject iOS camera permission keys in CI
Update `supabase/functions/github-build/index.ts` (the `build-ios.yml` template) to add a step **before** signing that writes:

```text
PLIST="ios/App/App/Info.plist"
PlistBuddy -c "Add :NSCameraUsageDescription string 'Used to scan QR codes for wallet addresses and seed phrases.'" "$PLIST"
PlistBuddy -c "Add :NSPhotoLibraryUsageDescription string 'Used to import QR codes from your photos.'" "$PLIST"
```

This makes the native camera prompt appear on TestFlight builds.

### 4. Android — already covered
The native plugin handles `CAMERA` permission via Android's runtime permission API, so the existing `<uses-permission android:name="android.permission.CAMERA" />` in `AndroidManifest.xml` is sufficient. No WebView permission glue needed.

### 5. Web preview — graceful message
Inside the Lovable iframe, `navigator.mediaDevices` is gated by the parent iframe's `allow` attribute (out of our control). When detection shows it's unavailable on web, show:

> "Camera scanning isn't available in the in-app preview. Open the published URL or paste the address manually."

Real production web (timetrade-wallet.lovable.app) is not iframed and works normally.

## Files to change

| File | Change |
|---|---|
| `package.json` | Add `@capacitor-mlkit/barcode-scanning` dependency |
| `src/components/send/QRScannerModal.tsx` | Hybrid native/web scanner; synchronous getUserMedia on web; fallback button |
| `supabase/functions/github-build/index.ts` | Add `NSCameraUsageDescription` + `NSPhotoLibraryUsageDescription` PlistBuddy step in iOS workflow template |

## After implementation

- **iOS TestFlight**: Tap scan → native iOS camera opens → permission prompt with our description → scans QR → returns address. Works offline, fast, full-resolution.
- **Android APK**: Same flow with native camera UI.
- **Production web**: html5-qrcode opens with proper user-gesture handling.
- **Lovable preview**: Shows clear "use the published URL" message instead of confusing camera error.

A new iOS build must be triggered after this lands so the `Info.plist` permission key is included.

