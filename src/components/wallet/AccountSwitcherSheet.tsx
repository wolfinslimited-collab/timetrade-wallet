import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Check, Copy, Wallet, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { toast } from "sonner";
import type { DerivedAccount } from "@/utils/walletDerivation";

interface AccountSwitcherSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSwitcherSheet({ open, onOpenChange }: AccountSwitcherSheetProps) {
  const { 
    derivedAccounts, 
    activeAccountIndex, 
    setActiveAccountIndex,
    walletAddress,
    isLoadingAccounts,
  } = useBlockchainContext();
  
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const handleSelectAccount = (index: number) => {
    setActiveAccountIndex(index);
    toast.success(`Switched to Account ${index + 1}`);
    onOpenChange(false);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">Switch Account</SheetTitle>
        </SheetHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {isLoadingAccounts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Deriving accounts...</span>
            </div>
          ) : derivedAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No accounts derived yet</p>
              <p className="text-xs mt-1">Complete onboarding to derive accounts</p>
            </div>
          ) : (
            derivedAccounts.map((account) => (
              <button
                key={account.index}
                onClick={() => handleSelectAccount(account.index)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border transition-all",
                  activeAccountIndex === account.index
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-secondary"
                )}
              >
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                    activeAccountIndex === account.index
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {account.index + 1}
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Account {account.index + 1}</span>
                    {activeAccountIndex === account.index && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {formatAddress(account.address)}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {account.path}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyAddress(account.address);
                  }}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  {copiedAddress === account.address ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </button>
            ))
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            All accounts are derived from your seed phrase using BIP44 standard paths
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
