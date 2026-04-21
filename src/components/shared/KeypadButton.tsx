import { useState, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface KeypadButtonProps {
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export const KeypadButton = ({ onPress, disabled, children }: KeypadButtonProps) => {
  const [pressed, setPressed] = useState(false);
  const activeRef = useRef(false);

  const fire = () => {
    if (disabled) return;
    setPressed(true);
    onPress();
  };

  const release = () => {
    setPressed(false);
    activeRef.current = false;
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onTouchStart={(e) => {
        if (disabled) return;
        e.preventDefault(); // prevent ghost click / scroll
        activeRef.current = true;
        fire();
      }}
      onTouchEnd={() => release()}
      onTouchCancel={() => release()}
      onMouseDown={(e) => {
        // Desktop fallback (touch devices won't reach here due to preventDefault)
        if (disabled || activeRef.current) return;
        e.preventDefault();
        activeRef.current = true;
        fire();
      }}
      onMouseUp={() => release()}
      onMouseLeave={() => release()}
      onClick={(e) => {
        // Last-resort fallback for accessibility / non-pointer environments
        if (disabled || activeRef.current) return;
        fire();
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