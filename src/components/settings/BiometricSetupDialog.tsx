import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { FullScreenPinModal } from "@/components/shared/FullScreenPinModal";

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
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (pin: string): Promise<boolean> => {
    setError(null);

    const storedPin = localStorage.getItem("timetrade_pin");
    if (storedPin !== pin) {
      setError("Incorrect PIN");
      return false;
    }

    try {
      const ok = await onRegister(pin);
      if (ok) {
        toast({
          title: "Biometrics enabled",
          description: "You can now unlock with Face ID or fingerprint",
        });
        setTimeout(() => {
          onSuccess();
          onOpenChange(false);
        }, 350);
        return true;
      }
      setError("Couldn't set up biometrics");
      return false;
    } catch {
      setError("Biometric setup failed");
      return false;
    }
  };

  return (
    <FullScreenPinModal
      open={open}
      onClose={() => {
        setError(null);
        onOpenChange(false);
      }}
      eyebrow="Security"
      title="Enable Biometrics"
      subtitle="Enter your PIN to link Face ID or fingerprint unlock"
      onSubmit={handleSubmit}
      error={error}
    />
  );
};
