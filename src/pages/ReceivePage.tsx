import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Share2, Check, QrCode, AlertCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWalletAddresses } from "@/hooks/useWalletAddresses";
import { QRCodeDisplay } from "@/components/receive/QRCodeDisplay";
import { NETWORKS, getNetworkLogoUrl, NETWORK_MAP } from "@/config/networks";
import { motion, AnimatePresence } from "framer-motion";
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

      <div className="flex flex-col flex-1 px-5 pb-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ── Network Grid (same as Send) ── */}
          {!selectedNetworkId && (
            <motion.div
              key="networks"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-3"
            >
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
                Choose Network
              </p>
              <div className="grid grid-cols-3 gap-3">
                {NETWORKS.map((net, i) => (
                  <motion.button
                    key={net.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedNetworkId(net.id)}
                    className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-card/60 border border-border/60 hover:border-primary/40 hover:bg-card transition-all active:scale-95"
                  >
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center"
                      style={{ background: `${net.color}18` }}
                    >
                      <img
                        src={getNetworkLogoUrl(net.id)}
                        alt={net.name}
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold leading-tight">{net.symbol}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight truncate max-w-[80px]">
                        {net.name}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── QR Code & Address ── */}
          {selectedNetworkId && selectedNetwork && (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReceivePage;
