import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, Copy, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { cn } from "@/lib/utils";

interface ConnectWalletSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Chain configurations
const CHAINS = [
  { id: 'ethereum', name: 'Ethereum', icon: '⟠', addressKey: 'timetrade_wallet_address_evm' },
  { id: 'polygon', name: 'Polygon', icon: '⬡', addressKey: 'timetrade_wallet_address_evm' },
  { id: 'solana', name: 'Solana', icon: '◎', addressKey: 'timetrade_wallet_address_solana' },
  { id: 'tron', name: 'Tron', icon: '◈', addressKey: 'timetrade_wallet_address_tron' },
];

export function ConnectWalletSheet({ open, onOpenChange }: ConnectWalletSheetProps) {
  const [copiedChain, setCopiedChain] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Record<string, string | null>>({});
  const { isConnected } = useBlockchainContext();

  // Load addresses from localStorage
  useEffect(() => {
    if (open) {
      const newAddresses: Record<string, string | null> = {};
      CHAINS.forEach(chain => {
        newAddresses[chain.id] = localStorage.getItem(chain.addressKey);
      });
      setAddresses(newAddresses);
    }
  }, [open]);

  const copyAddress = async (chainId: string, addr: string) => {
    await navigator.clipboard.writeText(addr);
    setCopiedChain(chainId);
    setTimeout(() => setCopiedChain(null), 2000);
  };


  if (!isConnected) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Wallet Addresses
          </SheetTitle>
          <SheetDescription>
            Your multi-chain wallet addresses for all supported networks
          </SheetDescription>
        </SheetHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-3"
        >
          {CHAINS.map((chain) => {
            const addr = addresses[chain.id];
            const isCopied = copiedChain === chain.id;
            
            // Skip chains without addresses
            if (!addr) return null;

            return (
              <div
                key={chain.id}
                className="bg-card border border-border rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{chain.icon}</span>
                  <span className="font-medium">{chain.name}</span>
                </div>
                
                <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-3">
                  <code className="flex-1 text-xs font-mono text-muted-foreground truncate">
                    {addr}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copyAddress(chain.id, addr)}
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Show message if no addresses found */}
          {Object.values(addresses).every(a => !a) && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No wallet addresses found</p>
              <p className="text-xs mt-1">Import a wallet to get started</p>
            </div>
          )}
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
