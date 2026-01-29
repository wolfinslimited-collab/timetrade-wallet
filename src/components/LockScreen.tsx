import { useState, useEffect } from "react";
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

  const handleKeyPress = (digit: string) => {
    if (isLocked || pin.length >= 6) return;
    
    const newPin = pin + digit;
    setPin(newPin);
    setShowError(false);

    if (newPin.length === 6) {
      setTimeout(() => verifyPin(newPin), 200);
    }
  };

  const verifyPin = (enteredPin: string) => {
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
    <div className="h-screen bg-background flex flex-col max-w-md mx-auto overflow-hidden">
      {/* Main Content - Fixed height with flex to center */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 min-h-0">
        {/* App Logo - Smaller */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-6"
        >
          <div className="w-20 h-20 overflow-hidden">
            <img 
              src="/app-logo.png" 
              alt="Timetrade" 
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>

        {/* Title - Compact */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl font-bold tracking-tight mb-1">Welcome Back</h1>
          <p className="text-muted-foreground text-xs">Enter your PIN to unlock</p>
        </motion.div>

        {/* Lock Timer */}
        <AnimatePresence>
          {isLocked && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 mb-4"
            >
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              <span className="text-xs text-destructive font-medium">
                Try again in {lockTimer}s
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PIN Dots - Compact */}
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex gap-2.5 mb-6"
        >
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <motion.div
              key={index}
              animate={showError ? { x: [-4, 4, -4, 4, 0] } : {}}
              transition={{ duration: 0.3 }}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-200",
                index < pin.length
                  ? showError 
                    ? "bg-destructive scale-110" 
                    : "bg-primary scale-110"
                  : "bg-muted-foreground/20"
              )}
            />
          ))}
        </motion.div>

        {/* Biometric Button - Compact */}
        {biometricAvailable && !isLocked && (
          <motion.button
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            onClick={handleBiometric}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border hover:bg-secondary/80 transition-colors mb-5"
          >
            <Fingerprint className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium">Use Biometrics</span>
          </motion.button>
        )}

        {/* Keypad - Compact */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="grid grid-cols-3 gap-3 w-full max-w-[240px]"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(String(digit))}
              disabled={isLocked}
              className={cn(
                "h-14 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 text-xl font-medium transition-all",
                isLocked 
                  ? "opacity-40 cursor-not-allowed" 
                  : "hover:bg-secondary active:scale-95 active:bg-secondary/80"
              )}
            >
              {digit}
            </button>
          ))}
          <div className="h-14" />
          <button
            onClick={() => handleKeyPress("0")}
            disabled={isLocked}
            className={cn(
              "h-14 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 text-xl font-medium transition-all",
              isLocked 
                ? "opacity-40 cursor-not-allowed" 
                : "hover:bg-secondary active:scale-95 active:bg-secondary/80"
            )}
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={isLocked}
            className={cn(
              "h-14 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 flex items-center justify-center transition-all",
              isLocked 
                ? "opacity-40 cursor-not-allowed" 
                : "hover:bg-secondary active:scale-95"
            )}
          >
            <Delete className="w-5 h-5 text-muted-foreground" />
          </button>
        </motion.div>
      </div>

      {/* Footer - Minimal */}
      <div className="pb-6 px-6">
        <p className="text-[10px] text-muted-foreground/50 text-center">
          Forgot PIN? Reset wallet from settings
        </p>
      </div>
    </div>
  );
};
