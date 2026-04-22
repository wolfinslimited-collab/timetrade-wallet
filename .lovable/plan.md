
Fix the sign-transaction PIN keypad by addressing the real cause: the PIN modal is being portaled to `document.body`, while the parent send flow lives inside a Radix sheet/dialog that disables pointer interaction outside its own modal layer. The keypad is visible, but it is treated as “outside” the active Radix modal tree, so taps can be ignored even when z-index looks correct.

1. Fix the actual modal-layer bug
- Update `src/components/shared/FullScreenPinModal.tsx` so it no longer always portals to `document.body`.
- Add a configurable mount target such as `container?: HTMLElement | null`.
- Default to `document.body` only when no container is provided.
- Keep the modal root explicitly interactive with `pointer-events-auto`, but do not rely on z-index alone as the fix.

2. Mount the PIN modal inside the active send sheet
- In `src/components/send/ConfirmationStep.tsx`, create a local DOM mount node inside the sheet/content subtree with a ref.
- Pass that ref/container into `PinUnlockModal`, and from there into `FullScreenPinModal`.
- This keeps the PIN overlay inside the same Radix dismissable-layer tree as the send sheet, so number buttons receive touch/click events correctly.

3. Propagate the same fix to every PIN flow launched from another modal/sheet
- Audit all `FullScreenPinModal` / `PinUnlockModal` usages and pass a local container when they are opened from inside another overlay.
- Priority files from the current codebase:
  - `src/components/send/PinUnlockModal.tsx`
  - `src/components/settings/ChangePinSheet.tsx`
  - `src/components/settings/ViewSeedPhraseSheet.tsx`
  - `src/components/settings/BiometricSetupDialog.tsx`
  - `src/components/settings/ResetWalletDialog.tsx`
  - `src/pages/SwapPage.tsx`
  - `src/pages/StakingPage.tsx`
- Leave direct full-screen/root-level PIN flows unchanged unless they also render from within another modal context.

4. Keep the keypad interaction hardened
- Preserve the recent `KeypadButton` touch/mouse activation improvements.
- Add a final safeguard so keypad buttons expose `pointer-events-auto` and are not wrapped by any accidental non-interactive container.
- Verify the modal content column and keypad region do not inherit `pointer-events: none`.

5. Normalize overlay stacking instead of escalating z-index forever
- Keep `FullScreenPinModal` above normal content, but stop using z-index as the primary workaround.
- Review custom overlays already using `z-[99999]` such as:
  - `src/components/send/TransactionRiskModal.tsx`
  - `src/components/settings/ResetWalletDialog.tsx`
  - `src/components/settings/AddressBookSheet.tsx`
- Ensure they do not conflict with the shared PIN flow when both can appear in the same screen path.

6. Verify the exact broken path first
- Reproduce the issue specifically in the sign-transaction path from `src/components/send/ConfirmationStep.tsx`.
- Confirm:
  - keypad digits visibly press
  - PIN dots fill on each tap
  - haptic fires on each digit
  - delete works
  - biometric button still works
  - modal remains tappable when opened above the send sheet

Technical details
- Current likely root cause:
  - `FullScreenPinModal` uses `createPortal(..., document.body)`.
  - `Sheet` / `Dialog` from Radix use modal dismissable layers that disable outside pointer events.
  - A nested modal portaled to `body` is visually above the sheet, but logically outside the active modal subtree, so touches can be blocked or discarded.
- Relevant files already confirming this:
  - `src/components/shared/FullScreenPinModal.tsx`
  - `src/components/ui/sheet.tsx`
  - `src/components/ui/dialog.tsx`
  - `src/components/send/ConfirmationStep.tsx`
- External behavior matches known Radix dismissable-layer pointer-event issues for nested/third-party portals opened from inside dialogs/sheets.

Expected result
- The sign transaction PIN keypad becomes reliably clickable again.
- The fix works for mobile touch, not just desktop click.
- Other PIN modals opened from sheets/dialogs inherit the same reliability without more z-index hacks.
