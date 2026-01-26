import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownUp, Settings2, ChevronDown, Info, Zap } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { TokenSelector } from "./TokenSelector";

interface Token {
  symbol: string;
  name: string;
  icon: string;
  balance: number;
  price: number;
  color: string;
}

const tokens: Token[] = [
  { symbol: "ETH", name: "Ethereum", icon: "⟠", balance: 2.5, price: 3200, color: "#627EEA" },
  { symbol: "BTC", name: "Bitcoin", icon: "₿", balance: 0.15, price: 65000, color: "#F7931A" },
  { symbol: "SOL", name: "Solana", icon: "◎", balance: 45, price: 150, color: "#9945FF" },
  { symbol: "USDC", name: "USD Coin", icon: "◈", balance: 1500, price: 1, color: "#2775CA" },
  { symbol: "USDT", name: "Tether", icon: "₮", balance: 800, price: 1, color: "#26A17B" },
  { symbol: "AVAX", name: "Avalanche", icon: "▲", balance: 25, price: 35, color: "#E84142" },
];

interface SwapCryptoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SwapCryptoSheet = ({ open, onOpenChange }: SwapCryptoSheetProps) => {
  const [fromToken, setFromToken] = useState<Token>(tokens[0]);
  const [toToken, setToToken] = useState<Token>(tokens[3]);
  const [fromAmount, setFromAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [showFromSelector, setShowFromSelector] = useState(false);
  const [showToSelector, setShowToSelector] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapComplete, setSwapComplete] = useState(false);

  // Calculate exchange rate with slight spread
  const exchangeRate = useMemo(() => {
    return fromToken.price / toToken.price;
  }, [fromToken.price, toToken.price]);

  // Calculate to amount based on from amount
  const toAmount = useMemo(() => {
    const amount = parseFloat(fromAmount) || 0;
    return (amount * exchangeRate).toFixed(toToken.symbol === "USDC" || toToken.symbol === "USDT" ? 2 : 6);
  }, [fromAmount, exchangeRate, toToken.symbol]);

  // Calculate price impact based on trade size
  const priceImpact = useMemo(() => {
    const amount = parseFloat(fromAmount) || 0;
    const valueUsd = amount * fromToken.price;
    // Simulate larger trades having more impact
    if (valueUsd < 100) return 0.01;
    if (valueUsd < 1000) return 0.05;
    if (valueUsd < 10000) return 0.15;
    if (valueUsd < 50000) return 0.5;
    return 1.2;
  }, [fromAmount, fromToken.price]);

  // Calculate minimum received with slippage
  const minimumReceived = useMemo(() => {
    const amount = parseFloat(toAmount) || 0;
    return (amount * (1 - slippage / 100)).toFixed(6);
  }, [toAmount, slippage]);

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount("");
  };

  const handleMaxClick = () => {
    setFromAmount(fromToken.balance.toString());
  };

  const handleSwap = async () => {
    setIsSwapping(true);
    // Simulate swap transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSwapping(false);
    setSwapComplete(true);
  };

  const handleClose = () => {
    setSwapComplete(false);
    setFromAmount("");
    onOpenChange(false);
  };

  const fromValueUsd = (parseFloat(fromAmount) || 0) * fromToken.price;
  const toValueUsd = parseFloat(toAmount) * toToken.price;
  const isValidSwap = parseFloat(fromAmount) > 0 && parseFloat(fromAmount) <= fromToken.balance;

  if (swapComplete) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full gap-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center"
            >
              <Zap className="w-10 h-10 text-primary" />
            </motion.div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Swap Complete!</h3>
              <p className="text-muted-foreground">
                Swapped {fromAmount} {fromToken.symbol} for {toAmount} {toToken.symbol}
              </p>
            </div>
            <div className="flex items-center gap-4 bg-card rounded-xl p-4">
              <div className="text-center">
                <div className="text-2xl mb-1">{fromToken.icon}</div>
                <div className="font-medium">-{fromAmount}</div>
                <div className="text-sm text-muted-foreground">{fromToken.symbol}</div>
              </div>
              <ArrowDownUp className="w-5 h-5 text-muted-foreground" />
              <div className="text-center">
                <div className="text-2xl mb-1">{toToken.icon}</div>
                <div className="font-medium text-primary">+{toAmount}</div>
                <div className="text-sm text-muted-foreground">{toToken.symbol}</div>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full max-w-xs">
              Done
            </Button>
          </motion.div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle>Swap</SheetTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings2 className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 bg-card border-border" align="end">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Slippage Tolerance</span>
                      <span className="text-sm text-primary">{slippage}%</span>
                    </div>
                    <div className="flex gap-2 mb-3">
                      {[0.1, 0.5, 1.0].map((val) => (
                        <Button
                          key={val}
                          variant={slippage === val ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => setSlippage(val)}
                        >
                          {val}%
                        </Button>
                      ))}
                    </div>
                    <Slider
                      value={[slippage]}
                      onValueChange={([val]) => setSlippage(val)}
                      min={0.1}
                      max={5}
                      step={0.1}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Your transaction will revert if the price changes unfavorably by more than this percentage.
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </SheetHeader>

          <div className="mt-6 space-y-2">
            {/* From Token */}
            <motion.div
              className="bg-card rounded-2xl p-4 border border-border"
              whileTap={{ scale: 0.995 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">From</span>
                <span className="text-sm text-muted-foreground">
                  Balance: {fromToken.balance.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFromSelector(true)}
                  className="flex items-center gap-2 bg-secondary/50 hover:bg-secondary rounded-xl px-3 py-2 transition-colors"
                >
                  <span className="text-xl">{fromToken.icon}</span>
                  <span className="font-medium">{fromToken.symbol}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="flex-1 text-right">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="border-0 bg-transparent text-right text-2xl font-semibold p-0 h-auto focus-visible:ring-0"
                  />
                  <div className="text-sm text-muted-foreground">
                    ${fromValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary h-6 px-2"
                  onClick={handleMaxClick}
                >
                  MAX
                </Button>
              </div>
            </motion.div>

            {/* Swap Button */}
            <div className="flex justify-center -my-4 relative z-10">
              <motion.button
                onClick={handleSwapTokens}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <ArrowDownUp className="w-5 h-5 text-primary-foreground" />
              </motion.button>
            </div>

            {/* To Token */}
            <motion.div
              className="bg-card rounded-2xl p-4 border border-border"
              whileTap={{ scale: 0.995 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">To</span>
                <span className="text-sm text-muted-foreground">
                  Balance: {toToken.balance.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowToSelector(true)}
                  className="flex items-center gap-2 bg-secondary/50 hover:bg-secondary rounded-xl px-3 py-2 transition-colors"
                >
                  <span className="text-xl">{toToken.icon}</span>
                  <span className="font-medium">{toToken.symbol}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="flex-1 text-right">
                  <div className="text-2xl font-semibold">
                    {parseFloat(toAmount) > 0 ? toAmount : "0.00"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ${toValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Swap Details */}
            <AnimatePresence>
              {parseFloat(fromAmount) > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-secondary/30 rounded-xl p-4 space-y-3 mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span>Exchange Rate</span>
                        <Info className="w-3.5 h-3.5" />
                      </div>
                      <span>
                        1 {fromToken.symbol} = {exchangeRate.toFixed(6)} {toToken.symbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span>Price Impact</span>
                        <Info className="w-3.5 h-3.5" />
                      </div>
                      <span className={cn(
                        priceImpact < 0.1 ? "text-green-500" :
                        priceImpact < 0.5 ? "text-yellow-500" : "text-red-500"
                      )}>
                        {priceImpact.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span>Minimum Received</span>
                        <Info className="w-3.5 h-3.5" />
                      </div>
                      <span>{minimumReceived} {toToken.symbol}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Slippage Tolerance</span>
                      <span>{slippage}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Network Fee</span>
                      <span>~$2.50</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Swap Button */}
            <motion.div
              className="pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                onClick={handleSwap}
                disabled={!isValidSwap || isSwapping}
                className="w-full h-14 text-lg font-semibold rounded-2xl"
              >
                {isSwapping ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full"
                  />
                ) : !fromAmount ? (
                  "Enter an amount"
                ) : parseFloat(fromAmount) > fromToken.balance ? (
                  "Insufficient balance"
                ) : (
                  "Swap"
                )}
              </Button>
            </motion.div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Token Selectors */}
      <TokenSelector
        open={showFromSelector}
        onOpenChange={setShowFromSelector}
        tokens={tokens}
        selectedToken={fromToken}
        excludeToken={toToken}
        onSelect={(token) => {
          setFromToken(token);
          setShowFromSelector(false);
        }}
      />
      <TokenSelector
        open={showToSelector}
        onOpenChange={setShowToSelector}
        tokens={tokens}
        selectedToken={toToken}
        excludeToken={fromToken}
        onSelect={(token) => {
          setToToken(token);
          setShowToSelector(false);
        }}
      />
    </>
  );
};
