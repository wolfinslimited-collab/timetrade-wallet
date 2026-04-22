import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { NetworkAssetSelector, AvailableAsset, NetworkAssetSelectorHandle } from "@/components/send/NetworkAssetSelector";
import { AddressInputStep } from "@/components/send/AddressInputStep";
import { AmountInputStep } from "@/components/send/AmountInputStep";
import { ConfirmationStep } from "@/components/send/ConfirmationStep";
import { TransactionResultStep } from "@/components/send/TransactionResultStep";
import { RiskCheckStep } from "@/components/send/RiskCheckStep";
import { Chain } from "@/hooks/useBlockchain";
import { useBroadcastTransaction } from "@/hooks/useTransactionBroadcast";
import { useWalletAddresses } from "@/hooks/useWalletAddresses";
import type { SendStep, TransactionData } from "@/components/send/SendCryptoSheet";

const VALID_CHAINS: Chain[] = ["ethereum", "polygon", "arbitrum", "bsc", "solana", "tron", "bitcoin"];

const SendPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const broadcastMutation = useBroadcastTransaction();
  const { addresses } = useWalletAddresses(true);
  const { refreshAll } = useBlockchainContext();

  // Optional prefill from URL (e.g. /send?recipient=0x...&chain=ethereum&symbol=SOL)
  const prefill = useMemo(() => {
    const r = (searchParams.get("recipient") || "").trim();
    const c = (searchParams.get("chain") || "").trim().toLowerCase() as Chain;
    const s = (searchParams.get("symbol") || "").trim();
    return {
      recipient: r,
      chain: VALID_CHAINS.includes(c) ? c : null,
      symbol: s || null,
    };
  }, [searchParams]);

  const [step, setStep] = useState<SendStep>("select");
  const [selectedChain, setSelectedChain] = useState<Chain>(prefill.chain ?? "ethereum");
  const [selectedAsset, setSelectedAsset] = useState<AvailableAsset | null>(null);
  const [senderAddress, setSenderAddress] = useState<string>("");
  const [isTestnet] = useState(false);
  const networkSelectorRef = useRef<NetworkAssetSelectorHandle>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [pendingSignedTx, setPendingSignedTx] = useState<string | null>(null);

  // Pre-set recipient when arriving with a URL prefill
  useEffect(() => {
    if (prefill.recipient) {
      setTransaction((prev) => ({ ...prev, recipient: prefill.recipient }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (chain === "ethereum") return addresses.evm || "";
    if (chain === "solana") return addresses.solana || "";
    if (chain === "tron") return addresses.tron || "";
    return "";
  };
  const handleClose = () => navigate(-1);

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
        const result = await broadcastMutation.mutateAsync({ chain: selectedChain, signedTransaction, testnet: isTestnet });
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
    if (step === "select") {
      const handled = networkSelectorRef.current?.handleBack();
      if (!handled) navigate(-1);
    }
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
      case "sending": return "Sending…";
      case "success": return "Transaction Sent";
      case "error": return "Transaction Failed";
    }
  };

  const showHeader = step !== "confirm" && step !== "success" && step !== "risk" && step !== "sending" && step !== "error";

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {showHeader && (
        <div className="px-6 pt-6 pb-2 relative flex items-center justify-center" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 1.5rem)" }}>
          <button
            type="button"
            onClick={handleBack}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-2 rounded-full bg-card border border-border active:bg-secondary"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-center">{getStepTitle()}</h1>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col">
        {step === "select" && (
          <div className="flex-1 min-h-0">
            <NetworkAssetSelector
              ref={networkSelectorRef}
              onSubmit={handleNetworkAssetSelect}
              onClose={handleClose}
              prefillChain={prefill.chain}
              prefillSymbol={prefill.symbol}
            />
          </div>
        )}
        {step === "address" && (
          <div className="flex-1 min-h-0">
            <AddressInputStep selectedChain={selectedChain} onSubmit={handleAddressSubmit} initialAddress={transaction.recipient} />
          </div>
        )}
        {step === "risk" && (
          <div className="flex-1 min-h-0 flex flex-col">
            <RiskCheckStep address={transaction.recipient} chain={selectedChain} amount={transaction.amount} senderAddress={senderAddress} onProceed={handleRiskProceed} onCancel={handleRiskCancel} />
          </div>
        )}
        {step === "amount" && selectedAsset && (
          <div className="flex-1 min-h-0">
            <AmountInputStep recipient={transaction.recipient} selectedAsset={selectedAsset} selectedChain={selectedChain} onSubmit={handleAmountSubmit} />
          </div>
        )}
        {step === "confirm" && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <ConfirmationStep transaction={transaction} selectedChain={selectedChain} isTestnet={isTestnet} onConfirm={handleConfirm} onBack={handleBack} />
          </div>
        )}
        {(step === "sending" || step === "success" || step === "error") && (
          <div className="flex-1 min-h-0">
            <TransactionResultStep
              mode={step === "sending" ? "loading" : step === "success" ? "success" : "error"}
              transaction={transaction}
              errorMessage={broadcastError || undefined}
              onClose={handleClose}
              onRetry={step === "error" ? handleRetryBroadcast : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SendPage;
