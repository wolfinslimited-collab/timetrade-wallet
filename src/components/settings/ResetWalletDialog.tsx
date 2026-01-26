import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface ResetWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const ResetWalletDialog = ({ open, onOpenChange, onConfirm }: ResetWalletDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-background border-border max-w-sm">
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
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onConfirm}
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Yes, Reset Wallet
          </AlertDialogAction>
          <AlertDialogCancel className="w-full mt-0 border-border bg-card hover:bg-secondary">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
