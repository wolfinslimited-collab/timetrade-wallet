import { useState, useMemo } from "react";
import { ChevronLeft, AlertTriangle, Shield, Zap, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionData } from "./SendCryptoSheet";
import { FeeEstimator, GasSpeed } from "./FeeEstimator";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { getChainInfo } from "@/hooks/useBlockchain";
import { useTransactionSigning, isEvmChain } from "@/hooks/useTransactionSigning";
import { useWalletConnect } from "@/contexts/WalletConnectContext";
import { PrivateKeyModal } from "./PrivateKeyModal";
import { toast } from "@/hooks/use-toast";

interface ConfirmationStepProps {
  transaction: TransactionData;
  onConfirm: (signedTransaction?: string, txHash?: string) => Promise<void>;
  onBack: () => void;
}

export const ConfirmationStep = ({ transaction, onConfirm, onBack }: ConfirmationStepProps) => {
  const { gasEstimate, selectedChain, isTestnet } = useBlockchainContext();
  const { 
    isWalletConnectConnected, 
    wcAddress, 
    openWalletConnectModal,
    signTransactionWithWalletConnect,
    isSigningWithWC 
  } = useWalletConnect();
  const [gasSpeed, setGasSpeed] = useState<GasSpeed>("standard");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);

  const chainInfo = getChainInfo(selectedChain);
  const { signTransaction, isSigningAvailable } = useTransactionSigning(selectedChain, isTestnet);

  const feeDetails = useMemo(() => {
    // Use real gas data if available
    const gasMap: Record<GasSpeed, string | undefined> = {
      slow: gasEstimate?.slow?.gasPrice,
      standard: gasEstimate?.medium?.gasPrice,
      fast: gasEstimate?.fast?.gasPrice,
      instant: gasEstimate?.fast?.gasPrice,
    };
    
    const baseGwei = parseFloat(gasMap[gasSpeed] || "20");
    const multiplier = gasSpeed === "instant" ? 1.5 : 1;
    const gwei = baseGwei * multiplier;
    const eth = (gwei * transaction.gasEstimate) / 1e9;
    const usd = eth * transaction.token.price;
    return { gwei, eth, usd, gasPriceGwei: String(gwei) };
  }, [gasSpeed, transaction.gasEstimate, transaction.token.price, gasEstimate]);

  const amountNum = parseFloat(transaction.amount);
  const amountUsd = amountNum * transaction.token.price;
  const isNativeToken = transaction.token.symbol === chainInfo.symbol;
  const totalCrypto = amountNum + (isNativeToken ? feeDetails.eth : 0);
  const totalUsd = amountUsd + feeDetails.usd;

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  const handleWalletConnectSign = async () => {
    setIsProcessing(true);
    try {
      const result = await signTransactionWithWalletConnect({
        to: transaction.recipient,
        value: transaction.amount,
        gasLimit: BigInt(transaction.gasEstimate),
        gasPrice: feeDetails.gasPriceGwei,
      });

      toast({
        title: "Transaction Sent",
        description: "Your transaction has been sent via WalletConnect.",
      });

      // Pass txHash directly since WalletConnect sends the transaction
      await onConfirm(undefined, result.txHash);
    } catch (error) {
      console.error('WalletConnect signing failed:', error);
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Failed to send transaction",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmClick = () => {
    if (isWalletConnectConnected && isEvmChain(selectedChain)) {
      // Use WalletConnect if connected
      handleWalletConnectSign();
    } else if (isSigningAvailable) {
      // Open private key modal for EVM chains
      setShowPrivateKeyModal(true);
    } else {
      // Fallback to simulated mode for non-EVM chains
      handleSimulatedTransaction();
    }
  };

  const handleSimulatedTransaction = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignAndSend = async (privateKey: string) => {
    setIsProcessing(true);
    try {
      // Sign the transaction using ethers.js
      const { signedTx, txHash } = await signTransaction(privateKey, {
        to: transaction.recipient,
        value: transaction.amount,
        gasLimit: BigInt(transaction.gasEstimate),
        gasPrice: feeDetails.gasPriceGwei,
      });

      console.log('Transaction signed:', { txHash });

      // Close modal and broadcast
      setShowPrivateKeyModal(false);
      
      // Call onConfirm with the signed transaction
      await onConfirm(signedTx);

      toast({
        title: "Transaction Signed",
        description: "Your transaction has been signed and is being broadcast.",
      });
    } catch (error) {
      console.error('Signing failed:', error);
      toast({
        title: "Signing Failed",
        description: error instanceof Error ? error.message : "Failed to sign transaction",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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
          <p className="text-sm font-medium">{chainInfo.name} {chainInfo.testnetName}</p>
        </div>
      </div>

      {/* Gas Fee Estimator */}
      <div className="mt-4">
        <FeeEstimator
          baseGasLimit={transaction.gasEstimate}
          tokenSymbol={transaction.token.symbol}
          tokenPrice={transaction.token.price}
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
          <span>{feeDetails.eth.toFixed(6)} {chainInfo.symbol}</span>
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

      {/* Mainnet/Testnet Indicator */}
      {!isTestnet && (
        <div className="mt-4 flex items-start gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <Zap className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Mainnet Transaction</p>
            <p className="text-xs text-muted-foreground">
              This transaction will use real funds on the {chainInfo.name} mainnet.
            </p>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="mt-4 flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Please verify the recipient address carefully. Transactions cannot be reversed once confirmed.
        </p>
      </div>

      {/* WalletConnect Status */}
      {isEvmChain(selectedChain) && (
        <div className="mt-4">
          {isWalletConnectConnected ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
              <Wallet className="w-5 h-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-500">WalletConnect Active</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {wcAddress?.slice(0, 10)}...{wcAddress?.slice(-8)}
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={openWalletConnectModal}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors border border-border"
            >
              <Wallet className="w-5 h-5 text-primary" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Connect with WalletConnect</p>
                <p className="text-xs text-muted-foreground">
                  Sign with MetaMask, Trust Wallet, and more
                </p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Confirm Button */}
      <div className="mt-auto pt-4">
        <Button
          onClick={handleConfirmClick}
          disabled={isProcessing || isSigningWithWC}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
        >
          {isProcessing || isSigningWithWC ? (
            <>
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              {isSigningWithWC ? "Approve in Wallet..." : "Processing..."}
            </>
          ) : isWalletConnectConnected && isEvmChain(selectedChain) ? (
            <>
              <Wallet className="w-5 h-5 mr-2" />
              Sign with Wallet
            </>
          ) : isSigningAvailable ? (
            "Sign & Send"
          ) : (
            "Confirm & Send"
          )}
        </Button>
        {!isSigningAvailable && !isWalletConnectConnected && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Transaction signing for {chainInfo.name} coming soon
          </p>
        )}
        {isEvmChain(selectedChain) && !isWalletConnectConnected && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Or connect WalletConnect above for easier signing
          </p>
        )}
      </div>

      {/* Private Key Modal */}
      <PrivateKeyModal
        open={showPrivateKeyModal}
        onOpenChange={setShowPrivateKeyModal}
        onSubmit={handleSignAndSend}
        isLoading={isProcessing}
      />
    </div>
  );
};
