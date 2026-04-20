---
name: Platform Feature Flags
description: Per-platform (iphone/android/web) toggles in the config table for Staking, Swap, Exchange, AI Trade
type: feature
---
The `config` table holds 12 keys controlling feature visibility per platform: `show_staking_{iphone|android|web}`, `show_swap_{iphone|android|web}`, `exchange_enabled_{iphone|android|web}`, `show_ai_trade_{iphone|android|web}`. All default to `false`.

- `usePlatform()` resolves runtime platform via `Capacitor.getPlatform()` ('ios' → 'iphone').
- `useFeatureFlags()` fetches all 12 keys (React Query, 5 min stale) and returns `{ showStaking, showSwap, exchangeEnabled, showAiTrade, isLoading }` already resolved for the current platform.
- `Index.tsx` uses these flags for `hiddenTabs` (Staking + AI Trade tabs) and blocks deeplinks to hidden tabs.
- `QuickActions.tsx` conditionally renders the Swap button.
- `exchangeEnabled` is wired but has no UI gating (wallet-only mode — reserved for future).
- The `config.key` column has a `UNIQUE` constraint (`config_key_unique`) for safe upserts.
- Flip flags from Cloud → Tables → `config` (no code change needed).
