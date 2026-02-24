import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownUp, Settings2, ChevronDown, ChevronLeft, Loader2, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SwapTokenSelector } from "@/components/swap/SwapTokenSelector";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { UnifiedAsset } from "@/hooks/useUnifiedPortfolio";
import { supabase } from "@/integrations/supabase/client";
import { Chain } from "@/hooks/useBlockchain";

const SOLANA_TOKEN_MINTS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
};

const EVM_NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

interface QuoteData {
  srcAmount: string;
  destAmount: string;
  priceImpact: number;
  route: string[];
  provider: string;
  gasCostUSD?: string;
  raw?: any;
}

const SwapPage = () => {
  const navigate = useNavigate();
  const { unifiedAssets } = useBlockchainContext();

  const [fromAsset, setFromAsset] = useState<UnifiedAsset | null>(null);
  const [toAsset, setToAsset] = useState<UnifiedAsset | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [showFromSelector, setShowFromSelector] = useState(false);
  const [showToSelector, setShowToSelector] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapComplete, setSwapComplete] = useState(false);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const swappableAssets = useMemo(() => {
    const swappable: Chain[] = ["solana", "ethereum", "polygon", "arbitrum", "bsc"];
    return (unifiedAssets || []).filter((a) => swappable.includes(a.chain) && a.amount > 0);
  }, [unifiedAssets]);

  useEffect(() => {
    if (swappableAssets.length >= 2 && !fromAsset) {
      setFromAsset(swappableAssets[0]);
      const other = swappableAssets.find(
        (a) => a.chain === swappableAssets[0].chain && a.symbol !== swappableAssets[0].symbol
      );
      setToAsset(other || swappableAssets[1]);
    }
  }, [swappableAssets]);

  useEffect(() => {
    if (fromAsset && toAsset && fromAsset.chain !== toAsset.chain) {
      const sameChain = swappableAssets.find(
        (a) => a.chain === fromAsset.chain && a.symbol !== fromAsset.symbol
      );
      setToAsset(sameChain || null);
    }
  }, [fromAsset]);

  const toAssets = useMemo(() => {
    if (!fromAsset) return swappableAssets;
    return swappableAssets.filter((a) => a.chain === fromAsset.chain);
  }, [fromAsset, swappableAssets]);

  const getTokenAddress = (asset: UnifiedAsset): string => {
    if (asset.chain === "solana") {
      if (asset.isNative) return SOLANA_TOKEN_MINTS.SOL;
      return asset.contractAddress || SOLANA_TOKEN_MINTS[asset.symbol] || "";
    }
    if (asset.isNative) return EVM_NATIVE_TOKEN;
    return asset.contractAddress || "";
  };

  useEffect(() => {
    if (!fromAsset || !toAsset || !fromAmount || parseFloat(fromAmount) <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingQuote(true);
      setQuoteError(null);

      try {
        const amountInBaseUnits = Math.floor(
          parseFloat(fromAmount) * Math.pow(10, fromAsset.decimals)
        ).toString();

          const { data, error } = await supabase.functions.invoke("swap-quote", {
            body: {
              action: "quote",
              chain: fromAsset.chain,
              srcToken: getTokenAddress(fromAsset),
              destToken: getTokenAddress(toAsset),
              amount: amountInBaseUnits,
              srcDecimals: fromAsset.decimals,
              destDecimals: toAsset.decimals,
              slippage: Math.round(slippage * 100),
            },
          });

          if (error) throw new Error(error.message);
          if (!data?.success) throw new Error(data?.error || "Quote failed");

          setQuote({
            srcAmount: data.data.srcAmount,
            destAmount: data.data.destAmount,
            priceImpact: Math.abs(data.data.priceImpact || 0),
            route: data.data.route || [],
            provider: data.provider,
            gasCostUSD: data.data.gasCostUSD,
            raw: data.data.raw,
          });
      } catch (err) {
        console.error("[SWAP] Quote error:", err);
        setQuoteError(err instanceof Error ? err.message : "Quote failed");
        setQuote(null);
      } finally {
        setIsLoadingQuote(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [fromAsset, toAsset, fromAmount, slippage]);

  const toAmount = useMemo(() => {
    if (!quote || !toAsset) return "0";
    const raw = parseFloat(quote.destAmount) / Math.pow(10, toAsset.decimals);
    return raw.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }, [quote, toAsset]);

  const toAmountNum = useMemo(() => {
    if (!quote || !toAsset) return 0;
    return parseFloat(quote.destAmount) / Math.pow(10, toAsset.decimals);
  }, [quote, toAsset]);

  const exchangeRate = useMemo(() => {
    if (!fromAsset || !toAsset || !quote) return null;
    const fromAmt = parseFloat(fromAmount) || 1;
    return toAmountNum / fromAmt;
  }, [fromAmount, toAmountNum, fromAsset, toAsset, quote]);

  const fromValueUsd = (parseFloat(fromAmount) || 0) * (fromAsset?.price || 0);
  const toValueUsd = toAmountNum * (toAsset?.price || 0);
  const isValidSwap =
    parseFloat(fromAmount) > 0 &&
    fromAsset &&
    toAsset &&
    parseFloat(fromAmount) <= fromAsset.amount &&
    quote &&
    !isLoadingQuote;

  const handleSwapTokens = () => {
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
    setFromAmount("");
    setQuote(null);
  };

  const handleMaxClick = () => {
    if (fromAsset) setFromAmount(fromAsset.amount.toString());
  };

  const handleSwap = async () => {
    setIsSwapping(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSwapping(false);
    setSwapComplete(true);
  };

  const getLogoUrl = (symbol: string) =>
    `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;

  // ===== SUCCESS SCREEN =====
  if (swapComplete) {
    return (
      <div className="min-h-screen flex flex-col max-w-md mx-auto items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 text-center w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center"
          >
            <Zap className="w-10 h-10 text-success" />
          </motion.div>
          <div>
            <h3 className="text-2xl font-bold mb-2">Swap Complete!</h3>
            <p className="text-muted-foreground">
              Swapped {fromAmount} {fromAsset?.symbol} for {toAmount} {toAsset?.symbol}
            </p>
          </div>
          <div className="flex items-center gap-6 bg-card rounded-2xl p-5 border border-border">
            <div className="text-center">
              <img src={getLogoUrl(fromAsset?.symbol || "")} alt="" className="w-10 h-10 rounded-full mx-auto mb-1" />
              <div className="font-medium">-{fromAmount}</div>
              <div className="text-sm text-muted-foreground">{fromAsset?.symbol}</div>
            </div>
            <ArrowDownUp className="w-5 h-5 text-muted-foreground" />
            <div className="text-center">
              <img src={getLogoUrl(toAsset?.symbol || "")} alt="" className="w-10 h-10 rounded-full mx-auto mb-1" />
              <div className="font-medium text-success">+{toAmount}</div>
              <div className="text-sm text-muted-foreground">{toAsset?.symbol}</div>
            </div>
          </div>
          <Button onClick={() => navigate("/")} className="w-full max-w-xs h-14 text-base">
            Done
          </Button>
        </motion.div>
      </div>
    );
  }

  // ===== MAIN SWAP UI =====
  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Swap</h1>
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors">
              <Settings2 className="w-5 h-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 bg-card border-border" align="end">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Slippage Tolerance</span>
                  <span className="text-sm text-foreground font-semibold">{slippage}%</span>
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
      </div>

      <div className="flex-1 px-5 pb-8">
        {/* FROM Card */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">You Pay</span>
            <span className="text-xs text-muted-foreground">
              Balance: {fromAsset?.amount.toLocaleString(undefined, { maximumFractionDigits: 6 }) || "0"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFromSelector(true)}
              className="flex items-center gap-2.5 bg-secondary/70 hover:bg-secondary rounded-2xl px-3.5 py-3 transition-colors shrink-0 active:scale-95"
            >
              {fromAsset ? (
                <>
                  <img src={getLogoUrl(fromAsset.symbol)} alt="" className="w-7 h-7 rounded-full" />
                  <span className="font-bold text-sm">{fromAsset.symbol}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Select</span>
              )}
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex-1 text-right min-w-0">
              <input
                type="number"
                placeholder="0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="w-full bg-transparent text-right text-2xl font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="flex items-center justify-end gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  ${fromValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <button
                  onClick={handleMaxClick}
                  className="text-[10px] font-bold text-primary hover:text-primary/80 uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SWAP DIRECTION */}
        <div className="flex justify-center -my-5 relative z-10">
          <motion.button
            onClick={handleSwapTokens}
            className="w-11 h-11 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-md hover:border-primary/50 transition-colors"
            whileHover={{ rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <ArrowDownUp className="w-5 h-5 text-foreground" />
          </motion.button>
        </div>

        {/* TO Card */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">You Receive</span>
            <span className="text-xs text-muted-foreground">
              Balance: {toAsset?.amount.toLocaleString(undefined, { maximumFractionDigits: 6 }) || "0"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowToSelector(true)}
              className="flex items-center gap-2.5 bg-secondary/70 hover:bg-secondary rounded-2xl px-3.5 py-3 transition-colors shrink-0 active:scale-95"
            >
              {toAsset ? (
                <>
                  <img src={getLogoUrl(toAsset.symbol)} alt="" className="w-7 h-7 rounded-full" />
                  <span className="font-bold text-sm">{toAsset.symbol}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Select</span>
              )}
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex-1 text-right min-w-0">
              <div className="text-2xl font-bold">
                {isLoadingQuote ? (
                  <Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" />
                ) : (
                  toAmount
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ${toValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* QUOTE ERROR */}
        {quoteError && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-destructive/10 rounded-2xl border border-destructive/20 mt-3">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <span className="text-xs text-destructive font-medium">{quoteError}</span>
          </div>
        )}

        {/* SWAP DETAILS */}
        <AnimatePresence>
          {quote && parseFloat(fromAmount) > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-card/50 rounded-2xl p-4 space-y-3 mt-3 border border-border/50">
                {exchangeRate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rate</span>
                    <span className="font-medium">
                      1 {fromAsset?.symbol} ≈ {exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toAsset?.symbol}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Price Impact</span>
                  <span className={cn("font-medium", quote.priceImpact < 1 ? "text-success" : quote.priceImpact < 3 ? "text-amber-500" : "text-destructive")}>
                    {quote.priceImpact.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Min. Received</span>
                  <span className="font-medium">
                    {(toAmountNum * (1 - slippage / 100)).toLocaleString(undefined, { maximumFractionDigits: 6 })} {toAsset?.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Slippage</span>
                  <span className="font-medium">{slippage}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Provider</span>
                  <span className="font-medium capitalize">{quote.provider === "jupiter" ? "Jupiter" : "ParaSwap"}</span>
                </div>
                {quote.route.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Route</span>
                    <span className="font-medium text-xs truncate max-w-[180px]">{quote.route.join(" → ")}</span>
                  </div>
                )}
                {quote.gasCostUSD && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Network Fee</span>
                    <span className="font-medium">~${parseFloat(quote.gasCostUSD).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SWAP BUTTON */}
        <div className="mt-6">
          <Button
            onClick={handleSwap}
            disabled={!isValidSwap || isSwapping}
            className="w-full h-14 text-base font-semibold rounded-2xl"
          >
            {isSwapping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : !fromAsset || !toAsset ? (
              "Select tokens"
            ) : !fromAmount || parseFloat(fromAmount) <= 0 ? (
              "Enter an amount"
            ) : fromAsset && parseFloat(fromAmount) > fromAsset.amount ? (
              "Insufficient balance"
            ) : isLoadingQuote ? (
              "Fetching quote..."
            ) : quoteError ? (
              "No route available"
            ) : (
              "Swap"
            )}
          </Button>
        </div>
      </div>

      {/* Token Selectors */}
      <SwapTokenSelector
        open={showFromSelector}
        onOpenChange={setShowFromSelector}
        assets={swappableAssets}
        selectedAsset={fromAsset}
        excludeAsset={toAsset}
        onSelect={(asset) => { setFromAsset(asset); setFromAmount(""); setQuote(null); }}
        title="Swap From"
      />
      <SwapTokenSelector
        open={showToSelector}
        onOpenChange={setShowToSelector}
        assets={toAssets}
        selectedAsset={toAsset}
        excludeAsset={fromAsset}
        onSelect={(asset) => { setToAsset(asset); setQuote(null); }}
        title="Swap To"
      />
    </div>
  );
};

export default SwapPage;
