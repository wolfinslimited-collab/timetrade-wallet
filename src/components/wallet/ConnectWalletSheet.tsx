import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, ExternalLink, Copy, Check, AlertCircle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

interface ConnectWalletSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectWalletSheet({ open, onOpenChange }: ConnectWalletSheetProps) {
  const [address, setAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const { connectWallet, isConnected, walletAddress, disconnectWallet } = useBlockchainContext();
  const { toast } = useToast();

  // Example testnet faucet address for testing
  const EXAMPLE_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f8dCd0";

  const handleConnect = () => {
    if (!address.trim()) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      });
      return;
    }

    if (!address.startsWith("0x") || address.length !== 42) {
      toast({
        title: "Invalid address format",
        description: "Ethereum addresses must start with 0x and be 42 characters",
        variant: "destructive",
      });
      return;
    }

    connectWallet(address);
    toast({
      title: "Wallet connected",
      description: "Your wallet has been connected to Sepolia testnet",
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

  const useExampleAddress = () => {
    setAddress(EXAMPLE_ADDRESS);
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
              ? "Your wallet is connected to Ethereum Sepolia testnet"
              : "Enter your Ethereum address to view your Sepolia testnet balance"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
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

              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-sm">
                <AlertCircle className="w-4 h-4 text-primary" />
                <span>Connected to Sepolia Testnet</span>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`https://sepolia.etherscan.io/address/${walletAddress}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Etherscan
                </Button>
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
              <div className="space-y-2">
                <Input
                  placeholder="0x..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Enter any Ethereum address to view its Sepolia testnet balance
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={useExampleAddress}
              >
                Use example address for testing
              </Button>

              <Button
                onClick={handleConnect}
                className="w-full"
                disabled={!address.trim()}
              >
                Connect Address
              </Button>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Need Sepolia ETH?{" "}
                  <a
                    href="https://sepoliafaucet.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Get free testnet ETH →
                  </a>
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
