
Fix the Android CI signing issue by updating the build pipeline in both places that control it, so the generated `android/` folder is re-signed on every build instead of falling back to `app-release-unsigned.apk`.

1. Lock down the real root cause
- Treat the repeated unsigned output as a workflow/template problem, not a Gradle compilation problem.
- Keep the diagnosis explicit in the implementation: the build succeeds, but `assembleRelease` is running against a regenerated `android/app/build.gradle` that no longer contains the custom `signingConfigs.release` + `signingConfig signingConfigs.release` logic.
- Ignore the Node 20 warning for this fix; it is unrelated to the unsigned APK failure.

2. Update the repository workflow
- Edit `.github/workflows/build-android.yml`.
- After `rm -rf android` + `npx cap add android` + `npx cap sync android`, add a deterministic patch step that rewrites the generated `android/app/build.gradle` to include:
  - `keystorePropertiesFile`
  - `keystoreProperties`
  - `hasReleaseSigning`
  - `signingConfigs { release { ... } }`
  - `buildTypes.release { signingConfig signingConfigs.release }`
- Make the patch idempotent so repeated builds do not duplicate the block.
- Add a fail-fast validation step immediately after patching:
  - confirm `android/app/build.gradle` exists
  - confirm `signingConfig signingConfigs.release` exists
  - print only safe diagnostic lines from the file, never secrets

3. Update the Build Center source of truth
- Edit `supabase/functions/github-build/index.ts`.
- Update the Android workflow template inside `WORKFLOW_TEMPLATES.android` to include the exact same signing patch and validation logic as the repository workflow.
- This is required because the Build Center force-syncs workflow YAML before dispatching builds, so a repo-only fix will keep getting overwritten.

4. Keep signing asset paths consistent
- Preserve the current keystore placement:
  - keystore file written to `android/app/release.keystore`
  - `android/key.properties` remains the metadata file
- Ensure the generated Gradle patch reads `key.properties` from the Android root and points the release signing config at the keystore path that actually exists during CI.
- Do not rely on the committed `android/app/build.gradle`, because the workflow deletes the whole `android/` directory every run.

5. Strengthen build-time diagnostics
- In the workflow, add safe checks before `assembleRelease` and `bundleRelease`:
  - whether `android/key.properties` exists
  - whether `android/app/release.keystore` exists
  - whether the generated `android/app/build.gradle` contains the signing block
- If any of these checks fail, stop before Gradle runs and emit a precise error, instead of waiting until artifact collection reports only `app-release-unsigned.apk`.

6. Keep artifact behavior strict
- Keep the current behavior that rejects `*-unsigned.apk`.
- Keep AAB generation gated behind signing.
- After the fix, the expected outputs should be:
  - `app-release.apk` or equivalent signed release APK
  - release `.aab` in the bundle output directory

7. Verify end-to-end behavior
- Trigger a fresh Android build after the workflow/template updates.
- Confirm the logs now show the patch validation step before Gradle.
- Confirm artifact staging picks up a signed APK instead of only `app-release-unsigned.apk`.
- Confirm AAB generation also succeeds in the signed path.

Technical details
- Files to update:
  - `.github/workflows/build-android.yml`
  - `supabase/functions/github-build/index.ts`
- Files not to rely on as the CI source of truth:
  - `android/app/build.gradle` in the repo, because it is deleted during CI regeneration
- Non-blocker:
  - the GitHub Actions Node 20 deprecation warning should be handled separately after signing is fixed
