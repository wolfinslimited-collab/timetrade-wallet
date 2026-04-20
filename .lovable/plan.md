
## Goal
Redesign the AI Trading screen so it feels like a polished fintech product, not a basic placeholder. Keep all current behavior and data, but rebuild the visual hierarchy, spacing, and surfaces to match the app’s premium wallet style.

## What I found
The current `src/pages/AITradingPage.tsx` is technically clean but visually too plain:
- Everything sits directly on the background with weak structure.
- The page has no strong hero surface, so the balance feels unsupported.
- The CTA/status row is functional but not premium.
- Stats and activity sections look like default list blocks instead of a productized dashboard.
- It does not match stronger screens already in the app like `AITradingWalletPage`, `AssetDetailPage`, and the wallet header patterns.

## Redesign direction
I’ll move the page to a more professional “premium wallet dashboard” layout:

```text
Top header
  AI Trading title + refined utility actions

Primary hero surface
  Large total balance
  Privacy toggle
  P&L summary
  subtle secondary info
  stronger spacing and container treatment

Control section
  Primary Start/Stop action
  clean live status chip
  short supporting description

Portfolio breakdown row
  Available
  In trades
  7d earnings

Quick actions
  Deposit
  Withdraw
  Live trades
  styled as premium compact action tiles/pills

Recent activity
  proper section header
  better row density
  cleaner icon treatment
  empty state that looks intentional
```

## Implementation plan
1. Rework `TradingDashboard` in `src/pages/AITradingPage.tsx`
   - Replace the current flat single-surface layout with a clearer sectioned layout.
   - Add one premium hero container using the project’s navy/blue visual language.
   - Keep balance masking, refresh, logout, and navigation behavior unchanged.

2. Upgrade the top section hierarchy
   - Refine the header spacing and icon buttons to match the rest of the wallet UI.
   - Make the title, subtitle, and balance area feel intentional and high-value.
   - Improve typography contrast and numeric presentation.

3. Redesign the control/status area
   - Convert the current mixed CTA row into a cleaner action block.
   - Keep one dominant Start/Stop button.
   - Add a more polished status chip and concise helper text.

4. Rebuild supporting stats
   - Present Available, In Trades, and 7d Earnings in a compact premium stat grid.
   - Use better spacing, labels, and visual grouping.
   - Keep muted colors except for positive/negative financial signals.

5. Improve quick actions and activity list
   - Restyle Deposit / Withdraw / Live so they feel more native and deliberate.
   - Tighten recent activity rows with better spacing and icon balance.
   - Improve the empty state so it feels designed rather than blank.

## Technical details
- File to update: `src/pages/AITradingPage.tsx`
- No backend or database changes needed.
- No new dependencies needed.
- No behavior changes to:
  - login/signup/forgot flow
  - refresh/logout
  - start/stop trading
  - wallet and live-trades navigation
  - balance masking
  - recent activity data source
- I will reuse existing patterns already present in:
  - `src/pages/AITradingWalletPage.tsx`
  - `src/pages/AssetDetailPage.tsx`
  - `src/components/WalletHeader.tsx`
  - project visual memory in `mem://style/visual-identity`

## Expected result
After implementation, the AI Trading page should feel:
- premium
- structured
- native-mobile
- financially focused
- visually consistent with the rest of Timetrade Wallet

It will still be simple, but no longer basic.
