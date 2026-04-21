

# Fix PIN UI Consistency and Cancel Button Position

## Problem
1. The Lock Screen PIN layout (screenshot 2) does not match the other PIN UIs like the Wallet Reset screen (screenshot 1). The Lock Screen places PIN dots near the top with a large empty gap before the keypad, while the FullScreenPinModal centers the dots vertically between title and keypad.
2. The "Cancel" button in FullScreenPinModal sits at the very bottom below the keypad — an awkward position on tall screens. It should be moved to the top-right corner.

## Changes

### 1. `src/components/LockScreen.tsx` — Match FullScreenPinModal layout
- Replace the current layout (dots near top, `flex-1` spacer, keypad at bottom) with the same structure used by FullScreenPinModal:
  - Logo + title at the top (already there)
  - PIN dots and biometric pill in a `flex-1` centered container (vertically centered between title and keypad)
  - Keypad pinned at the bottom with `shrink-0`
- This makes the lock screen visually identical to screenshot 1's layout pattern.

### 2. `src/components/shared/FullScreenPinModal.tsx` — Move Cancel to top-right
- Remove the "Cancel" button from the bottom (below the keypad/footer area).
- Add a "Cancel" text button in the header row, aligned to the right side.
- When `showBackArrow` is true, keep the back arrow on the left and add Cancel on the right. When `showBackArrow` is false, show Cancel on the right only.

## Files to edit
- `src/components/LockScreen.tsx`
- `src/components/shared/FullScreenPinModal.tsx`

