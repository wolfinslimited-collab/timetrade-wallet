Goal: fix the two things you're seeing in the screenshots.

What you're reporting
1. **External browser opening** instead of an in-app sheet. Screenshot 2 clearly shows iOS Safari (with the "◀ Timetrade Wa…" back-to-app chip in the status bar) opening `oauth.lovable.app`.
2. **"redirect_uri is not allowed"** authorization failure on that page.
3. After login you want to land **back on the AI Trading tab inside the app**, not on a new web route.

Why each one is happening

### Issue A — Still seeing external Safari
The in-app browser code IS in the codebase (`Browser.open` from `@capacitor/browser` in `src/hooks/useTradingApi.ts`). But two things can defeat it:
- **The native iOS app on the device hasn't been rebuilt** since `@capacitor/browser` was added. Until you `npm install && npm run build && npx cap sync ios` and re-run from Xcode, the device is running the OLD bundle that uses `lovable.auth.signInWithOAuth` → which calls `window.location.href` → which iOS hands to system Safari. This matches your screenshot exactly (Safari, not an SFSafariViewController sheet).
- **Even after rebuild**, the `capacitor.config.ts` has no `server.url` block, so the app loads from local bundled assets. That's correct for production. But there is currently no log line confirming `isNativePlatform()` returns `true`, so we can't tell from your screenshot which code path actually ran.

### Issue B — "redirect_uri is not allowed"
This is a Lovable OAuth broker error. The broker only accepts `redirect_uri` values on an allowlist (your `*.lovable.app` and `*.lovableproject.com` origins, plus configured custom domains). Right now the code sends:
```
redirect_uri = https://timetrade-wallet.lovable.app/?tab=trading
```
The base origin `https://timetrade-wallet.lovable.app` IS allowed, but the broker is rejecting the **full URL with query string**. The broker matches against registered origins, and a path/query like `/?tab=trading` can fail the match depending on how the allowlist is configured for this project. That's why the page shows `Authorization failed — redirect_uri is not allowed`.

### Issue C — "login should open in AI Trade tab, not a new route"
You want: tap Continue with Google → after login, land back on the AI Trading tab (`/?tab=trading`) inside the app. Not on a separate web page, not on home, not on a 404.

---

The fix

Three small code changes, then a rebuild.

1. **Use a redirect_uri the broker definitely accepts.** Drop the query string from the redirect_uri sent to the broker. Use the bare published origin `https://timetrade-wallet.lovable.app/`. We restore the `?tab=trading` ourselves after the in-app browser closes by calling `setTab("trading")` (or by router navigation) inside the app — we don't need the broker to preserve it.
   - File: `src/hooks/useTradingApi.ts`
     - In `performNativeGoogleAuth`: change `redirectUri` from `${PUBLISHED_WEB_ORIGIN}/?tab=trading` to `${PUBLISHED_WEB_ORIGIN}/`.
     - In `getOAuthRedirectUri` (web path): same — return `${PUBLISHED_WEB_ORIGIN}/` on native, `window.location.href` on web.

2. **Force the in-app browser path on native, with diagnostic logs** so if it ever falls back to system Safari we can see why. Add a `console.info("[google-auth] platform=native, opening in-app browser")` and a matching web log. This makes the next debug round 1 step instead of guessing.

3. **Land back on the AI Trading tab.** After `performNativeGoogleAuth` resolves successfully, navigate to `/?tab=trading` programmatically (via `window.history.replaceState` + a `popstate` event, or by using your existing tab-state setter). The Account screen is rendered inside the trading tab, so once the user is authenticated the same tab will show the dashboard — no extra routing needed beyond setting `?tab=trading`.

4. **Verify the broker allowlist actually contains your published origin.** If after the above the broker still says `redirect_uri is not allowed` with `https://timetrade-wallet.lovable.app/`, the project's OAuth allowlist itself is wrong, and we need to surface it from Lovable Cloud → Authentication → URL Configuration. (You'd add `https://timetrade-wallet.lovable.app` as an allowed redirect.)

---

After the code change — REQUIRED rebuild
The in-app browser fix is native code (`@capacitor/browser` plugin). It cannot ship via OTA / Lovable preview. You must:
```text
git pull
npm install
npm run build
npx cap sync ios
# open ios/App in Xcode and Run on device (not just refresh the preview)
```
Until you do this, you will keep seeing system Safari no matter how many code changes I make, because the device bundle still contains the old `window.location.href` flow.

---

Expected result after rebuild
```text
Tap "Continue with Google" on AI Trade tab
  → in-app browser sheet slides up (SFSafariViewController, NOT system Safari)
  → Google sign-in completes on oauth.lovable.app (no "redirect_uri" error)
  → sheet auto-closes
  → app returns to ?tab=trading (AI Trading dashboard)
  → user is logged in, no 404, no new route
```

Files I'll change
- `src/hooks/useTradingApi.ts` — drop `?tab=trading` from `redirect_uri`, add platform log, navigate to `?tab=trading` after auth completes.

Files I will NOT change
- `capacitor.config.ts` — already correct.
- `src/integrations/lovable/index.ts` — auto-generated, never edit.
- Anything in `ios/` or `android/` — no native code change needed; the existing `@capacitor/browser` plugin is enough.
