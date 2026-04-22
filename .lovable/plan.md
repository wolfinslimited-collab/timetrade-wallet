

# Fix: PIN Keypad Triple-Press Bug

## Problem
The `KeypadButton` component fires `onPress` multiple times per tap because the `activeRef` guard is reset too early in `release()`, allowing subsequent `click` (and sometimes `mouseDown`) events to pass the guard and fire again.

## Root Cause
Event sequence on desktop: `mouseDown` fires → `mouseUp` resets `activeRef=false` → `click` sees `activeRef=false` and fires again. On mobile, synthetic mouse events after touch events can cause a similar triple-fire.

## Fix (Single File)

**`src/components/shared/KeypadButton.tsx`**

Replace the current event handling with a simplified approach:
- In `release()`, delay the `activeRef.current = false` reset by ~50ms so it still blocks the subsequent `click` event
- Remove the `onClick` handler entirely since `mouseDown` and `touchStart` already cover all interaction paths (accessibility is handled by the button element itself)
- Alternative cleaner approach: use only `onPointerDown` + `onPointerUp` which unifies touch and mouse into a single event path, avoiding all duplicate-fire issues

The recommended implementation:
```
- Remove onTouchStart, onTouchEnd, onTouchCancel, onMouseDown, onMouseUp, onMouseLeave, onClick
- Use onPointerDown to fire (with e.preventDefault())
- Use onPointerUp / onPointerLeave / onPointerCancel to release visual state
- This single event path eliminates all duplicate firing
```

No other files need changes -- `KeypadButton` is the shared component used by `FullScreenPinModal`, which is in turn used by all PIN screens (lock, send, change PIN, biometric setup, reset wallet).

