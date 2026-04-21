

# iOS App Crash — Real Root Cause Found

## The Problem
After multiple investigations, the actual crash cause is now clear:

The iOS app crashes immediately at launch because **`FirebaseApp.configure()` is never called in the native iOS code**. The `@capacitor-firebase/messaging` plugin is installed (and required for push notifications), but the native Firebase iOS SDK throws a fatal `NSException` if `FirebaseApp.configure()` isn't called early in the app lifecycle. This kills the app before React Native (or in this case, the WKWebView) even loads.

### Why this kept being missed
- The `ios/` directory is **not committed to the repo** — it's deleted and regenerated on every CI build via `rm -rf ios && npx cap add ios`.
- Capacitor's stock `AppDelegate.swift` template does **not** include any Firebase initialization.
- `GoogleService-Info.plist` is correctly added to the Xcode target, but it's useless without the matching `FirebaseApp.configure()` call.
- The previous fixes addressed the JavaScript/web layer (WalletConnect, Firebase web SDK) — but those fixes don't matter because the crash happens in **native iOS code**, before the WebView even starts loading.

## The Fix

### Patch the scaffolded AppDelegate.swift in CI

Add a new step in `.github/workflows/build-ios.yml` (immediately after `npx cap add ios` succeeds, before `npx cap sync ios`) that overwrites `ios/App/App/AppDelegate.swift` with a version that initializes Firebase.

The new `AppDelegate.swift` will:
1. `import FirebaseCore`
2. Call `FirebaseApp.configure()` as the very first line of `application(_:didFinishLaunchingWithOptions:)`
3. Preserve all existing Capacitor app delegate behavior (URL handling, universal links, push notification routing)

```swift
import UIKit
import Capacitor
import FirebaseCore

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        return true
    }
    
    // ...preserve all the standard Capacitor URL/notification handlers
}
```

### Apply the same patch in the edge function template

Mirror the change in `supabase/functions/github-build/index.ts` so the workflow stays in sync when re-deployed by the Build Center self-healing engine.

## Files to Edit
- `.github/workflows/build-ios.yml` — add a "Patch AppDelegate.swift with Firebase init" step after `npx cap add ios`
- `supabase/functions/github-build/index.ts` — mirror the same step in the workflow template

## Why this will work
The native Firebase iOS SDK requires `FirebaseApp.configure()` to be called before any Firebase plugin (including `@capacitor-firebase/messaging`) accesses it. Without it, the plugin loading triggers a fatal native exception **at app launch**, before any JavaScript runs. This explains why all our JS-side fixes (removing WalletConnect, guarding Firebase web SDK) had no effect — the crash was always in Objective-C/Swift land.

After this fix, the launch sequence becomes:
1. iOS loads `AppDelegate.swift`
2. `FirebaseApp.configure()` initializes the native Firebase SDK using `GoogleService-Info.plist`
3. Cap