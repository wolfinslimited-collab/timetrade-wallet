import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BrowserProvider, JsonRpcSigner, parseEther, parseUnits } from 'ethers';

// WalletConnect is optional - we'll try to initialize it but gracefully handle failures
let appKitInitialized = false;
let useAppKit: any = () => ({ open: () => console.warn('WalletConnect not available') });
let useAppKitAccount: any = () => ({ address: undefined, isConnected: false });
let useAppKitProvider: any = () => ({ walletProvider: null });

// Try to initialize WalletConnect/AppKit
try {
  const appkit = require('@reown/appkit/react');
  const ethersAdapter = require('@reown/appkit-adapter-ethers');
  const networks = require('@reown/appkit/networks');

  const projectId = 'f6fa3c95d1ee89fa25fbb3eb50fe5e03';
  
  const metadata = {
    name: 'Timetrade Wallet',
    description: 'Secure crypto wallet with WalletConnect support',
    url: typeof window !== 'undefined' ? window.location.origin : '',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
  };

  const adapter = new ethersAdapter.EthersAdapter();

  appkit.createAppKit({
    adapters: [adapter],
    networks: [networks.mainnet, networks.sepolia, networks.polygon, networks.polygonAmoy],
    metadata,
    projectId,
    features: {
      analytics: false,
    }
  });

  useAppKit = appkit.useAppKit;
  useAppKitAccount = appkit.useAppKitAccount;
  useAppKitProvider = appkit.useAppKitProvider;
  appKitInitialized = true;
} catch (error) {
  console.warn('WalletConnect initialization failed:', error);
}

interface WalletConnectTransaction {
  to: string;
  value: string; // In ether
  gasLimit?: bigint;
  gasPrice?: string; // In gwei
  data?: string;
}

interface SignedTransactionResult {
  signedTx: string;
  txHash: string;
}

interface WalletConnectContextType {
  // Connection state
  isWalletConnectConnected: boolean;
  wcAddress: string | undefined;
  
  // Actions
  openWalletConnectModal: () => void;
  disconnectWalletConnect: () => void;
  signTransactionWithWalletConnect: (tx: WalletConnectTransaction) => Promise<SignedTransactionResult>;
  
  // State
  isSigningWithWC: boolean;
  wcError: string | null;
  clearWcError: () => void;
}

const WalletConnectContext = createContext<WalletConnectContextType | undefined>(undefined);

interface WalletConnectProviderProps {
  children: ReactNode;
}

export function WalletConnectProvider({ children }: WalletConnectProviderProps) {
  // Safely call hooks - they'll return defaults if AppKit isn't initialized
  const appKit = useAppKit();
  const account = useAppKitAccount();
  const provider = useAppKitProvider('eip155');
  
  const open = appKit?.open;
  const address = account?.address;
  const isConnected = account?.isConnected ?? false;
  const walletProvider = provider?.walletProvider;
  
  const [isSigningWithWC, setIsSigningWithWC] = useState(false);
  const [wcError, setWcError] = useState<string | null>(null);

  const clearWcError = useCallback(() => setWcError(null), []);

  const openWalletConnectModal = useCallback(() => {
    if (!appKitInitialized) {
      setWcError('WalletConnect is not available. Please use the built-in wallet.');
      return;
    }
    try {
      open?.();
    } catch (error) {
      console.error('Failed to open WalletConnect modal:', error);
      setWcError('Failed to open wallet connection. Please try again.');
    }
  }, [open]);

  const disconnectWalletConnect = useCallback(async () => {
    try {
      open?.({ view: 'Account' });
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }, [open]);

  const signTransactionWithWalletConnect = useCallback(async (
    tx: WalletConnectTransaction
  ): Promise<SignedTransactionResult> => {
    if (!walletProvider) {
      throw new Error('WalletConnect provider not available. Please connect your wallet first.');
    }

    if (!address) {
      throw new Error('No wallet address available. Please connect your wallet.');
    }

    setIsSigningWithWC(true);
    setWcError(null);

    try {
      // Create ethers provider from WalletConnect provider
      const provider = new BrowserProvider(walletProvider as any);
      const signer = await provider.getSigner() as JsonRpcSigner;

      // Build transaction
      const transaction = {
        to: tx.to,
        value: parseEther(tx.value),
        gasLimit: tx.gasLimit || BigInt(21000),
        ...(tx.data && { data: tx.data }),
      };

      // If gas price is provided, add it
      if (tx.gasPrice) {
        const gasPriceWei = parseUnits(tx.gasPrice, 'gwei');
        Object.assign(transaction, {
          maxFeePerGas: gasPriceWei,
          maxPriorityFeePerGas: gasPriceWei / BigInt(2),
        });
      }

      console.log('Sending transaction via WalletConnect:', transaction);

      // Send transaction - this will trigger the wallet popup for user approval
      const txResponse = await signer.sendTransaction(transaction);
      
      console.log('Transaction sent:', txResponse.hash);

      return {
        signedTx: '', // WalletConnect sends directly, no raw signed tx available
        txHash: txResponse.hash,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign transaction with WalletConnect';
      setWcError(message);
      throw error;
    } finally {
      setIsSigningWithWC(false);
    }
  }, [walletProvider, address]);

  const value: WalletConnectContextType = {
    isWalletConnectConnected: isConnected,
    wcAddress: address,
    openWalletConnectModal,
    disconnectWalletConnect,
    signTransactionWithWalletConnect,
    isSigningWithWC,
    wcError,
    clearWcError,
  };

  return (
    <WalletConnectContext.Provider value={value}>
      {children}
    </WalletConnectContext.Provider>
  );
}

export function useWalletConnect() {
  const context = useContext(WalletConnectContext);
  if (context === undefined) {
    throw new Error('useWalletConnect must be used within a WalletConnectProvider');
  }
  return context;
}
