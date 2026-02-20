import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, AlertCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { LockScreenBackground } from "@/components/lock/LockScreenBackground";
import { PinKeypad } from "@/components/lock/PinKeypad";

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
    <div className="h-screen flex flex-col max-w-md mx-auto overflow-hidden relative">
      {/* Blurred wallet-like background */}
      <div className="absolute inset-0 z-0">
        <LockScreenBackground />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-xl" />

      {/* PIN entry overlay */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-6">
        {/* Lock icon */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6"
        >
          <h1 className="text-lg font-bold tracking-tight text-foreground">Enter Your PIN</h1>
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
              <span className="text-xs text-destructive font-medium">Try again in {lockTimer}s</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PIN Dots */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.22, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex gap-3 mb-8"
        >
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <motion.div
              key={index}
              animate={
                showError
                  ? { x: [-4, 4, -4, 4, 0] }
                  : index < pin.length
                  ? { scale: [1, 1.2, 1] }
                  : {}
              }
              transition={{ duration: 0.25 }}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
                  "bg-white/5 border border-white/10",
                  "shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]",
                  showError && index < pin.length && "border-destructive/40"
                )}
              >
                {index < pin.length ? (
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all duration-200",
                      showError ? "bg-destructive" : "bg-foreground"
                    )}
                  />
                ) : (
                  <div className="w-2 h-[2px] rounded-full bg-muted-foreground/40" />
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Keypad */}
        <PinKeypad
          isLocked={isLocked}
          biometricAvailable={biometricAvailable}
          onKeyPress={handleKeyPress}
          onDelete={handleDelete}
          onBiometric={handleBiometric}
        />

        {/* Version footer */}
        <p className="text-[10px] text-muted-foreground/40 text-center mt-6">Version 1.0.1 (beta)</p>
      </div>
    </div>
  );
};
