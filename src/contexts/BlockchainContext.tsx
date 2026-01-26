import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useWalletBalance, useTransactions, useGasEstimate, Chain, WalletBalance, Transaction, GasEstimate, formatBalance } from '@/hooks/useBlockchain';
import { useQueryClient } from '@tanstack/react-query';

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
  isLoadingTransactions: boolean;
  transactionsError: Error | null;

  // Gas data
  gasEstimate: GasEstimate | undefined;
  isLoadingGas: boolean;
  gasError: Error | null;
}

const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined);

interface BlockchainProviderProps {
  children: ReactNode;
}

// Mock price data (in production, this would come from a price API)
const TOKEN_PRICES: Record<string, number> = {
  ETH: 3245.67,
  BTC: 65000,
  SOL: 150,
  USDC: 1,
  USDT: 1,
  MATIC: 0.85,
};

export function BlockchainProvider({ children }: BlockchainProviderProps) {
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    // Restore from localStorage
    return localStorage.getItem('timetrade_wallet_address');
  });
  const [selectedChain, setSelectedChain] = useState<Chain>('ethereum');

  // Queries
  const balanceQuery = useWalletBalance(walletAddress, selectedChain);
  const transactionsQuery = useTransactions(walletAddress, selectedChain);
  const gasQuery = useGasEstimate(selectedChain);

  // Calculate total USD balance
  const totalBalanceUsd = React.useMemo(() => {
    if (!balanceQuery.data) return 0;
    
    const { native, tokens } = balanceQuery.data;
    
    // Calculate native balance in USD
    const nativeBalance = parseFloat(native.balance) / Math.pow(10, native.decimals);
    const nativePrice = TOKEN_PRICES[native.symbol] || 0;
    let total = nativeBalance * nativePrice;
    
    // Add token balances
    for (const token of tokens) {
      const tokenBalance = parseFloat(token.balance) / Math.pow(10, token.decimals);
      const tokenPrice = TOKEN_PRICES[token.symbol] || token.price || 0;
      total += tokenBalance * tokenPrice;
    }
    
    return total;
  }, [balanceQuery.data]);

  const connectWallet = useCallback((address: string) => {
    setWalletAddress(address);
    localStorage.setItem('timetrade_wallet_address', address);
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    localStorage.removeItem('timetrade_wallet_address');
  }, []);

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['gasEstimate'] });
  }, [queryClient]);

  const value: BlockchainContextType = {
    walletAddress,
    selectedChain,
    isConnected: !!walletAddress,
    isTestnet: true, // Sepolia testnet

    connectWallet,
    disconnectWallet,
    setSelectedChain,
    refreshAll,

    balance: balanceQuery.data,
    isLoadingBalance: balanceQuery.isLoading,
    balanceError: balanceQuery.error,
    totalBalanceUsd,

    transactions: transactionsQuery.data as Transaction[] | undefined,
    isLoadingTransactions: transactionsQuery.isLoading,
    transactionsError: transactionsQuery.error,

    gasEstimate: gasQuery.data,
    isLoadingGas: gasQuery.isLoading,
    gasError: gasQuery.error,
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
