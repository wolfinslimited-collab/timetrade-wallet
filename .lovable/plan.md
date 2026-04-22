
## Fix Send Flow: PIN -> Loading Result -> Success/Error Result UI

### What will change
The send flow will stop leaving the user inside the PIN keypad while the transaction is being broadcast.

New behavior:
```text
Confirm screen
  -> PIN modal
  -> correct PIN
  -> dedicated result screen shows "Sending..." loading state
  -> success result screen OR error result screen
```

Invalid PIN/signing errors will still stay inside the PIN modal.
Broadcast/network errors will move to the result screen and show a proper error UI with retry.

### Why it is broken now
1. The PIN modal currently owns too much of the async flow, so after PIN entry the user remains in the keypad experience instead of transitioning into a send-result screen.
2. The parent send flow only has a success step, not a real pending/error result state.
3. `SendPage.tsx` rethrows broadcast errors, but `SendCryptoSheet.tsx` still swallows them with only a toast, so behavior is inconsistent.
4. The current success UI exists, but it is only entered after the whole process completes; there is no intermediate loading screen and no dedicated failure screen.

### Implementation plan

#### 1. Introduce a unified transaction result screen
Create a dedicated result component for send transactions that supports 3 states:
- `loading`
- `success`
- `error`

UI behavior:
- **Loading:** centered spinner / sending indicator, amount + token, recipient text, disabled bottom action
- **Success:** success icon, “Sent!” copy, explorer link, copy hash, Done button
- **Error:** failure icon, readable error message, Retry button, Back/Close action

This will match the native mobile layout and safe-area behavior already used in the app.

#### 2. Expand send flow states
Update the send-step state so the flow can represent real lifecycle stages, not just `confirm -> success`.

For both route and sheet flows:
- add a pending/result state such as:
  - `sending`
  - `success`
  - `error`

This allows the app to leave the confirm/PIN UI immediately after a valid PIN and show a proper transaction result screen.

#### 3. Change PIN flow responsibility
Refactor the PIN flow so it only handles:
- PIN entry
- PIN validation
- local signing/decryption
- inline PIN errors for wrong PIN / signing failure

After signing succeeds:
- close/unmount the PIN modal
- transition the parent send flow into the dedicated loading result screen
- let the parent continue the broadcast lifecycle

This is the critical logic change the user requested.

#### 4. Move broadcast/result orchestration into the parent send flows
Update both `SendPage.tsx` and `SendCryptoSheet.tsx` so they:
- enter `sending` state before broadcasting
- store transaction result metadata centrally
- switch to `success` when broadcast returns hash/explorer URL
- switch to `error` when broadcast fails
- support retrying from the error result state without forcing the user back through the entire flow

This will make both entry points behave the same:
- full page `/send`
- asset detail send sheet

#### 5. Keep PIN modal only for PIN-related failures
Expected behavior after the refactor:
- **Wrong PIN / local decrypt failure / local signing failure:** stay in PIN modal and shake/show error
- **Broadcast or network failure after valid PIN:** leave PIN modal and show error result screen
- **Successful broadcast:** leave PIN modal, show sending state, then success result UI

#### 6. Reuse or replace the current success component cleanly
Current `TransactionSuccessStep.tsx` will either be:
- expanded into a more general `TransactionResultStep.tsx`, or
- replaced by a new component while preserving the existing success design where appropriate

The new result screen will keep:
- explorer link
- copy hash
- bottom primary button
- mobile-safe spacing

### Files to update

#### `src/components/send/ConfirmationStep.tsx`
- stop treating the PIN modal as the final async container
- keep PIN modal only for PIN/signing phase
- after successful signing, hand off control to parent so parent can show loading result UI
- keep inline PIN errors for bad PIN/sign failures
- remove the current “stay in keypad during broadcast” behavior

#### `src/pages/SendPage.tsx`
- extend send state machine with loading/error result states
- centralize broadcast lifecycle
- store result/error state
- render the new transaction result component for loading/success/error
- preserve refresh logic after successful send

#### `src/components/send/SendCryptoSheet.tsx`
- mirror the same state machine changes as `SendPage`
- stop swallowing broadcast errors with toast-only behavior
- render the same loading/success/error result UI inside the sheet flow
- keep sheet close/reset logic intact

#### `src/components/send/TransactionSuccessStep.tsx`
- convert into a generalized result component or replace with a new shared result component
- support success and error modes
- optionally support loading mode in the same component for a single consistent experience

#### `src/components/send/PinUnlockModal.tsx`
- keep returning success/failure to the keypad
- ensure it no longer acts like the broadcast result UI
- remain focused on PIN auth only

#### `src/components/shared/FullScreenPinModal.tsx`
- minor adjustments only if needed for smoother handoff after a valid PIN
- no major redesign required unless a small timing tweak is needed to avoid flicker

### Resulting UX
```text
Enter PIN
  -> if PIN is wrong:
       PIN modal shakes + error text
  -> if PIN is correct:
       result screen opens in "Sending..." state
       -> if broadcast succeeds:
            show success result UI
       -> if broadcast fails:
            show error result UI with retry
```

### Technical details
- Both send implementations must be updated, not just `SendPage.tsx`
- Error propagation will be standardized so parent flows always know whether to show success or error result UI
- The final design will stay edge-to-edge and mobile-native, following existing modal/layout memory rules
- Toasts can remain secondary feedback, but the main source of truth will be the visible result screen
