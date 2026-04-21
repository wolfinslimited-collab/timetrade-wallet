

# Improve Animations and Performance Across the App

## Problem
The app has a heavy-handed CSS rule that forces `will-change: transform, opacity` and `translateZ(0)` on every element matching `[class*="animate-"]`, `[class*="transition-"]`, or `[data-state]`. This creates excessive GPU layer promotion and causes lag. Additionally, tab switching (both bottom nav and wallet tabs) lacks smooth transitions, making the app feel abrupt.

## Changes

### 1. Fix the global GPU compositing rule in `src/index.css`
Remove the overly broad `will-change` and `backface-visibility` rule that targets all animated/transitioning elements. This single change will significantly reduce GPU memory pressure and jank. Replace with targeted compositing only on elements that truly need it (sheets, page transitions).

### 2. Add animated active indicator to `src/components/BottomNav.tsx`
- Add a `motion.div` with `layoutId="bottom-nav-indicator"` behind the active tab button for a smooth sliding highlight
- Use the same iOS cubic-bezier easing (`[0.32, 0.72, 0, 1]`) as the rest of the app
- The indicator is a subtle `bg-primary/15` rounded pill that slides between tabs

### 3. Add tab content transition in `src/pages/Index.tsx`
- Wrap the tab content area with `AnimatePresence` and `motion.div` keyed by `currentView`
- Use a quick fade + subtle vertical shift (opacity 0 to 1, y 6px to 0, 180ms) for tab switches
- Keeps the feel instant while adding polish

### 4. Improve WalletTabs transition in `src/components/WalletTabs.tsx`
- Already has Framer Motion transitions -- minor tuning to match the unified easing

### 5. Add CSS transition utility for tab content fade
- Add a `tab-fade-in` keyframe to `tailwind.config.ts` (150ms opacity + translateY) for use in non-Framer contexts

## Technical Details

**Performance fix (index.css):**
```css
/* REMOVE this entire block: */
[class*="animate-"],
[class*="transition-"],
[data-state="open"],
[data-state="closed"] {
  will-change: transform, opacity;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  transform: translateZ(0);
}
```

**BottomNav indicator:**
- Uses Framer Motion `layoutId` for automatic FLIP animation between positions
- Spring transition: `type: "spring", stiffness: 500, damping: 35` for snappy native feel
- Haptics already fires on tab change (existing code)

**Tab content transition:**
- `AnimatePresence mode="wait"` with 150ms fade + 6px y-shift
- Hardware-accelerated (transform + opacity only)

## Files Modified
- `src/index.css` -- remove blanket GPU compositing rule
- `src/components/BottomNav.tsx` -- add sliding active indicator with layoutId
- `src/pages/Index.tsx` -- wrap tab content in AnimatePresence for smooth switching
- `tailwind.config.ts` -- add `tab-fade` animation keyframe

