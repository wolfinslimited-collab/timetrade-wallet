import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Eye, EyeOff, Shield } from "lucide-react";

interface PrivateKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (privateKey: string) => void;
  isLoading: boolean;
}

export const PrivateKeyModal = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading 
}: PrivateKeyModalProps) => {
  const [privateKey, setPrivateKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    
    let key = privateKey.trim();
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
    
    onSubmit(key);
  };

  const handleClose = () => {
    setPrivateKey("");
    setShowKey(false);
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
            Enter your private key to sign this transaction. Your key is never stored or transmitted.
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

          {/* Private Key Input */}
          <div className="space-y-2">
            <Label htmlFor="privateKey">Private Key</Label>
            <div className="relative">
              <Input
                id="privateKey"
                type={showKey ? "text" : "password"}
                value={privateKey}
                onChange={(e) => {
                  setPrivateKey(e.target.value);
                  setError(null);
                }}
                placeholder="0x..."
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
              "Sign & Send"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
