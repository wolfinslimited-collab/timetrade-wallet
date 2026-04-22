

# Backend Migration: Redirect Frontend to Project A

## Summary
Remove all non-build edge functions and tables from this project. Redirect all frontend API calls to Project A (`svhgjaadzthgnfdrbklt.supabase.co`). Keep only `builds` table, `config` table, and `github-build` edge function in this project.

---

## Step 1: Create Project A Supabase Client

Update `src/lib/externalSupabase.ts` to point to Project A instead of the old `mrdnogctgvzhuqlfervb` project:

- URL: `https://svhgjaadzthgnfdrbklt.supabase.co`
- Anon key: the one already stored in `useTradingApi.ts`
- Rename exports to `projectA` / `projectASupabase` for clarity

---

## Step 2: Redirect Edge Function Calls

Update these files to use the Project A client for `functions.invoke()`:

| File | Function Called | Change |
|------|----------------|--------|
| `src/lib/blockchain.ts` | `wallet-blockchain` | Use `projectASupabase.functions.invoke()` |
| `src/pages/SwapPage.tsx` | `swap-quote` | Use `projectASupabase` |
| `src/pages/StakingPage.tsx` | `staking` | Use `projectASupabase` |
| `src/hooks/useStakeTransfer.ts` | `staking` | Use `projectASupabase` |
| `src/hooks/useWalletAvatar.ts` | `generate-avatar` | Use `projectASupabase` |
| `src/hooks/useFCMToken.ts` | `apns-to-fcm`, `fcm-push` | Use `projectASupabase` |
| `src/components/send/TransactionRiskModal.tsx` | `transaction-risk` | Use `projectASupabase` |
| `src/components/send/RiskCheckStep.tsx` | `transaction-risk` | Use `projectASupabase` |
| `src/components/ai/AIPortfolioInsights.tsx` | `portfolio-insights` | Use `projectASupabase` |
| `src/components/swap/SwapCryptoSheet.tsx` | `swap-quote` | Use `projectASupabase` |
| `src/components/wallet/AccountSwitcherSheet.tsx` | `register-user` | Use `projectASupabase` |
| `src/components/WalletOnboarding.tsx` | `register-user` | Use `projectASupabase` |
| `src/pages/AdminNotificationsPage.tsx` | `fcm-push` | Use `projectASupabase` |

---

## Step 3: Redirect Database Table Reads

| File | Table | Change |
|------|-------|--------|
| `src/hooks/useServerNotifications.ts` | `push_notifications` | Use `projectASupabase.from()` |
| `src/hooks/useFCMToken.ts` | `fcm_tokens` | Use `projectASupabase.from()` |
| `src/pages/AdminNotificationsPage.tsx` | `fcm_tokens` | Use `projectASupabase.from()` |

---

## Step 4: Keep These Unchanged (Still Use This Project's Supabase)

- `src/pages/Build.tsx` — uses `github-build` function + `builds` table
- `src/hooks/useFeatureFlags.ts` — reads `config` table
- `src/hooks/useAppUpdate.ts` — reads `config` table
- `src/pages/Index.tsx` — imports supabase for config

---

## Step 5: Delete Edge Functions from This Project

Remove these folders and undeploy:
- `supabase/functions/wallet-blockchain/`
- `supabase/functions/staking/`
- `supabase/functions/ai-chat/`
- `supabase/functions/fcm-push/`
- `supabase/functions/send-notification/`
- `supabase/functions/register-user/`
- `supabase/functions/transaction-risk/`
- `supabase/functions/portfolio-insights/`
- `supabase/functions/swap-quote/`
- `supabase/functions/apns-to-fcm/`

Update `supabase/config.toml` to remove their `[functions.*]` blocks — keep only `[functions.github-build]`.

---

## Step 6: Drop Non-Build Tables via Migration

Drop these tables (data now lives in Project A):
- `fcm_tokens`
- `push_notifications`
- `saved_addresses`
- `stake_wallets`
- `staking_positions`
- `unstake_requests`
- `wallet_users`

Keep: `builds`, `config`

---

## Step 7: Update Memory

Update `mem://references/project-a.md` to reflect that Project A now hosts all wallet backend functions, not just the trading API.

