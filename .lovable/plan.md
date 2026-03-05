
Goal: permanently stop “placeholder icon” uploads for iOS and make failures impossible to miss before TestFlight upload.

What I found
1) The latest iOS build triggered from Build Center was platform=ios (Capacitor), not Flutter.
2) Workflow steps for icon generation/validation all passed in the latest successful run.
3) Current checks are still too loose: they only verify “AppIcon exists” (string grep), not that the required App Store marketing rendition is truly compiled and usable.
4) The repo workflow file and backend template can drift (I also see a one-line Export IPA command in repo while template has multiline). Drift can reintroduce fragile behavior.

Implementation plan

1) Eliminate workflow drift as first fix
- Update both:
  - `.github/workflows/build-ios.yml`
  - `supabase/functions/github-build/index.ts` (ios template block)
- Ensure they are byte-consistent for all icon-related steps and Export IPA command formatting.
- Keep the backend template as single source of truth and repo file matching it exactly.

2) Replace weak icon checks with strict, machine-verified checks
- In both archive and IPA validation steps:
  - Parse `assetutil --info` JSON with `jq` (no grep-only checks).
  - Assert all are true:
    - `CFBundleIcons:CFBundlePrimaryIcon:CFBundleIconName == AppIcon`
    - AppIcon renditions exist for iphone + ipad
    - ios-marketing rendition exists
    - marketing rendition is exactly 1024x1024
- Fail build immediately if any assertion is false.

3) Add deterministic evidence artifact for every build
- Generate and upload `icon-audit` artifact containing:
  - source icon metadata (format, width, height, alpha)
  - generated appiconset file list
  - archive assetutil JSON
  - IPA assetutil JSON
  - extracted plist icon keys
- This gives a forensic trail when Apple UI still shows placeholder.

4) Add pre-upload validation gate
- Add explicit `altool --validate-app` step before upload (or equivalent validation mode) and fail on icon-related warnings/errors.
- Upload to TestFlight only after validation gate passes.

5) Prevent accidental wrong-pipeline use for App Store
- In Build Center UI (`src/pages/Build.tsx`), add a warning on Flutter iOS card:
  - “Use Capacitor iOS for this App Store listing.”
- This prevents accidental submission from a pipeline with different icon behavior.

6) Add operational fallback path (if Apple UI still shows placeholder after a passing audit)
- Surface a clear post-build note in Build Center logs:
  - If strict icon audit passes but App Store card still shows placeholder, complete one-time listing icon update in App Store Connect and wait for processing refresh.
- This separates “binary icon issue” from “listing metadata/cache issue.”

Technical details (exact checks to implement)
- Use `xcrun --sdk iphoneos assetutil --info <Assets.car> > <json>`
- Validate with `jq`, for example:
  - primary icon name equals `AppIcon`
  - marketing idiom object exists with size 1024x1024
  - non-empty renditions for required idioms/scales
- Keep `ASSETCATALOG_COMPILER_APPICON_NAME=AppIcon` in archive command.
- Preserve alpha-removal and 1024 source normalization steps.

Files to update
- `.github/workflows/build-ios.yml`
- `supabase/functions/github-build/index.ts`
- `src/pages/Build.tsx` (small UX warning)

Verification plan after implementation
1) Trigger a fresh Capacitor iOS build from Build Center.
2) Confirm strict icon-audit step passes and artifact is generated.
3) Confirm TestFlight upload uses that exact IPA.
4) After Apple processing, re-check app icon in App Store Connect app card.
5) If still placeholder despite passing audit artifact, treat as listing metadata/cache path (not binary packaging) and apply one-time listing-side update.
