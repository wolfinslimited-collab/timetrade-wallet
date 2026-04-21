import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Copy, AlertTriangle, Shield, ChevronRight, Wallet, X } from "lucide-react";
import { decryptPrivateKey, EncryptedData } from "@/utils/encryption";
import { WALLET_STORAGE_KEYS } from "@/utils/walletStorage";
import { FullScreenPinModal } from "@/components/shared/FullScreenPinModal";

interface ViewSeedPhraseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AccountInfo {
  id: string;
  nickname: string;
  encryptedSeedPhrase: string;
}

function getAccounts(): AccountInfo[] {
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEYS.USER_ACCOUNTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((a: any) => a.encryptedSeedPhrase)
      .map((a: any, idx: number) => ({
        id: a.id,
        nickname: a.name || a.nickname || `Wallet ${idx + 1}`,
        encryptedSeedPhrase: a.encryptedSeedPhrase,
      }));
  } catch {
    return [];
  }
}

type Step = "select-account" | "enter-pin" | "view-seed";

export const ViewSeedPhraseSheet = ({ open, onOpenChange }: ViewSeedPhraseSheetProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("select-account");
  const [selectedAccount, setSelectedAccount] = useState<AccountInfo | null>(null);
  const [pin, setPin] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const storedPin = localStorage.getItem("timetrade_pin");
  const accounts = getAccounts();

  const handleSelectAccount = (account: AccountInfo) => {
    setSelectedAccount(account);
    setStep("enter-pin");
  };

  const handlePinSubmit = useCallback(async (enteredPin: string): Promise<boolean> => {
    if (enteredPin !== storedPin) {
      setError("Incorrect PIN");
      return false;
    }
    setIsDecrypting(true);
    try {
      if (selectedAccount?.encryptedSeedPhrase) {
        const encryptedData: EncryptedData = JSON.parse(selectedAccount.encryptedSeedPhrase);
        const decryptedPhrase = await decryptPrivateKey(encryptedData, enteredPin);
        setSeedPhrase(decryptedPhrase.split(" "));
        setStep("view-seed");
        return true;
      } else {
        setError("No seed phrase found");
        return false;
      }
    } catch {
      setError("Failed to decrypt seed phrase");
      return false;
    } finally {
      setIsDecrypting(false);
    }
  }, [storedPin, selectedAccount]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(seedPhrase.join(" "));
    toast({ title: "Copied!", description: "Seed phrase copied to clipboard. Keep it safe!" });
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("select-account");
      setSelectedAccount(null);
      setPin("");
      setRevealed(false);
      setError(null);
      setSeedPhrase([]);
    }, 300);
  };

  const handleBack = () => {
    if (step === "enter-pin") {
      setStep("select-account");
      setSelectedAccount(null);
      setPin("");
      setError(null);
    } else if (step === "view-seed") {
      setStep("select-account");
      setSelectedAccount(null);
      setPin("");
      setRevealed(false);
      setSeedPhrase([]);
    }
  };

  // Step 1: Account selection
  if (step === "select-account") {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl bg-background border-border p-0" hideCloseButton>
          <div className="flex justify-end pt-3 pb-1 px-4">
            <button
              onClick={handleClose}
              className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          <SheetHeader className="px-6 pb-2">
            <SheetTitle className="text-xl font-bold text-left">Select Account</SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-8 mt-2">
            <p className="text-sm text-muted-foreground mb-4">
              Choose which account's seed phrase to view
            </p>
            <div className="space-y-2">
              {accounts.map((account, idx) => (
                <button
                  key={account.id}
                  onClick={() => handleSelectAccount(account)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:bg-secondary active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[15px] truncate">{account.nickname}</p>
                    <p className="text-xs text-muted-foreground">Account {idx + 1}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                </button>
              ))}
              {accounts.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No accounts found</p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Step 2: PIN entry
  if (step === "enter-pin") {
    return (
      <FullScreenPinModal
        open={open}
        onClose={handleClose}
        title="Enter PIN"
        subtitle={`Verify to view ${selectedAccount?.nickname}'s seed phrase`}
        eyebrow="SECURITY"
        onSubmit={handlePinSubmit}
        error={error}
        isLoading={isDecrypting}
        showBackArrow
      />
    );
  }

  // Step 3: View seed phrase
  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl bg-background border-border p-0 overflow-y-auto" hideCloseButton>
        <div className="flex justify-end pt-3 pb-1 px-4">
          <button
            onClick={handleClose}
            className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <SheetHeader className="px-6 pb-2">
          <SheetTitle className="text-xl font-bold text-left">{selectedAccount?.nickname}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col px-6 pb-8">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mt-4">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive mb-1">Keep this secret!</p>
              <p className="text-muted-foreground">
                Never share your seed phrase. Anyone with these words can steal your funds.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Recovery Phrase</span>
              <button
                onClick={() => setRevealed(!revealed)}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {revealed ? <><EyeOff className="w-4 h-4" />Hide</> : <><Eye className="w-4 h-4" />Reveal</>}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {seedPhrase.map((word, index) => (
                <div key={index} className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border">
                  <span className="text-xs text-muted-foreground font-mono w-5">{index + 1}.</span>
                  <span className={cn("font-mono text-sm flex-1", !revealed && "blur-sm select-none")}>{word}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Security Tips</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Write down on paper and store in a safe place</li>
              <li>• Never store digitally or take screenshots</li>
              <li>• Consider using a metal backup for durability</li>
            </ul>
          </div>

          <Button onClick={handleCopy} variant="outline" className="mt-4 h-14 border-border bg-card hover:bg-secondary">
            <Copy className="w-5 h-5 mr-2" />
            Copy to Clipboard
          </Button>

          <Button onClick={handleClose} className="mt-3 h-14 bg-primary hover:bg-primary/90">
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
