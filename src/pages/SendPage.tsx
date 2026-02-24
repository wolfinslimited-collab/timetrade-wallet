import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { NetworkAssetSelector, AvailableAsset } from "@/components/send/NetworkAssetSelector";
import { AddressInputStep } from "@/components/send/AddressInputStep";
import { AmountInputStep } from "@/components/send/AmountInputStep";
import { ConfirmationStep } from "@/components/send/ConfirmationStep";
import { TransactionSuccessStep } from "@/components/send/TransactionSuccessStep";
import { RiskCheckStep } from "@/components/send/RiskCheckStep";
import { Chain, getChainInfo } from "@/hooks/useBlockchain";
import { useBroadcastTransaction } from "@/hooks/useTransactionBroadcast";
import { useWalletAddresses } from "@/hooks/useWalletAddresses";
import { toast } from "@/hooks/use-toast";
import type { SendStep, TransactionData } from "@/components/send/SendCryptoSheet";

const SendPage = () => {
  const navigate = useNavigate();
  const broadcastMutation = useBroadcastTransaction();
  const { addresses } = useWalletAddresses(true);
  const { refreshAll } = useBlockchainContext();

  const [step, setStep] = useState<SendStep>("select");
  const [selectedChain, setSelectedChain] = useState<Chain>("ethereum");
  const [selectedAsset, setSelectedAsset] = useState<AvailableAsset | null>(null);
  const [senderAddress, setSenderAddress] = useState<string>("");
  const [isTestnet] = useState(false);

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

  const getSenderAddress = (chain: Chain): string => {
    if (chain === "solana") return addresses.solana || "";
    if (chain === "tron") return addresses.tron || "";
    return addresses.evm || "";
  };

  const handleClose = () => {
    navigate(-1);
  };

  const handleNetworkAssetSelect = (network: Chain, asset: AvailableAsset, sender: string) => {
    setSelectedChain(network);
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
    setStep("address");
  };

  const handleAddressSubmit = (address: string) => {
    setTransaction((prev) => ({ ...prev, recipient: address }));
    setStep("risk");
  };

  const handleRiskProceed = () => setStep("amount");
  const handleRiskCancel = () => setStep("address");

  const handleAmountSubmit = (amount: string) => {
    const gasPrice = 0.000000045;
    const gasFee = transaction.gasEstimate * gasPrice;
    setTransaction((prev) => ({ ...prev, amount, gasFee }));
    setStep("confirm");
  };

  const handleConfirm = async (signedTransaction?: string, directTxHash?: string) => {
    try {
      if (directTxHash) {
        const chainInfo = getChainInfo(selectedChain);
        const explorerUrl = isTestnet
          ? `https://sepolia.etherscan.io/tx/${directTxHash}`
          : `https://etherscan.io/tx/${directTxHash}`;
        setTransaction((prev) => ({ ...prev, txHash: directTxHash, explorerUrl }));
        toast({ title: "Transaction Sent!", description: `Your transaction has been broadcast to the ${chainInfo.name} network.` });
      } else if (signedTransaction) {
        const result = await broadcastMutation.mutateAsync({ chain: selectedChain, signedTransaction, testnet: isTestnet });
        setTransaction((prev) => ({ ...prev, txHash: result.txHash, explorerUrl: result.explorerUrl }));
        toast({ title: "Transaction Sent!", description: "Your transaction has been broadcast to the network." });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setTransaction((prev) => ({
          ...prev,
          txHash: "0x" + Math.random().toString(16).slice(2, 66),
          explorerUrl: `https://etherscan.io/tx/0x${Math.random().toString(16).slice(2, 66)}`,
        }));
        toast({ title: "Transaction Simulated", description: "This is a simulated transaction.", variant: "default" });
      }
      setStep("success");
      refreshAll();
    } catch (error) {
      console.error("Transaction broadcast failed:", error);
      toast({ title: "Transaction Failed", description: error instanceof Error ? error.message : "Failed to broadcast transaction", variant: "destructive" });
    }
  };

  const handleBack = () => {
    if (step === "select") navigate(-1);
    else if (step === "address") setStep("select");
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

  const showHeader = step !== "confirm" && step !== "success" && step !== "risk";
  const canGoBack = true;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showHeader && (
        <div className="px-6 pt-6 pb-2 relative flex items-center justify-center">
          {canGoBack && (
            <button
              type="button"
              onClick={handleBack}
              className="absolute left-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-bold text-center">{getStepTitle()}</h1>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {step === "select" && (
            <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
              <NetworkAssetSelector onSubmit={handleNetworkAssetSelect} onClose={handleClose} />
            </motion.div>
          )}
          {step === "address" && (
            <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
              <AddressInputStep selectedChain={selectedChain} onSubmit={handleAddressSubmit} />
            </motion.div>
          )}
          {step === "risk" && (
            <motion.div key="risk" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
              <RiskCheckStep address={transaction.recipient} chain={selectedChain} amount={transaction.amount} senderAddress={senderAddress} onProceed={handleRiskProceed} onCancel={handleRiskCancel} />
            </motion.div>
          )}
          {step === "amount" && selectedAsset && (
            <motion.div key="amount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
              <AmountInputStep recipient={transaction.recipient} selectedAsset={selectedAsset} selectedChain={selectedChain} onSubmit={handleAmountSubmit} />
            </motion.div>
          )}
          {step === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 h-full overflow-hidden">
              <ConfirmationStep transaction={transaction} selectedChain={selectedChain} isTestnet={isTestnet} onConfirm={handleConfirm} onBack={handleBack} />
            </motion.div>
          )}
          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex-1">
              <TransactionSuccessStep transaction={transaction} onClose={handleClose} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SendPage;
