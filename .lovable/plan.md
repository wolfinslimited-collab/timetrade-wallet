

# Professional Empty State and Assets UI Enhancement

## Overview
Upgrade the "No tokens found" empty state on the home screen and the All Assets page with a polished, professional design. Replace the plain text placeholder with an illustrated empty state featuring an icon, descriptive copy, and a subtle call-to-action.

## Changes

### 1. UnifiedTokenList — Empty State (Home Screen)
**File:** `src/components/wallet/UnifiedTokenList.tsx`

Replace the current plain `"No tokens found"` text (lines 110-115) with a professional empty state card:
- Centered layout with a large subtle wallet/coins icon (from Lucide, e.g. `Wallet` or `Coins`)
- Headline: "No assets yet"
- Subtext: "Your tokens will appear here once you receive or import crypto"
- A subtle "Receive" button linking to `/receive` for quick onboarding
- Muted color scheme matching the existing card aesthetic

### 2. AllAssetsPage — Empty State
**File:** `src/pages/AllAssetsPage.tsx`

Replace the current plain empty text (lines 199-208) with a matching professional empty state:
- Same visual pattern as the home screen empty state (icon + headline + subtext)
- When filter is active: "No assets on selected networks" with a "Clear filter" button
- When no filter: same "No assets yet" pattern with a Receive CTA

### 3. Assets Section Header Polish
**File:** `src/pages/Index.tsx`

Minor refinements to the Assets card container (lines 307-318):
- Add a small asset count badge next to "Assets" when tokens exist (e.g., "Assets · 5")
- Improve the "View All" button with a subtle chevron-right icon

### Technical Details
- Uses existing Lucide icons (`Wallet`, `Coins`, `ChevronRight`, `ArrowDownLeft`)
- No new dependencies required
- Follows the existing navy/dark card aesthetic with `bg-card`, `border-border/40`, `text-muted-foreground`
- Maintains the zero-transition motion policy (no Framer Motion on the home screen empty state)
- Staggered fade-in animation on the All Assets page empty state uses existing Framer variants

