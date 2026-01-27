import { useState } from "react";
import { Scan, Clipboard, User, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QRScannerModal } from "./QRScannerModal";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { isValidSolanaAddress } from "@/hooks/useSolanaTransactionSigning";

interface AddressInputStepProps {
  onSubmit: (address: string) => void;
  onClose: () => void;
}

// Mock recent addresses
const recentAddresses = [
  { address: "0x1234...5678", name: "Alex's Wallet", time: "2h ago" },
  { address: "0xabcd...efgh", name: "Trading Account", time: "1d ago" },
  { address: "0x9876...5432", name: null, time: "3d ago" },
];

// Validate address based on chain
function validateAddressForChain(addr: string, chain: string): { valid: boolean; error?: string } {
  const trimmed = addr.trim();
  
  switch (chain) {
    case 'solana':
      if (isValidSolanaAddress(trimmed)) {
        return { valid: true };
      }
      return { valid: false, error: "Invalid Solana address format" };
    
    case 'tron':
      // Tron addresses start with T and are 34 characters
      if (/^T[a-zA-Z0-9]{33}$/.test(trimmed)) {
        return { valid: true };
      }
      return { valid: false, error: "Invalid Tron address format (should start with T)" };
    
    case 'ethereum':
    case 'polygon':
    default:
      // EVM addresses: 0x + 40 hex characters
      if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
        return { valid: true };
      }
      return { valid: false, error: "Invalid wallet address format" };
  }
}

export const AddressInputStep = ({ onSubmit, onClose }: AddressInputStepProps) => {
  const { toast } = useToast();
  const { selectedChain } = useBlockchainContext();
  const [address, setAddress] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleRecentSelect = (addr: string) => {
    // Expand mock address to full format for demo
    const fullAddress = addr.replace("...", "000000000000000000000000");
    setAddress(fullAddress);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full px-6 pb-8">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

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
            placeholder="Enter wallet address or ENS name"
            className={cn(
              "h-14 bg-card border-border font-mono text-sm pr-24",
              error && "border-destructive"
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <button
              onClick={handlePaste}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <Clipboard className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowScanner(true)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <Scan className="w-5 h-5 text-primary" />
            </button>
          </div>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Recent Addresses */}
      <div className="mt-8 flex-1">
        <h3 className="text-sm font-medium mb-3">Recent</h3>
        <div className="space-y-2">
          {recentAddresses.map((item, index) => (
            <button
              key={index}
              onClick={() => handleRecentSelect(item.address)}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {item.name || item.address}
                </p>
                {item.name && (
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {item.address}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{item.time}</span>
            </button>
          ))}
        </div>
      </div>

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
