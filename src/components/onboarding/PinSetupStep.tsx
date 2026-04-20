import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Delete, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { haptics } from "@/lib/haptics";
import { KeypadButton } from "@/components/shared/KeypadButton";

interface PinSetupStepProps {
  onComplete: (pin: string) => void;
  onBack: () => void;
}

export const PinSetupStep = ({ onComplete, onBack }: PinSetupStepProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const currentPin = step === "create" ? pin : confirmPin;

  const handleKeyPress = useCallback(
    (digit: string) => {
      if (success) return;
      const active = step === "create" ? pin : confirmPin;
      if (active.length >= 6) return;

      haptics.selection();
      const newPin = active + digit;
      if (step === "create") setPin(newPin);
      else setConfirmPin(newPin);

      if (newPin.length === 6) {
        if (step === "create") {
          setTimeout(() => {
            haptics.impact("light");
            setStep("confirm");
          }, 220);
        } else {
          if (newPin === pin) {
            setSuccess(true);
            haptics.impact("medium");
            setTimeout(() => onComplete(newPin), 380);
          } else {
            haptics.impact("heavy");
            setError(true);
            setTimeout(() => {
              setError(false);
              setConfirmPin("");
              toast({
                title: "PINs don't match",
                description: "Please try again",
                variant: "destructive",
              });
            }, 450);
          }
        }
      }
    },
    [step, pin, confirmPin, success, onComplete, toast]
  );

  const handleDelete = useCallback(() => {
    if (success) return;
    haptics.selection();
    if (step === "create") setPin((p) => p.slice(0, -1));
    else setConfirmPin((p) => p.slice(0, -1));
  }, [step, success]);

  const handleReset = useCallback(() => {
    haptics.selection();
    setPin("");
    setConfirmPin("");
    setStep("create");
  }, []);

  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden bg-background"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 12px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-2 pb-1 shrink-0">
        <button
          onClick={step === "confirm" && !success ? handleReset : onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.05] border border-white/[0.08] active:scale-90 transition-transform"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {step === "create" ? "Step 1 of 2" : "Step 2 of 2"}
        </div>
        <div className="w-9 h-9" />
      </div>

      {/* Title + Subtitle */}
      <div className="px-6 pt-6 pb-2 text-center shrink-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-[26px] font-bold tracking-tight text-foreground">
              {success
                ? "PIN Confirmed"
                : step === "create"
                ? "Create your PIN"
                : "Confirm your PIN"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-[280px] mx-auto">
              {step === "create"
                ? "Enter a 6-digit PIN to secure your wallet"
                : "Re-enter the same PIN to confirm"}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* PIN Dots */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <motion.div
          animate={
            error
              ? { x: [0, -10, 10, -8, 8, -4, 4, 0] }
              : success
              ? { scale: [1, 1.08, 1] }
              : {}
          }
          transition={{ duration: error ? 0.45 : 0.3 }}
          className="flex gap-3.5"
        >
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const filled = i < currentPin.length;
            return (
              <motion.div
                key={i}
                animate={{
                  scale: filled ? 1 : 0.85,
                  backgroundColor: error
                    ? "hsl(var(--destructive))"
                    : success
                    ? "hsl(var(--primary))"
                    : filled
                    ? "hsl(var(--foreground))"
                    : "transparent",
                  borderColor: error
                    ? "hsl(var(--destructive))"
                    : success
                    ? "hsl(var(--primary))"
                    : filled
                    ? "hsl(var(--foreground))"
                    : "hsl(var(--border))",
                }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 25,
                }}
                className="w-3.5 h-3.5 rounded-full border-2"
              />
            );
          })}
        </motion.div>
      </div>

      {/* Keypad */}
      <div className="px-6 pb-4 shrink-0">
        <div className="grid grid-cols-3 gap-x-6 gap-y-3 max-w-[320px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <KeypadButton
              key={digit}
              onPress={() => handleKeyPress(String(digit))}
              disabled={success}
            >
              <span className="text-[30px] font-light leading-none">{digit}</span>
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

          <KeypadButton onPress={() => handleKeyPress("0")} disabled={success}>
            <span className="text-[30px] font-light leading-none">0</span>
          </KeypadButton>

          <KeypadButton
            onPress={handleDelete}
            disabled={success || currentPin.length === 0}
          >
            <Delete className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
          </KeypadButton>
        </div>
      </div>
    </div>
  );
};

