

## Fix Onboarding Button Bug + Enhance Animations + Redesign Chains Hero

### Issues Found

1. **Button rendering raw className as text** — Lines 296-298 in `FeatureTourStep.tsx` have a duplicate `className=` string literally rendered inside the button element. This is what you see in the screenshot.
2. **Animations are CSS/JS-based, not GPU-optimized** — Framer Motion transitions use `x`/`y`/`scale` without explicit `translateZ(0)` or `will-change` hints, causing jank on mobile.
3. **Chains hero is a rigid grid** — User wants bigger coin icons in a scattered/organic layout instead of a 4-column list.

---

### Changes

#### 1. Fix the broken button in `FeatureTourStep.tsx`
- Remove the stray `className="w-full rounded-2xl bg-primary..."` text line (line 298) that's being rendered as button content.

#### 2. GPU-optimized animations in `FeatureTourStep.tsx`
- Add `transform: translateZ(0)` and `will-change: transform, opacity` to all animated containers.
- Replace Framer Motion `x`/`y` with `translateX`/`translateY` for GPU compositing.
- Reduce animation durations and simplify easing for snappier feel.
- Use `layout` prop sparingly; keep AnimatePresence transitions under 200ms.

#### 3. GPU-optimized transitions in `WalletOnboarding.tsx`
- Add `will-change-[transform,opacity]` and `[transform:translateZ(0)]` to the motion wrapper.
- Keep step transitions at ~180ms opacity-only for instant feel.

#### 4. Redesign ChainsHero — scattered floating coins
- Replace the 4-column grid with absolutely-positioned coins at predefined scattered coordinates.
- Make coin icons larger (w-16 h-16 containers with w-10 h-10 logos).
- Each coin gets a unique position with slight rotation and staggered float-in animation.
- Add a subtle continuous floating/bobbing animation using CSS `@keyframes` (GPU-friendly, no JS repaints).
- Positions hand-crafted to look organic but avoid overlap.

### Technical Details

**Files modified:**
- `src/components/onboarding/FeatureTourStep.tsx` — button fix, ChainsHero redesign, GPU animation hints
- `src/components/WalletOnboarding.tsx` — GPU-optimized step transitions

