

## Fix: PIN Modal Not Showing Transaction Result

### Problem
After entering the PIN to sign a transaction, the success screen never appears. Two bugs cause this:

1. **PinUnlockModal fire-and-forget**: The `handleSubmit` in `PinUnlockModal.tsx` calls `onSubmit(pin)` without `await`. This means the FullScreenPinModal never knows the operation succeeded — it never shows the success checkmark animation, and the `submitting` state resets immediately.

2. **Race condition in ConfirmationStep**: In `handlePinSubmit`, line 318 does `setShowPinModal(false)` then line 319 does `await onConfirm(signedTx)`. When `onConfirm` calls `setStep("success")` in SendPage, the ConfirmationStep unmounts — which destroys the PinUnlockModal portal mid-animation. The user sees a flash or nothing.

3. **Silent broadcast failure**: If broadcast fails, the PIN modal is already closed (line 318 runs before broadcast). The `pinError` state is set but the modal is closed, so the user only sees a brief toast and is stuck on the confirmation screen with no clear indication of what happened.

### Fix — 3 changes

#### 1. `src/components/send/PinUnlockModal.tsx`
- Change `handleSubmit` to **await** `onSubmit(pin)` and return `true` on success (shows checkmark in FullScreenPinModal) or `false` on failure (triggers shake).

#### 2. `src/components/send/ConfirmationStep.tsx` — `handlePinSubmit`
- **Move `setShowPinModal(false)` after `onConfirm`** so the PIN modal stays visible during broadcast with loading state.
- Add a brief delay (400ms) after `onConfirm` succeeds so the user sees the success checkmark in the PIN modal before it closes and the success step appears.
- On broadcast failure: keep the PIN modal open and show the error there (not just a toast), so the user clearly sees what happened and can retry.

The new flow:
```text
User enters PIN
  → Modal shows loading spinner (signing + broadcasting)
  → On success: Modal shows ✓ checkmark (400ms)
  → Modal closes → Success step appears

  → On broadcast failure: Modal shows error, user can retry or cancel
```

#### 3. `src/components/send/ConfirmationStep.tsx` — Make `handlePinSubmit` return a result
- Restructure so it returns `true`/`false` to the PinUnlockModal, enabling proper success/error states in the FullScreenPinModal.

### Files modified
- `src/components/send/PinUnlockModal.tsx` — await onSubmit, return boolean
- `src/components/send/ConfirmationStep.tsx` — reorder modal close, add delay for success animation, keep modal open on error

