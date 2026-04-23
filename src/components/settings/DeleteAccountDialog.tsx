import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { UserX, X, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { FullScreenPinModal } from "@/components/shared/FullScreenPinModal";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const DeleteAccountDialog = ({ open, onOpenChange, onConfirm }: DeleteAccountDialogProps) => {
  const [pinOpen, setPinOpen] = useState(false);
  const [deletingState, setDeletingState] = useState<"idle" | "deleting" | "done">("idle");
  const [bioError, setBioError] = useState<string | null>(null);
  const { isAvailable, isEnabled, isRegistered, authenticateWithBiometric } = useBiometricAuth();
  const canUseBiometric = isAvailable && isEnabled && isRegistered;

  const handleProceedToPin = () => {
    onOpenChange(false);
    setTimeout(() => setPinOpen(true), 120);
  };

  const handlePinSubmit = async (enteredPin: string): Promise<boolean> => {
    const storedPin = localStorage.getItem("timetrade_pin");
    if (enteredPin === storedPin) {
      setPinOpen(false);
      setTimeout(() => setDeletingState("deleting"), 150);
      return true;
    }
    return false;
  };

  const handleBiometric = async () => {
    setBioError(null);
    try {
      const recoveredPin = await authenticateWithBiometric();
      if (recoveredPin) {
        await handlePinSubmit(recoveredPin);
      } else {
        setBioError("Biometric authentication failed");
      }
    } catch {
      setBioError("Biometric authentication failed");
    }
  };

  useEffect(() => {
    if (deletingState === "deleting") {
      const timer = setTimeout(() => {
        onConfirm();
        setDeletingState("done");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [deletingState, onConfirm]);

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

            <h3 className="text-base font-semibold text-foreground text-center mb-2">Delete Account?</h3>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-2">
              This will permanently delete your account and all associated data, including wallet information, preferences, and transaction history.
            </p>

            <div className="bg-destructive/5 border border-destructive/15 rounded-xl p-3 mb-5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-destructive">
                    Make sure you have backed up your seed phrase before proceeding.
                  </p>
                  <p className="text-xs text-destructive/80">
                    This action is permanent and cannot be undone. All wallet data, keys, and preferences will be erased.
                  </p>
                </div>
              </div>
            </div>

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
        onBiometric={canUseBiometric ? handleBiometric : undefined}
        biometricAvailable={canUseBiometric}
        error={bioError}
      />

      {/* Deleting / Done overlay */}
      {deletingState !== "idle" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative flex flex-col items-center gap-5 px-8">
            {deletingState === "deleting" ? (
              <>
                <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-destructive animate-spin" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-1">Deleting Account...</h3>
                  <p className="text-sm text-muted-foreground">Removing all data and wallet information</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-1">Account Deleted</h3>
                  <p className="text-sm text-muted-foreground mb-6">Your account and all associated data have been permanently removed.</p>
                  <Button
                    onClick={() => {
                      setDeletingState("idle");
                      window.location.reload();
                    }}
                    className="h-12 px-8 rounded-xl bg-foreground/10 hover:bg-foreground/15 text-foreground font-medium"
                  >
                    Done
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};