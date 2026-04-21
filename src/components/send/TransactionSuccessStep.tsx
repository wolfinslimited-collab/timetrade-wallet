import { useEffect } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionData } from "./SendCryptoSheet";
import { useQueryClient } from "@tanstack/react-query";
import { haptics } from "@/lib/haptics";

interface TransactionSuccessStepProps {
  transaction: TransactionData;
  onClose: () => void;
}

export const TransactionSuccessStep = ({ transaction, onClose }: TransactionSuccessStepProps) => {
  const queryClient = useQueryClient();
  const amountNum = parseFloat(transaction.amount);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleViewExplorer = () => {
    const explorerUrl = transaction.explorerUrl || `https://etherscan.io/tx/${transaction.txHash}`;
    window.open(explorerUrl, "_blank");
  };

  const handleDone = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    onClose();
  };

  useEffect(() => {
    haptics.notify("success");
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0 px-6 items-center">
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-emerald-400 flex items-center justify-center"
        >
          <Check className="w-10 h-10 text-white" strokeWidth={3} />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold"
        >
          Sent!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground text-center text-sm"
        >
          {amountNum} {transaction.token.symbol} was successfully sent to {formatAddress(transaction.recipient)}
        </motion.p>

        {transaction.txHash && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={handleViewExplorer}
            className="text-primary text-sm font-medium"
          >
            View transaction
          </motion.button>
        )}
      </div>

      <div className="w-full pt-4" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
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
