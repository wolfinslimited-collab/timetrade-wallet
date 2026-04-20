import { useState, useEffect, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, Delete, Fingerprint, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

export interface FullScreenPinModalProps {
  open: boolean;
  onClose: () => void;
  /** Title shown at top of modal */
  title: string;
  /** Subtitle / instructions */
  subtitle?: ReactNode;
  /** Eyebrow text shown above title (e.g. "SECURITY") */
  eyebrow?: string;
  /** Called when 6 digits are entered. Return true if accepted, false to clear/shake. */
  onSubmit: (pin: string) => Promise<boolean | void> | boolean | void;
  /** Optional biometric handler — shows pill above keypad */
  onBiometric?: () => void | Promise<void>;
  biometricAvailable?: boolean;
  /** Loading state (e.g. signing in progress) */
  isLoading?: boolean;
  /** External error to display (resets on next keypress) */
  error?: string | null;
  /** Optional extra content (e.g. "Use Private Key" link) shown below keypad */
  footer?: ReactNode;
  /** Use back arrow instead of X close icon */
  showBackArrow?: boolean;
}

/**
 * Unified native-style full-screen PIN modal.
 * Same look as the onboarding "Create PIN" screen and lock screen.
 */
export const FullScreenPinModal = ({
  open,
  onClose,
  title,
  subtitle,
  eyebrow,
  onSubmit,
  onBiometric,
  biometricAvailable,
  isLoading,
  error: externalError,
  footer,
  showBackArrow,
}: FullScreenPinModalProps) => {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPin("");
      setShake(false);
      setSuccess(false);
      setSubmitting(false);
    }
  }, [open]);

  // Trigger shake on external error
  useEffect(() => {
    if (externalError && open) {
      setShake(true);
      setPin("");
      const t = setTimeout(() => setShake(false), 450);
      return () => clearTimeout(t);
    }
  }, [externalError, open]);

  const handleSubmit = useCallback(
    async (full: string) => {
      setSubmitting(true);
      try {
        const result = await onSubmit(full);
        if (result === false) {
          haptics.impact("heavy");
          setShake(true);
          setPin("");
          setTimeout(() => setShake(false), 450);
        } else if (result === true) {
          haptics.impact("medium");
          setSuccess(true);
        }
      } catch {
        haptics.impact("heavy");
        setShake(true);
        setPin("");
        setTimeout(() => setShake(false), 450);
      } finally {
        setSubmitting(false);
      }
    },
    [onSubmit]
  );

  const handleKeyPress = useCallback(
    (digit: string) => {
      if (success || submitting || isLoading) return;
      setPin((prev) => {
        if (prev.length >= 6) return prev;
        haptics.selection();
        const next = prev + digit;
        if (next.length === 6) {
          setTimeout(() => handleSubmit(next), 180);
        }
        return next;
      });
    },
    [success, submitting, isLoading, handleSubmit]
  );

  const handleDelete = useCallback(() => {
    if (success || submitting || isLoading) return;
    haptics.selection();
    setPin((p) => p.slice(0, -1));
  }, [success, submitting, isLoading]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[10000] bg-background"
          style={{
            paddingTop: "max(env(safe-area-inset-top), 12px)",
            paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
          }}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-1 shrink-0">
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.05] border border-white/[0.08] active:scale-90 transition-transform"
                aria-label="Close"
              >
                {showBackArrow ? (
                  <ChevronLeft className="w-5 h-5" />
                ) : (
                  <X className="w-4.5 h-4.5" />
                )}
              </button>
              {eyebrow && (
                <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  {eyebrow}
                </div>
              )}
              <div className="w-9 h-9" />
            </div>

            {/* Title */}
            <div className="px-6 pt-6 pb-2 text-center shrink-0">
              <h1 className="text-[26px] font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1.5 max-w-[300px] mx-auto">
                  {subtitle}
                </p>
              )}
            </div>

            {/* PIN dots */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-0">
              <motion.div
                animate={
                  shake
                    ? { x: [0, -10, 10, -8, 8, -4, 4, 0] }
                    : success
                    ? { scale: [1, 1.08, 1] }
                    : {}
                }
                transition={{ duration: shake ? 0.45 : 0.3 }}
                className="flex gap-3.5"
              >
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const filled = i < pin.length;
                  return (
                    <motion.div
                      key={i}
                      animate={{
                        scale: filled ? 1 : 0.85,
                        backgroundColor: shake
                          ? "hsl(var(--destructive))"
                          : success
                          ? "hsl(var(--primary))"
                          : filled
                          ? "hsl(var(--foreground))"
                          : "transparent",
                        borderColor: shake
                          ? "hsl(var(--destructive))"
                          : success
                          ? "hsl(var(--primary))"
                          : filled
                          ? "hsl(var(--foreground))"
                          : "hsl(var(--border))",
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className="w-3.5 h-3.5 rounded-full border-2"
                    />
                  );
                })}
              </motion.div>

              {externalError && !shake && (
                <p className="text-xs text-destructive mt-4 font-medium">
                  {externalError}
                </p>
              )}

              {(isLoading || submitting) && (
                <div className="flex items-center gap-2 mt-5">
                  <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-[12px] text-muted-foreground">
                    Verifying…
                  </span>
                </div>
              )}

              {/* Biometric pill */}
              {biometricAvailable && onBiometric && !isLoading && !submitting && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => {
                    haptics.selection();
                    onBiometric();
                  }}
                  className={cn(
                    "mt-6 flex items-center gap-2 px-4 py-2 rounded-full",
                    "bg-primary/15 border border-primary/30 text-primary",
                    "text-[13px] font-semibold",
                    "active:scale-95 transition-transform"
                  )}
                >
                  <Fingerprint className="w-4 h-4" />
                  Use Biometrics
                </motion.button>
              )}
            </div>

            {/* Keypad */}
            <div className="px-6 pb-4 shrink-0">
              <div className="grid grid-cols-3 gap-x-6 gap-y-3 max-w-[320px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <KeypadButton
                    key={digit}
                    onPress={() => handleKeyPress(String(digit))}
                    disabled={success || submitting || isLoading}
                  >
                    <span className="text-[30px] font-light leading-none">
                      {digit}
                    </span>
                  </KeypadButton>
                ))}

                {/* Bottom row */}
                {success ? (
                  <KeypadButton onPress={() => {}} disabled>
                    <Check className="w-7 h-7 text-primary" />
                  </KeypadButton>
                ) : (
                  <div />
                )}

                <KeypadButton
                  onPress={() => handleKeyPress("0")}
                  disabled={success || submitting || isLoading}
                >
                  <span className="text-[30px] font-light leading-none">0</span>
                </KeypadButton>

                <KeypadButton
                  onPress={handleDelete}
                  disabled={success || submitting || isLoading || pin.length === 0}
                >
                  <Delete
                    className="w-6 h-6 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                </KeypadButton>
              </div>

              {footer && <div className="mt-4">{footer}</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/* ---------- Native-feel keypad button ---------- */
interface KeypadButtonProps {
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}

const KeypadButton = ({ onPress, disabled, children }: KeypadButtonProps) => {
  const [pressed, setPressed] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    setPressed(true);
    onPress();
  };
  const release = () => setPressed(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
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
