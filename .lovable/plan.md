

# Optimize Animations for GPU Acceleration and Smoothness

## Problem
Many animations use `transition-all` which transitions every CSS property (including layout-triggering ones like `width`, `height`, `padding`), causing jank. Multiple `backdrop-blur` layers compound the issue. Some animations lack GPU-promotion hints.

## Changes

### 1. Replace `transition-all` with specific properties (29 files)
Search all `.tsx` files for `transition-all` and replace with the specific properties actually being animated:
- For color changes: `transition-colors`
- For scale/transform changes: `transition-transform`
- For opacity + transform: `transition-[transform,opacity]`
- For background + border: `transition-[background-color,border-color]`

This prevents the browser from watching and interpolating every single CSS property on each frame.

### 2. Add GPU promotion to animated elements
Add `transform: translateZ(0)` or `will-change-transform` to key animated containers:
- Bottom nav indicator background
- Page transition wrapper in `App.tsx`
- Sheet overlays in `sheet.tsx` (already has this)
- Token list rows with stagger animations

### 3. Reduce `backdrop-blur` usage
Replace decorative `backdrop-blur` with solid semi-transparent backgrounds where the blur is purely cosmetic:
- `AIChatPage.tsx`: Replace `backdrop-blur-sm` on chat bubbles and input with solid `bg-card` 
- `loading-skeletons.tsx`: Replace `backdrop-blur-sm` with solid `bg-card/50`
- `SwapCryptoSheet.tsx` / `SwapPage.tsx`: Replace `backdrop-blur-md` with solid `bg-card/60`
- `TradingOnboardingWizard.tsx`: Replace `backdrop-blur-md` with solid `bg-card`
- Keep `backdrop-blur-xl` only on critical overlays: LockScreen, BottomNav, AllAssetsPage header

### 4. Add `transform: translate3d(0,0,0)` to stagger-animated list items
In `UnifiedTokenList.tsx`, add `[transform:translate3d(0,0,0)]` to each row so the fade-in-up keyframe runs on the compositor thread.

### 5. Replace `animate-bounce` with GPU-friendly keyframe
In `AIChatPage.tsx`, the typing indicator dots use `animate-bounce` which animates `transform` + layout. Replace with a custom `animate-dot-pulse` using only `opacity` and `scale3d` transforms.

### 6. Add `contain: content` to scrollable lists
Add CSS containment to token lists and transaction history containers so the browser can skip layout/paint work outside the viewport.

### Files to edit
- `src/index.css` — add `.gpu-promoted` utility and `contain` rules
- `tailwind.config.ts` — add `dot-pulse` keyframe
- `src/App.tsx` — no change needed (already GPU-promoted)
- `src/components/BottomNav.tsx` — add GPU layer promotion
- `src/components/ai/AIChatPage.tsx` — remove `backdrop-blur`, fix bounce
- `src/components/trading/TradingOnboardingWizard.tsx` — remove `backdrop-blur-md`
- `src/components/swap/SwapCryptoSheet.tsx` — remove `backdrop-blur-md`
- `src/pages/SwapPage.tsx` — remove `backdrop-blur-md`
- `src/components/ui/loading-skeletons.tsx` — remove `backdrop-blur-sm`
- `src/components/wallet/AccountSwitcherSheet.tsx` — `transition-all` to `transition-colors`
- `src/components/onboarding/FeatureTourStep.tsx` — `transition-all` to specific
- `src/components/onboarding/SecurityWarningStep.tsx` — `transition-all` to specific
- `src/components/notifications/NotificationItem.tsx` — `transition-all` to specific
- `src/pages/NotificationsPage.tsx` — `transition-all` to specific
- `src/pages/AdminNotificationsPage.tsx` — `transition-all` to specific
- `src/components/wallet/UnifiedTokenList.tsx` — add GPU promotion to rows
- `src/components/send/TransactionRiskModal.tsx` — remove `backdrop-blur-sm`

