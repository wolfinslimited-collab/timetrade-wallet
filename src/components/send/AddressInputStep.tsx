import { useState, useMemo } from "react";
import { Scan, Clipboard, User, AlertCircle, Bookmark, BookmarkPlus, Trash2, ShieldCheck, Shield, AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QRScannerModal } from "./QRScannerModal";
import { Chain, getChainInfo } from "@/hooks/useBlockchain";
import { useSavedAddresses, SavedAddress } from "@/hooks/useSavedAddresses";
import { validateCryptoAddress } from "@nodehash/address-validator";
import { projectASupabase } from "@/lib/externalSupabase";

interface AddressInputStepProps {
  selectedChain: Chain;
  onSubmit: (address: string) => void;
  initialAddress?: string;
}

// Map our chain names to @nodehash/address-validator chain names
function getValidatorChain(chain: Chain): string {
  switch (chain) {
    case 'solana': return 'solana';
    case 'tron': return 'tron';
    case 'ethereum': return 'ethereum';
    case 'polygon': return 'polygon';
    case 'bitcoin': return 'bitcoin';
    default: return chain;
  }
}

// Validate address based on chain using @nodehash/address-validator
function validateAddressForChain(addr: string, chain: Chain): { valid: boolean; error?: string } {
  const trimmed = addr.trim();
  if (!trimmed) return { valid: false, error: "Please enter a wallet address" };
  
  const validatorChain = getValidatorChain(chain);
  const res = validateCryptoAddress(trimmed, validatorChain);
  
  if (res.valid) {
    return { valid: true };
  }
  return { valid: false, error: res.error || `Invalid ${getChainInfo(chain).name} address` };
}

export const AddressInputStep = ({ selectedChain, onSubmit, initialAddress }: AddressInputStepProps) => {
  const { toast } = useToast();
  const { addresses: savedAddresses, saveAddress, removeAddress, getAddressesForChain } = useSavedAddresses();
  
  const [address, setAddress] = useState(initialAddress || "");
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [showRiskCheck, setShowRiskCheck] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskData, setRiskData] = useState<{ risk_score: number; risk_level: string; explanation: string; flags: string[] } | null>(null);

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

  const isAddressValid = useMemo(() => {
    if (!address.trim()) return false;
    return validateAddressForChain(address.trim(), selectedChain).valid;
  }, [address, selectedChain]);

  const handleSecurityCheck = async () => {
    if (!isAddressValid) return;
    setShowRiskCheck(true);
    setRiskLoading(true);
    setRiskData(null);
    try {
      const { data, error: fnError } = await projectASupabase.functions.invoke("transaction-risk", {
        body: { address: address.trim(), chain: selectedChain },
      });
      if (fnError) {
        setRiskData({ risk_score: 0, risk_level: "Low", explanation: "Risk analysis unavailable.", flags: [] });
      } else {
        setRiskData(data);
      }
    } catch {
      setRiskData({ risk_score: 0, risk_level: "Low", explanation: "Risk analysis unavailable.", flags: [] });
    }
    setRiskLoading(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto overflow-x-hidden px-6 pb-8">
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

      {/* Security Check Button */}
      {isAddressValid && !showRiskCheck && (
        <button
          onClick={handleSecurityCheck}
          className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors w-full"
        >
          <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-success" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">Security Check</p>
            <p className="text-xs text-muted-foreground">Analyze address for risks</p>
          </div>
        </button>
      )}

      {/* Inline Risk Result */}
      {showRiskCheck && (
        <div className="mt-3 p-4 rounded-xl bg-card border border-border relative">
          <button
            onClick={() => { setShowRiskCheck(false); setRiskData(null); }}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-secondary"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          {riskLoading ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing address...</p>
            </div>
          ) : riskData ? (
            <div className="flex flex-col items-center gap-3">
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center",
                riskData.risk_level === "High" ? "bg-destructive/15" :
                riskData.risk_level === "Medium" ? "bg-amber-500/15" : "bg-success/15"
              )}>
                {riskData.risk_level === "High" ? (
                  <AlertTriangle className="w-7 h-7 text-destructive" />
                ) : riskData.risk_level === "Medium" ? (
                  <Shield className="w-7 h-7 text-amber-500" />
                ) : (
                  <ShieldCheck className="w-7 h-7 text-success" />
                )}
              </div>
              <p className={cn(
                "text-lg font-bold",
                riskData.risk_level === "High" ? "text-destructive" :
                riskData.risk_level === "Medium" ? "text-amber-500" : "text-success"
              )}>
                {riskData.risk_level === "High" ? "⚠️ High Risk" :
                 riskData.risk_level === "Medium" ? "⚠️ Medium Risk" : "✅ Low Risk"}
              </p>
              <span className={cn(
                "text-xs px-3 py-1 rounded-full font-medium",
                riskData.risk_level === "High" ? "bg-destructive/10 text-destructive" :
                riskData.risk_level === "Medium" ? "bg-amber-500/10 text-amber-500" : "bg-success/10 text-success"
              )}>
                Risk Score: {riskData.risk_score}/100
              </span>
              <p className="text-xs text-muted-foreground text-center">{riskData.explanation}</p>
              {riskData.flags?.length > 0 && (
                <div className="space-y-1 w-full">
                  {riskData.flags.map((flag, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

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
      <div className="pt-4" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}>
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
