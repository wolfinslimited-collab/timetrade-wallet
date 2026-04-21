

# Fix Android Capacitor Build CI

## Problem

The Android CI workflow (`build-android.yml`) runs `rm -rf android && npx cap add android`, which replaces the entire Android project with Capacitor defaults. Unlike the iOS workflow (which has extensive post-creation patching for permissions, Face ID, entitlements, etc.), the Android workflow is missing critical patching steps:

1. **Missing AndroidManifest permissions** -- `CAMERA` and `USE_BIOMETRIC` permissions are lost after recreation
2. **Missing NativeBiometric plugin registration** -- `MainActivity.java` reverts to default without `registerPlugin(NativeBiometric.class)`
3. **Missing proguard rules** -- R8 minification can strip Capacitor and plugin classes, causing runtime crashes
4. **Version code/name not injected** -- `ANDROID_VERSION_CODE`/`ANDROID_VERSION_NAME` env vars are set but the default `build.gradle` doesn't read them (it uses hardcoded values)

The iOS build works because it has dedicated steps to patch Info.plist, entitlements, and permissions after `npx cap add ios`.

## Plan

### Step 1: Add Android post-creation patching steps

Add new workflow steps (after "Sync Capacitor", before "Customize splash screen") to:

**a) Patch AndroidManifest.xml** -- Inject `CAMERA`, `USE_BIOMETRIC`, and `INTERNET` permissions using `sed`

**b) Patch MainActivity.java** -- Replace the default file with the custom one that registers `NativeBiometric`:
```java
registerPlugin(NativeBiometric.class);
```

**c) Inject proguard-rules.pro** -- Write the custom proguard rules that keep Capacitor and app classes

**d) Patch build.gradle for versioning** -- Inject the `ANDROID_VERSION_CODE`/`ANDROID_VERSION_NAME` env var reading logic into the default `build.gradle` so version numbers are dynamic

### Step 2: Update the edge function template

Mirror all the same patching steps in the `WORKFLOW_TEMPLATES.android` template inside `supabase/functions/github-build/index.ts`, with proper `\$` escaping for shell variables inside the JS template literal.

## Files to Modify

- `.github/workflows/build-android.yml` -- Add patching steps after Capacitor sync
- `supabase/functions/github-build/index.ts` -- Update the android workflow template to match

