import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Delete, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ResetWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const ResetWalletDialog = ({ open, onOpenChange, onConfirm }: ResetWalletDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"confirm" | "pin">("confirm");
  const [pin, setPin] = useState("");
  const [showError, setShowError] = useState(false);

  const storedPin = localStorage.getItem("timetrade_pin");

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setStep("confirm");
      setPin("");
      setShowError(false);
    }
    onOpenChange(isOpen);
  };

  const handleProceedToPin = () => {
    setStep("pin");
  };

  const handleKeyPress = (digit: string) => {
    if (pin.length >= 6) return;
    
    const newPin = pin + digit;
    setPin(newPin);
    setShowError(false);

    if (newPin.length === 6) {
      setTimeout(() => verifyPin(newPin), 200);
    }
  };

  const verifyPin = (enteredPin: string) => {
    if (enteredPin === storedPin) {
      // PIN correct - proceed with reset
      onConfirm();
      handleClose(false);
    } else {
      // Wrong PIN
      setShowError(true);
      setPin("");
      toast({
        title: "Incorrect PIN",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setShowError(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="bg-background border-border max-w-sm p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === "confirm" ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <AlertDialogHeader>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                  </div>
                </div>
                <AlertDialogTitle className="text-center">Reset Wallet?</AlertDialogTitle>
                <AlertDialogDescription className="text-center">
                  This will permanently delete your wallet data from this device. 
                  Make sure you have backed up your seed phrase before proceeding.
                  <span className="block mt-2 font-semibold text-destructive">
                    This action cannot be undone!
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col gap-2 sm:flex-col mt-4">
                <Button
                  onClick={handleProceedToPin}
                  className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Yes, Reset Wallet
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleClose(false)}
                  className="w-full border-border bg-card hover:bg-secondary"
                >
                  Cancel
                </Button>
              </AlertDialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <AlertDialogHeader>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-destructive" />
                  </div>
                </div>
                <AlertDialogTitle className="text-center">Enter PIN to Confirm</AlertDialogTitle>
                <AlertDialogDescription className="text-center">
                  Enter your 6-digit PIN to confirm wallet reset
                </AlertDialogDescription>
              </AlertDialogHeader>

              {/* PIN Dots */}
              <div className="flex justify-center gap-3 my-6">
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
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2 w-full max-w-[220px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handleKeyPress(String(digit))}
                    className="h-12 rounded-xl bg-card/80 border border-border/50 text-lg font-medium hover:bg-secondary active:scale-95 transition-all"
                  >
                    {digit}
                  </button>
                ))}
                <div className="h-12" />
                <button
                  onClick={() => handleKeyPress("0")}
                  className="h-12 rounded-xl bg-card/80 border border-border/50 text-lg font-medium hover:bg-secondary active:scale-95 transition-all"
                >
                  0
                </button>
                <button
                  onClick={handleDelete}
                  className="h-12 rounded-xl bg-card/80 border border-border/50 flex items-center justify-center hover:bg-secondary active:scale-95 transition-all"
                >
                  <Delete className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <AlertDialogFooter className="mt-6">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep("confirm");
                    setPin("");
                    setShowError(false);
                  }}
                  className="w-full text-muted-foreground"
                >
                  Back
                </Button>
              </AlertDialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </AlertDialogContent>
    </AlertDialog>
  );
};
