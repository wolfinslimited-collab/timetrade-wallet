

## Add Meta Pixel (Facebook Events) to the App

### What you need to provide
Your **Meta Pixel ID** — a numeric string (e.g. `1234567890`). You can find it in your Meta Events Manager at [business.facebook.com/events_manager](https://business.facebook.com/events_manager). This is a **public tracking ID**, not a secret key, so it will be stored directly in the codebase.

### Implementation

1. **Add Meta Pixel base script to `index.html`**
   - Insert the standard `fbevents.js` snippet in the `<head>` section
   - Place the `<noscript><img>` fallback inside `<body>` (required by HTML5 spec — cannot go in `<head>`)
   - Initialize with `fbq('init', 'YOUR_PIXEL_ID')` and fire `PageView`

2. **Create a reusable tracking utility**
   - Create `src/lib/fbPixel.ts` with helper functions:
     - `trackPageView()` — fires `fbq('track', 'PageView')`
     - `trackEvent(eventName, params?)` — fires custom events like `Purchase`, `Lead`, `CompleteRegistration`, etc.
   - Add TypeScript declarations for the global `fbq` function

3. **Integrate page view tracking in the router**
   - Add a `useEffect` in `src/App.tsx` (or the router component) that calls `trackPageView()` on every route change so all navigation is tracked automatically

4. **Optional: track key wallet events**
   - Fire custom events at meaningful points (e.g. onboarding complete, send transaction confirmed) using the `trackEvent` helper — this can be added incrementally later

### No backend changes needed
Meta Pixel is a client-side-only script. No database migrations, edge functions, or secrets are required.

