

# Fix QR Scanner: Duplicate Close Button and Camera Issues

## Problems

1. **Two close buttons**: The `DialogContent` component (from `dialog.tsx` line 45-48) renders a built-in X button at `absolute right-4 top-4`. The `QRScannerModal` also renders its own X button in the header (line 106-111). This results in two overlapping close buttons.

2. **Camera not working**: The current implementation uses `html5-qrcode` which relies on the browser `getUserMedia` API. This fails in Capacitor's WKWebView on iOS because the WebView does not support camera streaming the same way a browser does. It also fails on web if camera permissions are blocked or unavailable.

## Solution

### 1. Remove duplicate close button
- In `QRScannerModal`, remove the custom X button from the header since `DialogContent` already provides one
- Alternatively, hide the `DialogContent` built-in close button by passing a custom variant and keep only the header X button for better positioning within the dark scanner UI

Best approach: Keep the custom header X (it's better positioned for this UI) and hide the default `DialogContent` close button by adding a `hideClose` prop or overriding its visibility.

### 2. Fix camera for Capacitor (native iOS/Android)
- Install `@capacitor-community/barcode-scanner` which uses the native camera APIs on iOS/Android
- Update `QRScannerModal` to detect the platform:
  - **Native (Capacitor)**: Use `@capacitor-community/barcode-scanner` which opens a native camera overlay, scans QR codes natively, and returns the result
  - **Web**: Keep the existing `html5-qrcode` as fallback (it works on desktop browsers with camera access)
- On native, the scanner will request native camera permissions (not WebView getUserMedia), which properly triggers the iOS permission dialog

### Files to change

- **`package.json`** -- add `@capacitor-community/barcode-scanner`
- **`src/components/send/QRScannerModal.tsx`** -- hide default DialogContent close button, add native barcode scanner path with platform detection via `Capacitor.isNativePlatform()`
- **`src/components/ui/dialog.tsx`** -- add optional `hideClose` prop to `DialogContent` to conditionally hide the built-in X button

### Technical details

```text
QRScannerModal flow:

  open modal
    |
    ├─ Native (iOS/Android)?
    │    ├─ BarcodeScanner.checkPermission()
    │    ├─ BarcodeScanner.startScan()
    │    ├─ Show transparent overlay with frame UI
    │    └─ On result → extractAddress → onScan → stopScan
    │
    └─ Web?
         ├─ Html5Qrcode.start() (existing logic)
         └─ On result → extractAddress → onScan → stop
```

The native scanner uses the device's actual camera API rather than WebView's getUserMedia, which resolves the "Camera streaming not supported by the browser" error on Capacitor.

