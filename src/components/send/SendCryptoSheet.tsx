import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AnimatePresence, motion } from "framer-motion";
import { AddressInputStep } from "./AddressInputStep";
import { AmountInputStep } from "./AmountInputStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { TransactionSuccessStep } from "./TransactionSuccessStep";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { useBroadcastTransaction } from "@/hooks/useTransactionBroadcast";
import { toast } from "@/hooks/use-toast";

export type SendStep = "address" | "amount" | "confirm" | "success";

export interface TokenInfo {
  symbol: string;
  name: string;
  balance: number;
  price: number;
  icon: string;
}

export interface TransactionData {
  recipient: string;
  amount: string;
  token: TokenInfo;
  gasEstimate: number;
  gasFee: number;
  txHash?: string;
  explorerUrl?: string;
}

interface SendCryptoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultToken: TokenInfo = {
  symbol: "ETH",
  name: "Ethereum",
  balance: 2.5847,
  price: 3245.67,
  icon: "⟠",
};

export const SendCryptoSheet = ({ open, onOpenChange }: SendCryptoSheetProps) => {
  const { selectedChain, isTestnet } = useBlockchainContext();
  const broadcastMutation = useBroadcastTransaction();
  
  const [step, setStep] = useState<SendStep>("address");
  const [transaction, setTransaction] = useState<TransactionData>({
    recipient: "",
    amount: "",
    token: defaultToken,
    gasEstimate: 21000,
    gasFee: 0.0012,
  });

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setStep("address");
      setTransaction({
        recipient: "",
        amount: "",
        token: defaultToken,
        gasEstimate: 21000,
        gasFee: 0.0012,
      });
    }, 300);
  };

  const handleAddressSubmit = (address: string) => {
    setTransaction((prev) => ({ ...prev, recipient: address }));
    setStep("amount");
  };

  const handleAmountSubmit = (amount: string, token: TokenInfo) => {
    // Simulate gas calculation
    const gasPrice = 0.000000045; // 45 gwei
    const gasFee = transaction.gasEstimate * gasPrice;
    
    setTransaction((prev) => ({ 
      ...prev, 
      amount, 
      token,
      gasFee,
    }));
    setStep("confirm");
  };

  const handleConfirm = async (signedTransaction?: string) => {
    try {
      if (signedTransaction) {
        // Broadcast real transaction
        const result = await broadcastMutation.mutateAsync({
          chain: selectedChain,
          signedTransaction,
          testnet: isTestnet,
        });

        setTransaction((prev) => ({
          ...prev,
          txHash: result.txHash,
          explorerUrl: result.explorerUrl,
        }));

        toast({
          title: "Transaction Sent!",
          description: `Your transaction has been broadcast to the ${selectedChain} network.`,
        });
      } else {
        // Fallback: simulate transaction (for demo/testing without signed tx)
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        setTransaction((prev) => ({
          ...prev,
          txHash: "0x" + Math.random().toString(16).slice(2, 66),
          explorerUrl: `https://etherscan.io/tx/0x${Math.random().toString(16).slice(2, 66)}`,
        }));

        toast({
          title: "Transaction Simulated",
          description: "This is a simulated transaction. Connect a wallet to broadcast real transactions.",
          variant: "default",
        });
      }
      
      setStep("success");
    } catch (error) {
      console.error("Transaction broadcast failed:", error);
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Failed to broadcast transaction",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    if (step === "amount") setStep("address");
    else if (step === "confirm") setStep("amount");
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl bg-background border-border p-0">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="text-xl font-bold">
            {step === "address" && "Send Crypto"}
            {step === "amount" && "Enter Amount"}
            {step === "confirm" && "Confirm Transaction"}
            {step === "success" && "Transaction Sent"}
          </SheetTitle>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {step === "address" && (
            <motion.div
              key="address"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              <AddressInputStep
                onSubmit={handleAddressSubmit}
                onClose={handleClose}
              />
            </motion.div>
          )}

          {step === "amount" && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              <AmountInputStep
                recipient={transaction.recipient}
                selectedToken={transaction.token}
                onSubmit={handleAmountSubmit}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              <ConfirmationStep
                transaction={transaction}
                onConfirm={handleConfirm}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <TransactionSuccessStep
                transaction={transaction}
                onClose={handleClose}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
};
