

## Fix: Transaction Detail Sheet Shows Wrong Token Symbol

### Problem
The Solana Transaction Detail Sheet always displays the amount as **SOL** (line 134 of `SolanaTransactionDetailSheet.tsx`), even when the transaction is an SPL token transfer (e.g. USDC). The header always calls `formatLamports(transaction.value)` which converts from lamports (SOL decimals), ignoring token transfer data entirely.

The EVM `TransactionDetailSheet.tsx` also has hardcoded values — it always shows "ETH" for network fee (line 149) and "Ethereum Mainnet" for network (line 177), and links to etherscan.io (line 182), regardless of which chain the transaction is on.

### Plan

**1. Fix `SolanaTransactionDetailSheet.tsx` — detect token transfers and show correct symbol/amount**

- When `tokenTransfers` exist and contain a relevant transfer (matching `userAddress`), extract the token symbol, amount, and decimals from that transfer instead of showing SOL
- Use the existing `KNOWN_SPL` mint mapping (from `TransactionHistoryPage.tsx`) to resolve token symbols — extract this into a shared utility
- Only fall back to showing SOL when there are no token transfers (native SOL transaction)
- The header amount will show e.g. "-1.0000 USDC" instead of "-1.000000 SOL"

**2. Fix `TransactionDetailSheet.tsx` — use actual chain data instead of hardcoded Ethereum values**

- Accept `chain` and `explorerUrl` as props
- Use the chain's network config to show the correct network name, native symbol for fees, and explorer URL
- Update the "View on Explorer" button to use the correct explorer URL

**3. Extract shared `KNOWN_SPL` token map**

- Move the `KNOWN_SPL` constant from `TransactionHistoryPage.tsx` into a shared file (e.g. `src/config/knownTokens.ts`) so both the history page and detail sheets can use it

**4. Update parent components that render these sheets**

- Pass `chain` and `explorerUrl` to `TransactionDetailSheet` from `TransactionHistoryPage.tsx` and `AssetDetailPage.tsx`

### Files to modify
- `src/components/history/SolanaTransactionDetailSheet.tsx` — smart token detection in header
- `src/components/history/TransactionDetailSheet.tsx` — accept chain/explorer props, remove hardcoded ETH/Ethereum
- `src/pages/TransactionHistoryPage.tsx` — pass chain info to detail sheets, extract KNOWN_SPL
- `src/pages/AssetDetailPage.tsx` — pass chain info to detail sheets
- `src/config/knownTokens.ts` (new) — shared SPL token mint map

