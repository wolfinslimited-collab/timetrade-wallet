

# Fix Biometric Authentication with Native Capacitor Plugin

## Problem
WebAuthn (`navigator.credentials.create/get`) does **not work** inside Capacitor's WKWebView (iOS) or Android WebView. This is a known platform limitation -- WebAuthn requires a real browser context. The current implementation silently fails, showing "Setup cancelled."

## Solution
Replace WebAuthn with `@capgo/capacitor-native-biometric` -- a native Capacitor 7/8 plugin that uses real iOS Keychain + Face ID/Touch ID and Android Keystore + BiometricPrompt. It also provides secure credential storage built-in, eliminating the need to store the PIN in localStorage as base64.

## Changes

### 1. Install native biometric plugin
**File:** `package.json`
- Add `@capgo/capacitor-native-biometric` dependency

### 2. Rewrite `useBiometricAuth` hook
**File:** `src/hooks/useBiometricAuth.ts`

Replace the entire WebAuthn implementation with the native plugin:
- **Availability check**: Use `NativeBiometric.isAvailable()` which returns biometry type (Face ID, Touch ID, Fingerprint, Iris)
- **Registration**: Use `NativeBiometric.verifyIdentity()` to prompt biometric, then `NativeBiometric.setCredentials()` to securely store the PIN in Keychain/Keystore (server: `"timetrade-wallet"`, username: `"wallet-pin"`, password: the PIN)
- **Authentication**: Use `NativeBiometric.verifyIdentity()` then `NativeBiometric.getCredentials()` to retrieve the stored PIN
- **Removal**: Use `NativeBiometric.deleteCredentials()` to clear stored data
- **Web fallback**: On non-native platforms (browser preview), keep the existing WebAuthn logic as a fallback so the app doesn't crash in development

### 3. Update iOS build workflow for Face ID permission
**File:** `.github/workflows/build-ios.yml`
- Ensure `NSFaceIDUsageDescription` is injected into Info.plist (already done in previous fix, verify it's present)

### 4. Update Android manifest for biometric permission
**File:** `android/app/src/main/AndroidManifest.xml`
- Add `<uses-permission android:name="android.permission.USE_BIOMETRIC" />`

### 5. Update Android CI workflow
**File:** `.github/workflows/build-android.yml`
- Inject `USE_BIOMETRIC` permission during CI build

## Technical Details
- `@capgo/capacitor-native-biometric` uses iOS `LAContext` (LocalAuthentication framework) and Android `BiometricPrompt` -- both work natively without browser context
- Credentials are stored in iOS Keychain and Android Keystore, which is significantly more secure than base64 in localStorage
- The plugin auto-detects biometry type (Face ID vs Touch ID vs Fingerprint) so the UI label detection continues to work
- No changes needed to `BiometricSetupStep.tsx`, `LockScreen.tsx`, `PinUnlockModal.tsx`, or `BiometricSetupDialog.tsx` -- they all consume the hook interface which stays the same
- The `NativeBiometric.isAvailable()` call returns `{ isAvailable: boolean, biometryType: BiometryType }` for accurate detection

## Files Modified
- `package.json` -- add `@capgo/capacitor-native-biometric`
- `src/hooks/useBiometricAuth.ts` -- full rewrite with native plugin + web fallback
- `android/app/src/main/AndroidManifest.xml` -- add USE_BIOMETRIC permission
- `.github/workflows/build-android.yml` -- inject biometric permission in CI

