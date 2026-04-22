import { useRef, useState, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface KeypadButtonProps {
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export const KeypadButton = ({
  onPress,
  disabled,
  children,
}: KeypadButtonProps) => {
  const [pressed, setPressed] = useState(false);
  const lastFireRef = useRef(0);

  const fire = useCallback(() => {
    if (disabled) return;
    const now = Date.now();
    if (now - lastFireRef.current < 120) return;
    lastFireRef.current = now;
    onPress();
  }, [disabled, onPress]);

  return (
    <button
      type="button"
      disabled={disabled}
      onTouchStart={(e) => {
        e.stopPropagation();
        setPressed(true);
        fire();
      }}
      onTouchEnd={() => {
        setPressed(false);
      }}
      onTouchCancel={() => {
        setPressed(false);
      }}
      onMouseDown={(e) => {
        // Only fire for primary button, skip if touch already handled
        if (e.button !== 0) return;
        setPressed(true);
        fire();
      }}
      onMouseUp={() => {
        setPressed(false);
      }}
      onMouseLeave={() => {
        setPressed(false);
      }}
      onClick={(e) => {
        // Prevent synthetic click from firing again
        e.preventDefault();
        e.stopPropagation();
      }}
      className={cn(
        "relative w-[72px] h-[72px] rounded-full mx-auto select-none",
        "flex items-center justify-center text-foreground",
        "bg-white/[0.04] border border-white/[0.06]",
        "transition-[transform,background-color] duration-75 ease-out",
        "will-change-transform",
        pressed && !disabled && "bg-white/[0.16] scale-90",
        disabled && "opacity-40"
      )}
      style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
    >
      {children}
    </button>
  );
};