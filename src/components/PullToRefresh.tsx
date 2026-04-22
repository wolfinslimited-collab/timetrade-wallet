import { useRef, useCallback, ReactNode, useEffect, useState } from "react";
import { haptics } from "@/lib/haptics";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
}

const THRESHOLD = 70;
const MAX_PULL = 130;
const DAMPING = 0.45;

export const PullToRefresh = ({ children, onRefresh }: PullToRefreshProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const spinnerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const pullRef = useRef(0);
  const activeRef = useRef(false);
  const refreshingRef = useRef(false);
  const triggeredRef = useRef(false);
  const [, forceRender] = useState(0);

  const applyTransform = useCallback((dist: number, animate: boolean) => {
    const content = contentRef.current;
    const spinner = spinnerRef.current;
    if (!content || !spinner) return;

    const transition = animate ? "transform 0.35s cubic-bezier(0.25,1,0.5,1)" : "none";
    content.style.transition = transition;
    spinner.style.transition = animate
      ? "transform 0.35s cubic-bezier(0.25,1,0.5,1), opacity 0.25s ease"
      : "none";

    content.style.transform = `translate3d(0,${dist}px,0)`;

    const progress = Math.min(dist / THRESHOLD, 1);
    const spinnerY = dist * 0.5 - 36;
    spinner.style.transform = `translate3d(0,${spinnerY}px,0) rotate(${dist * 3}deg) scale(${0.4 + progress * 0.6})`;
    spinner.style.opacity = `${Math.min(progress * 1.4, 1)}`;
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (refreshingRef.current) return;
      const scrollEl = wrapRef.current;
      if (!scrollEl) return;
      // only activate when scrolled to absolute top
      const scrollTop = scrollEl.scrollTop ?? 0;
      if (scrollTop > 1) return;
      startYRef.current = e.touches[0].clientY;
      activeRef.current = true;
      triggeredRef.current = false;
      pullRef.current = 0;
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!activeRef.current || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) {
        pullRef.current = 0;
        applyTransform(0, false);
        return;
      }
      // prevent iOS bounce while we handle the gesture
      e.preventDefault();
      const damped = Math.min(MAX_PULL, dy * DAMPING);
      pullRef.current = damped;
      applyTransform(damped, false);

      // haptic tick when crossing threshold
      if (damped >= THRESHOLD && !triggeredRef.current) {
        triggeredRef.current = true;
        haptics.impact("light");
      }
      if (damped < THRESHOLD && triggeredRef.current) {
        triggeredRef.current = false;
      }
    },
    [applyTransform]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    const dist = pullRef.current;

    if (dist >= THRESHOLD && !refreshingRef.current) {
      refreshingRef.current = true;
      forceRender((n) => n + 1);
      // snap to resting "refreshing" position
      applyTransform(56, true);
      haptics.impact("medium");
      try {
        await onRefresh();
      } finally {
        refreshingRef.current = false;
        forceRender((n) => n + 1);
        applyTransform(0, true);
      }
    } else {
      applyTransform(0, true);
    }
    pullRef.current = 0;
  }, [onRefresh, applyTransform]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // passive: false so we can preventDefault on touchmove
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div
      ref={wrapRef}
      className="relative flex-1 overflow-visible scrollbar-hide"
      style={{ minHeight: 0, overscrollBehaviorY: "none" }}
    >
      {/* Spinner */}
      <div
        ref={spinnerRef}
        className="absolute left-1/2 z-20 pointer-events-none"
        style={{
          marginLeft: -18,
          top: 0,
          width: 36,
          height: 36,
          opacity: 0,
          willChange: "transform, opacity",
        }}
      >
        <svg
          viewBox="0 0 36 36"
          className="w-full h-full"
          style={refreshingRef.current ? { animation: "ptr-spin 0.7s linear infinite" } : undefined}
        >
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            strokeWidth="2.5"
            stroke="hsl(var(--primary))"
            strokeLinecap="round"
            strokeDasharray={refreshingRef.current ? "60 28" : "44 44"}
            strokeDashoffset="0"
            opacity="0.9"
          />
        </svg>
      </div>

      {/* Content */}
      <div ref={contentRef} style={{ willChange: "transform" }}>
        {children}
      </div>

      <style>{`@keyframes ptr-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};
