---
name: AI Trading Tab
description: Bottom nav AI Trading tab with Ed25519 wallet auth and dashboard connected to external mobile API
type: feature
---
The "AI Trade" tab in the bottom navigation connects to an external Timetrade Mobile API at `svhgjaadzthgnfdrbklt.supabase.co/functions/v1/mobile-api`.

**Auth flow:** Challenge/verify using Solana Ed25519 keypair signing via tweetnacl. The mnemonic is decrypted from active account storage, Solana keypair derived, then used to sign the challenge nonce. API tokens stored in localStorage with 30-day expiry. All API calls include `Authorization: Bearer <anon_key>` and `apikey` headers, plus `x-api-token` for user auth.

**Anon key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2aGdqYWFkenRoZ25mZHJia2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjI0NTMsImV4cCI6MjA4NTU5ODQ1M30.8WZZrAshhSb4DchRnL9UJ0bEQX7zQPuD9930PaNi4AA`

**Dashboard:** 4 balance cards (Total, Available, In Trading, Total Profit), trading bot status with start/stop toggle, 7-day earnings summary, recent trades list, and profile card.

**Key files:**
- `src/hooks/useTradingApi.ts` — API client with wallet-signature auth, balance, trading, earnings, and profile endpoints
- `src/pages/AITradingPage.tsx` — Connect wallet screen + Dashboard UI
- `src/components/icons/NavIcons.tsx` — AITradingIcon (trend line + sparkle)
