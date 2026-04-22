import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownUp, Settings2, ChevronDown, Info, Zap, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
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
import { SwapTokenSelector } from "./SwapTokenSelector";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { UnifiedAsset } from "@/hooks/useUnifiedPortfolio";
import { projectASupabase } from "@/lib/externalSupabase";
import { Chain } from "@/hooks/useBlockchain";
import { PinUnlockModal } from "@/components/send/PinUnlockModal";
import { decryptPrivateKey, EncryptedData } from "@/utils/encryption";
import { WALLET_STORAGE_KEYS, getActiveAccountEncryptedSeed } from "@/utils/walletStorage";
import { deriveSolanaKeypair } from "@/hooks/useSolanaTransactionSigning";
import { SolanaDerivationPath } from "@/utils/walletDerivation";
import { invokeBlockchain } from "@/lib/blockchain";
import { VersionedTransaction } from "@solana/web3.js";
import { Buffer } from "buffer";

// Well-known token mints/addresses for swap routing
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

interface SwapCryptoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SwapCryptoSheet = ({ open, onOpenChange }: SwapCryptoSheetProps) => {
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
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Only show assets on swappable chains
  const swappableAssets = useMemo(() => {
    const swappable: Chain[] = ["solana", "ethereum", "polygon", "arbitrum", "bsc"];
    return (unifiedAssets || []).filter((a) => swappable.includes(a.chain) && a.amount > 0);
  }, [unifiedAssets]);

  useEffect(() => {
    if (open && swappableAssets.length >= 2 && !fromAsset) {
      setFromAsset(swappableAssets[0]);
      const other = swappableAssets.find(
        (a) => a.chain === swappableAssets[0].chain && a.symbol !== swappableAssets[0].symbol
      );
      setToAsset(other || swappableAssets[1]);
    }
  }, [open, swappableAssets]);

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

  const handleSwap = () => {
    setSwapError(null);
    setPinError(null);
    setShowPinModal(true);
  };

  const handlePinSubmit = async (pin: string) => {
    setIsSwapping(true);
    setPinError(null);
    setSwapError(null);

    try {
      if (!fromAsset || !toAsset || !quote?.raw) {
        throw new Error("Missing swap data");
      }

      const encryptedSeedJson = getActiveAccountEncryptedSeed();
      if (!encryptedSeedJson) {
        setPinError("No wallet found. Please re-import your wallet.");
        setIsSwapping(false);
        return;
      }

      const encryptedData: EncryptedData = JSON.parse(encryptedSeedJson);
      let mnemonic: string;
      try {
        mnemonic = await decryptPrivateKey(encryptedData, pin);
      } catch {
        setPinError("Incorrect PIN. Please try again.");
        setIsSwapping(false);
        return;
      }

      setShowPinModal(false);

      if (fromAsset.chain === "solana") {
        const storedPath = (localStorage.getItem(WALLET_STORAGE_KEYS.SOLANA_DERIVATION_PATH) as SolanaDerivationPath) || "phantom";
        const storedIndex = parseInt(localStorage.getItem('timetrade_solana_balance_account_index') || '0', 10);
        const keypair = deriveSolanaKeypair(mnemonic.trim(), storedIndex, storedPath);
        const userPublicKey = keypair.publicKey.toBase58();

        // Getting Jupiter swap transaction

        const { data: swapData, error: swapErr } = await supabase.functions.invoke("swap-quote", {
          body: {
            action: "swap",
            chain: "solana",
            srcToken: getTokenAddress(fromAsset),
            destToken: getTokenAddress(toAsset),
            amount: quote.srcAmount,
            userAddress: userPublicKey,
            quoteResponse: quote.raw,
          },
        });

        if (swapErr) throw new Error(swapErr.message);
        if (!swapData?.success) throw new Error(swapData?.error || "Failed to build swap transaction");

        const swapTransactionBase64 = swapData.data.swapTransaction;
        if (!swapTransactionBase64) throw new Error("No swap transaction returned");

        const transactionBuf = Buffer.from(swapTransactionBase64, "base64");
        const transaction = VersionedTransaction.deserialize(transactionBuf);
        transaction.sign([keypair]);

        const signedTxBytes = transaction.serialize();
        const signedTxHex = Buffer.from(signedTxBytes).toString("hex");

        // Transaction signed, broadcasting...

        const { data: broadcastData, error: broadcastErr } = await invokeBlockchain({
          action: "broadcastTransaction",
          chain: "solana",
          address: userPublicKey,
          signedTransaction: signedTxHex,
          testnet: false,
        });

        if (broadcastErr) throw new Error(broadcastErr.message);

        const broadcastResult = broadcastData as { success: boolean; data?: { txHash: string }; error?: string };
        if (!broadcastResult?.success) throw new Error(broadcastResult?.error || "Broadcast failed");

        const hash = broadcastResult.data?.txHash;
        // Transaction broadcast successfully

        setTxHash(hash || null);
        setIsSwapping(false);
        setSwapComplete(true);
      } else {
        throw new Error("Real swap execution is only available for Solana currently. EVM swap coming soon.");
      }
    } catch (err) {
      console.error("[SWAP] Swap execution error:", err);
      setSwapError(err instanceof Error ? err.message : "Swap failed");
      setIsSwapping(false);
    }
  };

  const handleClose = () => {
    setSwapComplete(false);
    setFromAmount("");
    setQuote(null);
    setQuoteError(null);
    setSwapError(null);
    setTxHash(null);
    onOpenChange(false);
  };

  const getLogoUrl = (symbol: string) =>
    `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;

  const getSolscanUrl = (hash: string) => `https://solscan.io/tx/${hash}`;

  // ===== SUCCESS SCREEN =====
  if (swapComplete) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-background border-border p-0">
          <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
              {/* Animated success icon with ripple */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.1 }}
                className="relative"
              >
                <div className="w-28 h-28 rounded-full bg-success/10 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
                    className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center"
                  >
                    <Zap className="w-10 h-10 text-success" />
                  </motion.div>
                </div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.6 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 1.2, repeat: 2, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full border border-success/30"
                />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.4 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ duration: 1.4, repeat: 2, ease: "easeOut", delay: 0.2 }}
                  className="absolute inset-0 rounded-full border border-success/20"
                />
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-center"
              >
                <h3 className="text-3xl font-bold tracking-tight mb-2">Swap Complete!</h3>
                <p className="text-muted-foreground text-base">
                  Swapped {fromAmount} {fromAsset?.symbol} for {toAmount} {toAsset?.symbol}
                </p>
              </motion.div>

              {/* Token pair summary card */}
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="w-full"
              >
                <div className="relative rounded-2xl border border-border/50 bg-card/60 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden ring-2 ring-border/30">
                        <img
                          src={getLogoUrl(fromAsset?.symbol || "")}
                          alt={fromAsset?.symbol}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `<span class="text-lg font-bold text-foreground">${fromAsset?.symbol?.[0] || '?'}</span>`;
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">-{fromAmount}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">{fromAsset?.symbol}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center px-2">
                      <div className="w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center">
                        <ArrowDownUp className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden ring-2 ring-success/20">
                        <img
                          src={getLogoUrl(toAsset?.symbol || "")}
                          alt={toAsset?.symbol}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `<span class="text-lg font-bold text-success">${toAsset?.symbol?.[0] || '?'}</span>`;
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-success">+{toAmount}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">{toAsset?.symbol}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Transaction Hash Link */}
              {txHash && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  className="w-full"
                >
                  <a
                    href={getSolscanUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-colors"
                  >
                    <span className="text-sm font-medium text-primary">
                      View on Solscan
                    </span>
                    <ExternalLink className="w-4 h-4 text-primary" />
                  </a>
                  <p className="text-xs text-muted-foreground text-center mt-2 font-mono truncate px-4">
                    {txHash}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Bottom CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="px-6 pb-8 pt-4"
            >
              <Button
                onClick={handleClose}
                className="w-full h-14 text-base font-semibold rounded-2xl bg-foreground text-background hover:bg-foreground/90"
              >
                Done
              </Button>
            </motion.div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // ===== MAIN SWAP UI =====
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[90vh] rounded-t-3xl bg-background border-border"
        >
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle className="text-xl font-bold">Swap</SheetTitle>
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
          </SheetHeader>

          <div className="mt-6 space-y-2">
            {/* ===== FROM ===== */}
            <div className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">You Pay</span>
                <span className="text-xs text-muted-foreground">
                  Balance: {fromAsset?.amount.toLocaleString(undefined, { maximumFractionDigits: 6 }) || "0"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFromSelector(true)}
                  className="flex items-center gap-2 bg-secondary/60 hover:bg-secondary rounded-xl px-3 py-2.5 transition-colors shrink-0"
                >
                  {fromAsset ? (
                    <>
                      <img src={getLogoUrl(fromAsset.symbol)} alt="" className="w-6 h-6 rounded-full" />
                      <span className="font-semibold text-sm">{fromAsset.symbol}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Select</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="flex-1 text-right">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    className="border-0 bg-transparent text-right text-2xl font-bold p-0 h-auto focus-visible:ring-0"
                  />
                  <div className="text-xs text-muted-foreground mt-0.5">
                    ${fromValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-1">
                <button
                  onClick={handleMaxClick}
                  className="text-xs text-foreground/70 hover:text-foreground font-medium px-2 py-0.5 rounded bg-secondary/40 hover:bg-secondary transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* ===== SWAP DIRECTION ===== */}
            <div className="flex justify-center -my-4 relative z-10">
              <motion.button
                onClick={handleSwapTokens}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg border-4 border-background"
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <ArrowDownUp className="w-5 h-5 text-primary-foreground" />
              </motion.button>
            </div>

            {/* ===== TO ===== */}
            <div className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">You Receive</span>
                <span className="text-xs text-muted-foreground">
                  Balance: {toAsset?.amount.toLocaleString(undefined, { maximumFractionDigits: 6 }) || "0"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowToSelector(true)}
                  className="flex items-center gap-2 bg-secondary/60 hover:bg-secondary rounded-xl px-3 py-2.5 transition-colors shrink-0"
                >
                  {toAsset ? (
                    <>
                      <img src={getLogoUrl(toAsset.symbol)} alt="" className="w-6 h-6 rounded-full" />
                      <span className="font-semibold text-sm">{toAsset.symbol}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Select</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="flex-1 text-right">
                  <div className="text-2xl font-bold">
                    {isLoadingQuote ? (
                      <Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" />
                    ) : (
                      toAmount
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    ${toValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* ===== QUOTE ERROR ===== */}
            {quoteError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 rounded-xl border border-destructive/20">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-xs text-destructive">{quoteError}</span>
              </div>
            )}

            {/* ===== SWAP ERROR ===== */}
            {swapError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 rounded-xl border border-destructive/20">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-xs text-destructive">{swapError}</span>
              </div>
            )}

            {/* ===== SWAP DETAILS ===== */}
            <AnimatePresence>
              {quote && parseFloat(fromAmount) > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-card/50 rounded-xl p-4 space-y-2.5 mt-2 border border-border/50">
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

            {/* ===== SWAP BUTTON ===== */}
            <motion.div
              className="pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                onClick={handleSwap}
                disabled={!isValidSwap || isSwapping}
                className="w-full h-14 text-base font-semibold rounded-2xl"
              >
                {isSwapping ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Swapping...
                  </span>
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
            </motion.div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Token Selectors */}
      <SwapTokenSelector
        open={showFromSelector}
        onOpenChange={setShowFromSelector}
        assets={swappableAssets}
        selectedAsset={fromAsset}
        excludeAsset={toAsset}
        onSelect={(asset) => {
          setFromAsset(asset);
          setFromAmount("");
          setQuote(null);
        }}
        title="Swap From"
      />
      <SwapTokenSelector
        open={showToSelector}
        onOpenChange={setShowToSelector}
        assets={toAssets}
        selectedAsset={toAsset}
        excludeAsset={fromAsset}
        onSelect={(asset) => {
          setToAsset(asset);
          setQuote(null);
        }}
        title="Swap To"
      />

      {/* PIN Modal */}
      <PinUnlockModal
        open={showPinModal}
        onOpenChange={setShowPinModal}
        onSubmit={handlePinSubmit}
        isLoading={isSwapping}
        error={pinError || undefined}
      />
    </>
  );
};
