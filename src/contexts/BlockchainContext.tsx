import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useWalletBalance, useTransactions, useGasEstimate, Chain, WalletBalance, Transaction, GasEstimate, TransactionsResponse, SUPPORTED_CHAINS, getChainInfo } from '@/hooks/useBlockchain';
import { useCryptoPrices, getPriceForSymbol } from '@/hooks/useCryptoPrices';
import { useQueryClient } from '@tanstack/react-query';
import { decryptPrivateKey, EncryptedData } from '@/utils/encryption';
import { deriveEvmAddressFromMnemonicWords } from '@/utils/walletDerivation';

interface BlockchainContextType {
  // Wallet state
  walletAddress: string | null;
  selectedChain: Chain;
  isConnected: boolean;
  isTestnet: boolean;

  // Actions
  connectWallet: (address: string) => void;
  disconnectWallet: () => void;
  setSelectedChain: (chain: Chain) => void;
  refreshAll: () => void;

  // Balance data
  balance: WalletBalance | undefined;
  isLoadingBalance: boolean;
  balanceError: Error | null;
  totalBalanceUsd: number;

  // Transactions data
  transactions: Transaction[] | undefined;
  transactionsExplorerUrl: string | undefined;
  isLoadingTransactions: boolean;
  transactionsError: Error | null;

  // Gas data
  gasEstimate: GasEstimate | undefined;
  isLoadingGas: boolean;
  gasError: Error | null;

  // Price data
  prices: { symbol: string; price: number; change24h: number }[] | undefined;
  isLoadingPrices: boolean;
}

const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined);

interface BlockchainProviderProps {
  children: ReactNode;
}

export function BlockchainProvider({ children }: BlockchainProviderProps) {
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    const stored = localStorage.getItem('timetrade_wallet_address');
    return stored && stored.trim().length > 0 ? stored : null;
  });
  const [selectedChain, setSelectedChain] = useState<Chain>(() => {
    return (localStorage.getItem('timetrade_selected_chain') as Chain) || 'ethereum';
  });

  // Auto-connect from the stored, encrypted mnemonic (removes demo mode without requiring re-onboarding).
  useEffect(() => {
    let cancelled = false;

    async function autoConnectFromMnemonic() {
      if (walletAddress) return;

      const storedPin = localStorage.getItem('timetrade_pin');
      const encryptedDataStr = localStorage.getItem('timetrade_seed_phrase');

      if (!storedPin || !encryptedDataStr) return;

      try {
        const encryptedData: EncryptedData = JSON.parse(encryptedDataStr);
        const decryptedPhrase = await decryptPrivateKey(encryptedData, storedPin);
        const derivedAddress = deriveEvmAddressFromMnemonicWords(decryptedPhrase.split(/\s+/));

        if (cancelled) return;
        setWalletAddress(derivedAddress);
        localStorage.setItem('timetrade_wallet_address', derivedAddress);
      } catch {
        // If anything fails (bad PIN, corrupted data), stay disconnected.
      }
    }

    autoConnectFromMnemonic();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  // Queries
  const balanceQuery = useWalletBalance(walletAddress, selectedChain);
  const transactionsQuery = useTransactions(walletAddress, selectedChain);
  const gasQuery = useGasEstimate(selectedChain);
  
  // Get chain info for price fetching
  const chainInfo = getChainInfo(selectedChain);
  const tokenSymbols = balanceQuery.data?.tokens?.map(t => t.symbol) || [];
  const allSymbols = [...new Set(['ETH', 'BTC', 'SOL', 'MATIC', chainInfo.symbol, ...tokenSymbols])];
  
  // Fetch live prices
  const pricesQuery = useCryptoPrices(allSymbols);

  // Calculate total USD balance using live prices
  const totalBalanceUsd = React.useMemo(() => {
    if (!balanceQuery.data) return 0;
    
    const { native, tokens } = balanceQuery.data;
    
    // Calculate native balance in USD using live price
    const nativeBalance = parseFloat(native.balance) / Math.pow(10, native.decimals);
    const nativePrice = getPriceForSymbol(pricesQuery.data, native.symbol);
    let total = nativeBalance * nativePrice;
    
    // Add token balances
    for (const token of tokens) {
      const tokenBalance = parseFloat(token.balance) / Math.pow(10, token.decimals);
      const tokenPrice = getPriceForSymbol(pricesQuery.data, token.symbol) || token.price || 0;
      total += tokenBalance * tokenPrice;
    }
    
    return total;
  }, [balanceQuery.data, pricesQuery.data]);

  const connectWallet = useCallback((address: string) => {
    setWalletAddress(address);
    localStorage.setItem('timetrade_wallet_address', address);
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    localStorage.removeItem('timetrade_wallet_address');
  }, []);

  const handleSetSelectedChain = useCallback((chain: Chain) => {
    setSelectedChain(chain);
    localStorage.setItem('timetrade_selected_chain', chain);
  }, []);

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['gasEstimate'] });
    queryClient.invalidateQueries({ queryKey: ['cryptoPrices'] });
  }, [queryClient]);

  // Extract transactions from response
  const transactionsData = transactionsQuery.data as TransactionsResponse | undefined;

  const value: BlockchainContextType = {
    walletAddress,
    selectedChain,
    isConnected: !!walletAddress,
    isTestnet: true,

    connectWallet,
    disconnectWallet,
    setSelectedChain: handleSetSelectedChain,
    refreshAll,

    balance: balanceQuery.data,
    isLoadingBalance: balanceQuery.isLoading,
    balanceError: balanceQuery.error,
    totalBalanceUsd,

    transactions: transactionsData?.transactions,
    transactionsExplorerUrl: transactionsData?.explorerUrl,
    isLoadingTransactions: transactionsQuery.isLoading,
    transactionsError: transactionsQuery.error,

    gasEstimate: gasQuery.data,
    isLoadingGas: gasQuery.isLoading,
    gasError: gasQuery.error,
    
    prices: pricesQuery.data,
    isLoadingPrices: pricesQuery.isLoading,
  };

  return (
    <BlockchainContext.Provider value={value}>
      {children}
    </BlockchainContext.Provider>
  );
}

export function useBlockchainContext() {
  const context = useContext(BlockchainContext);
  if (context === undefined) {
    throw new Error('useBlockchainContext must be used within a BlockchainProvider');
  }
  return context;
}
