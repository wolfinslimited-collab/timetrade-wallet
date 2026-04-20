import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useStoredKeys } from "@/hooks/useStoredKeys";
import { decryptPrivateKey, EncryptedData, encryptPrivateKey } from "@/utils/encryption";
import { getActiveAccountEncryptedSeed, setActiveAccountEncryptedSeed } from "@/utils/walletStorage";
import { FullScreenPinModal } from "@/components/shared/FullScreenPinModal";

interface ChangePinSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newPin?: string) => void;
}

type PinStep = "current" | "new" | "confirm";

export const ChangePinSheet = ({ open, onOpenChange, onSuccess }: ChangePinSheetProps) => {
  const { toast } = useToast();
  const { reEncryptWithNewPin, storedKeys } = useStoredKeys();
  const [step, setStep] = useState<PinStep>("current");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isReEncrypting, setIsReEncrypting] = useState(false);

  const storedPin = localStorage.getItem("timetrade_pin");

  const handleSubmit = useCallback(async (pin: string): Promise<boolean> => {
    if (step === "current") {
      if (pin === storedPin) {
        setCurrentPin(pin);
        setTimeout(() => setStep("new"), 200);
        return true;
      } else {
        setError("Incorrect PIN");
        return false;
      }
    } else if (step === "new") {
      setNewPin(pin);
      setTimeout(() => setStep("confirm"), 200);
      return true;
    } else if (step === "confirm") {
      if (pin !== newPin) {
        setError("PINs don't match");
        setNewPin("");
        setTimeout(() => setStep("new"), 200);
        return false;
      }
      if (currentPin) {
        setIsReEncrypting(true);
        try {
          if (storedKeys.length > 0) {
            const ok = await reEncryptWithNewPin(currentPin, pin);
            if (!ok) throw new Error("Failed to update stored keys");
          }
          const encryptedSeedStr = getActiveAccountEncryptedSeed();
          if (encryptedSeedStr) {
            const encryptedSeed: EncryptedData = JSON.parse(encryptedSeedStr);
            const decryptedSeed = await decryptPrivateKey(encryptedSeed, currentPin);
            const reEncryptedSeed = await encryptPrivateKey(decryptedSeed, pin);
            setActiveAccountEncryptedSeed(JSON.stringify(reEncryptedSeed));
          }
          localStorage.setItem("timetrade_pin", pin);
          window.dispatchEvent(new CustomEvent("timetrade:pin-updated", { detail: { pin } }));
        } catch {
          setError("Failed to update PIN securely. Please try again.");
          setNewPin("");
          setTimeout(() => setStep("new"), 200);
          return false;
        } finally {
          setIsReEncrypting(false);
        }
      }
      handleClose();
      onSuccess(pin);
      return true;
    }
    return false;
  }, [step, storedPin, currentPin, newPin, storedKeys, reEncryptWithNewPin, onSuccess]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("current");
      setCurrentPin("");
      setNewPin("");
      setError(null);
    }, 300);
  };

  return (
    <FullScreenPinModal
      open={open}
      onClose={handleClose}
      title={step === "current" ? "Enter Current PIN" : step === "new" ? "Create New PIN" : "Confirm New PIN"}
      subtitle={
        step === "current" ? "Enter your current PIN to continue" :
        step === "new" ? "Create a new 6-digit PIN" :
        "Re-enter your new PIN to confirm"
      }
      eyebrow="CHANGE PIN"
      onSubmit={handleSubmit}
      error={error}
      isLoading={isReEncrypting}
      showBackArrow
    />
  );
};
