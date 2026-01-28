import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, AlertTriangle, Shield, Zap, Wallet, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionData } from "./SendCryptoSheet";
import { FeeEstimator, GasSpeed } from "./FeeEstimator";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { Chain, getChainInfo, useGasEstimate } from "@/hooks/useBlockchain";
import { useTransactionSigning, isEvmChain, isTronChain, isSolanaChain, isSigningSupportedForChain } from "@/hooks/useTransactionSigning";
import { useTronTransactionSigning } from "@/hooks/useTronTransactionSigning";
import { useSolanaTransactionSigning } from "@/hooks/useSolanaTransactionSigning";
import { useWalletConnect } from "@/contexts/WalletConnectContext";
import { PinUnlockModal } from "./PinUnlockModal";
import { toast } from "@/hooks/use-toast";
import { LiveFeeData, getFeeForSpeed } from "@/hooks/useLiveFeeEstimation";
import { ethers } from "ethers";
import { decryptPrivateKey, EncryptedData } from "@/utils/encryption";
import { derivePrivateKeyForChain, SolanaDerivationPath } from "@/utils/walletDerivation";
import { WALLET_STORAGE_KEYS } from "@/utils/walletStorage";

interface ConfirmationStepProps {
  transaction: TransactionData;
  selectedChain: Chain;
  isTestnet?: boolean;
  onConfirm: (signedTransaction?: string, txHash?: string) => Promise<void>;
  onBack: () => void;
}

export const ConfirmationStep = ({ transaction, selectedChain, isTestnet = false, onConfirm, onBack }: ConfirmationStepProps) => {
  const { walletAddress, prices } = useBlockchainContext();
  const { 
    isWalletConnectConnected, 
    wcAddress, 
    openWalletConnectModal,
    signTransactionWithWalletConnect,
    isSigningWithWC 
  } = useWalletConnect();
  const [gasSpeed, setGasSpeed] = useState<GasSpeed>("standard");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [liveFeeData, setLiveFeeData] = useState<LiveFeeData | null>(null);

  const chainInfo = getChainInfo(selectedChain);
  const gasEstimateQuery = useGasEstimate(selectedChain);
  const chainGasEstimate = gasEstimateQuery.data;

  // Check if user has a mnemonic stored (for deriving private key)
  const hasMnemonicStored = !!localStorage.getItem(WALLET_STORAGE_KEYS.SEED_PHRASE);

  // Use native token price for fee USD (fees are paid in the network native asset)
  const nativePriceSymbol = selectedChain === 'polygon' ? 'MATIC' : chainInfo.symbol;
  const nativeTokenPrice = useMemo(() => {
    const p = prices?.find((x) => x.symbol.toUpperCase() === nativePriceSymbol.toUpperCase())?.price ?? 0;
    if (p && p > 0) return p;
    // Fallback: if user is sending the native token, its price is correct for fees
    if (transaction.token.symbol.toUpperCase() === nativePriceSymbol.toUpperCase()) return transaction.token.price;
    return transaction.token.price; // last-resort fallback
  }, [prices, nativePriceSymbol, transaction.token.price, transaction.token.symbol]);
  const { signTransaction: signEvmTransaction, isSigningAvailable: isEvmSigningAvailable } = useTransactionSigning(selectedChain, isTestnet);
  const { signTransaction: signTronTransaction, isSigningAvailable: isTronSigningAvailable } = useTronTransactionSigning(isTestnet);
  const { signTransaction: signSolanaTransaction, isSigningAvailable: isSolanaSigningAvailable } = useSolanaTransactionSigning(isTestnet);
  
  // Combined signing availability check
  const isSigningAvailable = isSigningSupportedForChain(selectedChain);

  // Check if there's a stored mnemonic for signing
  const storedKeyAddress = walletAddress || wcAddress;

  // Handle fee data updates from FeeEstimator
  const handleFeeDataUpdate = useCallback((feeData: LiveFeeData | null) => {
    setLiveFeeData(feeData);
  }, []);

  // Calculate fee details using chain-correct data (Solana/Tron are NOT gwei-based)
  const feeDetails = useMemo(() => {
    // Solana: backend returns priority fee tiers in lamports
    if (isSolanaChain(selectedChain)) {
      const slowLamports = chainGasEstimate?.slow?.fee ? parseFloat(chainGasEstimate.slow.fee) : 5000;
      const mediumLamports = chainGasEstimate?.medium?.fee ? parseFloat(chainGasEstimate.medium.fee) : 10000;
      const fastLamports = chainGasEstimate?.fast?.fee ? parseFloat(chainGasEstimate.fast.fee) : 25000;

      const lamportsForSpeed: Record<GasSpeed, number> = {
        slow: slowLamports,
        standard: mediumLamports,
        fast: fastLamports,
        instant: fastLamports * 2,
      };

      const sol = (lamportsForSpeed[gasSpeed] || mediumLamports) / 1e9;
      const usd = sol * nativeTokenPrice;

      return {
        gwei: 0,
        maxFee: 0,
        priorityFee: 0,
        eth: sol,
        usd,
        gasPriceGwei: "0",
        isEIP1559: false,
      };
    }

    // Tron: backend returns fee tiers in TRX
    if (isTronChain(selectedChain)) {
      const slowTrx = chainGasEstimate?.slow?.fee ? parseFloat(chainGasEstimate.slow.fee) : 1;
      const mediumTrx = chainGasEstimate?.medium?.fee ? parseFloat(chainGasEstimate.medium.fee) : 5;
      const fastTrx = chainGasEstimate?.fast?.fee ? parseFloat(chainGasEstimate.fast.fee) : 10;

      const trxForSpeed: Record<GasSpeed, number> = {
        slow: slowTrx,
        standard: mediumTrx,
        fast: fastTrx,
        instant: fastTrx * 1.5,
      };

      const trx = trxForSpeed[gasSpeed] || mediumTrx;
      const usd = trx * nativeTokenPrice;

      return {
        gwei: 0,
        maxFee: 0,
        priorityFee: 0,
        eth: trx,
        usd,
        gasPriceGwei: "0",
        isEIP1559: false,
      };
    }

    // EVM: prefer live RPC fee data
    if (liveFeeData && isEvmChain(selectedChain)) {
      const tier = liveFeeData[gasSpeed];
      const effectiveGas = liveFeeData.isEIP1559 ? tier.maxFee : tier.gasPrice;
      const eth = (effectiveGas * transaction.gasEstimate) / 1e9;
      const usd = eth * nativeTokenPrice;
      return {
        gwei: tier.gasPrice,
        maxFee: tier.maxFee,
        priorityFee: tier.priorityFee,
        eth,
        usd,
        gasPriceGwei: String(tier.gasPrice),
        isEIP1559: liveFeeData.isEIP1559,
      };
    }

    // EVM fallback: backend estimates (gwei)
    const gasMap: Record<GasSpeed, string | undefined> = {
      slow: chainGasEstimate?.slow?.gasPrice,
      standard: chainGasEstimate?.medium?.gasPrice,
      fast: chainGasEstimate?.fast?.gasPrice,
      instant: chainGasEstimate?.fast?.gasPrice,
    };

    const baseGwei = parseFloat(gasMap[gasSpeed] || "20");
    const multiplier = gasSpeed === "instant" ? 1.5 : 1;
    const gwei = baseGwei * multiplier;
    const eth = (gwei * transaction.gasEstimate) / 1e9;
    const usd = eth * nativeTokenPrice;

    return {
      gwei,
      maxFee: gwei,
      priorityFee: gwei * 0.1,
      eth,
      usd,
      gasPriceGwei: String(gwei),
      isEIP1559: false,
    };
  }, [gasSpeed, selectedChain, chainGasEstimate, liveFeeData, transaction.gasEstimate, nativeTokenPrice]);

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
      handleWalletConnectSign();
    } else if (hasMnemonicStored && isSigningAvailable) {
      // Use stored mnemonic - prompt for PIN
      setPinError(null);
      setShowPinModal(true);
    } else if (isSigningAvailable) {
      // No stored mnemonic - show error (shouldn't happen normally)
      toast({
        title: "Wallet Not Found",
        description: "Please re-import your wallet to sign transactions.",
        variant: "destructive",
      });
    } else {
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

  const handlePinSubmit = async (pin: string) => {
    setIsProcessing(true);
    setPinError(null);
    
    try {
      // Get stored encrypted seed phrase
      const encryptedSeedJson = localStorage.getItem(WALLET_STORAGE_KEYS.SEED_PHRASE);
      if (!encryptedSeedJson) {
        setPinError("No wallet found. Please re-import your wallet.");
        setIsProcessing(false);
        return;
      }

      // Decrypt the seed phrase
      const encryptedData: EncryptedData = JSON.parse(encryptedSeedJson);
      let mnemonic: string;
      try {
        mnemonic = await decryptPrivateKey(encryptedData, pin);
      } catch (decryptError) {
        setPinError("Incorrect PIN. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Get account index (default 0)
      const accountIndex = parseInt(localStorage.getItem(WALLET_STORAGE_KEYS.ACTIVE_ACCOUNT_INDEX) || '0', 10);
      
      // Get Solana path style if applicable
      const solanaPathStyle = (localStorage.getItem(WALLET_STORAGE_KEYS.SOLANA_DERIVATION_PATH) as SolanaDerivationPath) || 'phantom';

      // Derive private key for the selected chain
      const privateKey = derivePrivateKeyForChain(mnemonic, selectedChain, accountIndex, solanaPathStyle);

      let signedTx: string;

      if (isSolanaChain(selectedChain)) {
        // Solana transaction signing
        const solanaAddress = localStorage.getItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_SOLANA) || '';
        
        const result = await signSolanaTransaction(privateKey, {
          to: transaction.recipient,
          amount: transaction.amount,
          from: solanaAddress,
          priorityFee: gasSpeed === 'fast' ? 100000 : gasSpeed === 'instant' ? 500000 : undefined,
        });
        signedTx = result.signedTx;
      } else if (isTronChain(selectedChain)) {
        // Tron transaction signing
        const tronAddress = localStorage.getItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_TRON) || '';
        const isToken = transaction.token.symbol !== 'TRX';
        
        const result = await signTronTransaction(privateKey, {
          to: transaction.recipient,
          amount: transaction.amount,
          from: tronAddress,
          isToken,
          contractAddress: isToken ? (transaction.token as any).contractAddress : undefined,
          decimals: transaction.token.symbol === 'USDT' ? 6 : 6, // TRC-20 tokens typically use 6 decimals
        });
        signedTx = result.signedTx;
      } else {
        // EVM transaction signing
        const txParams = {
          to: transaction.recipient,
          value: transaction.amount,
          gasLimit: BigInt(transaction.gasEstimate),
          ...(feeDetails.isEIP1559 ? {
            maxFeePerGas: feeDetails.maxFee.toFixed(9),
            maxPriorityFeePerGas: feeDetails.priorityFee.toFixed(9),
          } : {
            gasPrice: feeDetails.gasPriceGwei,
          }),
        };
        
        const result = await signEvmTransaction(privateKey, txParams);
        signedTx = result.signedTx;
      }

      setShowPinModal(false);
      await onConfirm(signedTx);

      toast({
        title: "Transaction Signed",
        description: "Your transaction has been signed and is being broadcast.",
      });
    } catch (error) {
      console.error('Signing failed:', error);
      setPinError(error instanceof Error ? error.message : "Failed to sign transaction");
    } finally {
      setIsProcessing(false);
    }
  };

  // Get the correct fee symbol based on chain
  const feeSymbol = chainInfo.symbol;

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 pb-safe-bottom">
      {/* Header with back button */}
      <div className="flex items-center gap-3 py-4 -mx-6 px-6 sticky top-0 bg-background z-10">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="p-2 rounded-full bg-card border border-border hover:bg-secondary transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Confirm Transaction</h2>
      </div>

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
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-1">To</p>
          <p className="font-mono text-sm">{formatAddress(transaction.recipient)}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Network</p>
          <p className="text-sm font-medium">{chainInfo.name} {chainInfo.testnetName}</p>
        </div>
      </div>

      {/* Gas Fee Estimator */}
      <div className="mt-4">
        <FeeEstimator
          baseGasLimit={transaction.gasEstimate}
          tokenSymbol={chainInfo.symbol}
          tokenPrice={nativeTokenPrice}
          selectedSpeed={gasSpeed}
          onSpeedChange={setGasSpeed}
          onFeeDataUpdate={handleFeeDataUpdate}
          disabled={isProcessing}
          chain={selectedChain}
          isTestnet={isTestnet}
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
          <span>{feeDetails.eth.toFixed(6)} {feeSymbol}</span>
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

      {/* Wallet Ready Indicator */}
      {hasMnemonicStored && isSigningAvailable && !isWalletConnectConnected && (
        <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <Key className="w-5 h-5 text-green-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-500">Wallet Ready</p>
            <p className="text-xs text-muted-foreground">
              Enter your PIN to sign this transaction
            </p>
          </div>
        </div>
      )}

      {/* Insurance Badge */}
      <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <Shield className="w-5 h-5 text-primary" />
        <div>
          <p className="text-sm font-medium">Protected by Timetrade Insurance</p>
          <p className="text-xs text-muted-foreground">Transaction covered up to $10,000</p>
        </div>
      </div>

      {/* Mainnet Indicator */}
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
      {isEvmChain(selectedChain) && !hasMnemonicStored && (
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

      {/* Confirm Button - Fixed at bottom with safe area */}
      <div className="mt-auto pt-4 pb-6">
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
          ) : hasMnemonicStored && isSigningAvailable ? (
            <>
              <Key className="w-5 h-5 mr-2" />
              Sign with PIN
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
      </div>

      {/* PIN Unlock Modal */}
      <PinUnlockModal
        open={showPinModal}
        onOpenChange={setShowPinModal}
        onSubmit={handlePinSubmit}
        isLoading={isProcessing}
        walletAddress={storedKeyAddress}
        error={pinError}
      />
    </div>
  );
};
