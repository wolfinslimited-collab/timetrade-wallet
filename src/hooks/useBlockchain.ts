import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type Chain = 'ethereum' | 'bitcoin' | 'solana' | 'polygon';

export interface TokenBalance {
  symbol: string;
  balance: string;
  decimals: number;
  contractAddress?: string;
  name?: string;
  price?: number;
}

export interface WalletBalance {
  native: TokenBalance;
  tokens: TokenBalance[];
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
  type: 'send' | 'receive' | 'swap';
}

export interface GasEstimate {
  slow: { gasPrice: string; estimatedTime: number };
  medium: { gasPrice: string; estimatedTime: number };
  fast: { gasPrice: string; estimatedTime: number };
}

interface BlockchainResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function callBlockchainFunction<T>(
  action: string,
  chain: Chain,
  address: string,
  testnet: boolean = true
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('blockchain', {
    body: { action, chain, address, testnet },
  });

  if (error) {
    console.error('Blockchain function error:', error);
    throw new Error(error.message || 'Failed to call blockchain function');
  }

  const response = data as BlockchainResponse<T>;
  
  if (!response.success) {
    throw new Error(response.error || 'Unknown error');
  }

  return response.data as T;
}

export function useWalletBalance(address: string | null, chain: Chain = 'ethereum') {
  return useQuery({
    queryKey: ['walletBalance', chain, address],
    queryFn: () => callBlockchainFunction<WalletBalance>('getBalance', chain, address!, true),
    enabled: !!address,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useTransactions(address: string | null, chain: Chain = 'ethereum') {
  return useQuery({
    queryKey: ['transactions', chain, address],
    queryFn: () => callBlockchainFunction<Transaction[]>('getTransactions', chain, address!, true),
    enabled: !!address,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useGasEstimate(chain: Chain = 'ethereum') {
  return useQuery({
    queryKey: ['gasEstimate', chain],
    queryFn: () => callBlockchainFunction<GasEstimate>('estimateGas', chain, '', true),
    staleTime: 15000, // 15 seconds - gas prices change frequently
    refetchInterval: 30000,
  });
}

export function useBlockchain() {
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<Chain>('ethereum');

  const balanceQuery = useWalletBalance(walletAddress, selectedChain);
  const transactionsQuery = useTransactions(walletAddress, selectedChain);
  const gasQuery = useGasEstimate(selectedChain);

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['gasEstimate'] });
  }, [queryClient]);

  const connectWallet = useCallback((address: string) => {
    setWalletAddress(address);
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
  }, []);

  return {
    // State
    walletAddress,
    selectedChain,
    isConnected: !!walletAddress,

    // Actions
    connectWallet,
    disconnectWallet,
    setSelectedChain,
    refreshAll,

    // Balance data
    balance: balanceQuery.data,
    isLoadingBalance: balanceQuery.isLoading,
    balanceError: balanceQuery.error,

    // Transactions data
    transactions: transactionsQuery.data,
    isLoadingTransactions: transactionsQuery.isLoading,
    transactionsError: transactionsQuery.error,

    // Gas data
    gasEstimate: gasQuery.data,
    isLoadingGas: gasQuery.isLoading,
    gasError: gasQuery.error,
  };
}

// Helper to format balance with decimals
export function formatBalance(balance: string, decimals: number = 18): string {
  const num = parseFloat(balance) / Math.pow(10, decimals);
  return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

// Helper to format address (truncate)
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
