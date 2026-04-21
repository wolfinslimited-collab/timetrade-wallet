import { useState, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface KeypadButtonProps {
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export const KeypadButton = ({ onPress, disabled, children }: KeypadButtonProps) => {
  const [pressed, setPressed] = useState(false);
  const firedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    firedRef.current = true;
    setPressed(true);
    onPress();
  };
  const release = () => {
    setPressed(false);
    firedRef.current = false;
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onTouchStart={(e) => {
        // Fallback: if pointerdown didn't fire (iOS WKWebView edge cases)
        if (disabled || firedRef.current) return;
        firedRef.current = true;
        setPressed(true);
        onPress();
      }}
      onTouchEnd={release}
      onClick={() => {
        // Last-resort fallback for click-only environments
        if (disabled || firedRef.current) return;
        firedRef.current = true;
        setPressed(true);
        onPress();
        setTimeout(release, 100);
      }}
      className={cn(
        "relative w-[72px] h-[72px] rounded-full mx-auto select-none",
        "flex items-center justify-center text-foreground",
        "bg-white/[0.04] border border-white/[0.06]",
        "transition-[transform,background-color] duration-75 ease-out",
        "will-change-transform touch-manipulation",
        pressed && !disabled && "bg-white/[0.16] scale-90",
        disabled && "opacity-40"
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {children}
    </button>
  );
};