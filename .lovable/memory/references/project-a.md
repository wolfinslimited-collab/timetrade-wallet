---
name: Project A
description: External Timetrade backend (svhgjaadzthgnfdrbklt.supabase.co) hosting ALL wallet edge functions, trading API, notifications, and database tables
type: reference
---
**"Project A"** = the central Timetrade backend hosting all wallet services.

- Base URL: `https://svhgjaadzthgnfdrbklt.supabase.co/functions/v1/mobile-api`
- Anon key stored in `src/hooks/useTradingApi.ts` as `TIMETRADE_SUPABASE_ANON_KEY`
- Also exported from `src/lib/externalSupabase.ts` as `PROJECT_A_ANON_KEY`
- Auth: email/password via `/auth/login`, `/auth/register`, `/auth/forgot-password`. Bearer token returned, stored in localStorage 30 days.
- Trading endpoints: `/wallet/balance`, `/wallet/deposit-addresses`, `/wallet/withdraw`, `/trading/status`, `/trading/toggle`, `/history/trades`, `/history/earnings?days=N`, `/profile`, `/transactions`
- Edge functions hosted: `wallet-blockchain`, `staking`, `ai-chat`, `fcm-push`, `send-notification`, `register-user`, `transaction-risk`, `portfolio-insights`, `swap-quote`, `apns-to-fcm`, `generate-avatar`
- Database tables hosted: `fcm_tokens`, `push_notifications`, `saved_addresses`, `stake_wallets`, `staking_positions`, `unstake_requests`, `wallet_users`
- All requests include `Authorization: Bearer <anon_key>`, `apikey: <anon_key>`, and `x-api-token: <session_token>`.
- Consumed by: `src/lib/externalSupabase.ts` (projectASupabase client), `src/hooks/useTradingApi.ts`, and all redirected hooks/components.
- When the user says "Project A" they mean this backend.
