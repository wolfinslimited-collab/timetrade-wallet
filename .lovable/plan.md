

# Replace Spinners with Skeleton Shimmer Loaders

## Overview
Replace full-page and section-level `Loader2 animate-spin` spinners with polished skeleton shimmer placeholders that match the layout of the content being loaded. Button-level spinners (e.g. "Swapping...", "Start Trading") stay as-is since they are contextual action indicators.

## Changes

### 1. Create reusable skeleton components (`src/components/ui/loading-skeletons.tsx`)
Build a set of purpose-built skeleton loaders using the existing `Skeleton` component:
- **PortfolioSkeleton** -- mimics the balance card + token list (used on Index page)
- **TransactionListSkeleton** -- mimics transaction rows (used on History page)
- **StakingPageSkeleton** -- mimics staking balance card + positions list
- **TradingDashboardSkeleton** -- mimics the AI trading dashboard layout
- **ChartSkeleton** -- mimics PnL chart area
- **GenericCardSkeleton** -- reusable card-shaped placeholder

Each skeleton uses `Skeleton` with rounded shapes and staggered widths to look realistic.

### 2. Replace spinners in page-level loading states

**`src/pages/Index.tsx`** -- Replace the "Loading portfolio..." spinner with `PortfolioSkeleton`

**`src/pages/StakingPage.tsx`** -- Replace 3 spinner instances:
- Balance loading spinner → skeleton cards
- Positions loading spinner → skeleton list rows
- Unstake balance loading → skeleton card

**`src/pages/AITradingWalletPage.tsx`** -- Replace 3 spinner instances:
- Initial auth check → `TradingDashboardSkeleton`
- Dashboard loading → `TradingDashboardSkeleton`
- Wallet balances loading → skeleton rows

**`src/pages/AITradingOnboardingPage.tsx`** -- Replace full-page spinner with skeleton card

**`src/pages/TransactionHistoryPage.tsx`** -- Replace "Loading transactions..." spinner with `TransactionListSkeleton`

### 3. Replace spinners in component-level loading states

**`src/components/trading/PnlChart.tsx`** -- Replace chart spinner with `ChartSkeleton`

**`src/components/ai/AIPortfolioInsights.tsx`** -- Replace "Analyzing portfolio..." spinner with a skeleton gauge layout

### 4. Keep spinners where appropriate (no changes)
- Button loading states (Swap, Stake, Withdraw, Send Test Push)
- Inline indicators (DEX search, build status, live refresh)
- Small contextual spinners (quote loading, risk analysis)

## Technical Details
- All skeletons use the existing `Skeleton` component from `src/components/ui/skeleton.tsx`
- Shimmer effect comes from `animate-pulse` already built into the Skeleton component
- Skeleton shapes match the actual content dimensions for seamless transition
- Wrapped in `motion.div` with fade-out when content loads

## Files Modified
- `src/components/ui/loading-skeletons.tsx` -- new file with all skeleton variants
- `src/pages/Index.tsx` -- swap spinner for PortfolioSkeleton
- `src/pages/StakingPage.tsx` -- swap 3 spinners for skeleton layouts
- `src/pages/AITradingWalletPage.tsx` -- swap 3 spinners for skeleton layouts
- `src/pages/AITradingOnboardingPage.tsx` -- swap spinner for skeleton card
- `src/pages/TransactionHistoryPage.tsx` -- swap spinner for TransactionListSkeleton
- `src/components/trading/PnlChart.tsx` -- swap spinner for ChartSkeleton
- `src/components/ai/AIPortfolioInsights.tsx` -- swap spinner for skeleton gauge

