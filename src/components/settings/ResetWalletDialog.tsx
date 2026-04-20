import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { FullScreenPinModal } from "@/components/shared/FullScreenPinModal";

interface ResetWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const ResetWalletDialog = ({ open, onOpenChange, onConfirm }: ResetWalletDialogProps) => {
  const [pinOpen, setPinOpen] = useState(false);

  const handleProceedToPin = () => {
    onOpenChange(false);
    // Slight delay so AlertDialog close animation doesn't compete
    setTimeout(() => setPinOpen(true), 120);
  };

  const handlePinSubmit = async (enteredPin: string): Promise<boolean> => {
    const storedPin = localStorage.getItem("timetrade_pin");
    if (enteredPin === storedPin) {
      setPinOpen(false);
      // Defer destructive action so modal can animate out
      setTimeout(() => onConfirm(), 150);
      return true;
    }
    return false;
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="bg-background border-border max-w-sm p-6">
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
              onClick={() => onOpenChange(false)}
              className="w-full border-border bg-card hover:bg-secondary"
            >
              Cancel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FullScreenPinModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        eyebrow="Danger Zone"
        title="Confirm Wallet Reset"
        subtitle="Enter your 6-digit PIN to permanently delete this wallet from the device"
        onSubmit={handlePinSubmit}
      />
    </>
  );
};
