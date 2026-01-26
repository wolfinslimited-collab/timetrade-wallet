import { useState, useMemo } from "react";
import { ChevronLeft, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionData } from "./SendCryptoSheet";
import { FeeEstimator, GasSpeed, gasOptions } from "./FeeEstimator";

interface ConfirmationStepProps {
  transaction: TransactionData;
  onConfirm: () => Promise<void>;
  onBack: () => void;
}

export const ConfirmationStep = ({ transaction, onConfirm, onBack }: ConfirmationStepProps) => {
  const [gasSpeed, setGasSpeed] = useState<GasSpeed>("standard");
  const [isProcessing, setIsProcessing] = useState(false);

  const feeDetails = useMemo(() => {
    const baseGwei = 30; // Simulated base fee
    const gwei = baseGwei * gasOptions[gasSpeed].multiplier;
    const eth = (gwei * transaction.gasEstimate) / 1e9;
    const usd = eth * 3245.67; // ETH price
    return { gwei, eth, usd };
  }, [gasSpeed, transaction.gasEstimate]);

  const amountNum = parseFloat(transaction.amount);
  const amountUsd = amountNum * transaction.token.price;
  const totalCrypto = amountNum + (transaction.token.symbol === "ETH" ? feeDetails.eth : 0);
  const totalUsd = amountUsd + feeDetails.usd;

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    await onConfirm();
    setIsProcessing(false);
  };

  return (
    <div className="flex flex-col h-full px-6 pb-8">
      {/* Back button */}
      <button
        onClick={onBack}
        disabled={isProcessing}
        className="absolute top-4 left-4 p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors disabled:opacity-50"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Amount Summary */}
      <div className="text-center mt-4 mb-6">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-4xl">{transaction.token.icon}</span>
        </div>
        <p className="text-3xl font-bold">
          {amountNum.toFixed(6)} {transaction.token.symbol}
        </p>
        <p className="text-muted-foreground">
          ≈ ${amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* Transaction Details */}
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {/* To */}
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-1">To</p>
          <p className="font-mono text-sm">{formatAddress(transaction.recipient)}</p>
        </div>

        {/* Network */}
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Network</p>
          <p className="text-sm font-medium">Ethereum Mainnet</p>
        </div>
      </div>

      {/* Gas Fee Estimator */}
      <div className="mt-4">
        <FeeEstimator
          baseGasLimit={transaction.gasEstimate}
          tokenSymbol={transaction.token.symbol}
          tokenPrice={3245.67}
          selectedSpeed={gasSpeed}
          onSpeedChange={setGasSpeed}
          disabled={isProcessing}
        />
      </div>

      {/* Fee Summary */}
      <div className="mt-4 p-4 bg-card border border-border rounded-xl space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Amount</span>
          <span>{amountNum.toFixed(6)} {transaction.token.symbol}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Network Fee</span>
          <span>{feeDetails.eth.toFixed(6)} ETH</span>
        </div>
        <div className="border-t border-border pt-3 flex justify-between font-medium">
          <span>Total</span>
          <div className="text-right">
            <p>{transaction.token.symbol === "ETH" ? totalCrypto.toFixed(6) : amountNum.toFixed(6)} {transaction.token.symbol}</p>
            <p className="text-xs text-muted-foreground">
              ≈ ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Insurance Badge */}
      <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <Shield className="w-5 h-5 text-primary" />
        <div>
          <p className="text-sm font-medium">Protected by Timetrade Insurance</p>
          <p className="text-xs text-muted-foreground">Transaction covered up to $10,000</p>
        </div>
      </div>

      {/* Warning */}
      <div className="mt-4 flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Please verify the recipient address carefully. Transactions cannot be reversed once confirmed.
        </p>
      </div>

      {/* Confirm Button */}
      <div className="mt-auto pt-4">
        <Button
          onClick={handleConfirm}
          disabled={isProcessing}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Processing...
            </>
          ) : (
            "Confirm & Send"
          )}
        </Button>
      </div>
    </div>
  );
};
