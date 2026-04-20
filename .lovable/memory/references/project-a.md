---
name: Project A
description: External Timetrade trading backend (svhgjaadzthgnfdrbklt.supabase.co/mobile-api) consumed by the AI Trade tab
type: reference
---
**"Project A"** = the external Timetrade trading/PnL backend.

- Base URL: `https://svhgjaadzthgnfdrbklt.supabase.co/functions/v1/mobile-api`
- Anon key stored in `src/hooks/useTradingApi.ts` as `TIMETRADE_SUPABASE_ANON_KEY`
- Auth: email/password via `/auth/login`, `/auth/register`, `/auth/forgot-password`. Bearer token returned, stored in localStorage 30 days.
- Endpoints used: `/wallet/balance`, `/wallet/deposit-addresses`, `/wallet/withdraw`, `/trading/status`, `/trading/toggle`, `/history/trades`, `/history/earnings?days=N`, `/profile`, `/transactions`
- All requests include `Authorization: Bearer <anon_key>`, `apikey: <anon_key>`, and `x-api-token: <session_token>`.
- Consumed by: `src/hooks/useTradingApi.ts`, `src/pages/AITradingPage.tsx`, `src/components/trading/PnlChart.tsx`.
- When the user says "Project A" they mean this backend.
