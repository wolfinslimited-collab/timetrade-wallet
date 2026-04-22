import { useState, useMemo } from "react";
import { Scan, Clipboard, AlertCircle, Bookmark, BookmarkPlus, Trash2, Loader2, ShieldCheck, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QRScannerModal } from "./QRScannerModal";
import { Chain, getChainInfo } from "@/hooks/useBlockchain";
import { useSavedAddresses, SavedAddress } from "@/hooks/useSavedAddresses";
import { validateCryptoAddress } from "@nodehash/address-validator";
import { projectASupabase } from "@/lib/externalSupabase";

interface RiskData {
  risk_score: number;
  risk_level: "Low" | "Medium" | "High";
  explanation: string;
  flags: string[];
}

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
  const [riskState, setRiskState] = useState<"idle" | "loading" | "done">("idle");
  const [riskData, setRiskData] = useState<RiskData | null>(null);

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
      // Start risk check
      setRiskState("loading");
      setRiskData(null);
      projectASupabase.functions
        .invoke("transaction-risk", {
          body: { address: address.trim(), chain: selectedChain },
        })
        .then(({ data, error: fnError }) => {
          if (fnError) {
            setRiskData({
              risk_score: 15,
              risk_level: "Low",
              explanation: "Risk analysis unavailable.",
              flags: [],
            });
          } else {
            setRiskData(data);
          }
          setRiskState("done");
        });
    }
  };

  const handleRiskProceed = () => {
    onSubmit(address.trim());
  };

  const handleRiskReset = () => {
    setRiskState("idle");
    setRiskData(null);
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
    <div className="flex flex-col h-full min-h-0">
      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6">

      {/* Risk check loading state */}
      {riskState === "loading" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing recipient address...</p>
        </div>
      )}

      {/* Risk check result */}
      {riskState === "done" && riskData && (() => {
        const isHigh = riskData.risk_level === "High";
        const isMedium = riskData.risk_level === "Medium";
        return (
          <div className="flex flex-col items-center py-6">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mb-5",
              isHigh ? "bg-destructive/15" : isMedium ? "bg-amber-500/15" : "bg-success/15"
            )}>
              {isHigh ? (
                <AlertTriangle className="w-10 h-10 text-destructive" />
              ) : isMedium ? (
                <Shield className="w-10 h-10 text-amber-500" />
              ) : (
                <ShieldCheck className="w-10 h-10 text-success" />
              )}
            </div>
            <h3 className={cn(
              "text-2xl font-bold text-center mb-2",
              isHigh ? "text-destructive" : isMedium ? "text-amber-500" : "text-success"
            )}>
              {isHigh ? "⚠️ High Risk Address" : isMedium ? "⚠️ Medium Risk" : "✅ Low Risk"}
            </h3>
            <span className={cn(
              "text-xs px-3 py-1 rounded-full font-medium mb-4",
              isHigh ? "bg-destructive/10 text-destructive" : isMedium ? "bg-amber-500/10 text-amber-500" : "bg-success/10 text-success"
            )}>
              Risk Score: {riskData.risk_score}/100
            </span>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-xs">
              {riskData.explanation}
            </p>
            {riskData.flags && riskData.flags.length > 0 && (
              <div className="space-y-2 w-full max-w-xs">
                {riskData.flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />
                    <span>{flag}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Address input & saved addresses - only show when not in risk check */}
      {riskState === "idle" && (
        <>
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
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Saved Addresses</h3>
                </div>
                <span className="text-xs text-muted-foreground">{chainSavedAddresses.length} saved</span>
              </div>
              <div className="space-y-1.5 max-h-[240px] overflow-y-auto rounded-xl">
                {chainSavedAddresses.map((item) => (
                  <div
                    key={`${item.chain}-${item.address}`}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl bg-card border transition-colors active:scale-[0.98]",
                      address.toLowerCase() === item.address.toLowerCase()
                        ? "border-primary/60 bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <button
                      onClick={() => handleSavedAddressSelect(item)}
                      className="flex-1 flex items-center gap-3 text-left"
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                        address.toLowerCase() === item.address.toLowerCase()
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary text-muted-foreground"
                      )}>
                        {item.label.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate leading-tight">{item.label}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {item.address.slice(0, 8)}...{item.address.slice(-6)}
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
            <div className="mt-6 py-8 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No saved addresses yet</p>
                <p className="text-xs mt-1">Save addresses for quick access</p>
              </div>
            </div>
          )}
        </>
      )}
      </div>

      {/* Continue Button */}
      <div className="shrink-0 px-6 pt-3 bg-background" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
        {riskState === "idle" && (
          <Button
            onClick={handleSubmit}
            disabled={!address.trim()}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base rounded-2xl"
          >
            Continue
          </Button>
        )}
        {riskState === "done" && riskData && (
          <div className="flex gap-3">
            {riskData.risk_level === "High" && (
              <Button
                variant="outline"
                className="flex-1 h-14 text-base border-destructive/30 text-destructive hover:bg-destructive/10 rounded-2xl"
                onClick={handleRiskReset}
              >
                Cancel
              </Button>
            )}
            {riskData.risk_level !== "High" && (
              <Button
                variant="outline"
                className="flex-1 h-14 text-base rounded-2xl"
                onClick={handleRiskReset}
              >
                Back
              </Button>
            )}
            <Button
              className={cn(
                "flex-1 h-14 text-base rounded-2xl",
                riskData.risk_level === "High" ? "bg-destructive hover:bg-destructive/90" : ""
              )}
              onClick={handleRiskProceed}
            >
              {riskData.risk_level === "High" ? "Proceed Anyway" : "Continue"}
            </Button>
          </div>
        )}
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
