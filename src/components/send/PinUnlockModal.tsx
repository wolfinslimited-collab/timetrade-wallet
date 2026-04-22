import { useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Key } from "lucide-react";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { FullScreenPinModal } from "@/components/shared/FullScreenPinModal";

interface PinUnlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pin: string) => void;
  // onSubmit may return a promise (async signing flow)
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
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const {
    isAvailable,
    isEnabled,
    isRegistered,
    authenticateWithBiometric,
    refreshStatus,
  } = useBiometricAuth();

  const canUseBiometric = isAvailable && isEnabled && isRegistered;

  useEffect(() => {
    if (open) {
      refreshStatus();
      setBiometricError(null);
    }
  }, [open, refreshStatus]);

  const handleSubmit = async (pin: string): Promise<boolean | void> => {
    try {
      await onSubmit(pin);
      // Parent resolved without throwing — show success checkmark
      return true;
    } catch {
      // Parent threw — trigger shake
      return false;
    }
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
    } catch {
      setBiometricError("Biometric authentication failed");
    }
  };

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const subtitle: ReactNode = walletAddress ? (
    <>
      Authenticate to sign with{" "}
      <span className="font-mono text-xs text-foreground/80">
        {formatAddress(walletAddress)}
      </span>
    </>
  ) : (
    "Authenticate to sign this transaction"
  );

  const footer = onUsePrivateKey ? (
    <Button
      variant="ghost"
      onClick={onUsePrivateKey}
      disabled={isLoading}
      className="w-full text-muted-foreground"
    >
      <Key className="w-4 h-4 mr-2" />
      Use Private Key Instead
    </Button>
  ) : null;

  return (
    <FullScreenPinModal
      open={open}
      onClose={() => onOpenChange(false)}
      eyebrow="Security"
      title="Unlock to Sign"
      subtitle={subtitle}
      onSubmit={handleSubmit}
      onBiometric={canUseBiometric ? handleBiometricAuth : undefined}
      biometricAvailable={canUseBiometric}
      isLoading={isLoading}
      error={error || biometricError}
      footer={footer}
    />
  );
};
