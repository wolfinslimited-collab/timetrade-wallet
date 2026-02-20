import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, AlertCircle, Delete } from "lucide-react";
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
    <div className="h-screen bg-background flex flex-col items-center justify-between max-w-md mx-auto overflow-hidden relative py-10 px-6">
      {/* Upper: Logo + Title + Dots */}
      <div className="flex flex-col items-center flex-1 justify-center w-full">
        {/* App Logo */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5"
        >
          <div className="w-16 h-16 overflow-hidden">
            <img
              src="/app-logo.png"
              alt="Timetrade"
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6"
        >
          <h1 className="text-xl font-bold tracking-tight mb-1">Welcome Back</h1>
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
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.22, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex gap-3 mb-4"
        >
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <motion.div
              key={index}
              animate={
                showError
                  ? { x: [-4, 4, -4, 4, 0] }
                  : index < pin.length
                  ? { scale: [1, 1.3, 1] }
                  : {}
              }
              transition={{ duration: 0.25 }}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
                  "bg-muted/60 border border-border/30",
                  showError && index < pin.length && "border-destructive/50"
                )}
              >
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all duration-200",
                    index < pin.length
                      ? showError
                        ? "bg-destructive shadow-[0_0_8px_hsl(0,72%,51%,0.5)]"
                        : "bg-foreground shadow-[0_0_8px_hsl(0,0%,98%,0.3)]"
                      : "bg-muted-foreground/40"
                  )}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Biometric Button */}
        {biometricAvailable && !isLocked && (
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-xs text-muted-foreground mt-2"
          >
            Or use biometrics below
          </motion.p>
        )}
      </div>

      {/* Keypad */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full pb-4"
      >
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <motion.button
              key={digit}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleKeyPress(String(digit))}
              disabled={isLocked}
              className={cn(
                "aspect-square rounded-full text-xl font-semibold transition-colors duration-100",
                "bg-muted/50 border border-border/20",
                isLocked
                  ? "opacity-25 cursor-not-allowed"
                  : "active:bg-secondary"
              )}
            >
              {digit}
            </motion.button>
          ))}

          {biometricAvailable && !isLocked ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleBiometric}
              className="aspect-square rounded-full flex items-center justify-center transition-colors duration-100 bg-muted/50 border border-border/20 active:bg-secondary"
            >
              <Fingerprint className="w-6 h-6 text-muted-foreground" />
            </motion.button>
          ) : (
            <div />
          )}

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleKeyPress("0")}
            disabled={isLocked}
            className={cn(
              "aspect-square rounded-full text-xl font-semibold transition-colors duration-100",
              "bg-muted/50 border border-border/20",
              isLocked
                ? "opacity-25 cursor-not-allowed"
                : "active:bg-secondary"
            )}
          >
            0
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleDelete}
            disabled={isLocked}
            className={cn(
              "aspect-square rounded-full flex items-center justify-center transition-colors duration-100",
              "bg-muted/50 border border-border/20",
              isLocked
                ? "opacity-25 cursor-not-allowed"
                : "active:bg-secondary"
            )}
          >
            <Delete className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
