import { motion } from "framer-motion";
import { CheckCircle, ExternalLink, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionData } from "./SendCryptoSheet";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface TransactionSuccessStepProps {
  transaction: TransactionData;
  onClose: () => void;
}

export const TransactionSuccessStep = ({ transaction, onClose }: TransactionSuccessStepProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const amountNum = parseFloat(transaction.amount);
  const amountUsd = amountNum * transaction.token.price;

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  const handleCopyTxHash = async () => {
    if (transaction.txHash) {
      await navigator.clipboard.writeText(transaction.txHash);
      toast({
        title: "Copied!",
        description: "Transaction hash copied to clipboard",
      });
    }
  };

  const handleViewExplorer = () => {
    const explorerUrl = transaction.explorerUrl || `https://etherscan.io/tx/${transaction.txHash}`;
    window.open(explorerUrl, "_blank");
  };

  const handleShare = async () => {
    const explorerUrl = transaction.explorerUrl || `https://etherscan.io/tx/${transaction.txHash}`;
    if (navigator.share) {
      await navigator.share({
        title: "Transaction Sent",
        text: `Sent ${amountNum} ${transaction.token.symbol} via Timetrade`,
        url: explorerUrl,
      });
    } else {
      handleCopyTxHash();
    }
  };

  const handleDone = () => {
    // Invalidate transaction queries so they refresh
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    // Close the modal — the user is already on /asset route
    onClose();
  };

  return (
    <div className="flex flex-col h-full px-6 pb-8 items-center">
      {/* Success Animation */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative mb-6"
        >
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <CheckCircle className="w-12 h-12 text-primary" />
            </motion.div>
          </div>
          
          {/* Ripple effect */}
          <motion.div
            initial={{ scale: 0.8, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 1, repeat: 2 }}
            className="absolute inset-0 rounded-full border-2 border-primary"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold mb-2">Transaction Sent!</h2>
          <p className="text-muted-foreground">
            Your transaction has been submitted to the network
          </p>
        </motion.div>

        {/* Transaction Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 w-full bg-card border border-border rounded-xl p-4"
        >
          <div className="text-center mb-4">
            <p className="text-3xl font-bold">
              {amountNum.toFixed(6)} {transaction.token.symbol}
            </p>
            <p className="text-muted-foreground">
              ≈ ${amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">To</span>
              <span className="font-mono">{formatAddress(transaction.recipient)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="text-amber-500 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Pending
              </span>
            </div>
            {transaction.txHash && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Transaction</span>
                <button
                  onClick={handleCopyTxHash}
                  className="font-mono text-primary flex items-center gap-1 hover:underline"
                >
                  {formatAddress(transaction.txHash)}
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4 flex flex-wrap justify-center gap-3"
        >
          <button
            onClick={handleViewExplorer}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:bg-secondary transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm">Explorer</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:bg-secondary transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-sm">Share</span>
          </button>
        </motion.div>
      </div>

      {/* Done Button */}
      <div className="w-full pt-4">
        <Button
          onClick={handleDone}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
        >
          Done
        </Button>
      </div>
    </div>
  );
};
