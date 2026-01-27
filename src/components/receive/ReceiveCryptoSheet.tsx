import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Copy, Share2, ChevronDown, Check, QrCode, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { QRCodeDisplay } from "./QRCodeDisplay";

// Network logo components
const EthereumLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <path d="M16 0L6.5 16.5L16 22.5L25.5 16.5L16 0Z" opacity="0.6" />
    <path d="M6.5 16.5L16 32L25.5 16.5L16 22.5L6.5 16.5Z" />
  </svg>
);

const PolygonLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <path d="M21.6 13.4c-.6-.3-1.3-.3-1.8 0l-4.2 2.4-2.8 1.6-4.2 2.4c-.6.3-1.3.3-1.8 0l-3.3-1.9c-.6-.3-.9-.9-.9-1.5v-3.7c0-.6.3-1.2.9-1.5l3.2-1.8c.6-.3 1.3-.3 1.8 0l3.2 1.8c.6.3.9.9.9 1.5v2.4l2.8-1.6v-2.4c0-.6-.3-1.2-.9-1.5l-6-3.4c-.6-.3-1.3-.3-1.8 0l-6.1 3.5c-.6.3-.9.9-.9 1.5v6.9c0 .6.3 1.2.9 1.5l6 3.4c.6.3 1.3.3 1.8 0l4.2-2.4 2.8-1.6 4.2-2.4c.6-.3 1.3-.3 1.8 0l3.2 1.8c.6.3.9.9.9 1.5v3.7c0 .6-.3 1.2-.9 1.5l-3.2 1.9c-.6.3-1.3.3-1.8 0l-3.2-1.8c-.6-.3-.9-.9-.9-1.5v-2.4l-2.8 1.6v2.4c0 .6.3 1.2.9 1.5l6 3.4c.6.3 1.3.3 1.8 0l6-3.4c.6-.3.9-.9.9-1.5v-6.9c0-.6-.3-1.2-.9-1.5l-6.1-3.4z" />
  </svg>
);

const SolanaLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <path d="M7.5 21.5c.2-.2.4-.3.7-.3h18.4c.4 0 .6.5.3.8l-3.7 3.7c-.2.2-.4.3-.7.3H4.1c-.4 0-.6-.5-.3-.8l3.7-3.7z" />
    <path d="M7.5 6.3c.2-.2.4-.3.7-.3h18.4c.4 0 .6.5.3.8l-3.7 3.7c-.2.2-.4.3-.7.3H4.1c-.4 0-.6-.5-.3-.8l3.7-3.7z" />
    <path d="M22.5 13.8c-.2-.2-.4-.3-.7-.3H3.4c-.4 0-.6.5-.3.8l3.7 3.7c.2.2.4.3.7.3h18.4c.4 0 .6-.5.3-.8l-3.7-3.7z" />
  </svg>
);

const TronLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <path d="M16 2L3 9v14l13 7 13-7V9L16 2zm0 3.5l9.5 5.2v10.6L16 26.5l-9.5-5.2V10.7L16 5.5z" />
    <path d="M16 8v16l7-4V12l-7-4z" opacity="0.6" />
  </svg>
);

const BitcoinLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <path d="M23.6 14.2c.4-2.5-1.5-3.9-4.2-4.8l.9-3.5-2.1-.5-.8 3.4c-.6-.1-1.1-.3-1.7-.4l.8-3.4-2.1-.5-.9 3.5c-.5-.1-.9-.2-1.4-.3l-2.9-.7-.6 2.3s1.5.4 1.5.4c.9.2 1 .8 1 1.2l-1 4.1c.1 0 .1 0 .2.1h-.2l-1.4 5.8c-.1.3-.4.7-.9.6 0 0-1.5-.4-1.5-.4l-1 2.5 2.7.7c.5.1 1 .3 1.5.4l-.9 3.6 2.1.5.9-3.5c.6.2 1.1.3 1.7.5l-.9 3.5 2.1.5.9-3.6c3.6.7 6.3.4 7.4-2.8.9-2.6-.1-4.1-1.9-5.1 1.4-.3 2.4-1.2 2.7-3.1zm-4.8 6.7c-.6 2.6-4.9 1.2-6.3.8l1.1-4.5c1.4.3 5.8 1 5.2 3.7zm.7-6.7c-.6 2.3-4.1 1.1-5.3.8l1-4.1c1.2.3 4.9.9 4.3 3.3z" />
  </svg>
);

const USDTLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <path d="M16 0c8.837 0 16 7.163 16 16s-7.163 16-16 16S0 24.837 0 16 7.163 0 16 0zm0 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2z" opacity="0.3" />
    <path d="M17.8 17.4v-.1c-.1 0-.6 0-1.8.1-1 0-1.5 0-1.7-.1v.1c-3.3-.2-5.8-.7-5.8-1.4 0-.6 2.5-1.2 5.8-1.4v2.2c.2 0 .7.1 1.7.1 1.2 0 1.7 0 1.8-.1V14.6c3.3.2 5.7.8 5.7 1.4s-2.4 1.2-5.7 1.4zm0-3V12h4.7V9H9.5v3h4.7v2.4c-3.7.2-6.5.9-6.5 1.8s2.8 1.6 6.5 1.8v6.5h3.6V18c3.7-.2 6.5-.9 6.5-1.8s-2.8-1.6-6.5-1.8z" />
  </svg>
);

interface TokenOption {
  symbol: string;
  name: string;
  network: string;
  networkId: string;
  color: string;
  Logo: React.FC<{ className?: string }>;
  addressKey: string;
}

const tokens: TokenOption[] = [
  { 
    symbol: "ETH", 
    name: "Ethereum", 
    network: "Ethereum Mainnet", 
    networkId: "ethereum",
    color: "#627EEA",
    Logo: EthereumLogo,
    addressKey: "timetrade_wallet_address_evm"
  },
  { 
    symbol: "POL", 
    name: "Polygon", 
    network: "Polygon Mainnet", 
    networkId: "polygon",
    color: "#8247E5",
    Logo: PolygonLogo,
    addressKey: "timetrade_wallet_address_evm"
  },
  { 
    symbol: "SOL", 
    name: "Solana", 
    network: "Solana Mainnet", 
    networkId: "solana",
    color: "#14F195",
    Logo: SolanaLogo,
    addressKey: "timetrade_wallet_address_solana"
  },
  { 
    symbol: "TRX", 
    name: "Tron", 
    network: "Tron Mainnet", 
    networkId: "tron",
    color: "#FF0013",
    Logo: TronLogo,
    addressKey: "timetrade_wallet_address_tron"
  },
  { 
    symbol: "BTC", 
    name: "Bitcoin", 
    network: "Bitcoin Network", 
    networkId: "bitcoin",
    color: "#F7931A",
    Logo: BitcoinLogo,
    addressKey: "timetrade_wallet_address_btc"
  },
  { 
    symbol: "USDT", 
    name: "Tether", 
    network: "Ethereum Mainnet", 
    networkId: "ethereum",
    color: "#26A17B",
    Logo: USDTLogo,
    addressKey: "timetrade_wallet_address_evm"
  },
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
  const [walletAddresses, setWalletAddresses] = useState<Record<string, string>>({});

  // Load wallet addresses from localStorage
  useEffect(() => {
    const addresses: Record<string, string> = {};
    const keys = [
      "timetrade_wallet_address_evm",
      "timetrade_wallet_address_solana",
      "timetrade_wallet_address_tron",
      "timetrade_wallet_address_btc"
    ];
    
    keys.forEach(key => {
      const addr = localStorage.getItem(key);
      if (addr) {
        addresses[key] = addr;
      }
    });
    
    setWalletAddresses(addresses);
  }, [open]);

  const currentAddress = walletAddresses[selectedToken.addressKey] || "";

  const handleCopy = async () => {
    if (!currentAddress) return;
    await navigator.clipboard.writeText(currentAddress);
    setCopied(true);
    toast({
      title: "Address copied!",
      description: "Wallet address copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!currentAddress) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${selectedToken.symbol} Address`,
          text: `Send ${selectedToken.symbol} to: ${currentAddress}`,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  const TokenLogo = selectedToken.Logo;

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
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary"
                  style={{ color: selectedToken.color }}
                >
                  <TokenLogo className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">{selectedToken.symbol}</p>
                  <p className="text-xs text-muted-foreground">{selectedToken.network}</p>
                </div>
              </div>
              <ChevronDown className={cn("w-5 h-5 transition-transform", showTokens && "rotate-180")} />
            </button>

            {/* Token Dropdown */}
            {showTokens && (
              <div className="mt-2 bg-card border border-border rounded-xl p-2 space-y-1 max-h-48 overflow-y-auto">
                {tokens.map((token) => {
                  const Logo = token.Logo;
                  return (
                    <button
                      key={`${token.symbol}-${token.networkId}`}
                      onClick={() => {
                        setSelectedToken(token);
                        setShowTokens(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                        token.symbol === selectedToken.symbol && token.networkId === selectedToken.networkId
                          ? "bg-primary/10" 
                          : "hover:bg-secondary"
                      )}
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary"
                        style={{ color: token.color }}
                      >
                        <Logo className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{token.symbol}</p>
                        <p className="text-xs text-muted-foreground">{token.network}</p>
                      </div>
                      {token.symbol === selectedToken.symbol && token.networkId === selectedToken.networkId && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            {currentAddress ? (
              <>
                <QRCodeDisplay 
                  value={currentAddress} 
                  size={200}
                  tokenLogo={
                    <div style={{ color: selectedToken.color }}>
                      <TokenLogo className="w-full h-full" />
                    </div>
                  }
                />
                
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Scan QR code to receive {selectedToken.symbol}
                </p>
              </>
            ) : (
              <div className="text-center py-8">
                <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No wallet address found</p>
                <p className="text-xs text-muted-foreground mt-1">Please import your wallet first</p>
              </div>
            )}
          </div>

          {/* Address Display */}
          {currentAddress && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Your {selectedToken.symbol} Address
                </span>
                <QrCode className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="font-mono text-sm break-all leading-relaxed">
                {currentAddress}
              </p>
            </div>
          )}

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
              disabled={!currentAddress}
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
              disabled={!currentAddress}
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
