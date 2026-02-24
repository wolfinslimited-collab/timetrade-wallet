import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Share2, ChevronDown, Check, QrCode, AlertCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWalletAddresses } from "@/hooks/useWalletAddresses";
import { QRCodeDisplay } from "@/components/receive/QRCodeDisplay";
import { NETWORKS, getNetworkLogoUrl } from "@/config/networks";
import type { NetworkConfig, AddressKey } from "@/config/networks";

// Derive token list from config
const tokens = NETWORKS.map((n) => ({
  symbol: n.symbol,
  name: n.name,
  network: `${n.name} Mainnet`,
  networkId: n.id,
  addressKey: n.addressKey,
  logoSymbol: n.logoSymbol,
}));

const getCryptoLogoUrl = (symbol: string): string =>
  `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;

const ReceivePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showTokens, setShowTokens] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedToken, setSelectedToken] = useState(tokens[0]);

  const { addresses: walletAddresses } = useWalletAddresses(true);
  const currentAddress = walletAddresses[selectedToken.addressKey] || "";

  const tokenLogoUrl = getCryptoLogoUrl(selectedToken.symbol);

  const handleCopy = async () => {
    if (!currentAddress) return;
    await navigator.clipboard.writeText(currentAddress);
    setCopied(true);
    toast({ title: "Address copied!", description: "Wallet address copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!currentAddress) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `My ${selectedToken.symbol} Address`, text: `Send ${selectedToken.symbol} to: ${currentAddress}` });
      } catch (err) {
        if ((err as Error).name !== "AbortError") handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 relative flex items-center justify-center">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-center">Receive Crypto</h1>
      </div>

      <div className="flex flex-col flex-1 px-6 pb-8">
        {/* Token Selector */}
        <div className="mt-4 relative shrink-0">
          <button
            onClick={() => setShowTokens(!showTokens)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary">
                <img src={tokenLogoUrl} alt={selectedToken.symbol} className="w-full h-full object-contain p-1" />
              </div>
              <div className="text-left">
                <p className="font-semibold">{selectedToken.symbol}</p>
                <p className="text-xs text-muted-foreground">{selectedToken.network}</p>
              </div>
            </div>
            <ChevronDown className={cn("w-5 h-5 transition-transform", showTokens && "rotate-180")} />
          </button>

          {showTokens && (
            <div className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-xl p-2 space-y-1 max-h-72 overflow-y-auto z-50 shadow-lg">
              {tokens.map((token) => (
                <button
                  key={`${token.symbol}-${token.networkId}`}
                  onClick={() => { setSelectedToken(token); setShowTokens(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                    token.symbol === selectedToken.symbol && token.networkId === selectedToken.networkId ? "bg-primary/10" : "hover:bg-secondary"
                  )}
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
                    <img src={getCryptoLogoUrl(token.symbol)} alt={token.symbol} className="w-full h-full object-contain p-0.5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{token.symbol}</p>
                    <p className="text-xs text-muted-foreground">{token.network}</p>
                  </div>
                  {token.symbol === selectedToken.symbol && token.networkId === selectedToken.networkId && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
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
                tokenLogo={<img src={tokenLogoUrl} alt={selectedToken.symbol} className="w-full h-full object-contain" />}
              />
              <p className="text-sm text-muted-foreground mt-4 text-center">Scan QR code to receive {selectedToken.symbol}</p>
            </>
          ) : (
            <div className="text-center py-8">
              <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading wallet address...</p>
            </div>
          )}
        </div>

        {/* Address Display */}
        {currentAddress && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Your {selectedToken.symbol} Address</span>
              <QrCode className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="font-mono text-sm break-all leading-relaxed">{currentAddress}</p>
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
          <Button onClick={handleCopy} variant="outline" disabled={!currentAddress} className="flex-1 h-14 border-border bg-card hover:bg-secondary">
            {copied ? (<><Check className="w-5 h-5 mr-2 text-primary" />Copied!</>) : (<><Copy className="w-5 h-5 mr-2" />Copy Address</>)}
          </Button>
          <Button onClick={handleShare} disabled={!currentAddress} className="flex-1 h-14 bg-primary hover:bg-primary/90">
            <Share2 className="w-5 h-5 mr-2" />Share
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReceivePage;
