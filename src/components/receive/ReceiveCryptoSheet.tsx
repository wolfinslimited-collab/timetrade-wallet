import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Copy, Share2, ChevronDown, Check, QrCode, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QRCodeDisplay } from "./QRCodeDisplay";

interface TokenOption {
  symbol: string;
  name: string;
  network: string;
  icon: string;
  address: string;
}

const tokens: TokenOption[] = [
  { symbol: "ETH", name: "Ethereum", network: "Ethereum Mainnet", icon: "⟠", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f8c2B1" },
  { symbol: "BTC", name: "Bitcoin", network: "Bitcoin Network", icon: "₿", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" },
  { symbol: "USDT", name: "Tether", network: "Ethereum Mainnet", icon: "₮", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f8c2B1" },
  { symbol: "SOL", name: "Solana", network: "Solana Mainnet", icon: "◎", address: "7EcDhSYGxXyscszYEp35KHN8sj4CtPD9e5M2cAJr3Bwp" },
];

interface ReceiveCryptoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReceiveCryptoSheet = ({ open, onOpenChange }: ReceiveCryptoSheetProps) => {
  const { toast } = useToast();
  const [selectedToken, setSelectedToken] = useState(tokens[0]);
  const [showTokens, setShowTokens] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(selectedToken.address);
    setCopied(true);
    toast({
      title: "Address copied!",
      description: "Wallet address copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${selectedToken.symbol} Address`,
          text: `Send ${selectedToken.symbol} to: ${selectedToken.address}`,
        });
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  const formatAddress = (addr: string) => {
    if (addr.length > 20) {
      return `${addr.slice(0, 12)}...${addr.slice(-10)}`;
    }
    return addr;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-background border-border p-0">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="text-xl font-bold">Receive Crypto</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full px-6 pb-8">
          {/* Token Selector */}
          <div className="mt-4">
            <button
              onClick={() => setShowTokens(!showTokens)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedToken.icon}</span>
                <div className="text-left">
                  <p className="font-semibold">{selectedToken.symbol}</p>
                  <p className="text-xs text-muted-foreground">{selectedToken.network}</p>
                </div>
              </div>
              <ChevronDown className={cn("w-5 h-5 transition-transform", showTokens && "rotate-180")} />
            </button>

            {/* Token Dropdown */}
            {showTokens && (
              <div className="mt-2 bg-card border border-border rounded-xl p-2 space-y-1">
                {tokens.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => {
                      setSelectedToken(token);
                      setShowTokens(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                      token.symbol === selectedToken.symbol ? "bg-primary/10" : "hover:bg-secondary"
                    )}
                  >
                    <span className="text-xl">{token.icon}</span>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{token.symbol}</p>
                      <p className="text-xs text-muted-foreground">{token.network}</p>
                    </div>
                    {token.symbol === selectedToken.symbol && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <QRCodeDisplay 
              value={selectedToken.address} 
              size={200}
              tokenIcon={selectedToken.icon}
            />
            
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Scan QR code to receive {selectedToken.symbol}
            </p>
          </div>

          {/* Address Display */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                Your {selectedToken.symbol} Address
              </span>
              <QrCode className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="font-mono text-sm break-all leading-relaxed">
              {selectedToken.address}
            </p>
          </div>

          {/* Warning */}
          <div className="mt-4 flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Only send <span className="font-semibold text-foreground">{selectedToken.symbol}</span> to this address on the <span className="font-semibold text-foreground">{selectedToken.network}</span>. Sending other assets may result in permanent loss.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex-1 h-14 border-border bg-card hover:bg-secondary"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 mr-2 text-primary" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 mr-2" />
                  Copy Address
                </>
              )}
            </Button>
            <Button
              onClick={handleShare}
              className="flex-1 h-14 bg-primary hover:bg-primary/90"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
