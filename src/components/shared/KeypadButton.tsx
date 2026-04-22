import { useRef, useState, type ReactNode } from "react";
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
  const firedRef = useRef(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onTouchStart={() => {
        if (disabled) return;
        setPressed(true);
        if (!firedRef.current) {
          firedRef.current = true;
          onPress();
        }
      }}
      onTouchEnd={() => {
        setPressed(false);
        // Reset guard after a short delay so the synthetic click is also blocked
        setTimeout(() => {
          firedRef.current = false;
        }, 300);
      }}
      onTouchCancel={() => {
        setPressed(false);
        setTimeout(() => {
          firedRef.current = false;
        }, 300);
      }}
      onMouseDown={() => {
        if (disabled || firedRef.current) return;
        setPressed(true);
        firedRef.current = true;
        onPress();
      }}
      onMouseUp={() => {
        setPressed(false);
        setTimeout(() => {
          firedRef.current = false;
        }, 50);
      }}
      onMouseLeave={() => {
        setPressed(false);
      }}
      onClick={(e) => {
        // Prevent any additional firing from click events
        e.preventDefault();
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