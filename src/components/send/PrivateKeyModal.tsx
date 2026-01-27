import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Eye, EyeOff, Shield, Key, Lock } from "lucide-react";
import { useBlockchainContext } from "@/contexts/BlockchainContext";

interface PrivateKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (privateKey: string, saveKey: boolean) => void;
  isLoading: boolean;
  hasStoredKey?: boolean;
}

export const PrivateKeyModal = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading,
  hasStoredKey = false,
}: PrivateKeyModalProps) => {
  const { selectedChain } = useBlockchainContext();
  const [privateKey, setPrivateKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saveKey, setSaveKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSolana = selectedChain === 'solana';

  const handleSubmit = () => {
    setError(null);
    
    let key = privateKey.trim();
    
    // For Solana, we accept either mnemonic (with spaces) or 32-byte hex key
    if (isSolana) {
      const isMnemonic = key.includes(' ');
      if (isMnemonic) {
        // Basic mnemonic validation: should have at least 12 words
        const words = key.split(/\s+/).filter(Boolean);
        if (words.length < 12) {
          setError("Mnemonic must have at least 12 words.");
          return;
        }
      } else {
        // Hex private key - should be 32 bytes (64 hex chars)
        if (!key.startsWith('0x')) {
          key = '0x' + key;
        }
        if (key.length !== 66 || !/^0x[a-fA-F0-9]{64}$/.test(key)) {
          setError("Invalid private key. For Solana, enter your 12/24-word mnemonic or 64-char hex key.");
          return;
        }
      }
      onSubmit(isMnemonic ? privateKey.trim() : key, saveKey);
      return;
    }
    
    // EVM / Tron: expect 64 hex chars
    if (!key.startsWith('0x')) {
      key = '0x' + key;
    }
    
    if (key.length !== 66) {
      setError("Invalid private key format. Must be 64 hex characters.");
      return;
    }
    
    // Basic hex validation
    if (!/^0x[a-fA-F0-9]{64}$/.test(key)) {
      setError("Invalid private key. Must contain only hexadecimal characters.");
      return;
    }
    
    onSubmit(key, saveKey);
  };

  const handleClose = () => {
    setPrivateKey("");
    setShowKey(false);
    setSaveKey(false);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Sign Transaction
          </DialogTitle>
          <DialogDescription>
            {isSolana 
              ? "Enter your 12/24-word mnemonic or private key to sign. Your key is never stored or transmitted unless you save it."
              : "Enter your private key to sign this transaction. Your key is never stored or transmitted unless you choose to save it."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Security Warning */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-amber-500 mb-1">Security Notice</p>
              <p>Your private key is used locally to sign this transaction. It is never sent to any server.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="privateKey">{isSolana ? "Mnemonic or Private Key" : "Private Key"}</Label>
            <div className="relative">
              <Input
                id="privateKey"
                type={showKey ? "text" : "password"}
                value={privateKey}
                onChange={(e) => {
                  setPrivateKey(e.target.value);
                  setError(null);
                }}
                placeholder={isSolana ? "Enter mnemonic or 0x..." : "0x..."}
                className="pr-10 font-mono text-sm"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          {/* Save Key Option */}
          {!hasStoredKey && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <Checkbox
                id="saveKey"
                checked={saveKey}
                onCheckedChange={(checked) => setSaveKey(checked === true)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <label htmlFor="saveKey" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Save key for faster transactions
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Encrypts your key with your PIN for quick access. You'll only need to enter your PIN next time.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={!privateKey.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Signing...
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Sign & Send
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
