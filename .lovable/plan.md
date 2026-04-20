

## Unify Reset Wallet PIN UI

The Reset Wallet flow in Settings still uses a small AlertDialog with a basic custom keypad. It needs to use the same full-screen native PIN modal (`FullScreenPinModal`) that powers onboarding, lock screen, biometric setup, and send-signing.

### Changes

**1. Refactor `src/components/settings/ResetWalletDialog.tsx`**

Keep the two-step flow but split the rendering:
- **Step 1 — "Confirm" warning**: Keep the existing `AlertDialog` with the warning icon, copy, and the red "Yes, Reset Wallet" / "Cancel" buttons. This step does not change.
- **Step 2 — "PIN entry"**: When the user taps "Yes, Reset Wallet", close the AlertDialog and open `FullScreenPinModal` instead of swapping content inside the small dialog.

**2. FullScreenPinModal configuration for the reset step**

```tsx
<FullScreenPinModal
  open={pinOpen}
  onClose={() => setPinOpen(false)}
  eyebrow="Danger Zone"
  title="Confirm Wallet Reset"
  subtitle="Enter your 6-digit PIN to permanently delete this wallet from the device"
  onSubmit={async (pin) => {
    if (pin === localStorage.getItem("timetrade_pin")) {
      onConfirm();
      setPinOpen(false);
      return true;
    }
    return false; // triggers shake + clear in modal
  }}
  error={error}
/>
```

- Reuses the unified glassmorphic keypad, spring dot animations, instant `onPointerDown` taps, haptics, and the shake-on-error.
- Renders at `z-[10000]` so it covers bottom nav, exactly like the other PIN prompts.
- No biometric pill here (intentional — destructive action requires explicit PIN).

**3. Cleanup**

Remove the now-unused inline keypad code, `pin`/`showError`/`handleKeyPress`/`handleDelete`/`verifyPin` state from `ResetWalletDialog.tsx`. The error toast for incorrect PIN is replaced by the modal's built-in shake + error message (consistent with rest of app).

### Files
- `src/components/settings/ResetWalletDialog.tsx` — refactor to two-stage: AlertDialog warning → FullScreenPinModal

### Result
Every PIN entry across the app (onboarding, lock, biometric setup, send signing, reset wallet) uses the identical full-screen native UI — no more small dialog with a different keypad.

