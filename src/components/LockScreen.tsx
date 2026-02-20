import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, AlertCircle, Delete, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen = ({ onUnlock }: LockScreenProps) => {
  const { toast } = useToast();
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showError, setShowError] = useState(false);

  const storedPin = localStorage.getItem("timetrade_pin");
  const biometricEnabled = localStorage.getItem("timetrade_biometric") === "true";

  useEffect(() => {
    const checkBiometric = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricAvailable(available && biometricEnabled);
        } catch {
          setBiometricAvailable(false);
        }
      }
    };
    checkBiometric();
  }, [biometricEnabled]);

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

  const verifyPin = useCallback((enteredPin: string) => {
    if (enteredPin === storedPin) {
      window.dispatchEvent(
        new CustomEvent("timetrade:unlocked", {
          detail: { pin: enteredPin },
        })
      );
      onUnlock();
    } else {
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
  }, [storedPin, attempts, onUnlock, toast]);

  const handleKeyPress = (digit: string) => {
    if (isLocked || pin.length >= 6) return;

    const newPin = pin + digit;
    setPin(newPin);
    setShowError(false);

    if (newPin.length === 6) {
      setTimeout(() => verifyPin(newPin), 200);
    }
  };

  const handleDelete = () => {
    if (isLocked) return;
    setPin(pin.slice(0, -1));
    setShowError(false);
  };

  const handleBiometric = async () => {
    window.dispatchEvent(new CustomEvent("timetrade:unlocked"));
    onUnlock();
  };

  return (
    <div className="h-screen bg-background flex flex-col max-w-md mx-auto overflow-hidden relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.02] blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full bg-primary/[0.015] blur-[100px]" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 min-h-0 relative z-10">
        {/* App Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="w-20 h-20 overflow-hidden">
            <img
              src="/app-logo.png"
              alt="Timetrade"
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-semibold tracking-tight mb-1.5">Welcome Back</h1>
          <p className="text-muted-foreground text-sm">Enter your PIN to continue</p>
        </motion.div>

        {/* Lock Timer */}
        <AnimatePresence>
          {isLocked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20 mb-6"
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
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex gap-4 mb-8"
        >
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <motion.div
              key={index}
              animate={
                showError
                  ? { x: [-3, 3, -3, 3, 0] }
                  : index < pin.length
                  ? { scale: [1, 1.3, 1] }
                  : {}
              }
              transition={{ duration: 0.25 }}
              className="relative"
            >
              <div
                className={cn(
                  "w-3.5 h-3.5 rounded-full transition-all duration-200",
                  index < pin.length
                    ? showError
                      ? "bg-destructive shadow-[0_0_8px_hsl(0,72%,51%,0.4)]"
                      : "bg-primary shadow-[0_0_8px_hsl(0,0%,98%,0.3)]"
                    : "bg-muted-foreground/15 ring-1 ring-muted-foreground/10"
                )}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Biometric Button */}
        {biometricAvailable && !isLocked && (
          <motion.button
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileTap={{ scale: 0.97 }}
            onClick={handleBiometric}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-card border border-border/60 hover:border-primary/30 hover:bg-card/80 transition-all mb-6"
          >
            <Fingerprint className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground/80">Use Biometrics</span>
          </motion.button>
        )}

        {/* Keypad */}
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-3 gap-3 w-full max-w-[340px]"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <motion.button
              key={digit}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleKeyPress(String(digit))}
              disabled={isLocked}
              className={cn(
                "h-[72px] rounded-2xl text-2xl font-medium transition-all duration-150",
                "bg-card/60 border border-border/40",
                isLocked
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-card active:bg-secondary"
              )}
            >
              {digit}
            </motion.button>
          ))}
          <div className="h-[72px]" />
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => handleKeyPress("0")}
            disabled={isLocked}
            className={cn(
              "h-[72px] rounded-2xl text-2xl font-medium transition-all duration-150",
              "bg-card/60 border border-border/40",
              isLocked
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-card active:bg-secondary"
            )}
          >
            0
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleDelete}
            disabled={isLocked}
            className={cn(
              "h-[72px] rounded-2xl flex items-center justify-center transition-all duration-150",
              "bg-card/60 border border-border/40",
              isLocked
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-card active:bg-secondary"
            )}
          >
            <Delete className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};
