import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useStoredKeys } from "@/hooks/useStoredKeys";
import { Lock, Check } from "lucide-react";

interface ChangePinSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type PinStep = "current" | "new" | "confirm";

export const ChangePinSheet = ({ open, onOpenChange, onSuccess }: ChangePinSheetProps) => {
  const { toast } = useToast();
  const { reEncryptWithNewPin, storedKeys } = useStoredKeys();
  const [step, setStep] = useState<PinStep>("current");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isReEncrypting, setIsReEncrypting] = useState(false);

  const storedPin = localStorage.getItem("timetrade_pin");
  
  const activePin = step === "current" ? currentPin : step === "new" ? newPin : confirmPin;
  const setActivePin = step === "current" ? setCurrentPin : step === "new" ? setNewPin : setConfirmPin;

  const handleKeyPress = (digit: string) => {
    if (activePin.length >= 6) return;
    
    const newValue = activePin + digit;
    setActivePin(newValue);
    setError(null);

    if (newValue.length === 6) {
      handlePinComplete(newValue);
    }
  };

  const handlePinComplete = async (pin: string) => {
    if (step === "current") {
      if (pin === storedPin) {
        setTimeout(() => setStep("new"), 300);
      } else {
        setError("Incorrect PIN");
        setCurrentPin("");
      }
    } else if (step === "new") {
      setTimeout(() => setStep("confirm"), 300);
    } else if (step === "confirm") {
      if (pin === newPin) {
        // Re-encrypt stored keys with new PIN if any exist
        if (storedKeys.length > 0 && currentPin) {
          setIsReEncrypting(true);
          const success = await reEncryptWithNewPin(currentPin, pin);
          setIsReEncrypting(false);
          
          if (!success) {
            setError("Failed to update stored keys. Please try again.");
            setConfirmPin("");
            setNewPin("");
            setStep("new");
            return;
          }
        }
        
        localStorage.setItem("timetrade_pin", pin);
        handleClose();
        onSuccess();
      } else {
        setError("PINs don't match");
        setConfirmPin("");
        setNewPin("");
        setStep("new");
      }
    }
  };

  const handleDelete = () => {
    setActivePin(activePin.slice(0, -1));
    setError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("current");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setError(null);
    }, 300);
  };

  const getTitle = () => {
    switch (step) {
      case "current": return "Enter Current PIN";
      case "new": return "Create New PIN";
      case "confirm": return "Confirm New PIN";
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl bg-background border-border p-0">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="text-xl font-bold">{getTitle()}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full px-6 pb-8">
          {/* Icon and Description */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-6">
              <Lock className="w-10 h-10 text-primary" />
            </div>

            <p className="text-muted-foreground text-center mb-8 max-w-xs">
              {step === "current" && "Enter your current PIN to continue"}
              {step === "new" && "Create a new 6-digit PIN"}
              {step === "confirm" && "Re-enter your new PIN to confirm"}
            </p>

            {/* Error Message */}
            {error && (
              <p className="text-destructive text-sm mb-4">{error}</p>
            )}

            {/* PIN Dots */}
            <div className="flex gap-4 mb-8">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div
                  key={index}
                  className={cn(
                    "w-4 h-4 rounded-full transition-all duration-200",
                    index < activePin.length
                      ? error ? "bg-destructive" : "bg-primary scale-110"
                      : "bg-muted border border-border"
                  )}
                />
              ))}
            </div>

            {/* Step Indicator */}
            <div className="flex gap-2 mb-8">
              {["current", "new", "confirm"].map((s, i) => (
                <div
                  key={s}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    step === s ? "bg-primary" : 
                    (step === "new" && i === 0) || (step === "confirm" && i <= 1) 
                      ? "bg-primary/50" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                onClick={() => handleKeyPress(String(digit))}
                className="h-14 rounded-xl bg-card border border-border text-xl font-semibold hover:bg-secondary active:scale-95 transition-all"
              >
                {digit}
              </button>
            ))}
            <div className="h-14" />
            <button
              onClick={() => handleKeyPress("0")}
              className="h-14 rounded-xl bg-card border border-border text-xl font-semibold hover:bg-secondary active:scale-95 transition-all"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="h-14 rounded-xl bg-card border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
