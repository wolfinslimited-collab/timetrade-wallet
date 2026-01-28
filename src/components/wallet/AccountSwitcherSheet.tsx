import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Plus, Key, FileText, ChevronRight, ChevronLeft, Layers, Edit2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { toast } from "sonner";
import { validateSeedPhrase } from "@/utils/seedPhrase";
import { deriveEvmAddress, deriveSolanaAddress, deriveTronAddress } from "@/utils/walletDerivation";
import { encryptPrivateKey } from "@/utils/encryption";

interface AccountSwitcherSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AddAccountMode = null | "menu" | "mnemonic" | "privateKey";

interface AccountNickname {
  index: number;
  name: string;
}

function useAccountNicknames() {
  const [nicknames, setNicknames] = useState<AccountNickname[]>(() => {
    const stored = localStorage.getItem("timetrade_account_nicknames");
    return stored ? JSON.parse(stored) : [];
  });

  const setNickname = (index: number, name: string) => {
    setNicknames((prev) => {
      const filtered = prev.filter((n) => n.index !== index);
      const updated = [...filtered, { index, name }];
      localStorage.setItem("timetrade_account_nicknames", JSON.stringify(updated));
      return updated;
    });
  };

  const getNickname = (index: number): string | null => {
    return nicknames.find((n) => n.index === index)?.name || null;
  };

  return { nicknames, setNickname, getNickname };
}

export function AccountSwitcherSheet({ open, onOpenChange }: AccountSwitcherSheetProps) {
  const { 
    derivedAccounts, 
    activeAccountIndex, 
    setActiveAccountIndex,
    isLoadingAccounts,
  } = useBlockchainContext();
  
  const { getNickname, setNickname } = useAccountNicknames();
  const [addMode, setAddMode] = useState<AddAccountMode>(null);
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [accountNameInput, setAccountNameInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [editingAccountIndex, setEditingAccountIndex] = useState<number | null>(null);
  const [editNameInput, setEditNameInput] = useState("");

  // Group accounts by index (multi-chain = one account has multiple chain addresses)
  const uniqueAccounts = useMemo(() => {
    const indexMap = new Map<number, boolean>();
    derivedAccounts.forEach(acc => indexMap.set(acc.index, true));
    return Array.from(indexMap.keys()).sort((a, b) => a - b);
  }, [derivedAccounts]);

  const handleSelectAccount = (index: number) => {
    setActiveAccountIndex(index);
    const name = getNickname(index) || `Account ${index + 1}`;
    toast.success(`Switched to ${name}`);
    onOpenChange(false);
  };

  const handleImportMnemonic = async () => {
    const words = mnemonicInput.trim().toLowerCase().split(/\s+/);
    if (!validateSeedPhrase(words)) {
      toast.error("Invalid seed phrase");
      return;
    }

    setIsImporting(true);
    try {
      const storedPin = localStorage.getItem("timetrade_pin");
      if (!storedPin) {
        toast.error("Please set up PIN first");
        return;
      }

      const encrypted = await encryptPrivateKey(words.join(" "), storedPin);
      localStorage.setItem("timetrade_seed_phrase", JSON.stringify(encrypted));

      const evmAddress = deriveEvmAddress(words.join(" "), 0);
      const solAddress = deriveSolanaAddress(words.join(" "), 0, "phantom");
      const tronAddress = deriveTronAddress(words.join(" "), 0);

      localStorage.setItem("timetrade_wallet_address", evmAddress);
      localStorage.setItem("timetrade_wallet_address_evm", evmAddress);
      localStorage.setItem("timetrade_wallet_address_solana", solAddress);
      localStorage.setItem("timetrade_wallet_address_tron", tronAddress);

      if (accountNameInput.trim()) {
        setNickname(0, accountNameInput.trim());
      }

      window.dispatchEvent(new CustomEvent("timetrade:unlocked", { detail: { pin: storedPin } }));

      toast.success("Wallet imported successfully");
      setMnemonicInput("");
      setAccountNameInput("");
      setAddMode(null);
      onOpenChange(false);
      
      window.location.reload();
    } catch (err) {
      console.error("Import failed:", err);
      toast.error("Failed to import wallet");
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportPrivateKey = async () => {
    const key = privateKeyInput.trim();
    if (!key || key.length < 32) {
      toast.error("Invalid private key");
      return;
    }

    setIsImporting(true);
    try {
      const storedPin = localStorage.getItem("timetrade_pin");
      if (!storedPin) {
        toast.error("Please set up PIN first");
        return;
      }

      const encrypted = await encryptPrivateKey(key, storedPin);
      const existingKeys = JSON.parse(localStorage.getItem("timetrade_stored_keys") || "[]");
      const newKeyIndex = existingKeys.length;
      existingKeys.push({
        id: Date.now().toString(),
        label: accountNameInput.trim() || `Imported Key ${newKeyIndex + 1}`,
        encryptedKey: encrypted,
        addedAt: new Date().toISOString(),
      });
      localStorage.setItem("timetrade_stored_keys", JSON.stringify(existingKeys));

      toast.success("Private key imported");
      setPrivateKeyInput("");
      setAccountNameInput("");
      setAddMode(null);
    } catch (err) {
      console.error("Import failed:", err);
      toast.error("Failed to import key");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveNickname = (index: number) => {
    if (editNameInput.trim()) {
      setNickname(index, editNameInput.trim());
      toast.success("Account renamed");
    }
    setEditingAccountIndex(null);
    setEditNameInput("");
  };

  const startEditingName = (index: number) => {
    setEditingAccountIndex(index);
    setEditNameInput(getNickname(index) || "");
  };

  const resetAddMode = () => {
    setAddMode(null);
    setMnemonicInput("");
    setPrivateKeyInput("");
    setAccountNameInput("");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { resetAddMode(); setEditingAccountIndex(null); } }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] bg-background/95 backdrop-blur-xl border-border/50">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left flex items-center gap-2 text-lg">
            <Layers className="w-5 h-5 text-primary" />
            {addMode === null && "Switch Account"}
            {addMode === "menu" && "Add Account"}
            {addMode === "mnemonic" && "Import Seed Phrase"}
            {addMode === "privateKey" && "Import Private Key"}
          </SheetTitle>
        </SheetHeader>

        {/* Add Account Button */}
        {addMode === null && (
          <button
            onClick={() => setAddMode("menu")}
            className="w-full flex items-center gap-4 p-4 mb-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all duration-200"
          >
            <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <span className="font-medium text-primary">Add or Import Account</span>
          </button>
        )}

        {/* Add Account Menu */}
        {addMode === "menu" && (
          <div className="space-y-3 py-4">
            <button
              onClick={() => setAddMode("mnemonic")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-secondary/50 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">Import Seed Phrase</p>
                <p className="text-sm text-muted-foreground">12 or 24 word recovery phrase</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => setAddMode("privateKey")}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-secondary/50 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">Import Private Key</p>
                <p className="text-sm text-muted-foreground">Hex-encoded private key</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Mnemonic Import Form */}
        {addMode === "mnemonic" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-name-mnemonic" className="text-muted-foreground">Wallet Name</Label>
              <Input
                id="account-name-mnemonic"
                value={accountNameInput}
                onChange={(e) => setAccountNameInput(e.target.value)}
                placeholder="e.g. Main Wallet, Trading"
                maxLength={24}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Seed Phrase</Label>
              <textarea
                value={mnemonicInput}
                onChange={(e) => setMnemonicInput(e.target.value)}
                placeholder="Enter your 12 or 24 word seed phrase..."
                className="w-full h-28 p-4 rounded-2xl border border-border/50 bg-secondary/50 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={resetAddMode} className="flex-1 rounded-xl">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleImportMnemonic}
                disabled={isImporting || !mnemonicInput.trim()}
                className="flex-1 rounded-xl"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import Wallet"}
              </Button>
            </div>
          </div>
        )}

        {/* Private Key Import Form */}
        {addMode === "privateKey" && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-name-pk" className="text-muted-foreground">Wallet Name</Label>
              <Input
                id="account-name-pk"
                value={accountNameInput}
                onChange={(e) => setAccountNameInput(e.target.value)}
                placeholder="e.g. Hot Wallet, DeFi"
                maxLength={24}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Private Key</Label>
              <Input
                type="password"
                value={privateKeyInput}
                onChange={(e) => setPrivateKeyInput(e.target.value)}
                placeholder="Enter private key..."
                className="font-mono bg-secondary/50 border-border/50"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={resetAddMode} className="flex-1 rounded-xl">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleImportPrivateKey}
                disabled={isImporting || !privateKeyInput.trim()}
                className="flex-1 rounded-xl"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import Key"}
              </Button>
            </div>
          </div>
        )}

        {/* Account List */}
        {addMode === null && (
          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
            {isLoadingAccounts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading accounts...</span>
              </div>
            ) : uniqueAccounts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">No Accounts Found</p>
                <p className="text-sm mt-1 opacity-70">Import a wallet to get started</p>
              </div>
            ) : (
              uniqueAccounts.map((accountIndex) => {
                const nickname = getNickname(accountIndex);
                const displayName = nickname || `Account ${accountIndex + 1}`;
                const isActive = activeAccountIndex === accountIndex;
                const isEditing = editingAccountIndex === accountIndex;

                return (
                  <div
                    key={accountIndex}
                    className={cn(
                      "w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200",
                      isActive
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/30 bg-card/30 hover:bg-secondary/50"
                    )}
                  >
                    {/* Account Number */}
                    <button
                      onClick={() => handleSelectAccount(accountIndex)}
                      className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg shrink-0 transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {accountIndex + 1}
                    </button>
                    
                    {/* Account Info */}
                    <button
                      onClick={() => handleSelectAccount(accountIndex)}
                      className="flex-1 text-left min-w-0"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editNameInput}
                            onChange={(e) => setEditNameInput(e.target.value)}
                            placeholder="Enter wallet name"
                            maxLength={24}
                            className="h-8 text-sm bg-secondary/50"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveNickname(accountIndex);
                              if (e.key === "Escape") setEditingAccountIndex(null);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleSaveNickname(accountIndex)}
                          >
                            <Check className="w-4 h-4 text-primary" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{displayName}</span>
                          {isActive && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">
                              Active
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Edit Button */}
                    {!isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingName(accountIndex);
                        }}
                        className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
                        title="Rename"
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
