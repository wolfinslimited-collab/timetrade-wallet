---
name: motion-design-system
description: Subtle iOS-style motion: page slide+fade, sheet springs, list stagger, tap scale, with global haptics on key actions.
type: design
---
The app uses subtle, iOS-style native motion — NOT zero-animation:

- **Page transitions**: framer-motion route changes use a subtle slide-from-right + fade with cubic-bezier `[0.32, 0.72, 0, 1]` (220ms in, 160ms out). Defined in `src/App.tsx`.
- **Sheets / dialogs**: `src/components/ui/sheet.tsx` uses the same iOS easing with 300ms open / 200ms close.
- **List stagger**: token rows in `UnifiedTokenList` use `animate-fade-in-up` with a per-row delay (capped at 8 rows × 35ms) for a polished load-in.
- **Tap feedback**: buttons use `transition-transform duration-150 active:scale-90` (or `active:scale-[0.98]` for list rows). Always paired with haptics on important actions.
- **Haptics**: `src/lib/haptics.ts` wraps `@capacitor/haptics` with a web `navigator.vibrate` fallback. Use `haptics.selection()` for nav/tab changes, `haptics.impact("light"|"medium"|"heavy")` for taps, and `haptics.notify("success"|"warning"|"error")` for confirmations.
- **Native shell**: `src/lib/nativeInit.ts` (called from `main.tsx`) sets `StatusBar` style/color and hides the splash screen on native platforms. No-op on web.
- **Custom keyframe**: `fade-in-up` added to `tailwind.config.ts` for stagger animations.

This replaces the previous "zero-latency, no transitions" rule — taps still feel instant because animations are short (≤220ms) and run on transform/opacity only.
