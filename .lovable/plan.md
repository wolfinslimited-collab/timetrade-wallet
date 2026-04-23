

## Goal

Silence the noisy toast popups that appear during wallet creation, wallet import, and push notification registration — these are the ones surfacing on app launch (like "Push notifications registered!" in your screenshot). Keep critical toasts (transaction errors, copy confirmations, security alerts) so the app remains usable.

## Files containing the popups you asked about

**Wallet Create flow**
- `src/components/WalletOnboarding.tsx` — "Setup failed" error toast during seed encryption (line ~110)
- `src/components/onboarding/SuccessStep.tsx` — full-screen "Wallet Created!" success step (visual screen, not a toast)

**Wallet Import flow**
- `src/components/onboarding/ImportWalletStep.tsx` — toasts for: scanned, pasted, invalid QR, invalid clipboard, incomplete seed, invalid words, invalid checksum (lines 51, 53, 88, 101, 103, 106, 117, 122, 126)
- `src/components/wallet/AccountSwitcherSheet.tsx` — `toast.success("Wallet imported successfully")` (line 620) when importing an additional account

**Web / Push notification popup**
- `src/hooks/useFCMToken.ts` — `toast.success("Push notifications registered!")` (lines 83 and 92) — this is the popup in your screenshot
- `src/components/settings/NotificationSettingsSheet.tsx` — toasts for enable/disable feedback
- `src/pages/NotificationsPage.tsx` — debug copy toast

## Proposed changes

### 1. Remove the auto-registration popup (the one in your screenshot)
Delete both `toast.success("Push notifications registered!")` calls in `src/hooks/useFCMToken.ts`. Status is already tracked in state — no need to interrupt the user on every app open.

### 2. Silence wallet create flow
Remove the "Setup failed" toast in `WalletOnboarding.tsx`. Replace with inline error handling (the user already sees the success step UI on completion).

### 3. Silence wallet import flow
- `ImportWalletStep.tsx`: Remove the 7 informational/validation toasts. Replace destructive validation errors (incomplete, invalid words, bad checksum) with **inline red text under the seed grid** — better UX than a popup.
- `AccountSwitcherSheet.tsx`: Remove the "Wallet imported successfully" toast — the sheet closes and the new account appears, which is feedback enough.

### 4. Keep these (do NOT remove)
- Transaction send errors / success (`ConfirmationStep.tsx`, `TransactionResultStep.tsx`) — financial actions need confirmation
- Copy-to-clipboard toasts (address, seed phrase) — standard UX expectation
- Lock screen "Incorrect PIN" toasts — security feedback
- Biometric / PIN settings toasts — explicit user actions in settings

If you'd rather strip **every single toast everywhere** (including transaction confirmations and copy feedback), say "remove all toasts globally" and I'll do that instead — but it will make some flows feel broken.

### Technical notes
- No changes to `<Toaster />` / `<Sonner />` mounts in `App.tsx` — the toast system stays available for the kept use cases.
- `AlertDialog` components (delete account confirm, remove key confirm) are **modals**, not popup alerts — they stay, since removing them would break destructive-action confirmations Apple requires.

