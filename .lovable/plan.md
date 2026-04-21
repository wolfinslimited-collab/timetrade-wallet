

# Add Safe Area Bottom Padding to All Bottom Buttons

## Problem
On devices with a home indicator (iPhone X and later), bottom buttons are obscured by the phone's home bar because they lack safe area inset padding. The screenshot shows the SecurityWarningStep button being cut off.

## Affected Files and Changes

### 1. `src/components/onboarding/SecurityWarningStep.tsx`
The fixed bottom container (`shrink-0 px-6 py-4 border-t`) needs safe area padding:
- Change the bottom container div to include `style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}`

### 2. `src/components/onboarding/SeedPhraseStep.tsx`
The fixed bottom button container (`shrink-0 px-6 py-4 border-t`) has no safe area:
- Add `style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}`

### 3. `src/components/onboarding/VerifySeedStep.tsx`
Same pattern -- fixed bottom button container missing safe area:
- Add `style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}`

### 4. `src/components/send/AddressInputStep.tsx`
The "Continue" button wrapper (`div className="pt-4"`) sits at the bottom with no safe area:
- Add `style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}`

### 5. `src/components/send/AmountInputStep.tsx`
The "Review Transaction" button wrapper (`div className="mt-auto pt-6"`) has no safe area:
- Add `style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}`

### 6. `src/components/send/ConfirmationStep.tsx`
The "Confirm" button wrapper (`div className="mt-auto pt-4 pb-6"`) has no safe area:
- Add `style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}`

### 7. `src/components/send/TransactionSuccessStep.tsx`
The "Done" button wrapper (`div className="w-full pt-4"`) and the outer container (`pb-8`) have no safe area:
- Add `style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}` to the button wrapper

### 8. `src/components/send/RiskCheckStep.tsx`
The action buttons at the bottom (`div className="flex gap-3 w-full mt-auto px-2"`) have no safe area:
- Add `style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}`

### 9. `src/pages/ReceivePage.tsx`
The action buttons at the bottom (`div className="flex gap-3 mt-6"`) have no safe area:
- Add `style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}`

### 10. `src/pages/SendPage.tsx`
The page header also needs top safe area inset:
- Add `style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 1.5rem)" }}` to the header div

## Technical Details
- All fixes use `env(safe-area-inset-bottom, 0px)` which is already supported via the `viewport-fit=cover` meta tag in `index.html`
- The pattern is consistent with existing safe area usage across the onboarding flow (WelcomeStep, PinSetupStep, etc.)
- No new dependencies required

