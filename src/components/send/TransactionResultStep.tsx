import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, ExternalLink, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionData } from "./SendCryptoSheet";
import { useQueryClient } from "@tanstack/react-query";
import { haptics } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";

type ResultMode = "loading" | "success" | "error";

interface TransactionResultStepProps {
  mode: ResultMode;
  transaction: TransactionData;
  errorMessage?: string;
  onClose: () => void;
  onRetry?: () => void;
}

export const TransactionResultStep = ({
  mode,
  transaction,
  errorMessage,
  onClose,
  onRetry,
}: TransactionResultStepProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const amountNum = parseFloat(transaction.amount || "0");

  const formatAddress = (addr: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  useEffect(() => {
    if (mode === "success") {
      haptics.notify("success");
      const t1 = setTimeout(() => haptics.impact("medium"), 200);
      const t2 = setTimeout(() => haptics.impact("light"), 400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (mode === "error") {
      haptics.notify("error");
    }
  }, [mode]);

  const handleViewExplorer = () => {
    const explorerUrl =
      transaction.explorerUrl || `https://etherscan.io/tx/${transaction.txHash}`;
    window.open(explorerUrl, "_blank");
  };

  const handleDone = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    haptics.impact("light");
    onClose();
  };

  const handleCopyTx = async () => {
    if (!transaction.txHash) return;
    await navigator.clipboard.writeText(transaction.txHash);
    haptics.impact("light");
    toast({ title: "Copied!", description: "Transaction hash copied to clipboard" });
  };

  return (
    <div className="flex flex-col h-full min-h-0 px-6 items-center relative overflow-hidden">
      {/* ── Loading ── */}
      {mode === "loading" && (
        <>
          <div className="flex-1 flex flex-col items-center justify-center gap-5 z-10">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mt-2">Sending…</h2>
            <div className="bg-card border border-border/40 rounded-2xl px-6 py-4 w-full max-w-[300px] text-center space-y-2">
              <p className="text-xl font-bold text-foreground">
                {amountNum} {transaction.token.symbol}
              </p>
              <p className="text-sm text-muted-foreground">
                to{" "}
                <span className="font-mono text-foreground/70">
                  {formatAddress(transaction.recipient)}
                </span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Broadcasting to network…</p>
          </div>
          <div
            className="w-full pt-4 z-10"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <Button disabled className="w-full h-14 font-semibold text-base rounded-2xl opacity-50">
              Please wait…
            </Button>
          </div>
        </>
      )}

      {/* ── Success ── */}
      {mode === "success" && (
        <>
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.15, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute top-[25%] w-64 h-64 rounded-full bg-emerald-400 blur-[80px] pointer-events-none"
          />
          <div className="flex-1 flex flex-col items-center justify-center gap-5 z-10">
            <div className="relative">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.3, 1], opacity: [0, 0.3, 0] }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute inset-[-16px] rounded-full border-2 border-emerald-400"
              />
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 10, stiffness: 180, delay: 0.15 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-[0_0_40px_rgba(52,211,153,0.3)]"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  <Check className="w-12 h-12 text-white" strokeWidth={3} />
                </motion.div>
              </motion.div>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="text-3xl font-extrabold tracking-tight mt-2"
            >
              Sent!
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.65, duration: 0.4 }}
              className="bg-card border border-border/40 rounded-2xl px-6 py-4 w-full max-w-[300px] text-center space-y-2"
            >
              <p className="text-2xl font-bold text-foreground">
                {amountNum} {transaction.token.symbol}
              </p>
              <p className="text-sm text-muted-foreground">
                was successfully sent to{" "}
                <span className="font-mono text-foreground/70">
                  {formatAddress(transaction.recipient)}
                </span>
              </p>
            </motion.div>

            {transaction.txHash && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.3 }}
                className="flex items-center gap-4"
              >
                <button
                  onClick={handleViewExplorer}
                  className="flex items-center gap-1.5 text-primary text-sm font-semibold active:opacity-70"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View transaction
                </button>
                <span className="text-border">|</span>
                <button
                  onClick={handleCopyTx}
                  className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium active:opacity-70"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Hash
                </button>
              </motion.div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.3 }}
            className="w-full pt-4 z-10"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <Button
              onClick={handleDone}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base rounded-2xl"
            >
              Done
            </Button>
          </motion.div>
        </>
      )}

      {/* ── Error ── */}
      {mode === "error" && (
        <>
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.12, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute top-[25%] w-64 h-64 rounded-full bg-destructive blur-[80px] pointer-events-none"
          />
          <div className="flex-1 flex flex-col items-center justify-center gap-5 z-10">
            <div className="relative">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 10, stiffness: 180 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.3)]"
              >
                <X className="w-12 h-12 text-white" strokeWidth={3} />
              </motion.div>
            </div>

            <h2 className="text-2xl font-bold tracking-tight mt-2">
              Transaction Failed
            </h2>

            <div className="bg-card border border-border/40 rounded-2xl px-6 py-4 w-full max-w-[300px] text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {errorMessage || "Something went wrong while broadcasting your transaction."}
              </p>
            </div>
          </div>

          <div
            className="w-full pt-4 z-10 space-y-3"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
          >
            {onRetry && (
              <Button
                onClick={onRetry}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base rounded-2xl"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={handleDone}
              className="w-full h-12 text-muted-foreground font-medium text-base rounded-2xl"
            >
              Close
            </Button>
          </div>
        </>
      )}
    </div>
  );
};