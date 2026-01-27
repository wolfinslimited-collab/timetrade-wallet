import { useState, useMemo } from "react";
import { Scan, Clipboard, User, AlertCircle, ChevronLeft, Bookmark, BookmarkPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QRScannerModal } from "./QRScannerModal";
import { Chain, getChainInfo } from "@/hooks/useBlockchain";
import { useSavedAddresses, SavedAddress } from "@/hooks/useSavedAddresses";
import { isValidSolanaAddress } from "@/hooks/useSolanaTransactionSigning";

interface AddressInputStepProps {
  selectedChain: Chain;
  onSubmit: (address: string) => void;
  onBack: () => void;
}

// Validate address based on chain
function validateAddressForChain(addr: string, chain: Chain): { valid: boolean; error?: string } {
  const trimmed = addr.trim();
  if (!trimmed) return { valid: false, error: "Please enter a wallet address" };
  
  switch (chain) {
    case 'solana':
      if (isValidSolanaAddress(trimmed)) {
        return { valid: true };
      }
      return { valid: false, error: "Invalid Solana address (Base58 format required)" };
    
    case 'tron':
      if (/^T[a-zA-Z0-9]{33}$/.test(trimmed)) {
        return { valid: true };
      }
      return { valid: false, error: "Invalid Tron address (should start with T, 34 chars)" };
    
    case 'ethereum':
    case 'polygon':
      if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
        return { valid: true };
      }
      return { valid: false, error: "Invalid EVM address (0x + 40 hex chars)" };
    
    case 'bitcoin':
      // Basic Bitcoin address validation
      if (/^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(trimmed)) {
        return { valid: true };
      }
      return { valid: false, error: "Invalid Bitcoin address format" };
    
    default:
      return { valid: true };
  }
}

export const AddressInputStep = ({ selectedChain, onSubmit, onBack }: AddressInputStepProps) => {
  const { toast } = useToast();
  const { addresses: savedAddresses, saveAddress, removeAddress, getAddressesForChain } = useSavedAddresses();
  
  const [address, setAddress] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");

  const chainInfo = getChainInfo(selectedChain);
  
  // Get saved addresses for current chain
  const chainSavedAddresses = useMemo(() => {
    return getAddressesForChain(selectedChain as SavedAddress['chain']);
  }, [selectedChain, getAddressesForChain]);

  const validateAddress = (addr: string): boolean => {
    const result = validateAddressForChain(addr, selectedChain);
    if (!result.valid) {
      setError(result.error || "Invalid address");
      return false;
    }
    setError(null);
    return true;
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setAddress(text.trim());
      setError(null);
      toast({
        title: "Address pasted",
        description: "Wallet address pasted from clipboard",
      });
    } catch {
      toast({
        title: "Paste failed",
        description: "Unable to access clipboard",
        variant: "destructive",
      });
    }
  };

  const handleScan = (scannedAddress: string) => {
    setAddress(scannedAddress);
    setShowScanner(false);
    setError(null);
    toast({
      title: "QR Code scanned",
      description: "Wallet address detected",
    });
  };

  const handleSubmit = () => {
    if (!address.trim()) {
      setError("Please enter a wallet address");
      return;
    }
    if (validateAddress(address.trim())) {
      onSubmit(address.trim());
    }
  };

  const handleSavedAddressSelect = (savedAddr: SavedAddress) => {
    setAddress(savedAddr.address);
    setError(null);
  };

  const handleSaveAddress = () => {
    if (!saveLabel.trim()) {
      toast({
        title: "Label required",
        description: "Please enter a label for this address",
        variant: "destructive",
      });
      return;
    }
    if (!validateAddress(address)) return;
    
    saveAddress(address.trim(), saveLabel.trim(), selectedChain as SavedAddress['chain']);
    setShowSaveDialog(false);
    setSaveLabel("");
    toast({
      title: "Address saved",
      description: `"${saveLabel}" has been saved`,
    });
  };

  const handleRemoveSavedAddress = (addr: string) => {
    removeAddress(addr, selectedChain as SavedAddress['chain']);
    toast({
      title: "Address removed",
      description: "Address has been removed from saved list",
    });
  };

  const isAddressSaved = useMemo(() => {
    return chainSavedAddresses.some(
      (a) => a.address.toLowerCase() === address.toLowerCase()
    );
  }, [chainSavedAddresses, address]);

  return (
    <div className="flex flex-col h-full px-6 pb-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Network indicator */}
      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <span>Sending on</span>
        <span className="font-medium text-foreground">{chainInfo.name}</span>
      </div>

      {/* Address Input */}
      <div className="mt-4">
        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
          Recipient Address
        </label>
        <div className="relative">
          <Input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setError(null);
            }}
            placeholder={`Enter ${chainInfo.name} address`}
            className={cn(
              "h-14 bg-card border-border font-mono text-sm pr-28",
              error && "border-destructive"
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <button
              onClick={handlePaste}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Paste"
            >
              <Clipboard className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowScanner(true)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              title="Scan QR"
            >
              <Scan className="w-5 h-5 text-primary" />
            </button>
            {address && !isAddressSaved && validateAddressForChain(address, selectedChain).valid && (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                title="Save address"
              >
                <BookmarkPlus className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Save Address Dialog */}
        {showSaveDialog && (
          <div className="mt-3 p-4 bg-card border border-border rounded-xl">
            <p className="text-sm font-medium mb-2">Save this address</p>
            <Input
              value={saveLabel}
              onChange={(e) => setSaveLabel(e.target.value)}
              placeholder="Enter a label (e.g., My Trading Wallet)"
              className="h-10 mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowSaveDialog(false);
                  setSaveLabel("");
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveAddress}>
                Save
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Saved Addresses */}
      {chainSavedAddresses.length > 0 && (
        <div className="mt-6 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Bookmark className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Saved Addresses</h3>
          </div>
          <div className="space-y-2">
            {chainSavedAddresses.map((item) => (
              <div
                key={`${item.chain}-${item.address}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <button
                  onClick={() => handleSavedAddressSelect(item)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.label}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {item.address.slice(0, 10)}...{item.address.slice(-8)}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => handleRemoveSavedAddress(item.address)}
                  className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state if no saved addresses */}
      {chainSavedAddresses.length === 0 && (
        <div className="mt-6 flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No saved addresses yet</p>
            <p className="text-xs mt-1">Save addresses for quick access</p>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <div className="pt-4">
        <Button
          onClick={handleSubmit}
          disabled={!address.trim()}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
        >
          Continue
        </Button>
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
      />
    </div>
  );
};
