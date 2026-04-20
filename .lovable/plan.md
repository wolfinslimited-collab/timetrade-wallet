

## Unify All PIN Screens to Match the FullScreenPinModal Style

The app currently has **3 different PIN keypad styles** across 5 files. The goal is to make every PIN screen match the style shown in screenshot 1 (the "Confirm Wallet Reset" screen from `FullScreenPinModal`).

### Current Problems

| Screen | File | Issue |
|--------|------|-------|
| **Lock Screen (app startup)** | `LockScreen.tsx` + `PinKeypad.tsx` | Uses old 76px embossed buttons with Framer Motion `whileTap`, different font weight |
| **Change PIN** | `ChangePinSheet.tsx` | Uses a Sheet with old `bg-card border-border` 76px buttons, "Delete" text instead of icon |
| **View Seed Phrase** | `ViewSeedPhraseSheet.tsx` | Same old Sheet style as Change PIN |

### Target Style (from FullScreenPinModal)
- 72px round buttons, `bg-white/[0.04] border border-white/[0.06]`
- `text-[30px] font-light` for digits
- `Delete` icon (lucide) for backspace, not text
- PointerDown-based instant tap (no Framer Motion `whileTap`)
- Press state: `bg-white/[0.16] scale-90`

### Plan

**Step 1: Refactor LockScreen to use FullScreenPinModal style**

Update `src/components/LockScreen.tsx` to replace the imported `PinKeypad` component with the same inline `KeypadButton` pattern and grid layout used in `FullScreenPinModal`. Match the 72px size, `text-[30px] font-light`, and `Delete` icon. The lock screen keeps its own layout (logo, blur background) but the keypad grid itself will be identical.

Alternatively, delete `src/components/lock/PinKeypad.tsx` entirely since it will no longer be used.

**Step 2: Convert ChangePinSheet to use FullScreenPinModal**

Replace the Sheet-based UI in `src/components/settings/ChangePinSheet.tsx` with `FullScreenPinModal`. The 3-step flow (current -> new -> confirm) will use the modal's title/subtitle/eyebrow props, switching them per step. All re-encryption logic stays the same, just the UI wrapper changes.

**Step 3: Convert ViewSeedPhraseSheet PIN step to use FullScreenPinModal**

Update `src/components/settings/ViewSeedPhraseSheet.tsx` to use `FullScreenPinModal` for its PIN verification step instead of the inline Sheet keypad.

**Step 4: Delete unused PinKeypad component**

Remove `src/components/lock/PinKeypad.tsx` since no component will reference it after the LockScreen update.

### Technical Details

- The `KeypadButton` component is duplicated in `FullScreenPinModal.tsx` and `PinSetupStep.tsx`. As part of this change, extract it into a shared file (e.g. `src/components/shared/KeypadButton.tsx`) so all PIN screens import the same component.
- PIN dots styling will also be unified: `w-3.5 h-3.5 rounded-full border-2` with spring animations, matching FullScreenPinModal.
- The LockScreen retains its unique frosted-glass background and biometric pill, but the keypad and dots will be visually identical to all other PIN screens.

