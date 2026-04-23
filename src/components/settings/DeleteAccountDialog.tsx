import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { UserX, X } from "lucide-react";
import { FullScreenPinModal } from "@/components/shared/FullScreenPinModal";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const DeleteAccountDialog = ({ open, onOpenChange, onConfirm }: DeleteAccountDialogProps) => {
  const [pinOpen, setPinOpen] = useState(false);

  const handleProceedToPin = () => {
    onOpenChange(false);
    setTimeout(() => setPinOpen(true), 120);
  };

  const handlePinSubmit = async (enteredPin: string): Promise<boolean> => {
    const storedPin = localStorage.getItem("timetrade_pin");
    if (enteredPin === storedPin) {
      setPinOpen(false);
      setTimeout(() => onConfirm(), 150);
      return true;
    }
    return false;
  };

  return (
    <>
      {open && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
          <div className="relative w-full max-w-sm mx-4 mb-6 sm:mb-0 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <UserX className="w-6 h-6 text-destructive" />
              </div>
            </div>

            <h3 className="text-base font-semibold text-foreground text-center mb-1.5">Delete Account?</h3>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-1">
              This will permanently delete your account and all associated data, including wallet information, preferences, and transaction history.
            </p>
            <p className="text-xs font-medium text-destructive text-center mb-1">
              Make sure you have backed up your seed phrase.
            </p>
            <p className="text-xs font-medium text-destructive text-center mb-6">
              This action cannot be undone.
            </p>

            <div className="flex flex-col gap-2.5">
              <Button
                onClick={handleProceedToPin}
                className="w-full h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium"
              >
                Yes, Delete My Account
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full h-12 rounded-xl border-border/50 bg-muted/30 hover:bg-muted/50 text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <FullScreenPinModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        eyebrow="Account Deletion"
        title="Confirm Account Deletion"
        subtitle="Enter your 6-digit PIN to permanently delete your account"
        onSubmit={handlePinSubmit}
      />
    </>
  );
};