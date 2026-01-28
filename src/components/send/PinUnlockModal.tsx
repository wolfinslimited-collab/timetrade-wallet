import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Delete, Key, Fingerprint } from "lucide-react";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";

interface PinUnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pin: string) => void;
  onUsePrivateKey?: () => void;
  isLoading: boolean;
  walletAddress?: string;
  error?: string | null;
}

export const PinUnlockModal = ({ 
  open, 
  onOpenChange, 
  onSubmit,
  onUsePrivateKey,
  isLoading,
  walletAddress,
  error,
}: PinUnlockModalProps) => {
  const [pin, setPin] = useState("");
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const { isAvailable, isEnabled, isRegistered, authenticateWithBiometric, refreshStatus } = useBiometricAuth();

  const canUseBiometric = isAvailable && isEnabled && isRegistered;

  // Refresh biometric status when modal opens
  useEffect(() => {
    if (open) {
      refreshStatus();
      setPin("");
      setBiometricError(null);
    }
  }, [open, refreshStatus]);

  const handleKeyPress = (digit: string) => {
    if (pin.length >= 6) return;
    
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 6) {
      onSubmit(newPin);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClose = () => {
    setPin("");
    setBiometricError(null);
    onOpenChange(false);
  };

  const handleBiometricAuth = async () => {
    setBiometricError(null);
    try {
      const retrievedPin = await authenticateWithBiometric();
      if (retrievedPin) {
        onSubmit(retrievedPin);
      } else {
        setBiometricError("Biometric authentication failed");
      }
    } catch (err) {
      setBiometricError("Biometric authentication failed");
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Unlock to Sign
          </DialogTitle>
          <DialogDescription>
            {walletAddress ? (
              <>Authenticate to sign with <span className="font-mono text-xs">{formatAddress(walletAddress)}</span></>
            ) : (
              "Authenticate to sign this transaction with your stored key."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Biometric Button */}
          {canUseBiometric && (
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={handleBiometricAuth}
                disabled={isLoading}
                className="w-full h-16 text-lg gap-3 border-primary/30 hover:border-primary hover:bg-primary/5"
              >
                <Fingerprint className="w-8 h-8 text-primary" />
                Use Face ID / Fingerprint
              </Button>
              {biometricError && (
                <p className="text-center text-sm text-destructive mt-2">{biometricError}</p>
              )}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or enter PIN</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </div>
          )}

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
          <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                disabled={isLoading}
                className="h-14 rounded-xl bg-card border border-border text-xl font-semibold hover:bg-secondary active:scale-95 transition-all disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleBackspace}
              disabled={isLoading}
              className="h-14 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-secondary active:scale-95 transition-all disabled:opacity-50"
            >
              <Delete className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleKeyPress("0")}
              disabled={isLoading}
              className="h-14 rounded-xl bg-card border border-border text-xl font-semibold hover:bg-secondary active:scale-95 transition-all disabled:opacity-50"
            >
              0
            </button>
            <div className="h-14" />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Signing transaction...</span>
          </div>
        )}

        {/* Use Private Key Instead - only show if handler provided */}
        {onUsePrivateKey && (
          <div className="border-t border-border pt-4">
            <Button
              variant="ghost"
              onClick={onUsePrivateKey}
              disabled={isLoading}
              className="w-full text-muted-foreground"
            >
              <Key className="w-4 h-4 mr-2" />
              Use Private Key Instead
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
