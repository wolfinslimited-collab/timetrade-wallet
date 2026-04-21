

# Fix iOS QR Scanner — Switch to SPM-Compatible Plugin

## Why the previous fix failed

The error **"BarcodeScanner plugin is not implemented on ios"** means Capacitor's JavaScript layer loaded the plugin shim, but the native iOS Swift code was never compiled into the app. The reason:

| Capacitor 8 (our setup) | `@capacitor-mlkit/barcode-scanning` |
|---|---|
| Uses **Swift Package Manager** (`ios/App/CapApp-SPM/Package.swift`) | Ships **CocoaPods only** — has no `Package.swift` manifest |
| Auto-discovers SPM-compatible plugins via `npx cap sync ios` | Cannot be discovered → native code never linked |

Result: `npx cap sync ios` silently skips the plugin's iOS target, the IPA ships without the native scanner module, and at runtime the JS call fails. Adding more `Info.plist` permissions or PlistBuddy steps cannot fix this — the native code simply isn't in the binary.

Confirmed by checking the plugin's repo: there is no `Package.swift` in `@capacitor-mlkit/barcode-scanning`.

## The Fix — Switch to the Ionic-official scanner

Replace `@capacitor-mlkit/barcode-scanning` with **`@capacitor/barcode-scanner`** (Ionic's official one). It:
- Ships a proper `Package.swift` → works with Capacitor 8 SPM out of the box
- Uses native `AVFoundation` on iOS and `CameraX` on Android
- Has a simpler API (returns the decoded value directly)
- No CocoaPods, no Podfile, no workflow changes

## Changes

### 1. `package.json`
- **Remove** `@capacitor-mlkit/barcode-scanning`
- **Add** `@capacitor/barcode-scanner` (latest v2)

### 2. `src/components/send/QRScannerModal.tsx`
Rewrite the native branch to use the new plugin's API:

```text
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } from '@capacitor/barcode-scanner';

const result = await CapacitorBarcodeScanner.scanBarcode({
  hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
});
// result.ScanResult is the decoded string
```

Web fallback (`html5-qrcode`) stays unchanged.

### 3. iOS workflow (`supabase/functions/github-build/index.ts`)
**No change needed.** The existing `NSCameraUsageDescription` PlistBuddy step already covers permissions. SPM auto-discovery during `npx cap sync ios` will pick up the new plugin automatically.

### 4. Android
**No change needed.** Existing `<uses-permission android:name="android.permission.CAMERA" />` in `AndroidManifest.xml` is sufficient. The plugin handles runtime permission requests via Android's standard API.

## After this lands

1. **Trigger a new iOS build** from the Build Center.
2. On TestFlight, tapping the QR scan icon will open the native iOS camera UI, prompt for camera permission with our description, scan the QR, and return the address — no more "plugin not implemented" error.
3. Android APK behaves the same.
4. Web preview shows the existing graceful "use the published URL" message.

## Files to edit

| File | Change |
|---|---|
| `package.json` | Remove `@capacitor-mlkit/barcode-scanning`, add `@capacitor/barcode-scanner` |
| `src/components/send/QRScannerModal.tsx` | Replace native branch to use `CapacitorBarcodeScanner.scanBarcode()` |

