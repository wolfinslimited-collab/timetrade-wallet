import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, ExternalLink, Copy, Check, AlertCircle, ChevronRight } from "lucide-react";
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
import { SUPPORTED_CHAINS, getChainInfo } from "@/hooks/useBlockchain";
import { ChainSelectorSheet } from "./ChainSelectorSheet";

interface ConnectWalletSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectWalletSheet({ open, onOpenChange }: ConnectWalletSheetProps) {
  const [address, setAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [showChainSelector, setShowChainSelector] = useState(false);
  const { 
    connectWallet, 
    isConnected, 
    walletAddress, 
    disconnectWallet, 
    selectedChain,
    balance,
  } = useBlockchainContext();
  const { toast } = useToast();

  const chainInfo = getChainInfo(selectedChain);

  // Example testnet addresses for different chains
  const EXAMPLE_ADDRESSES: Record<string, string> = {
    ethereum: "0x742d35Cc6634C0532925a3b844Bc9e7595f8dCd0",
    polygon: "0x742d35Cc6634C0532925a3b844Bc9e7595f8dCd0",
    bitcoin: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
    solana: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV",
  };

  const handleConnect = () => {
    if (!address.trim()) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid wallet address",
        variant: "destructive",
      });
      return;
    }

    // Basic validation based on chain
    if (selectedChain === 'ethereum' || selectedChain === 'polygon') {
      if (!address.startsWith("0x") || address.length !== 42) {
        toast({
          title: "Invalid address format",
          description: "Ethereum/Polygon addresses must start with 0x and be 42 characters",
          variant: "destructive",
        });
        return;
      }
    } else if (selectedChain === 'bitcoin') {
      if (address.length < 26 || address.length > 62) {
        toast({
          title: "Invalid address format",
          description: "Please enter a valid Bitcoin address",
          variant: "destructive",
        });
        return;
      }
    } else if (selectedChain === 'solana') {
      if (address.length < 32 || address.length > 44) {
        toast({
          title: "Invalid address format",
          description: "Please enter a valid Solana address",
          variant: "destructive",
        });
        return;
      }
    }

    connectWallet(address);
    toast({
      title: "Wallet connected",
      description: `Connected to ${chainInfo.name} ${chainInfo.testnetName}`,
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
    setAddress(EXAMPLE_ADDRESSES[selectedChain] || EXAMPLE_ADDRESSES.ethereum);
  };

  const getExplorerUrl = () => {
    if (!walletAddress) return '';
    return balance?.explorerUrl 
      ? `${balance.explorerUrl}/address/${walletAddress}`
      : '';
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              {isConnected ? "Wallet Connected" : "Connect Wallet"}
            </SheetTitle>
            <SheetDescription>
              {isConnected
                ? `Connected to ${chainInfo.name} ${chainInfo.testnetName}`
                : `Enter your ${chainInfo.name} address to view your ${chainInfo.testnetName} balance`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Chain Selector */}
            <button
              onClick={() => setShowChainSelector(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ backgroundColor: `${chainInfo.color}20` }}
              >
                {chainInfo.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">{chainInfo.name}</div>
                <div className="text-xs text-muted-foreground">
                  {chainInfo.testnetName} Testnet
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

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

                <div 
                  className="flex items-center gap-2 p-3 rounded-lg text-sm"
                  style={{ 
                    backgroundColor: `${chainInfo.color}10`,
                    color: chainInfo.color,
                  }}
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Connected to {chainInfo.testnetName} Testnet</span>
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
                <div className="space-y-2">
                  <Input
                    placeholder={selectedChain === 'ethereum' || selectedChain === 'polygon' ? '0x...' : 'Enter address...'}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter any {chainInfo.name} address to view its {chainInfo.testnetName} balance
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
                  style={{ 
                    backgroundColor: chainInfo.color,
                  }}
                >
                  Connect to {chainInfo.name}
                </Button>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    Need testnet tokens?{" "}
                    {selectedChain === 'ethereum' && (
                      <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Get Sepolia ETH →
                      </a>
                    )}
                    {selectedChain === 'polygon' && (
                      <a href="https://faucet.polygon.technology/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Get Amoy MATIC →
                      </a>
                    )}
                    {selectedChain === 'bitcoin' && (
                      <a href="https://coinfaucet.eu/en/btc-testnet/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Get Testnet BTC →
                      </a>
                    )}
                    {selectedChain === 'solana' && (
                      <a href="https://solfaucet.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Get Devnet SOL →
                      </a>
                    )}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ChainSelectorSheet 
        open={showChainSelector} 
        onOpenChange={setShowChainSelector} 
      />
    </>
  );
}
