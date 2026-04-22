import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, X } from "lucide-react";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { NetworkAssetSelector, AvailableAsset } from "./NetworkAssetSelector";
import { AddressInputStep } from "./AddressInputStep";
import { AmountInputStep } from "./AmountInputStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { TransactionResultStep } from "./TransactionResultStep";
import { RiskCheckStep } from "./RiskCheckStep";
import { Chain } from "@/hooks/useBlockchain";
import { useBroadcastTransaction } from "@/hooks/useTransactionBroadcast";
import { useWalletAddresses } from "@/hooks/useWalletAddresses";

export type SendStep = "select" | "address" | "risk" | "amount" | "confirm" | "sending" | "success" | "error";

export interface TokenInfo {
  symbol: string;
  name: string;
  balance: number;
  price: number;
  icon: string;
  contractAddress?: string;
  decimals?: number;
  isNative?: boolean;
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
  // Pre-selected asset from AssetDetailSheet
  preSelectedAsset?: {
    symbol: string;
    name: string;
    balance: number;
    decimals: number;
    chain: Chain;
    isNative: boolean;
    contractAddress?: string;
    price: number;
  } | null;
}

export const SendCryptoSheet = ({ open, onOpenChange, preSelectedAsset }: SendCryptoSheetProps) => {
  const broadcastMutation = useBroadcastTransaction();
  const { addresses } = useWalletAddresses(open);
  const { refreshAll } = useBlockchainContext();
  
  const [step, setStep] = useState<SendStep>("select");
  const [selectedChain, setSelectedChain] = useState<Chain>("ethereum");
  const [selectedAsset, setSelectedAsset] = useState<AvailableAsset | null>(null);
  const [senderAddress, setSenderAddress] = useState<string>("");
  const [isTestnet] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [pendingSignedTx, setPendingSignedTx] = useState<string | null>(null);
  
  const [transaction, setTransaction] = useState<TransactionData>({
    recipient: "",
    amount: "",
    token: {
      symbol: "ETH",
      name: "Ethereum",
      balance: 0,
      price: 0,
      icon: "eth",
    },
    gasEstimate: 21000,
    gasFee: 0.0012,
  });

  // Get sender address for a chain
  const getSenderAddress = (chain: Chain): string => {
    if (chain === 'solana') return addresses.solana || '';
    if (chain === 'tron') return addresses.tron || '';
    return addresses.evm || '';
  };

  // Handle pre-selected asset from AssetDetailSheet
  useEffect(() => {
    if (open && preSelectedAsset) {
      const chain = preSelectedAsset.chain;
      const sender = getSenderAddress(chain);
      
      const asset: AvailableAsset = {
        symbol: preSelectedAsset.symbol,
        name: preSelectedAsset.name,
        balance: preSelectedAsset.balance,
        decimals: preSelectedAsset.decimals,
        chain: chain,
        isNative: preSelectedAsset.isNative,
        contractAddress: preSelectedAsset.contractAddress,
        price: preSelectedAsset.price,
      };

      setSelectedChain(chain);
      setSelectedAsset(asset);
      setSenderAddress(sender);
      
      setTransaction((prev) => ({
        ...prev,
        token: {
          symbol: asset.symbol,
          name: asset.name,
          balance: asset.balance,
          price: asset.price,
          icon: asset.symbol.toLowerCase(),
          contractAddress: asset.contractAddress,
          decimals: asset.decimals,
          isNative: asset.isNative,
        },
      }));
      
      // Skip directly to address step
      setStep("address");
    }
  }, [open, preSelectedAsset, addresses]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("select");
      setSelectedAsset(null);
      setSenderAddress("");
      setTransaction({
        recipient: "",
        amount: "",
        token: {
          symbol: "ETH",
          name: "Ethereum",
          balance: 0,
          price: 0,
          icon: "eth",
        },
        gasEstimate: 21000,
        gasFee: 0.0012,
      });
    }, 300);
  };

  const handleNetworkAssetSelect = (network: Chain, asset: AvailableAsset, sender: string) => {
    setSelectedChain(network);
    setSelectedAsset(asset);
    setSenderAddress(sender);
    
    // Convert to TokenInfo format
    setTransaction((prev) => ({
      ...prev,
      token: {
        symbol: asset.symbol,
        name: asset.name,
        balance: asset.balance,
        price: asset.price,
        icon: asset.symbol.toLowerCase(),
        contractAddress: asset.contractAddress,
        decimals: asset.decimals,
        isNative: asset.isNative,
      },
    }));
    
    setStep("address");
  };

  const handleAddressSubmit = (address: string) => {
    setTransaction((prev) => ({ ...prev, recipient: address }));
    setStep("risk");
  };

  const handleRiskProceed = () => {
    setStep("amount");
  };

  const handleRiskCancel = () => {
    setStep("address");
  };

  const handleAmountSubmit = (amount: string) => {
    const gasPrice = 0.000000045;
    const gasFee = transaction.gasEstimate * gasPrice;
    
    setTransaction((prev) => ({ 
      ...prev, 
      amount,
      gasFee,
    }));
    setStep("confirm");
  };

  const handleConfirm = (signedTransaction?: string, directTxHash?: string) => {
    setBroadcastError(null);
    setPendingSignedTx(signedTransaction || null);
    setStep("sending");
    doBroadcast(signedTransaction, directTxHash);
  };

  const doBroadcast = async (signedTransaction?: string, directTxHash?: string) => {
    try {
      if (directTxHash) {
        const explorerUrl = isTestnet 
          ? `https://sepolia.etherscan.io/tx/${directTxHash}`
          : `https://etherscan.io/tx/${directTxHash}`;
        setTransaction((prev) => ({ ...prev, txHash: directTxHash, explorerUrl }));
      } else if (signedTransaction) {
        const result = await broadcastMutation.mutateAsync({
          chain: selectedChain,
          signedTransaction,
          testnet: isTestnet,
        });
        setTransaction((prev) => ({ ...prev, txHash: result.txHash, explorerUrl: result.explorerUrl }));
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setTransaction((prev) => ({
          ...prev,
          txHash: "0x" + Math.random().toString(16).slice(2, 66),
          explorerUrl: `https://etherscan.io/tx/0x${Math.random().toString(16).slice(2, 66)}`,
        }));
      }
      setStep("success");
      refreshAll();
    } catch (error) {
      console.error("Transaction broadcast failed:", error);
      setBroadcastError(error instanceof Error ? error.message : "Failed to broadcast transaction");
      setStep("error");
    }
  };

  const handleRetryBroadcast = () => {
    setStep("sending");
    setBroadcastError(null);
    doBroadcast(pendingSignedTx || undefined);
  };

  const handleBack = () => {
    if (step === "address") setStep("select");
    else if (step === "risk") setStep("address");
    else if (step === "amount") setStep("risk");
    else if (step === "confirm") setStep("amount");
  };

  const getStepTitle = () => {
    switch (step) {
      case "select": return "Send Crypto";
      case "address": return "Recipient Address";
      case "risk": return "Risk Analysis";
      case "amount": return "Enter Amount";
      case "confirm": return "Confirm Transaction";
      case "success": return "Transaction Sent";
    }
  };

  // Hide header and close button for confirm and success steps
  const showHeader = step !== "confirm" && step !== "success" && step !== "risk" && step !== "sending" && step !== "error";
  const hideSheetClose = step === "confirm" || step === "success" || step === "risk" || step === "sending" || step === "error";
  const canGoBack = step === "address" || step === "amount" || step === "risk";

  const handleSheetOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
      return;
    }
    // Controlled open: forward the intent to parent
    onOpenChange(true);
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] rounded-t-3xl bg-background border-border p-0 flex flex-col"
        hideCloseButton={true}
      >
        {showHeader && (
          <SheetHeader className="px-6 pt-6 pb-2">
            <div className="flex items-center">
              {canGoBack && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {!canGoBack && <div className="w-9 h-9" />}
              <SheetTitle className="text-xl font-bold text-center flex-1">{getStepTitle()}</SheetTitle>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </SheetHeader>
        )}

        <AnimatePresence mode="wait">
          {step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              <NetworkAssetSelector
                onSubmit={handleNetworkAssetSelect}
                onClose={handleClose}
              />
            </motion.div>
          )}

          {step === "address" && (
            <motion.div
              key="address"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              <AddressInputStep
                selectedChain={selectedChain}
                onSubmit={handleAddressSubmit}
              />
            </motion.div>
          )}

          {step === "risk" && (
            <motion.div
              key="risk"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              <RiskCheckStep
                address={transaction.recipient}
                chain={selectedChain}
                amount={transaction.amount}
                senderAddress={senderAddress}
                onProceed={handleRiskProceed}
                onCancel={handleRiskCancel}
              />
            </motion.div>
          )}

          {step === "amount" && selectedAsset && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              <AmountInputStep
                recipient={transaction.recipient}
                selectedAsset={selectedAsset}
                selectedChain={selectedChain}
                onSubmit={handleAmountSubmit}
              />
            </motion.div>
          )}

          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 h-full overflow-hidden"
            >
              <ConfirmationStep
                transaction={transaction}
                selectedChain={selectedChain}
                isTestnet={isTestnet}
                onConfirm={handleConfirm}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {(step === "sending" || step === "success" || step === "error") && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <TransactionResultStep
                mode={step === "sending" ? "loading" : step === "success" ? "success" : "error"}
                transaction={transaction}
                errorMessage={broadcastError || undefined}
                onClose={handleClose}
                onRetry={step === "error" ? handleRetryBroadcast : undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
};
