import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Loader2, Plus, Key, FileText, ChevronRight, Wallet2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { toast } from "sonner";
import { validateSeedPhrase } from "@/utils/seedPhrase";
import { deriveEvmAddress, deriveSolanaAddress, deriveTronAddress } from "@/utils/walletDerivation";
import { encryptPrivateKey } from "@/utils/encryption";
import type { DerivedAccount } from "@/utils/walletDerivation";

interface AccountSwitcherSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AddAccountMode = null | "menu" | "mnemonic" | "privateKey";

export function AccountSwitcherSheet({ open, onOpenChange }: AccountSwitcherSheetProps) {
  const { 
    derivedAccounts, 
    activeAccountIndex, 
    setActiveAccountIndex,
    isLoadingAccounts,
  } = useBlockchainContext();
  
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<AddAccountMode>(null);
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast.success("Address copied");
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleSelectAccount = (index: number) => {
    setActiveAccountIndex(index);
    toast.success(`Switched to Account ${index + 1}`);
    onOpenChange(false);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getChainIcon = (chain: string) => {
    switch (chain) {
      case "evm":
        return "⟠";
      case "solana":
        return "◎";
      case "tron":
        return "◈";
      default:
        return "●";
    }
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

      // Encrypt and store the new seed phrase
      const encrypted = await encryptPrivateKey(words.join(" "), storedPin);
      localStorage.setItem("timetrade_seed_phrase", JSON.stringify(encrypted));

      // Derive addresses
      const evmAddress = deriveEvmAddress(words.join(" "), 0);
      const solAddress = deriveSolanaAddress(words.join(" "), 0, "phantom");
      const tronAddress = deriveTronAddress(words.join(" "), 0);

      localStorage.setItem("timetrade_wallet_address", evmAddress);
      localStorage.setItem("timetrade_wallet_address_evm", evmAddress);
      localStorage.setItem("timetrade_wallet_address_solana", solAddress);
      localStorage.setItem("timetrade_wallet_address_tron", tronAddress);

      // Trigger re-derivation
      window.dispatchEvent(new CustomEvent("timetrade:unlocked", { detail: { pin: storedPin } }));

      toast.success("Wallet imported successfully");
      setMnemonicInput("");
      setAddMode(null);
      onOpenChange(false);
      
      // Reload to refresh context
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

      // Store as encrypted key
      const encrypted = await encryptPrivateKey(key, storedPin);
      const existingKeys = JSON.parse(localStorage.getItem("timetrade_stored_keys") || "[]");
      existingKeys.push({
        id: Date.now().toString(),
        label: `Imported Key ${existingKeys.length + 1}`,
        encryptedKey: encrypted,
        addedAt: new Date().toISOString(),
      });
      localStorage.setItem("timetrade_stored_keys", JSON.stringify(existingKeys));

      toast.success("Private key imported");
      setPrivateKeyInput("");
      setAddMode(null);
    } catch (err) {
      console.error("Import failed:", err);
      toast.error("Failed to import key");
    } finally {
      setIsImporting(false);
    }
  };

  const resetAddMode = () => {
    setAddMode(null);
    setMnemonicInput("");
    setPrivateKeyInput("");
  };

  // Render add account menu
  const renderAddMenu = () => (
    <div className="space-y-3 py-4">
      <button
        onClick={() => setAddMode("mnemonic")}
        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-secondary transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold">Import Seed Phrase</p>
          <p className="text-sm text-muted-foreground">12 or 24 word recovery phrase</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>

      <button
        onClick={() => setAddMode("privateKey")}
        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-secondary transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Key className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold">Import Private Key</p>
          <p className="text-sm text-muted-foreground">Hex-encoded private key</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );

  // Render mnemonic import form
  const renderMnemonicForm = () => (
    <div className="space-y-4 py-4">
      <p className="text-sm text-muted-foreground">
        Enter your 12 or 24 word seed phrase, separated by spaces.
      </p>
      <textarea
        value={mnemonicInput}
        onChange={(e) => setMnemonicInput(e.target.value)}
        placeholder="word1 word2 word3 ..."
        className="w-full h-32 p-3 rounded-xl border border-border bg-card text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex gap-3">
        <Button variant="outline" onClick={resetAddMode} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleImportMnemonic}
          disabled={isImporting || !mnemonicInput.trim()}
          className="flex-1"
        >
          {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import"}
        </Button>
      </div>
    </div>
  );

  // Render private key import form
  const renderPrivateKeyForm = () => (
    <div className="space-y-4 py-4">
      <p className="text-sm text-muted-foreground">
        Enter your private key (hex format).
      </p>
      <Input
        type="password"
        value={privateKeyInput}
        onChange={(e) => setPrivateKeyInput(e.target.value)}
        placeholder="0x..."
        className="font-mono"
      />
      <div className="flex gap-3">
        <Button variant="outline" onClick={resetAddMode} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleImportPrivateKey}
          disabled={isImporting || !privateKeyInput.trim()}
          className="flex-1"
        >
          {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import"}
        </Button>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetAddMode(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh]">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-left flex items-center gap-2">
            <Wallet2 className="w-5 h-5" />
            {addMode === null && "Switch Account"}
            {addMode === "menu" && "Add Account"}
            {addMode === "mnemonic" && "Import Seed Phrase"}
            {addMode === "privateKey" && "Import Private Key"}
          </SheetTitle>
        </SheetHeader>

        {/* Add Account Button - only show when viewing accounts */}
        {addMode === null && (
          <button
            onClick={() => setAddMode("menu")}
            className="w-full flex items-center gap-3 p-3 mb-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <span className="font-medium text-primary">Add or Import Account</span>
          </button>
        )}

        {/* Add Account Modes */}
        {addMode === "menu" && renderAddMenu()}
        {addMode === "mnemonic" && renderMnemonicForm()}
        {addMode === "privateKey" && renderPrivateKeyForm()}

        {/* Account List - only show when not in add mode */}
        {addMode === null && (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {isLoadingAccounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading accounts...</span>
              </div>
            ) : derivedAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No accounts found</p>
                <p className="text-xs mt-1">Import a wallet to get started</p>
              </div>
            ) : (
              derivedAccounts.map((account) => (
                <button
                  key={account.index}
                  onClick={() => handleSelectAccount(account.index)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                    activeAccountIndex === account.index
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-secondary"
                  )}
                >
                  {/* Account Number Circle */}
                  <div 
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0",
                      activeAccountIndex === account.index
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {account.index + 1}
                  </div>
                  
                  {/* Account Info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Account {account.index + 1}</span>
                      {activeAccountIndex === account.index && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs">{getChainIcon(account.chain)}</span>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {formatAddress(account.address)}
                      </p>
                    </div>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyAddress(account.address);
                    }}
                    className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
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
        )}

        {/* Footer Info */}
        {addMode === null && derivedAccounts.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-[11px] text-muted-foreground text-center">
              Accounts derived from your seed phrase using BIP44
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
