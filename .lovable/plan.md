

# Fix QR Scanner: Real Camera Access and Permission Handling

## Problem
The QR scanner modal is a placeholder that only simulates scanning. It never actually opens the camera or scans real QR codes. The app also lacks the Android camera permission in its manifest.

## Plan

### 1. Install `html5-qrcode` library
Add the `html5-qrcode` npm package, a lightweight browser-based QR scanner that uses `getUserMedia` to access the device camera and decode QR codes in real time. No native plugin needed -- it works inside Capacitor's WebView.

### 2. Add Android camera permission
Patch `android/app/src/main/AndroidManifest.xml` to include:
```xml
<uses-permission android:name="android.permission.CAMERA" />
```

### 3. Rewrite `QRScannerModal.tsx` with real camera scanning
Replace the current simulated scanner with a fully functional implementation:

- On open, request camera permission and initialize `Html5Qrcode` scanner targeting a `<div>` rendered inside the modal.
- Use the rear-facing camera (`facingMode: "environment"`).
- On successful QR decode, extract the address (handle `ethereum:0x...` URI format too), call `onScan(address)`, and stop the scanner.
- On close/unmount, stop the camera stream and clean up.
- Show clear error states for: permission denied, no camera found, camera in use.
- Remove the "Simulate QR Scan" button and the "In production" disclaimer.
- Keep the existing scanner frame UI (corner accents, scanning line animation) overlaid on the live camera feed.

### 4. Patch CI workflow for camera permission
Update `.github/workflows/build-android.yml` to inject the camera permission into `AndroidManifest.xml` during CI (since the `android/` folder is regenerated), similar to the existing signing patch pattern.

## Files Modified
- `package.json` -- add `html5-qrcode` dependency
- `src/components/send/QRScannerModal.tsx` -- full rewrite with real camera
- `android/app/src/main/AndroidManifest.xml` -- add CAMERA permission
- `.github/workflows/build-android.yml` -- inject CAMERA permission in CI

