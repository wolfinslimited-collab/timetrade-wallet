---
name: AI Trading Tab
description: Bottom nav AI Trading tab with Ed25519 wallet auth and dashboard connected to external mobile API
type: feature
---
The "AI Trade" tab in the bottom navigation connects to an external Timetrade Mobile API at `svhgjaadzthgnfdrbklt.supabase.co/functions/v1/mobile-api`.

**Auth flow:** Challenge/verify using Solana Ed25519 keypair signing via tweetnacl. The mnemonic is decrypted from active account storage, Solana keypair derived, then used to sign the challenge nonce. API tokens stored in localStorage with 30-day expiry. All API calls include `Authorization: Bearer <anon_key>` and `apikey` headers, plus `x-api-token` for user auth.

**Anon key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2aGdqYWFkenRoZ25mZHJia2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjI0NTMsImV4cCI6MjA4NTU5ODQ1M30.8WZZrAshhSb4DchRnL9UJ0bEQX7zQPuD9930PaNi4AA`

**Endpoints:**
- `/auth/challenge` POST — get nonce+message for wallet signing
- `/auth/verify` POST — verify signature, get token
- `/wallet/balance` GET — balances and trading status
- `/portfolio/summary` GET — deposited, profit, ROI
- `/trades/history?limit=20&offset=0` GET — paginated trades
- `/earnings/chart?days=30` GET — earnings chart data
- `/earnings/total` GET — total earned profit
- `/trading/start` POST — start with allocatedAmount, riskLevel, etc.
- `/trading/stop` POST — stop trading
- `/notifications?limit=20` GET — user notifications
- `/notifications/read` POST — mark notification read
- `/deposit/address` POST — get deposit address by chain
- `/withdraw` POST — withdraw funds

**Dashboard:** 4 balance cards (Total, Available, In Trading, Total Profit), ROI card, trading bot status with start/stop toggle, total earnings, recent trades list, and profile card.

**Key files:**
- `src/hooks/useTradingApi.ts` — API client with wallet-signature auth and all endpoint methods
- `src/pages/AITradingPage.tsx` — Connect wallet screen with PIN dialog + Dashboard UI
- `src/components/icons/NavIcons.tsx` — AITradingIcon (trend line + sparkle)
