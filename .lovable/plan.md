<final-text>Goal: fix the real native Google auth bug shown in your screenshot.

What the screenshot proves
- The app is already opening an in-app browser sheet.
- The failure now is different: after auth, the sheet is landing on `timetrade-wallet.lovable.app` and staying there instead of returning to the app.
- So the current native flow is missing a proper return path back into the Capacitor app.

Root cause
- In `src/hooks/useTradingApi.ts`, native Google auth uses `redirect_uri = https://timetrade-wallet.lovable.app/`.
- That sends OAuth back to the published website inside the browser sheet.
- The app then waits for `App.addListener("appUrlOpen")`, but that event never fires because no custom app deep link is being used.
- Polling `supabase.auth.getSession()` in the app cannot reliably work here, because the login completed inside the browser sheet context, not the main app WebView.

Plan
1. Replace the native OAuth redirect with an app deep link.
   - Use a native-only redirect URI like `com.wallet.ai://oauth-callback`.
   - Keep web auth unchanged on normal web/published usage.

2. Register the deep link on both native platforms.
   - iOS: add URL scheme for `com.wallet.ai` in the app plist.
   - Android: add a `VIEW`/`BROWSABLE` intent filter for `com.wallet.ai://oauth-callback` in `AndroidManifest.xml`.

3. Finish auth from the deep link instead of waiting for the published site.
   - In `performNativeGoogleAuth`, listen for `appUrlOpen`.
   - Parse the callback URL for OAuth result data.
   - If tokens are returned, call `supabase.auth.setSession(...)` directly in the app.
   - Then exchange the access token with `/auth/google` and store the trading token.
   - Close the in-app browser immediately after the deep link is received.

4. Send the user back to AI Trade inside the app.
   - After successful native auth, set `?tab=trading` in-app exactly as the current tab logic expects.
   - No new standalone route.

5. Add hard error handling and logs.
   - Log native start, callback receipt, token parse success/failure, and exchange success/failure.
   - If the callback contains an OAuth error or invalid state, show a clear auth error instead of leaving the user stuck in the sheet.

Files to update
- `src/hooks/useTradingApi.ts`
- `android/app/src/main/AndroidManifest.xml`
- native iOS app plist for the Capacitor app URL scheme

Technical details
```text
Tap Continue with Google
  -> Browser.open() shows in-app sheet
  -> Google sign-in finishes
  -> broker redirects to com.wallet.ai://oauth-callback...
  -> Capacitor appUrlOpen fires
  -> app closes sheet
  -> app sets session from callback tokens
  -> app exchanges token with /auth/google
  -> app sets ?tab=trading
  -> AI Trade dashboard opens inside the app
```

Expected result
- No external Safari.
- No getting stuck on `timetrade-wallet.lovable.app` inside the sheet.
- No 404.
- User returns directly to the AI Trade tab after Google login.

After implementation
- You will need to rebuild the native app because deep-link config is a native change:
  - `git pull`
  - `npm install`
  - `npm run build`
  - `npx cap sync ios` / `npx cap sync android`
  - rebuild from Xcode / Android Studio
</final-text>