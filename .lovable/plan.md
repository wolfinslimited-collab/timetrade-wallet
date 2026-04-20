

## Goal
Replace the busy AI Trading dashboard with a **calm, premium, single-surface UI** inspired by Phantom / Robinhood / Coinbase — focused on one big number, one primary action, and quiet supporting data. No gradient blobs, no stacked colored cards, no decoration competing for attention.

## What's wrong with the current UI
- Too many separate cards (hero + actions + status + earnings + trades) — feels fragmented.
- Heavy gradient blobs and colored borders make it look like a demo, not a wallet.
- Big primary button competes with a separate status card saying the same thing.
- Inconsistent type sizes; too many uppercase micro-labels.

## New Design

```text
┌──────────────────────────────┐
│  ← AI Trading       ↻   ⎋   │   ← clean top bar
├──────────────────────────────┤
│                              │
│   PORTFOLIO VALUE            │   ← tiny quiet label
│   $12,480.55          👁     │   ← huge number, subtle eye
│   ▲ +$245.10  ·  +2.0% 7d   │   ← single P&L line
│                              │
│   ┌────────┐  ● Bot active   │   ← status chip inline
│   │  Stop  │                 │   ← single primary CTA
│   └────────┘                 │
│                              │
├──────────────────────────────┤
│  Available    In trades      │   ← 2-col quiet stats row
│  $8,200.00    $4,280.55      │
├──────────────────────────────┤
│                              │
│  [↓ Deposit] [↑ Withdraw] [⚡ Live]   ← 3 ghost pills
│                              │
├──────────────────────────────┤
│  Recent activity    View all │
│                              │
│  ↗ BTC/USDT       +$12.40    │
│  ↘ ETH/USDT        −$3.10    │
│  ↗ SOL/USDT        +$8.22    │
└──────────────────────────────┘
```

### Key principles
1. **One hero, no card** — the balance lives directly on the page background, not inside a gradient card. Big restrained typography does the work.
2. **Status merged with CTA** — a single row: pill button + small live indicator. No duplicate "Bot is running" card.
3. **Hairline dividers replace card borders** — separates sections without visual noise.
4. **Quiet stats** — Available / In Trades shown as a simple 2-column inline row, not a colored gradient card.
5. **Pill quick actions** — small, ghost-style horizontal pills (not big square tiles), like Phantom's swap/buy bar.
6. **Activity list flat on background** — no card wrapper, just dividers; tighter rows.
7. **Color discipline** — only success/destructive for P&L numbers; everything else is foreground/muted. No gradients, no shadow blobs.
8. **Typography rhythm** — one display size (40–44px) for balance, one body size (14px), one micro size (11px muted). Mono only for numbers.

## Files to edit

- **`src/pages/AITradingPage.tsx`** → replace the entire `TradingDashboard` component (lines ~145–393) and the `ActionButton` helper. Keep `TradingConnect` (auth) and the page wrapper untouched.

No new files, no CSS changes, no new dependencies.

## Behavior (unchanged)
- Refresh / logout buttons still work.
- Eye toggle still masks all $ values.
- Start → navigates `/ai-trading/start`; Stop → `api.toggleTrading("stop")`.
- Deposit/Withdraw → `/ai-trading/wallet?tab=…`; Live → `/live-trades`.
- Recent trades list shows up to 6 from `tradeHistory`.

<lov-actions>
<lov-suggestion message="Open /?tab=trading and verify the redesigned AI Trading dashboard renders correctly with the new minimal layout, balance hero, single CTA, and activity list.">Verify the new UI</lov-suggestion>
<lov-suggestion message="Apply the same minimal, no-gradient visual style to the AI Trading Wallet page (/ai-trading/wallet) so deposit and withdraw screens feel consistent.">Match Wallet page style</lov-suggestion>
<lov-suggestion message="Add a subtle 7-day sparkline chart underneath the balance number on the AI Trading dashboard.">Add 7d sparkline</lov-suggestion>
</lov-actions>
