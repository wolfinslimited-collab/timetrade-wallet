import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PinSetupStepProps {
  onComplete: (pin: string) => void;
  onBack: () => void;
}

export const PinSetupStep = ({ onComplete, onBack }: PinSetupStepProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPin = step === "create" ? pin : confirmPin;
  const setCurrentPin = step === "create" ? setPin : setConfirmPin;

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const handleKeyPress = (digit: string) => {
    if (currentPin.length >= 6) return;
    
    const newPin = currentPin + digit;
    setCurrentPin(newPin);

    if (newPin.length === 6) {
      if (step === "create") {
        setTimeout(() => setStep("confirm"), 300);
      } else {
        if (newPin === pin) {
          toast({
            title: "PIN created successfully!",
            description: "Your wallet is now secured",
          });
          onComplete(newPin);
        } else {
          toast({
            title: "PINs don't match",
            description: "Please try again",
            variant: "destructive",
          });
          setConfirmPin("");
          setPin("");
          setStep("create");
        }
      }
    }
  };

  const handleDelete = () => {
    setCurrentPin(currentPin.slice(0, -1));
  };

  const handleClear = () => {
    setCurrentPin("");
  };

  return (
    <div className="flex flex-col min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={onBack}
          className="p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Security Setup</p>
          <h2 className="text-xl font-bold">
            {step === "create" ? "Create PIN" : "Confirm PIN"}
          </h2>
        </div>
      </div>

      {/* PIN Display */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-8">
          <Lock className="w-10 h-10 text-primary" />
        </div>

        <p className="text-muted-foreground text-center mb-8 max-w-xs">
          {step === "create" 
            ? "Create a 6-digit PIN to secure your wallet" 
            : "Re-enter your PIN to confirm"}
        </p>

        {/* PIN Dots */}
        <div className="flex gap-4 mb-12">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-200",
                index < currentPin.length
                  ? "bg-primary scale-110"
                  : "bg-muted border border-border"
              )}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(String(digit))}
              className="h-16 rounded-2xl bg-card border border-border text-2xl font-semibold hover:bg-secondary active:scale-95 transition-all"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-16 rounded-2xl bg-card border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-all"
          >
            Clear
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            className="h-16 rounded-2xl bg-card border border-border text-2xl font-semibold hover:bg-secondary active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-card border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-all"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Hidden input for keyboard support */}
      <input
        ref={inputRef}
        type="tel"
        className="sr-only"
        value={currentPin}
        onChange={(e) => {
          const value = e.target.value.replace(/\D/g, "").slice(0, 6);
          setCurrentPin(value);
        }}
        maxLength={6}
      />
    </div>
  );
};
