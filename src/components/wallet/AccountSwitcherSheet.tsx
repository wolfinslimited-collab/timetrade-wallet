import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Plus, Key, FileText, ChevronRight, ChevronLeft, Layers, Edit2, Wallet, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { toast } from "sonner";
import { validateSeedPhrase } from "@/utils/seedPhrase";
import { deriveEvmAddress, deriveSolanaAddress, deriveTronAddress } from "@/utils/walletDerivation";
import { decryptPrivateKey, encryptPrivateKey } from "@/utils/encryption";
import { Wallet as EthersWallet } from "ethers";
import { evmToTronAddress } from "@/utils/tronAddress";
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

interface AccountSwitcherSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AddAccountMode = null | "menu" | "mnemonic" | "privateKey";

interface StoredAccount {
  id: string;
  name: string;
  type: "mnemonic" | "privateKey";
  // When type === "mnemonic", we must persist the encrypted mnemonic per account
  // so switching restores the correct wallet after refresh.
  encryptedSeedPhrase?: string;
  // When type === "privateKey", link to an entry in timetrade_stored_keys.
  storedKeyId?: string;
  createdAt: string;
}

const ACCOUNTS_STORAGE_KEY = "timetrade_user_accounts";

function useUserAccounts() {
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);

  // Load accounts on mount - with recovery for empty arrays
  useEffect(() => {
    const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    let parsed: StoredAccount[] = [];
    
    if (stored) {
      try {
        parsed = JSON.parse(stored);
      } catch {
        parsed = [];
      }
    }
    
    // If we have accounts, use them (and lightly hydrate legacy entries)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const seedCipher = localStorage.getItem("timetrade_seed_phrase") || undefined;
      const hydrated = parsed.map((a) => {
        if (a.type === "mnemonic" && a.id === "main" && !a.encryptedSeedPhrase && seedCipher) {
          return { ...a, encryptedSeedPhrase: seedCipher };
        }
        return a;
      });
      setAccounts(hydrated);
      // Persist hydration so switching works after refresh
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(hydrated));
    } else {
      // Recovery: Check if there's an existing seed phrase but no accounts registered
      const seedCipher = localStorage.getItem("timetrade_seed_phrase");
      const walletName = localStorage.getItem("timetrade_wallet_name") || "Main Wallet";
      if (seedCipher) {
        const mainAccount: StoredAccount = {
          id: "main",
          name: walletName,
          type: "mnemonic",
          encryptedSeedPhrase: seedCipher,
          createdAt: new Date().toISOString(),
        };
        setAccounts([mainAccount]);
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([mainAccount]));
      }
    }
  }, []);

  const addAccount = (
    name: string,
    type: "mnemonic" | "privateKey",
    extras?: Pick<StoredAccount, "encryptedSeedPhrase" | "storedKeyId">
  ) => {
    const newAccount: StoredAccount = {
      id: Date.now().toString(),
      name: name.trim() || `Account ${accounts.length + 1}`,
      type,
      ...(extras || {}),
      createdAt: new Date().toISOString(),
    };
    const updated = [...accounts, newAccount];
    setAccounts(updated);
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
    return newAccount;
  };

  const removeAccount = (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
  };

  const renameAccount = (id: string, newName: string) => {
    const updated = accounts.map((a) =>
      a.id === id ? { ...a, name: newName.trim() } : a
    );
    setAccounts(updated);
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
  };

  return { accounts, addAccount, removeAccount, renameAccount };
}

export function AccountSwitcherSheet({ open, onOpenChange }: AccountSwitcherSheetProps) {
  const { activeAccountIndex, setActiveAccountIndex, isLoadingAccounts, refreshAll } = useBlockchainContext();
  
  const { accounts, addAccount, removeAccount, renameAccount } = useUserAccounts();
  const [addMode, setAddMode] = useState<AddAccountMode>(null);
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [accountNameInput, setAccountNameInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSelectAccount = async (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;

    // Always update wallet name so header reflects selection
    localStorage.setItem("timetrade_wallet_name", account.name);

    // IMPORTANT: the UI list index is NOT a derivation index.
    // Switching must restore the correct wallet material (mnemonic/private key) first.
    if (account.type === "mnemonic") {
      if (!account.encryptedSeedPhrase) {
        toast.error("This wallet was created before an update. Please re-import the seed phrase.");
        return;
      }

      const storedPin = localStorage.getItem("timetrade_pin");
      if (!storedPin) {
        toast.error("Please set up PIN first");
        return;
      }

      localStorage.setItem("timetrade_seed_phrase", account.encryptedSeedPhrase);
      localStorage.setItem("timetrade_active_account_index", "0");

      // Trigger re-derivation + UI sync (BlockchainContext re-derives when seed phrase changes)
      window.dispatchEvent(new CustomEvent("timetrade:account-switched"));

      // Refresh queries after addresses have been re-derived
      setTimeout(() => refreshAll(), 250);
    } else {
      // Private-key accounts: derive EVM + Tron addresses and update storage.
      const storedPin = localStorage.getItem("timetrade_pin");
      if (!storedPin) {
        toast.error("Please set up PIN first");
        return;
      }

      const existingKeys = JSON.parse(localStorage.getItem("timetrade_stored_keys") || "[]");
      const entry =
        existingKeys.find((k: any) => k.id === account.storedKeyId) ||
        existingKeys.find((k: any) => k.label === account.name);
      if (!entry?.encryptedKey) {
        toast.error("Private key not found for this account");
        return;
      }

      const privateKeyRaw = await decryptPrivateKey(entry.encryptedKey, storedPin);
      const privateKey = privateKeyRaw.startsWith("0x") ? privateKeyRaw : `0x${privateKeyRaw}`;
      const evmAddress = new EthersWallet(privateKey).address;
      const tronAddress = evmToTronAddress(evmAddress);

      localStorage.setItem("timetrade_wallet_address", evmAddress);
      localStorage.setItem("timetrade_wallet_address_evm", evmAddress);
      if (tronAddress) localStorage.setItem("timetrade_wallet_address_tron", tronAddress);
      localStorage.removeItem("timetrade_wallet_address_solana");
      localStorage.setItem("timetrade_active_account_index", "0");

      window.dispatchEvent(new CustomEvent("timetrade:account-switched"));
      setTimeout(() => refreshAll(), 200);
    }

    toast.success(`Switched to ${account.name}`);
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
      const encryptedStr = JSON.stringify(encrypted);
      localStorage.setItem("timetrade_seed_phrase", encryptedStr);

      const evmAddress = deriveEvmAddress(words.join(" "), 0);
      const solAddress = deriveSolanaAddress(words.join(" "), 0, "phantom");
      const tronAddress = deriveTronAddress(words.join(" "), 0);

      localStorage.setItem("timetrade_wallet_address", evmAddress);
      localStorage.setItem("timetrade_wallet_address_evm", evmAddress);
      localStorage.setItem("timetrade_wallet_address_solana", solAddress);
      localStorage.setItem("timetrade_wallet_address_tron", tronAddress);

      const accountName = accountNameInput.trim() || "Imported Wallet";
      
      // Set wallet name so header displays it correctly
      localStorage.setItem("timetrade_wallet_name", accountName);
      
      addAccount(accountName, "mnemonic", { encryptedSeedPhrase: encryptedStr });

      window.dispatchEvent(new CustomEvent("timetrade:unlocked", { detail: { pin: storedPin } }));
      window.dispatchEvent(new CustomEvent("timetrade:account-switched"));

      toast.success("Wallet imported successfully");
      setMnemonicInput("");
      setAccountNameInput("");
      setAddMode(null);
      onOpenChange(false);
      
      // Small delay before refresh to let events propagate
      setTimeout(() => window.location.reload(), 100);
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
      const accountName = accountNameInput.trim() || `Private Key ${existingKeys.length + 1}`;
      const keyId = Date.now().toString();
      existingKeys.push({
        id: keyId,
        label: accountName,
        encryptedKey: encrypted,
        addedAt: new Date().toISOString(),
      });
      localStorage.setItem("timetrade_stored_keys", JSON.stringify(existingKeys));

      // Set wallet name so header displays it correctly
      localStorage.setItem("timetrade_wallet_name", accountName);
      
      addAccount(accountName, "privateKey", { storedKeyId: keyId });

      window.dispatchEvent(new CustomEvent("timetrade:account-switched"));

      toast.success("Private key imported");
      setPrivateKeyInput("");
      setAccountNameInput("");
      setAddMode(null);
      
      // Refresh data for the new account
      setTimeout(() => refreshAll(), 150);
    } catch (err) {
      console.error("Import failed:", err);
      toast.error("Failed to import key");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveNickname = (id: string) => {
    if (editNameInput.trim()) {
      renameAccount(id, editNameInput.trim());
      toast.success("Account renamed");
    }
    setEditingAccountId(null);
    setEditNameInput("");
  };

  const startEditingName = (id: string, currentName: string) => {
    setEditingAccountId(id);
    setEditNameInput(currentName);
  };

  const handleDeleteAccount = (id: string) => {
    removeAccount(id);
    setDeleteConfirmId(null);
    toast.success("Account removed");
  };

  const resetAddMode = () => {
    setAddMode(null);
    setMnemonicInput("");
    setPrivateKeyInput("");
    setAccountNameInput("");
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { resetAddMode(); setEditingAccountId(null); } }}>
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

              <Button variant="ghost" onClick={resetAddMode} className="w-full mt-2">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
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
              ) : accounts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wallet className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No Accounts Found</p>
                  <p className="text-sm mt-1 opacity-70">Import a wallet to get started</p>
                </div>
              ) : (
                accounts.map((account, index) => {
                  const isActive = activeAccountIndex === index;
                  const isEditing = editingAccountId === account.id;

                  return (
                    <div
                      key={account.id}
                      className={cn(
                        "w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200",
                        isActive
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/30 bg-card/30 hover:bg-secondary/50"
                      )}
                    >
                      {/* Account Number */}
                      <button
                        onClick={() => handleSelectAccount(account.id)}
                        className={cn(
                          "w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg shrink-0 transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground"
                        )}
                      >
                        {index + 1}
                      </button>
                      
                      {/* Account Info */}
                      <button
                        onClick={() => handleSelectAccount(account.id)}
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
                                if (e.key === "Enter") handleSaveNickname(account.id);
                                if (e.key === "Escape") setEditingAccountId(null);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSaveNickname(account.id)}
                            >
                              <Check className="w-4 h-4 text-primary" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground truncate">{account.name}</span>
                            {account.type === "privateKey" && (
                              <Key className="w-3 h-3 text-muted-foreground shrink-0" />
                            )}
                            {isActive && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold shrink-0">
                                Active
                              </span>
                            )}
                          </div>
                        )}
                      </button>

                      {/* Action Buttons */}
                      {!isEditing && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingName(account.id, account.name);
                            }}
                            className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
                            title="Rename"
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                          {/* Only allow deletion for non-main accounts or if there are multiple accounts */}
                          {(account.id !== "main" || accounts.length > 1) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(account.id);
                              }}
                              className="p-2 rounded-xl hover:bg-destructive/10 transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4 text-destructive/70" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this account from your wallet? This action cannot be undone.
              Make sure you have backed up your seed phrase or private key before removing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteAccount(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
