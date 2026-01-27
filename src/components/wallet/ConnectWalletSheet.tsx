import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, ExternalLink, Copy, Check, AlertCircle, Link2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { useWalletConnect } from "@/contexts/WalletConnectContext";
import { useToast } from "@/hooks/use-toast";

interface ConnectWalletSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectWalletSheet({ open, onOpenChange }: ConnectWalletSheetProps) {
  const [address, setAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const { 
    connectWallet, 
    isConnected, 
    walletAddress, 
    disconnectWallet, 
    balance,
  } = useBlockchainContext();
  const {
    isWalletConnectConnected,
    wcAddress,
    openWalletConnectModal,
  } = useWalletConnect();
  const { toast } = useToast();

  const handleConnect = () => {
    if (!address.trim()) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid wallet address",
        variant: "destructive",
      });
      return;
    }

    // Basic validation for EVM address
    if (address.startsWith("0x")) {
      if (address.length !== 42) {
        toast({
          title: "Invalid address format",
          description: "EVM addresses must be 42 characters",
          variant: "destructive",
        });
        return;
      }
    }

    connectWallet(address);
    toast({
      title: "Wallet connected",
      description: "Connected to multi-chain wallet",
    });
    onOpenChange(false);
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setAddress("");
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExplorerUrl = () => {
    if (!walletAddress) return '';
    return balance?.explorerUrl 
      ? `${balance.explorerUrl}/address/${walletAddress}`
      : '';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {isConnected ? "Wallet Connected" : "Connect Wallet"}
          </SheetTitle>
          <SheetDescription>
            {isConnected
              ? "Connected to all supported networks (Ethereum, Polygon, Solana, Tron)"
              : "Your wallet will be connected to all supported networks automatically"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Multi-chain badge */}
          <div className="flex flex-wrap gap-2">
            {[
              { name: 'Ethereum', icon: '⟠', color: '#627EEA' },
              { name: 'Polygon', icon: '○', color: '#8247E5' },
              { name: 'Solana', icon: '◎', color: '#00D18C' },
              { name: 'Tron', icon: '◆', color: '#FF0013' },
            ].map((chain) => (
              <div 
                key={chain.name}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${chain.color}15`,
                  color: chain.color,
                }}
              >
                <span>{chain.icon}</span>
                <span>{chain.name}</span>
              </div>
            ))}
          </div>

          {isConnected ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-secondary/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground mb-2">Connected Address</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono truncate">
                    {walletAddress}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyAddress(walletAddress!)}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-primary/10 text-primary">
                <AlertCircle className="w-4 h-4" />
                <span>Connected to all networks</span>
              </div>

              <div className="flex gap-3">
                {getExplorerUrl() && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(getExplorerUrl(), '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Explorer
                  </Button>
                )}
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* WalletConnect Option */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    openWalletConnectModal();
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">Connect with WalletConnect</div>
                    <div className="text-xs text-muted-foreground">
                      MetaMask, Trust Wallet, Rainbow, and more
                    </div>
                  </div>
                </button>

                {isWalletConnectConnected && wcAddress && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-500">
                      WalletConnect active: {wcAddress.slice(0, 8)}...{wcAddress.slice(-6)}
                    </span>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or enter address manually
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="0x... (EVM address)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your EVM address to view balances across all networks
                </p>
              </div>

              <Button
                onClick={handleConnect}
                className="w-full"
                disabled={!address.trim()}
              >
                Connect Wallet
              </Button>
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}