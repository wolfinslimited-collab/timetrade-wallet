
Goal: fix Google sign-in on mobile so tapping “Continue with Google” no longer opens the app’s 404 screen.

What I found
- The current mobile patch only changes the OAuth `redirect_uri` in `src/hooks/useTradingApi.ts`.
- The auth library still starts the flow through a relative broker path: `"/~oauth/initiate"`.
- In the native mobile shell, that relative path resolves against the app origin (`capacitor://localhost`), so the app navigates to a local route like `/~oauth/initiate` and React Router shows `NotFound`.
- That matches the screenshot exactly: this is not the Google callback failing first, it is the OAuth start URL being opened on the wrong origin.

Implementation plan
1. Make the OAuth start URL native-safe
- Update the AI Trading Google auth flow to use the published app origin for the broker URL on native mobile.
- Keep normal web behavior unchanged.
- Use these two native helpers together:
  - published broker URL: `https://timetrade-wallet.lovable.app/~oauth/initiate`
  - published redirect URL: `https://timetrade-wallet.lovable.app/?tab=trading`

2. Apply the fix inside the trading auth hook
- Refactor `src/hooks/useTradingApi.ts` so native mobile Google auth uses a native-aware auth instance/config instead of the current relative broker path.
- Keep the existing token exchange logic after return:
  - get current auth session
  - call `/auth/google`
  - store trading API token
  - mark AI Trading as authenticated

3. Add a defensive fallback for accidental `/~oauth/*` hits
- Add a small route guard or redirect handler so if the mobile app ever lands on `/~oauth/...` locally again, it immediately forwards to the published URL instead of rendering the app’s 404 page.
- This prevents bad UX for cached installs or edge cases.

4. Verify mobile tab return behavior
- Ensure the user lands back on AI Trading (`/?tab=trading`) after auth.
- Confirm the existing `Index.tsx` tab parsing and session completion flow still activates the trading tab and finalizes login.

Files to update
- `src/hooks/useTradingApi.ts`
- `src/App.tsx` or a tiny redirect component used by routing

Expected result
- Web stays as-is.
- On mobile, “Continue with Google” opens the correct hosted OAuth entrypoint instead of the app-local `/~oauth/initiate`.
- The user returns to the AI Trading tab authenticated, with no “Page not found” screen.

Technical note
```text
Current mobile flow
capacitor://localhost/?tab=trading
  -> /~oauth/initiate   (relative, wrong origin)
  -> React Router NotFound

Fixed mobile flow
capacitor app
  -> https://timetrade-wallet.lovable.app/~oauth/initiate
  -> Google
  -> https://timetrade-wallet.lovable.app/?tab=trading
  -> session exchange in useTradingApi
  -> authenticated AI Trading dashboard
```
