import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Copy, AlertTriangle, Lock, Shield, Loader2, ChevronRight, Wallet } from "lucide-react";
import { decryptPrivateKey, EncryptedData } from "@/utils/encryption";
import { WALLET_STORAGE_KEYS } from "@/utils/walletStorage";

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
      .map((a: any) => ({
        id: a.id,
        nickname: a.nickname || `Account`,
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

  const handleKeyPress = async (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(null);

    if (newPin.length === 6) {
      if (newPin === storedPin) {
        setIsDecrypting(true);
        try {
          if (selectedAccount?.encryptedSeedPhrase) {
            const encryptedData: EncryptedData = JSON.parse(selectedAccount.encryptedSeedPhrase);
            const decryptedPhrase = await decryptPrivateKey(encryptedData, newPin);
            setSeedPhrase(decryptedPhrase.split(" "));
            setStep("view-seed");
          } else {
            setError("No seed phrase found");
            setPin("");
          }
        } catch {
          setError("Failed to decrypt seed phrase");
          setPin("");
        } finally {
          setIsDecrypting(false);
        }
      } else {
        setError("Incorrect PIN");
        setPin("");
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(null);
  };

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
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl bg-background border-border p-0">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="text-xl font-bold">Select Account</SheetTitle>
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
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl bg-background border-border p-0">
          <SheetHeader className="px-6 pt-6 pb-2">
            <div className="flex items-center gap-2">
              <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
                ← Back
              </button>
              <SheetTitle className="text-xl font-bold">Enter PIN</SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex flex-col h-full px-6 pb-8">
            <div className="flex-1 flex flex-col items-center justify-center">
              {isDecrypting ? (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-6">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  </div>
                  <p className="text-muted-foreground text-center">Decrypting...</p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-6">
                    <Lock className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-sm font-medium mb-1">{selectedAccount?.nickname}</p>
                  <p className="text-muted-foreground text-center mb-8 max-w-xs text-sm">
                    Enter your PIN to view the seed phrase
                  </p>
                  {error && <p className="text-destructive text-sm mb-4">{error}</p>}
                  <div className="flex gap-4 mb-8">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <div
                        key={index}
                        className={cn(
                          "w-4 h-4 rounded-full transition-all duration-200",
                          index < pin.length
                            ? error ? "bg-destructive" : "bg-primary scale-110"
                            : "bg-muted border border-border"
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleKeyPress(String(digit))}
                  className="h-14 rounded-xl bg-card border border-border text-xl font-semibold hover:bg-secondary active:scale-95 transition-all"
                >
                  {digit}
                </button>
              ))}
              <div className="h-14" />
              <button
                onClick={() => handleKeyPress("0")}
                className="h-14 rounded-xl bg-card border border-border text-xl font-semibold hover:bg-secondary active:scale-95 transition-all"
              >
                0
              </button>
              <button
                onClick={handleDelete}
                className="h-14 rounded-xl bg-card border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Step 3: View seed phrase
  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl bg-background border-border p-0">
        <SheetHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              ← Back
            </button>
            <SheetTitle className="text-xl font-bold">{selectedAccount?.nickname}</SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex flex-col h-full px-6 pb-8">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 mt-4">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive mb-1">Keep this secret!</p>
              <p className="text-muted-foreground">
                Never share your seed phrase. Anyone with these words can steal your funds.
              </p>
            </div>
          </div>

          <div className="flex-1 mt-6">
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

          <Button onClick={handleCopy} variant="outline" className="mt-4 h-14 border-border bg-card hover:bg-secondary" disabled={!revealed}>
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
