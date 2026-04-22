

## Inline Security Check in Address Input

### What changes

The address input step will show a **"Security Check - Analyze address for risks"** card directly below the address input field when a valid address is entered. This replaces the current behavior where clicking "Continue" triggers a full-screen risk analysis that hides the address form.

### How it will work

1. **When a valid address is typed/pasted**: A clickable "Security Check" card appears below the address input (green shield icon, "Security Check" title, "Analyze address for risks" subtitle, chevron arrow).

2. **Tapping the Security Check card**: Triggers the risk analysis inline -- the card expands to show loading state, then results (risk level, score, flags) within the same card area. The address input remains visible above.

3. **Continue button**: Always visible at the bottom. Tapping "Continue" submits the address and moves to the amount step directly -- no separate risk step. The security check is optional/informational, not blocking.

4. **High risk handling**: If high risk is detected, the card shows a warning but the user can still proceed via Continue.

### Files to modify

- **`src/components/send/AddressInputStep.tsx`** -- Restructure to:
  - Remove the full-screen risk takeover (loading/done states that hide the address form)
  - Add an inline "Security Check" card below the address input that appears when address is valid
  - Tapping the card runs the risk analysis and shows results inline within the card
  - "Continue" button always calls `onSubmit` directly without triggering risk check
  
- **`src/pages/SendPage.tsx`** -- No changes needed (already routes address -> amount)

- **`src/components/send/SendCryptoSheet.tsx`** -- Verify risk step is already removed from flow

