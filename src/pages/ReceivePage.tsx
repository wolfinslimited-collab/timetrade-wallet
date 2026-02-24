import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Share2, Check, QrCode, AlertCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useWalletAddresses } from "@/hooks/useWalletAddresses";
import { QRCodeDisplay } from "@/components/receive/QRCodeDisplay";
import { NETWORKS, getNetworkLogoUrl, NETWORK_MAP } from "@/config/networks";
import type { Chain } from "@/config/networks";

const getCryptoLogoUrl = (symbol: string): string =>
  `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;

const ReceivePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedNetworkId, setSelectedNetworkId] = useState<Chain | null>(null);
  const [copied, setCopied] = useState(false);

  const { addresses: walletAddresses } = useWalletAddresses(true);

  const selectedNetwork = selectedNetworkId ? NETWORK_MAP[selectedNetworkId] : null;
  const currentAddress = selectedNetwork
    ? walletAddresses[selectedNetwork.addressKey] || ""
    : "";
  const tokenLogoUrl = selectedNetwork
    ? getCryptoLogoUrl(selectedNetwork.logoSymbol)
    : "";

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
        await navigator.share({
          title: `My ${selectedNetwork!.symbol} Address`,
          text: `Send ${selectedNetwork!.symbol} to: ${currentAddress}`,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleBack = () => {
    if (selectedNetworkId) {
      setSelectedNetworkId(null);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 relative flex items-center justify-center">
        <button
          type="button"
          onClick={handleBack}
          className="absolute left-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-center">Receive Crypto</h1>
      </div>

      <div className="flex flex-col flex-1 px-6 pb-8 overflow-y-auto">
        {/* Network Selection (inline list) */}
        {!selectedNetworkId && (
          <div className="mt-4">
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
              Select Network
            </label>
            <div className="space-y-2">
              {NETWORKS.map((net) => (
                <button
                  key={net.id}
                  onClick={() => setSelectedNetworkId(net.id)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary">
                    <img
                      src={getNetworkLogoUrl(net.id)}
                      alt={net.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{net.name}</p>
                    <p className="text-xs text-muted-foreground">{net.symbol}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* QR Code & Address (after network selected) */}
        {selectedNetworkId && selectedNetwork && (
          <>
            {/* QR Code */}
            <div className="flex-1 flex flex-col items-center justify-center py-6">
              {currentAddress ? (
                <>
                  <QRCodeDisplay
                    value={currentAddress}
                    size={200}
                    tokenLogo={<img src={tokenLogoUrl} alt={selectedNetwork.symbol} className="w-full h-full object-contain" />}
                  />
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Scan QR code to receive {selectedNetwork.symbol} on {selectedNetwork.name}
                  </p>
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
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Your {selectedNetwork.name} Address
                  </span>
                  <QrCode className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="font-mono text-sm break-all leading-relaxed">{currentAddress}</p>
              </div>
            )}

            {/* Warning */}
            <div className="mt-4 flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Only send <span className="font-semibold text-foreground">{selectedNetwork.symbol}</span> to this address on{" "}
                <span className="font-semibold text-foreground">{selectedNetwork.name}</span>. Sending other assets may result in permanent loss.
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
          </>
        )}
      </div>
    </div>
  );
};

export default ReceivePage;
