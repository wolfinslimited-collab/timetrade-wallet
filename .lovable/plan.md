
Goal: make "Continue with Google" open inside the app (in-app browser) instead of kicking the user out to Safari/Chrome, and return cleanly without a 404.

Why this is happening
- Today we call `lovable.auth.signInWithOAuth("google", ...)`, which sets `window.location.href` to the OAuth URL.
- Inside the Capacitor WebView, that hands the URL off to the OS, which launches **Safari (iOS) / Chrome (Android)** — the "external browser" you're seeing.
- Google **forbids** signing in inside an embedded WebView (`disallowed_useragent`), so we can't just load Google directly in the app's own WebView.
- The correct native pattern is an **in-app browser** (SFSafariViewController on iOS, Chrome Custom Tab on Android) via `@capacitor/browser`. It slides up over the app, looks in-app, and we can close it programmatically when auth finishes.

About the "Page not found"
- That's the same wrong-origin issue: after Google, the broker tries to bounce to a path that the native WebView resolves against `capacitor://localhost`, hitting React Router's `NotFound`.
- Once we own the OAuth window via `@capacitor/browser`, we control return ourselves and dismiss it — no 404 screen.

Implementation plan

1. Add the in-app browser plugin
- Install `@capacitor/browser`.
- Will require `npx cap sync` after build (standard Capacitor step).

2. Build a native Google auth path in `useTradingApi.ts`
- On native only, do NOT call `lovable.auth.signInWithOAuth` (which redirects the WebView).
- Instead:
  - Build the OAuth start URL manually: `https://timetrade-wallet.lovable.app/~oauth/initiate?provider=google&redirect_uri=https://timetrade-wallet.lovable.app/?tab=trading&...`
  - Open it with `Browser.open({ url, presentationStyle: "popover" })` → this is the **in-app** Safari/Chrome sheet, not external Safari.
  - Listen for `Browser.addListener("browserFinished", ...)` and `appUrlOpen` to know when the user returns.
  - On return, call `Browser.close()` to dismiss the sheet, then run the existing token-exchange logic (`supabase.auth.getSession()` → `/auth/google`).

3. Handle the return without a deep link
- Since Lovable's OAuth broker redirects back to the published web URL (not a custom scheme), we use the simpler "polling on resume" pattern:
  - When the in-app browser closes (`browserFinished` event), poll `supabase.auth.getSession()` for up to ~10s.
  - As soon as a session appears, exchange it for the trading API token and mark authenticated.
- Keep the existing `OAuthBounce` route as a safety net for any edge case.
- Web behavior is unchanged (still uses `lovable.auth.signInWithOAuth` redirect flow).

4. Clean up the UX
- While the in-app browser is open, keep `isAuthenticating = true` so the button stays in loading state.
- If the user dismisses the sheet without completing, clear loading state and show no error.
- On success, automatically navigate to the AI Trading dashboard.

Files to update
- `src/hooks/useTradingApi.ts` — native Google flow uses `@capacitor/browser` + session polling.
- `package.json` — add `@capacitor/browser`.
- `src/App.tsx` — keep `OAuthBounce` as fallback (no change needed).

Expected result
```text
Tap "Continue with Google" on mobile
  -> in-app browser sheet slides up (still feels in-app)
  -> Google sign-in completes
  -> sheet auto-closes
  -> app picks up the session
  -> lands on AI Trading dashboard
  -> no external Safari, no 404 page
```

Note
- After this change you will need to `git pull`, `npm install`, `npm run build`, then `npx cap sync ios` and rebuild the iOS app for the new `@capacitor/browser` native plugin to be linked.
