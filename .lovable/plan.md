

# Redesign Transaction Success Screen

## Overview
Replace the current busy success screen with a clean, minimal design matching the reference screenshot. Add haptic feedback on mount. The new layout: large green checkmark with animation, "Sent!" title, amount + recipient summary, and a "View transaction" link. Remove the card-style summary, Explorer/Share buttons, and Done button clutter.

## Changes

### 1. Rewrite `TransactionSuccessStep.tsx`
**File:** `src/components/send/TransactionSuccessStep.tsx`

Replace the entire render with a minimal centered layout:
- **Haptic on mount**: Fire `haptics.notify("success")` in a `useEffect` on mount
- **Animated green checkmark**: Large 80px solid green (`#4ADE80`) circle with a `Check` icon inside, spring animation from scale 0 to 1
- **"Sent!" heading**: Bold, 24px, appears after checkmark with fade-in
- **Summary line**: Muted text showing `"{amount} {symbol} was successfully sent to {truncatedAddress}"` -- concise, single line
- **"View transaction" link**: Primary-colored text button that opens the explorer URL, appears with fade-in
- **Done button at bottom**: Keep a minimal "Done" button with safe area padding, same as current
- Remove: the card with amount/status/txHash details, the Explorer and Share pill buttons, the ripple animation, the `CheckCircle` icon (use filled circle + `Check` instead)

### 2. Add Haptics to Other Key Moments
**File:** `src/components/send/ConfirmationStep.tsx`

- Add `haptics.impact("medium")` when broadcast succeeds (just before transitioning to the success step)
- Add `haptics.notify("error")` on broadcast failure

## Technical Details
- Import `haptics` from `@/lib/haptics` (already exists and works on native + web)
- Use Framer Motion `motion.div` for the checkmark spring and text fade-ins (already a dependency)
- Green circle uses inline Tailwind: `bg-emerald-400` for the filled circle, white `Check` icon
- Keep `useQueryClient` invalidation in `handleDone`
- Safe area bottom padding preserved on the Done button

## Files Modified
- `src/components/send/TransactionSuccessStep.tsx` -- full redesign
- `src/components/send/ConfirmationStep.tsx` -- add haptic calls on broadcast result

