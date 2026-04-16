---
name: AI Trading Tab
description: Bottom nav AI Trading tab with Ed25519 wallet auth and dashboard connected to external mobile API
type: feature
---
The "AI Trade" tab in the bottom navigation connects to an external Timetrade Mobile API at `svhgjaadzthgnfdrbklt.supabase.co/functions/v1/mobile-api`.

**Auth flow:** Challenge/verify using Solana Ed25519 keypair signing via tweetnacl. The mnemonic is decrypted from active account storage, Solana keypair derived, then used to sign the challenge nonce. Session tokens stored in localStorage with 30-day expiry.

**Dashboard:** Mirrors the Timetrade web project dashboard — 4 balance cards (Total, Available, In Trading, Total Profit), trading bot status with start/stop toggle, 7-day earnings summary, recent trades list, and profile card.

**Key files:**
- `src/hooks/useTradingApi.ts` — API client with auth, balance, trading, earnings, and profile endpoints
- `src/pages/AITradingPage.tsx` — Auth screen + Dashboard UI
- `src/components/icons/NavIcons.tsx` — AITradingIcon (trend line + sparkle)
