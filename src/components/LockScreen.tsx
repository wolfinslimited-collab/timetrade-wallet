import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, AlertCircle, ArrowLeft } from "lucide-react";
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

  const btnStyle = cn(
    "w-[56px] h-[56px] rounded-full flex items-center justify-center text-lg font-semibold text-foreground/90 transition-all duration-100",
    "bg-gradient-to-b from-muted/70 to-muted/30",
    "shadow-[inset_0_-4px_8px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.06),0_2px_6px_rgba(0,0,0,0.25)]",
    "border border-white/[0.04]",
  );

  return (
    <div className="h-screen flex flex-col items-center max-w-md mx-auto overflow-hidden relative"
      style={{ background: 'radial-gradient(ellipse at top center, hsl(120 15% 12%), hsl(120 8% 5%))' }}
    >
      {/* Upper */}
      <div className="flex flex-col items-center pt-12 pb-4 w-full">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4"
        >
          <div className="w-14 h-14 overflow-hidden">
            <img src="/app-logo.png" alt="Timetrade" className="w-full h-full object-contain" />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6"
        >
          <h1 className="text-xl font-bold tracking-tight">Enter Your PIN</h1>
        </motion.div>

        <AnimatePresence>
          {isLocked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20 mb-4"
            >
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              <span className="text-xs text-destructive font-medium">Try again in {lockTimer}s</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PIN Dots - embossed dark circles with dash/dot indicator */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.22, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex gap-2.5"
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
                  "bg-gradient-to-b from-muted/60 to-muted/25",
                  "shadow-[inset_0_-3px_6px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05),0_1px_3px_rgba(0,0,0,0.2)]",
                  "border border-white/[0.04]",
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
                  <div className="w-2 h-[2px] rounded-full bg-muted-foreground/30" />
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Keypad */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex-1 flex flex-col justify-center pb-8 px-8"
      >
        <div className="grid grid-cols-3 gap-3 mx-auto w-fit">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <motion.button
              key={digit}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleKeyPress(String(digit))}
              disabled={isLocked}
              className={cn(btnStyle, isLocked && "opacity-25 cursor-not-allowed")}
            >
              {digit}
            </motion.button>
          ))}

          {biometricAvailable && !isLocked ? (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleBiometric}
              className={btnStyle}
            >
              <Fingerprint className="w-6 h-6 text-muted-foreground" />
            </motion.button>
          ) : (
            <div />
          )}

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => handleKeyPress("0")}
            disabled={isLocked}
            className={cn(btnStyle, isLocked && "opacity-25 cursor-not-allowed")}
          >
            0
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleDelete}
            disabled={isLocked}
            className={cn(btnStyle, isLocked && "opacity-25 cursor-not-allowed")}
          >
            <ArrowLeft className="w-6 h-6 text-muted-foreground" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
