import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// WalletConnect is permanently disabled in this app (imported mnemonic only).
// This stub exists so existing imports continue to compile, but it never
// loads any WalletConnect / @reown/appkit code. That keeps iOS from crashing
// on browser-only APIs (WebSocket / IndexedDB / window globals) at startup.

interface WalletConnectTransaction {
  to: string;
  value: string;
  gasLimit?: bigint;
  gasPrice?: string;
  data?: string;
}

interface SignedTransactionResult {
  signedTx: string;
  txHash: string;
}

interface WalletConnectContextType {
  isWalletConnectConnected: boolean;
  wcAddress: string | undefined;
  openWalletConnectModal: () => void;
  disconnectWalletConnect: () => void;
  signTransactionWithWalletConnect: (tx: WalletConnectTransaction) => Promise<SignedTransactionResult>;
  isSigningWithWC: boolean;
  wcError: string | null;
  clearWcError: () => void;
}

const WalletConnectContext = createContext<WalletConnectContextType | undefined>(undefined);

interface WalletConnectProviderProps {
  children: ReactNode;
}

export function WalletConnectProvider({ children }: WalletConnectProviderProps) {
  const [wcError, setWcError] = useState<string | null>(null);
  const [isSigningWithWC] = useState(false);

  const clearWcError = useCallback(() => setWcError(null), []);

  const openWalletConnectModal = useCallback(() => {
    setWcError('WalletConnect is not available. Please use the built-in wallet.');
  }, []);

  const disconnectWalletConnect = useCallback(async () => {
    /* no-op */
  }, []);

  const signTransactionWithWalletConnect = useCallback(async (
    _tx: WalletConnectTransaction
  ): Promise<SignedTransactionResult> => {
    throw new Error('WalletConnect is not available in this app.');
  }, []);

  const value: WalletConnectContextType = {
    isWalletConnectConnected: false,
    wcAddress: undefined,
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
