

## Goal

Turn the `config` table flags into **per-platform** feature switches and have the bottom nav respect them. 12 keys total — 4 features × 3 platforms (iphone, android, web).

## The 12 config keys

| Feature | iPhone | Android | Web |
|---|---|---|---|
| Staking tab | `show_staking_iphone` | `show_staking_android` | `show_staking_web` |
| Swap action | `show_swap_iphone` | `show_swap_android` | `show_swap_web` |
| Exchange | `exchange_enabled_iphone` | `exchange_enabled_android` | `exchange_enabled_web` |
| AI Trade tab | `show_ai_trade_iphone` | `show_ai_trade_android` | `show_ai_trade_web` |

All defaults: `false` (matches current state — flip to `true` from the Cloud config UI when you want a feature live on a platform).

## Backend changes

Single migration that:
1. Deletes the 3 old non-platform rows (`show_staking`, `show_swap`, `exchange_enabled`).
2. Inserts the 12 new rows with `false` defaults (uses `ON CONFLICT (key) DO NOTHING` so it's safe to re-run).
3. Adds a `UNIQUE` constraint on `config.key` (currently missing — needed for upsert/conflict logic).

`config` table RLS already allows public SELECT — no changes there.

## Frontend changes

**1. New hook `src/hooks/usePlatform.ts`**
Returns `'iphone' | 'android' | 'web'` using `Capacitor.getPlatform()` (`'ios'` → `'iphone'`).

**2. New hook `src/hooks/useFeatureFlags.ts`**
- One React Query call fetching all 12 rows from `config` (5 min stale time).
- Detects current platform via `usePlatform()`.
- Returns a clean object:
  ```ts
  { showStaking, showSwap, exchangeEnabled, showAiTrade, isLoading }
  ```
  Each value already resolved to the current platform's flag. Defaults to `false` while loading or on error so hidden-by-default is the safe behavior.

**3. `src/pages/Index.tsx`** — feed flags into `hiddenTabs`:
```ts
const flags = useFeatureFlags();
const hiddenTabs = useMemo<NavTab[]>(() => {
  const hidden: NavTab[] = [];
  if (!flags.showStaking) hidden.push("staking");
  if (!flags.showAiTrade) hidden.push("trading");
  return hidden;
}, [flags.showStaking, flags.showAiTrade]);
```
Also gate the view-switch logic so a user can't land on a hidden tab via deeplink.

**4. Swap/Exchange gating**
- `showSwap` → hides Swap quick action button (currently the `/swap` route already renders `NotFound`, so we just hide the entry point).
- `exchangeEnabled` → controls any exchange-related entry point. (Project is in wallet-only mode so there's no live exchange UI right now; the flag will be wired to the hook and ready for future use — no UI gating needed today, documented in the hook's JSDoc.)

## Files touched

- `supabase/migrations/<timestamp>_platform_feature_flags.sql` (new)
- `src/hooks/usePlatform.ts` (new)
- `src/hooks/useFeatureFlags.ts` (new)
- `src/pages/Index.tsx` (use flags for `hiddenTabs` + deeplink guard)
- `src/components/QuickActions.tsx` (hide Swap button when `!showSwap`)
- `.lovable/memory/index.md` + new `mem://features/platform-feature-flags.md`

## How you control flags after migration

Open Cloud → Tables → `config`, edit any row's `value` from `false` to `true`. Frontend picks it up within 5 min (or on next app reload). No code change needed to flip a feature on a single platform.

