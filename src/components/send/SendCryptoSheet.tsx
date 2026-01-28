import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AnimatePresence, motion } from "framer-motion";
import { NetworkAssetSelector, AvailableAsset } from "./NetworkAssetSelector";
import { AddressInputStep } from "./AddressInputStep";
import { AmountInputStep } from "./AmountInputStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { TransactionSuccessStep } from "./TransactionSuccessStep";
import { Chain, getChainInfo } from "@/hooks/useBlockchain";
import { useBroadcastTransaction } from "@/hooks/useTransactionBroadcast";
import { useWalletAddresses } from "@/hooks/useWalletAddresses";
import { toast } from "@/hooks/use-toast";

export type SendStep = "select" | "address" | "amount" | "confirm" | "success";

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
    setStep("amount");
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

  const handleConfirm = async (signedTransaction?: string, directTxHash?: string) => {
    try {
      if (directTxHash) {
        const chainInfo = getChainInfo(selectedChain);
        const explorerUrl = isTestnet 
          ? `https://sepolia.etherscan.io/tx/${directTxHash}`
          : `https://etherscan.io/tx/${directTxHash}`;

        setTransaction((prev) => ({
          ...prev,
          txHash: directTxHash,
          explorerUrl,
        }));

        toast({
          title: "Transaction Sent!",
          description: `Your transaction has been broadcast to the ${chainInfo.name} network.`,
        });
      } else if (signedTransaction) {
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
          description: `Your transaction has been broadcast to the network.`,
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        setTransaction((prev) => ({
          ...prev,
          txHash: "0x" + Math.random().toString(16).slice(2, 66),
          explorerUrl: `https://etherscan.io/tx/0x${Math.random().toString(16).slice(2, 66)}`,
        }));

        toast({
          title: "Transaction Simulated",
          description: "This is a simulated transaction.",
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
    if (step === "address") setStep("select");
    else if (step === "amount") setStep("address");
    else if (step === "confirm") setStep("amount");
  };

  const getStepTitle = () => {
    switch (step) {
      case "select": return "Send Crypto";
      case "address": return "Recipient Address";
      case "amount": return "Enter Amount";
      case "confirm": return "Confirm Transaction";
      case "success": return "Transaction Sent";
    }
  };

  // Hide header and close button for confirm step (it has its own header)
  const showHeader = step !== "confirm";

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] rounded-t-3xl bg-background border-border p-0 flex flex-col"
        hideCloseButton={step === "confirm"}
      >
        {showHeader && (
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="text-xl font-bold">{getStepTitle()}</SheetTitle>
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
                onBack={handleBack}
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
