import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, Lock, Delete } from "lucide-react";

interface BiometricSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onRegister: (pin: string) => Promise<boolean>;
}

export const BiometricSetupDialog = ({ 
  open, 
  onOpenChange, 
  onSuccess,
  onRegister,
}: BiometricSetupDialogProps) => {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKeyPress = (digit: string) => {
    if (pin.length >= 6) return;
    setError(null);
    const newPin = pin + digit;
    setPin(newPin);
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(null);
  };

  const handleClose = () => {
    setPin("");
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (pin.length !== 6) {
      setError("Please enter your 6-digit PIN");
      return;
    }

    // Verify PIN first
    const storedPin = localStorage.getItem("timetrade_pin");
    if (storedPin !== pin) {
      setError("Incorrect PIN");
      setPin("");
      return;
    }

    setIsLoading(true);
    try {
      const success = await onRegister(pin);
      if (success) {
        onSuccess();
        handleClose();
      } else {
        setError("Failed to set up biometrics");
      }
    } catch (err) {
      setError("Biometric setup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-primary" />
            Enable Biometric Unlock
          </DialogTitle>
          <DialogDescription>
            Enter your PIN to link biometric authentication. After setup, you can use Face ID or fingerprint to unlock stored keys.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* PIN Dots */}
          <div className="flex justify-center gap-3 mb-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  i < pin.length 
                    ? "bg-primary scale-110" 
                    : "bg-muted border-2 border-border"
                }`}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-center text-sm text-destructive mb-4">{error}</p>
          )}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                disabled={isLoading}
                className="w-[76px] h-[76px] rounded-full bg-card border border-border text-xl font-semibold hover:bg-secondary active:scale-95 transition-all disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleBackspace}
              disabled={isLoading}
              className="w-[76px] h-[76px] rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary active:scale-95 transition-all disabled:opacity-50"
            >
              <Delete className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleKeyPress("0")}
              disabled={isLoading}
              className="w-[76px] h-[76px] rounded-full bg-card border border-border text-xl font-semibold hover:bg-secondary active:scale-95 transition-all disabled:opacity-50"
            >
              0
            </button>
            <div />
          </div>
        </div>

        {/* Confirm Button */}
        <Button 
          onClick={handleSubmit} 
          disabled={pin.length !== 6 || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Setting up...
            </>
          ) : (
            <>
              <Fingerprint className="w-4 h-4 mr-2" />
              Enable Biometrics
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
