import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, AlertCircle, Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { LockScreenBackground } from "@/components/lock/LockScreenBackground";
import { KeypadButton } from "@/components/shared/KeypadButton";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { haptics } from "@/lib/haptics";

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen = ({ onUnlock }: LockScreenProps) => {
  const { toast } = useToast();
  const { isAvailable, isEnabled, isRegistered, authenticateWithBiometric } =
    useBiometricAuth();
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [showError, setShowError] = useState(false);
  const [bioInProgress, setBioInProgress] = useState(false);
  const autoPromptedRef = useRef(false);

  const storedPin = localStorage.getItem("timetrade_pin");
  const biometricReady = isAvailable && isEnabled && isRegistered;

  // Detect platform label
  const isApple =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod|mac/i.test(navigator.userAgent);
  const bioLabel = isApple ? "Face ID" : "Fingerprint";

  useEffect(() => {
    if (lockTimer > 0) {
      const interval = setInterval(() => {
        setLockTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (lockTimer === 0 && isLocked) {
      setIsLocked(false);
      setAttempts(0);
    }
  }, [lockTimer, isLocked]);

  const verifyPin = useCallback(
    (enteredPin: string) => {
      if (enteredPin === storedPin) {
        haptics.impact("medium");
        window.dispatchEvent(
          new CustomEvent("timetrade:unlocked", {
            detail: { pin: enteredPin },
          })
        );
        onUnlock();
      } else {
        haptics.impact("heavy");
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setShowError(true);
        setPin("");

        if (newAttempts >= 5) {
          setIsLocked(true);
          setLockTimer(30);
          toast({
            title: "Too many attempts",
            description: "Please wait 30 seconds before trying again",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Incorrect PIN",
            description: `${5 - newAttempts} attempts remaining`,
            variant: "destructive",
          });
        }
      }
    },
    [storedPin, attempts, onUnlock, toast]
  );

  const handleKeyPress = (digit: string) => {
    if (isLocked || pin.length >= 6) return;
    haptics.selection();
    const newPin = pin + digit;
    setPin(newPin);
    setShowError(false);

    if (newPin.length === 6) {
      setTimeout(() => verifyPin(newPin), 180);
    }
  };

  const handleDelete = () => {
    if (isLocked) return;
    haptics.selection();
    setPin(pin.slice(0, -1));
    setShowError(false);
  };

  const handleBiometric = useCallback(async () => {
    if (!biometricReady || isLocked || bioInProgress) return;
    setBioInProgress(true);
    try {
      const recoveredPin = await authenticateWithBiometric();
      if (recoveredPin && recoveredPin === storedPin) {
        haptics.impact("medium");
        window.dispatchEvent(
          new CustomEvent("timetrade:unlocked", {
            detail: { pin: recoveredPin },
          })
        );
        onUnlock();
      } else if (recoveredPin) {
        // PIN mismatch (rare — user changed PIN externally)
        toast({
          title: "Biometric expired",
          description: "Please unlock with your PIN",
          variant: "destructive",
        });
      }
    } catch {
      // user cancelled or failed — silent
    } finally {
      setBioInProgress(false);
    }
  }, [
    biometricReady,
    isLocked,
    bioInProgress,
    authenticateWithBiometric,
    storedPin,
    onUnlock,
    toast,
  ]);

  // Auto-prompt biometric once on mount if available
  useEffect(() => {
    if (biometricReady && !autoPromptedRef.current && !isLocked) {
      autoPromptedRef.current = true;
      // small delay so the lock screen is rendered before the system sheet
      const t = setTimeout(() => handleBiometric(), 350);
      return () => clearTimeout(t);
    }
  }, [biometricReady, isLocked, handleBiometric]);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden relative">
      {/* Blurred wallet-like background */}
      <div className="absolute inset-0 z-0">
        <LockScreenBackground />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-xl" />

      {/* PIN entry overlay */}
      <div
        className="relative z-20 flex-1 flex flex-col items-center px-6"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 12px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
        }}
      >
        {/* Spacer for top alignment like FullScreenPinModal */}
        <div className="shrink-0 h-4" />

        {/* Lock icon */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 mb-4"
        >
          <img src="/app-logo.png" alt="Logo" className="w-14 h-14 object-cover" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6"
        >
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Enter Your PIN
          </h1>
        </motion.div>

        {/* Lock timer warning */}
        <AnimatePresence>
          {isLocked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/20 border border-destructive/30 mb-4"
            >
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              <span className="text-xs text-destructive font-medium">
                Try again in {lockTimer}s
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PIN Dots */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.22, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            animate={showError ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : {}}
            transition={{ duration: 0.45 }}
            className="flex gap-3.5"
          >
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const filled = i < pin.length;
              return (
                <motion.div
                  key={i}
                  animate={{
                    scale: filled ? 1 : 0.85,
                    backgroundColor: showError
                      ? "hsl(var(--destructive))"
                      : filled
                      ? "hsl(var(--foreground))"
                      : "transparent",
                    borderColor: showError
                      ? "hsl(var(--destructive))"
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
        </motion.div>

        {/* Flex spacer pushes keypad to bottom */}
        <div className="flex-1" />

        {/* Prominent biometric pill */}
        {biometricReady && !isLocked && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            onClick={handleBiometric}
            disabled={bioInProgress}
            className={cn(
              "mb-6 flex items-center gap-2 px-4 py-2 rounded-full",
              "bg-primary/15 border border-primary/30 text-primary",
              "text-[13px] font-semibold",
              "active:scale-95 transition-transform",
              "disabled:opacity-60"
            )}
          >
            <Fingerprint className="w-4 h-4" />
            {bioInProgress ? "Verifying…" : `Unlock with ${bioLabel}`}
          </motion.button>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-x-6 gap-y-3 max-w-[320px] mx-auto pb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <KeypadButton
              key={digit}
              onPress={() => handleKeyPress(String(digit))}
              disabled={isLocked}
            >
              <span className="text-[30px] font-light leading-none">{digit}</span>
            </KeypadButton>
          ))}
          <div />
          <KeypadButton
            onPress={() => handleKeyPress("0")}
            disabled={isLocked}
          >
            <span className="text-[30px] font-light leading-none">0</span>
          </KeypadButton>
          <KeypadButton
            onPress={handleDelete}
            disabled={isLocked || pin.length === 0}
          >
            <Delete className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
          </KeypadButton>
        </div>
      </div>
    </div>
  );
};
