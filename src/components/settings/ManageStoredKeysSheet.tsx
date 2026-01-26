import { useState } from "react";
import { Key, Trash2, Shield, AlertTriangle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useStoredKeys, StoredKeyInfo } from "@/hooks/useStoredKeys";
import { useToast } from "@/hooks/use-toast";
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
import { cn } from "@/lib/utils";

interface ManageStoredKeysSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageStoredKeysSheet = ({ open, onOpenChange }: ManageStoredKeysSheetProps) => {
  const { storedKeys, removeStoredKey, clearAllStoredKeys, refreshKeys } = useStoredKeys();
  const { toast } = useToast();
  const [keyToDelete, setKeyToDelete] = useState<StoredKeyInfo | null>(null);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);

  const handleDeleteKey = (key: StoredKeyInfo) => {
    setKeyToDelete(key);
  };

  const confirmDeleteKey = () => {
    if (keyToDelete) {
      removeStoredKey(keyToDelete.address, keyToDelete.chain);
      toast({
        title: "Key removed",
        description: `Stored key for ${truncateAddress(keyToDelete.address)} has been deleted`,
      });
      setKeyToDelete(null);
      refreshKeys();
    }
  };

  const handleClearAll = () => {
    clearAllStoredKeys();
    toast({
      title: "All keys removed",
      description: "All stored private keys have been deleted",
    });
    setShowClearAllDialog(false);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getChainName = (chain: string) => {
    const chains: Record<string, string> = {
      ethereum: "Ethereum",
      polygon: "Polygon",
      bsc: "BNB Chain",
      arbitrum: "Arbitrum",
      optimism: "Optimism",
    };
    return chains[chain.toLowerCase()] || chain;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Stored Keys
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 overflow-y-auto max-h-[calc(85vh-120px)] pb-4">
            {/* Info Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Encrypted with your PIN</p>
                  <p className="text-muted-foreground mt-1">
                    These keys are stored locally and encrypted. They can only be used by entering your PIN.
                  </p>
                </div>
              </div>
            </div>

            {storedKeys.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Key className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No stored keys</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Save a key when sending to enable PIN-based signing
                </p>
              </div>
            ) : (
              <>
                {/* Keys List */}
                <div className="space-y-3">
                  {storedKeys.map((key) => (
                    <div
                      key={`${key.chain}-${key.address}`}
                      className="bg-card border border-border rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              {truncateAddress(key.address)}
                            </span>
                            <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full">
                              {getChainName(key.chain)}
                            </span>
                          </div>
                          {key.label && (
                            <p className="text-sm text-muted-foreground mt-1">{key.label}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Added {formatDate(key.addedAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteKey(key)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Clear All Button */}
                {storedKeys.length > 1 && (
                  <Button
                    variant="outline"
                    className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => setShowClearAllDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove All Stored Keys
                  </Button>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Single Key Dialog */}
      <AlertDialog open={!!keyToDelete} onOpenChange={() => setKeyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove Stored Key?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the stored key for{" "}
              <span className="font-mono">{keyToDelete && truncateAddress(keyToDelete.address)}</span>.
              You'll need to enter your private key again to sign transactions from this address.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteKey}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Dialog */}
      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove All Stored Keys?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {storedKeys.length} stored keys. You'll need to enter private keys
              again to sign any transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove All Keys
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
