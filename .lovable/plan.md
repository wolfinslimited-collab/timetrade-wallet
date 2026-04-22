
Fix the shared PIN keypad so taps always register again in the transaction-sign modal, then add consistent haptic feedback across every PIN-entry flow that uses the shared keypad.

1. Stabilize the shared keypad button interaction
- Update `src/components/shared/KeypadButton.tsx` so it no longer relies only on a single `onPointerDown` path.
- Replace the current event handling with a safe single-fire interaction model that:
  - works on iPhone/Android touch
  - still works with normal click activation
  - does not double-trigger like before
  - clears the pressed visual state reliably on release/cancel
- Keep the native-feeling pressed animation, but avoid event suppression that can make taps appear dead inside modal/portal flows.

2. Make the shared full-screen PIN modal respond reliably
- Verify `src/components/shared/FullScreenPinModal.tsx` continues to submit digits exactly once per tap after the shared button change.
- Keep the existing success/error/shake behavior, but ensure the keypad is never blocked unless `isLoading`, `submitting`, or `success` is actually true.
- Preserve all current consumers of this modal:
  - `src/components/send/PinUnlockModal.tsx`
  - `src/components/settings/ChangePinSheet.tsx`
  - `src/components/settings/ViewSeedPhraseSheet.tsx`
  - `src/components/settings/ResetWalletDialog.tsx`
  - `src/components/settings/BiometricSetupDialog.tsx`

3. Add haptic feedback to all React PIN keypad flows
- Ensure every numeric and delete press gives one light selection vibration across:
  - `src/components/shared/FullScreenPinModal.tsx`
  - `src/components/LockScreen.tsx`
  - `src/components/onboarding/PinSetupStep.tsx`
- Avoid duplicate vibrations by keeping haptics in one place per press path.
- Keep stronger feedback for validation outcomes:
  - success = medium impact
  - wrong PIN / mismatch / failure = heavy impact

4. Keep Flutter parity
- Confirm the standalone Flutter keypad in `flutter_app/lib/core/widgets/pin_keypad.dart` already provides haptic feedback on press.
- Only adjust it if needed so behavior matches the React app: one haptic per key tap, not multiple.

5. Regression checks after implementation
- Test these flows specifically:
  - Sign transaction PIN modal: digits appear immediately, 6-digit submit fires once
  - Change PIN: current/new/confirm steps all accept taps correctly
  - View seed phrase PIN gate: taps work and wrong PIN clears with error
  - Reset wallet PIN confirmation: keypad works and deletes correctly
  - Lock screen: no duplicate digits, no dead taps
  - Onboarding PIN setup: create/confirm works with haptics
- Verify no old triple-press bug returns while fixing the dead-tap issue.

Technical details
- Likely issue area: `src/components/shared/KeypadButton.tsx` currently uses only `onPointerDown` with `preventDefault()`, which is fragile for modal/mobile tap handling.
- Safer implementation target: support a single activation per real user interaction with proper guard/reset behavior instead of depending on one pointer event only.
- Because `FullScreenPinModal` is the shared entry point for transaction signing and multiple security flows, fixing the shared button should repair the broken sign-transaction PIN UI everywhere it is reused.
