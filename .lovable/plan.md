

# Fix Bottom Sheet Close Buttons and Remove Back Arrow

## Changes

### 1. Remove "← Back" from seed phrase view header
In `src/components/settings/ViewSeedPhraseSheet.tsx`, remove the Back button from the step 3 (view-seed) header. The title will show just the account nickname. Users can close the sheet with the close button instead.

### 2. Add centered close button to bottom sheets
For bottom sheet modals like this one, hide the default top-right X close button and add a centered, slightly larger close (X) button at the top of the sheet content, styled as a centered pill/circle. This provides a more native iOS feel.

### Files to edit

- **`src/components/settings/ViewSeedPhraseSheet.tsx`**
  - Step 3 header: remove the `← Back` button, show only the account nickname as the title
  - Hide the default SheetContent close button (`hideCloseButton`)
  - Add a centered close X button at the top of the sheet (rounded circle, larger than default)
  - Apply the same pattern to the step 1 (select-account) sheet

### Technical details

The SheetContent already supports `hideCloseButton` prop. Each bottom sheet will use `hideCloseButton` and render a custom centered close button in the header area — a 32x32 rounded-full button with the X icon, centered at the top of the content.

