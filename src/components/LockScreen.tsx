import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Fingerprint, Wallet, AlertCircle } from "lucide-react";
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
    // Check if Web Authentication API is available (for biometric simulation)
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
      toast({
        title: "Welcome back!",
        description: "Wallet unlocked successfully",
      });
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
    // Simulate biometric authentication
    // In a real app, this would use WebAuthn or native biometric APIs
    toast({
      title: "Biometric verified!",
      description: "Welcome back",
    });
    onUnlock();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto p-6">
      {/* Status bar simulation */}
      <div className="flex items-center justify-between px-0 py-2 text-xs text-muted-foreground">
        <span className="font-medium">9:41</span>
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            <div className="w-1 h-2 bg-foreground rounded-sm" />
            <div className="w-1 h-2.5 bg-foreground rounded-sm" />
            <div className="w-1 h-3 bg-foreground rounded-sm" />
            <div className="w-1 h-3.5 bg-foreground rounded-sm" />
          </div>
          <span className="ml-1">📶</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-8"
        >
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center glow-green">
            <Wallet className="w-12 h-12 text-primary" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center">
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
        </motion.div>

        <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
        <p className="text-muted-foreground text-sm mb-8">Enter your PIN to unlock</p>

        {/* Lock Timer */}
        <AnimatePresence>
          {isLocked && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/20 mb-6"
            >
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">
                Try again in {lockTimer}s
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PIN Dots */}
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <motion.div
              key={index}
              animate={showError ? { x: [-4, 4, -4, 4, 0] } : {}}
              transition={{ duration: 0.3 }}
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-200",
                index < pin.length
                  ? showError 
                    ? "bg-destructive" 
                    : "bg-primary scale-110"
                  : "bg-muted border border-border"
              )}
            />
          ))}
        </div>

        {/* Biometric Button */}
        {biometricAvailable && !isLocked && (
          <button
            onClick={handleBiometric}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border hover:bg-secondary transition-colors mb-8"
          >
            <Fingerprint className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Use Biometrics</span>
          </button>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(String(digit))}
              disabled={isLocked}
              className={cn(
                "h-16 rounded-2xl bg-card border border-border text-2xl font-semibold transition-all",
                isLocked 
                  ? "opacity-50 cursor-not-allowed" 
                  : "hover:bg-secondary active:scale-95"
              )}
            >
              {digit}
            </button>
          ))}
          <div className="h-16" /> {/* Empty space */}
          <button
            onClick={() => handleKeyPress("0")}
            disabled={isLocked}
            className={cn(
              "h-16 rounded-2xl bg-card border border-border text-2xl font-semibold transition-all",
              isLocked 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:bg-secondary active:scale-95"
            )}
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={isLocked}
            className={cn(
              "h-16 rounded-2xl bg-card border border-border text-sm font-medium text-muted-foreground transition-all",
              isLocked 
                ? "opacity-50 cursor-not-allowed" 
                : "hover:bg-secondary"
            )}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-center pt-6">
        Forgot PIN? Reset wallet from settings
      </p>
    </div>
  );
};
