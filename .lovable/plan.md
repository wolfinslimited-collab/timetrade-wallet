

# Fix Biometric Authentication on Native App

## Problem

There are multiple issues preventing biometrics from working reliably on the native app:

1. **Silent error swallowing**: All biometric operations catch errors silently, making it impossible to debug what's actually failing on device.

2. **Stale `checkBiometricStatus` reference**: The `useCallback` for `checkBiometricStatus` has an empty dependency array but is called inside `useEffect([], [])` -- this works on mount but the function reference used by other callbacks (like `registerNative`) may be stale if React optimizes re-renders.

3. **No Capacitor plugin registration**: The `@capgo/capacitor-native-biometric` plugin is installed but not explicitly registered in `MainActivity.java`. Capacitor 8 auto-registers most plugins, but some community plugins (especially Capgo's) may need explicit `add()` calls in the bridge activity.

4. **Missing iOS Face ID usage description**: The iOS project doesn't have an `NSFaceIDUsageDescription` entry -- this is **required** by Apple for Face ID. Without it, the biometric prompt will silently fail or crash on iOS.

5. **Race condition on registration flow**: In `BiometricSetupDialog`, the PIN is verified against `localStorage.getItem("timetrade_pin")` before calling `onRegister(pin)`. If the stored PIN format ever changes, registration silently fails.

## Plan

### Step 1: Add diagnostic logging to biometric hook

Add temporary structured logging (using the project's console pattern) to `useBiometricAuth.ts` at key decision points:
- `checkBiometricStatus`: log the native/web branch taken, `isAvailable` result, and final state
- `registerNative` / `authenticateNative`: log entry and catch block errors with actual error messages instead of swallowing them
- This will help identify the exact failure point on device

### Step 2: Register native biometric plugin explicitly

Update `android/app/src/main/java/com/wallet/ai/MainActivity.java` to explicitly register the `NativeBiometric` plugin in `onCreate()`:

```java
import com.capgo.capacitor.nativebiometric.NativeBiometric;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeBiometric.class);
        super.onCreate(savedInstanceState);
    }
}
```

### Step 3: Add iOS Face ID usage description

Add `NSFaceIDUsageDescription` to the Capacitor iOS config in `capacitor.config.ts` under the `ios` key so it gets injected into Info.plist during `cap sync`:

```typescript
ios: {
  contentInset: 'never',
  scrollEnabled: true,
}
```

And create a note that when the user runs `npx cap sync ios`, they need to manually add `NSFaceIDUsageDescription` to their Info.plist, OR add it via the Capacitor config plugin settings.

### Step 4: Improve error handling in BiometricSetupDialog

Instead of silently returning `false` on failure, surface the actual error message from the native plugin so users see what went wrong (e.g., "Biometric hardware not enrolled", "User cancelled").

### Step 5: Fix the hook's useCallback dependencies

Ensure `checkBiometricStatus` is stable and properly referenced by adding it to the `useEffect` dependency array and ensuring derived callbacks like `registerNative` always reference the latest version.

## Files to Modify

- `src/hooks/useBiometricAuth.ts` -- Add logging, fix callback deps, improve error messages
- `src/components/settings/BiometricSetupDialog.tsx` -- Surface actual error messages
- `android/app/src/main/java/com/wallet/ai/MainActivity.java` -- Explicit plugin registration
- `capacitor.config.ts` -- Add iOS biometric plugin config

