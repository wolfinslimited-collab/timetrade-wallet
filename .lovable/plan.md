

## Fix Empty Balances After Import + Bottom Nav Spacing

### Issue 1: Balances not loading after wallet import

**Root cause**: After onboarding completes (`handleOnboardingComplete`), the app sets `hasWallet = true` and `isLocked = false`, but never dispatches a `timetrade:unlocked` event. The `BlockchainContext` only re-derives addresses when it receives that event. Without it, the unified portfolio hook never gets valid addresses, so all balances show $0.

Additionally, there is a Solana derivation path mismatch: onboarding uses `"legacy"` as the default path, while `BlockchainContext` uses `"phantom"`. This means the Solana address saved during onboarding differs from what would be derived on subsequent unlocks.

**Fix**:

1. **`src/pages/Index.tsx`** — In `handleOnboardingComplete`, dispatch a `timetrade:unlocked` event with the stored PIN so `BlockchainContext` re-derives addresses and triggers balance fetching:
   ```
   window.dispatchEvent(new CustomEvent('timetrade:unlocked', { detail: { pin: localStorage.getItem('timetrade_pin') } }));
   ```

2. **`src/components/WalletOnboarding.tsx`** — Change the default Solana derivation path in `handlePinComplete` from `"legacy"` to `"phantom"` to match `BlockchainContext`'s default, preventing address mismatches.

---

### Issue 2: Bottom navigator has too much space from device bottom

**Root cause**: The nav wrapper has `pt-2` top padding and the `nav-safe-inset` class adds `padding-bottom: env(safe-area-inset-bottom)`. On native iOS with Capacitor, the WebView already accounts for safe areas, so the `env()` value doubles the inset. The `pt-2` also adds unnecessary vertical spacing.

**Fix**:

1. **`src/components/BottomNav.tsx`** — Remove `pt-2` from the inner wrapper, reduce it to `pt-1`. Change `pb-0` to `pb-1` for a tight but comfortable fit. Keep the `nav-safe-inset` class but make it smaller.

2. **`src/index.css`** — Update `.nav-safe-inset` to use a smaller safe-area fraction or a max constraint so native iOS does not double the bottom inset:
   ```css
   .nav-safe-inset {
     padding-bottom: max(4px, env(safe-area-inset-bottom, 0px));
   }
   ```
   This preserves safe area handling but prevents excessive spacing.

---

### Files to modify
- `src/pages/Index.tsx` — dispatch unlock event after onboarding
- `src/components/WalletOnboarding.tsx` — fix Solana path default
- `src/components/BottomNav.tsx` — tighten vertical padding
- `src/index.css` — adjust safe-area padding rule

