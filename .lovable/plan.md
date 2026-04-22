

## Separate PIN Verification from Transaction Signing

### What changes

The PIN unlock modal will only verify the PIN (decrypt the seed to confirm correctness), then immediately close and advance to the "sending" step. The actual transaction signing and broadcasting will happen inside the "sending/result" step, using the verified PIN to derive keys and sign.

### Why

Currently, the PIN modal both verifies the PIN AND signs the transaction inline, which couples two concerns. The user wants the PIN step to be a quick unlock gate, with the heavier signing/broadcast work shown in the loading result screen.

### Technical details

#### 1. `src/components/send/ConfirmationStep.tsx`

- Modify `onConfirm` prop signature to accept an optional `pin` parameter: `onConfirm: (pin?: string) => void`
- Simplify `handlePinSubmit`: only decrypt the seed phrase to verify the PIN is correct (keep the decrypt check), then call `onConfirm(pin)` without signing. Remove all signing logic (EVM, Solana, Tron key derivation and `signTransaction` calls).
- Remove imports and hooks no longer needed in this component: `useTransactionSigning`, `useTronTransactionSigning`, `useSolanaTransactionSigning`, `derivePrivateKeyForChain`, `ethers`, etc.

#### 2. `src/components/send/SendCryptoSheet.tsx`

- Update `handleConfirm` to accept `pin?: string` and store it in state (e.g., `verifiedPin`).
- Move the signing logic (currently in `ConfirmationStep.handlePinSubmit`) into the `doBroadcast` function or a new `signAndBroadcast` function that runs during the "sending" step.
- The "sending" step will: derive the private key from the stored mnemonic using the verified PIN, sign the transaction for the correct chain, then broadcast the signed transaction.
- On error during signing, transition to the "error" step with the appropriate message and allow retry.

#### 3. `src/components/send/TransactionResultStep.tsx`

- No structural changes needed. The "loading" mode already displays a spinner. The signing work will happen before this component shows "success" or "error".

### Flow after changes

```text
Confirm screen → tap "Confirm & Sign" → PIN modal (verify only)
  → PIN correct → close modal → "sending" step (sign + broadcast with loading spinner)
  → success / error result
```

