

## Fix App Splash Screen: Dark Background + App Logo

### Problem
On app startup, a white screen with the default Capacitor logo appears. This happens because the CI build pipeline recreates the `ios` and `android` folders from scratch (`rm -rf ios && npx cap add ios`), which generates the default Capacitor LaunchScreen with a white background and Capacitor's blue icon.

### Solution
Add CI steps in the `github-build` edge function to replace the default splash/launch screens on both iOS and Android with a dark background (#0E1116) and the app logo centered.

### Changes

**File: `supabase/functions/github-build/index.ts`**

1. **iOS workflow** — Add a new step after "Sync Capacitor" called "Customize LaunchScreen":
   - Use `sed` or a heredoc to replace the default `ios/App/App/Base.lproj/LaunchScreen.storyboard` with a custom storyboard XML that has:
     - Background color set to #0E1116 (the app's dark background)
     - An `ImageView` centered on screen displaying the app logo
   - Copy `public/app-logo.png` into `ios/App/App/Assets.xcassets/` as a `Splash.imageset` with a scaled-down version (e.g., 200px) so it appears centered as a logo, not filling the screen
   - The storyboard XML will reference this image asset

2. **Android workflow** — Add a new step after "Sync Capacitor" called "Customize splash screen":
   - Replace `android/app/src/main/res/drawable/splash.png` with a generated dark-background splash image using ImageMagick (composite the app logo centered on a dark #0E1116 canvas)
   - Update `android/app/src/main/res/values/styles.xml` to ensure the `AppTheme.NoActionBarLaunch` theme uses the dark background color
   - Optionally create additional density drawable folders (drawable-hdpi, drawable-xhdpi, etc.) with appropriate sizes

3. **Also add a web-side loading screen** in `index.html`:
   - Add inline CSS and HTML inside the `#root` div that shows the app logo centered on a dark background
   - This will display immediately while React loads, then React replaces the content
   - This covers the brief white flash before the JS bundle loads on native

### Technical Details

- The iOS LaunchScreen.storyboard is an XML file that Xcode uses to render the launch screen. Capacitor generates a default one with a white background. We replace it with custom XML referencing our logo image asset.
- Android uses `@drawable/splash` referenced in `styles.xml`. We replace the default splash.png with our branded version.
- The `index.html` inline loading screen is the fastest way to eliminate the white flash between native splash dismiss and React mount.
- No new dependencies required.

