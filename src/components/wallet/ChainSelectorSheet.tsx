import { motion } from "framer-motion";
import { Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { SUPPORTED_CHAINS, Chain, getChainInfo } from "@/hooks/useBlockchain";
import { cn } from "@/lib/utils";

interface ChainSelectorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChainSelectorSheet({ open, onOpenChange }: ChainSelectorSheetProps) {
  const { selectedChain, setSelectedChain, isConnected } = useBlockchainContext();

  const handleSelectChain = (chain: Chain) => {
    setSelectedChain(chain);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>Select Network</SheetTitle>
          <SheetDescription>
            Choose which blockchain network to view
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          {SUPPORTED_CHAINS.map((chain, index) => {
            const isSelected = selectedChain === chain.id;
            
            return (
              <motion.button
                key={chain.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSelectChain(chain.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl transition-all",
                  isSelected 
                    ? "bg-primary/10 border-2 border-primary" 
                    : "bg-card border border-border hover:bg-secondary"
                )}
              >
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${chain.color}20` }}
                >
                  {chain.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{chain.name}</span>
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: `${chain.color}20`,
                        color: chain.color,
                      }}
                    >
                      {chain.testnetName}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {chain.symbol} • {chain.decimals} decimals
                  </p>
                </div>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        {isConnected && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Switching networks will update your balance and transaction data
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
