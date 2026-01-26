import { motion } from "framer-motion";
import { Search, Check } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Token {
  symbol: string;
  name: string;
  icon: string;
  balance: number;
  price: number;
  color: string;
}

interface TokenSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokens: Token[];
  selectedToken: Token;
  excludeToken?: Token;
  onSelect: (token: Token) => void;
}

export const TokenSelector = ({
  open,
  onOpenChange,
  tokens,
  selectedToken,
  excludeToken,
  onSelect,
}: TokenSelectorProps) => {
  const [search, setSearch] = useState("");

  const filteredTokens = tokens.filter((token) => {
    if (excludeToken && token.symbol === excludeToken.symbol) return false;
    if (!search) return true;
    return (
      token.symbol.toLowerCase().includes(search.toLowerCase()) ||
      token.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Select Token</SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or symbol"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary/50 border-0"
            />
          </div>
        </div>

        <div className="mt-4 space-y-1 max-h-[calc(70vh-140px)] overflow-y-auto">
          {filteredTokens.map((token, index) => {
            const isSelected = token.symbol === selectedToken.symbol;
            const valueUsd = token.balance * token.price;

            return (
              <motion.button
                key={token.symbol}
                onClick={() => onSelect(token)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                  isSelected
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-secondary/50"
                )}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${token.color}20` }}
                >
                  {token.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{token.symbol}</div>
                  <div className="text-sm text-muted-foreground">{token.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{token.balance.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">
                    ${valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </motion.button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
