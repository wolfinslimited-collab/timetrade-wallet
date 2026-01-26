import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type Chain = 'ethereum' | 'bitcoin' | 'solana' | 'polygon';

export interface ChainInfo {
  id: Chain;
  name: string;
  symbol: string;
  icon: string;
  color: string;
  decimals: number;
  testnetName: string;
}

export const SUPPORTED_CHAINS: ChainInfo[] = [
  { 
    id: 'ethereum', 
    name: 'Ethereum', 
    symbol: 'ETH', 
    icon: '⟠', 
    color: '#627EEA',
    decimals: 18,
    testnetName: 'Sepolia',
  },
  { 
    id: 'polygon', 
    name: 'Polygon', 
    symbol: 'MATIC', 
    icon: '⬡', 
    color: '#8247E5',
    decimals: 18,
    testnetName: 'Amoy',
  },
  { 
    id: 'bitcoin', 
    name: 'Bitcoin', 
    symbol: 'BTC', 
    icon: '₿', 
    color: '#F7931A',
    decimals: 8,
    testnetName: 'Testnet',
  },
  { 
    id: 'solana', 
    name: 'Solana', 
    symbol: 'SOL', 
    icon: '◎', 
    color: '#9945FF',
    decimals: 9,
    testnetName: 'Devnet',
  },
];

export function getChainInfo(chain: Chain): ChainInfo {
  return SUPPORTED_CHAINS.find(c => c.id === chain) || SUPPORTED_CHAINS[0];
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  decimals: number;
  contractAddress?: string;
  name?: string;
  price?: number;
  logo?: string;
}

export interface WalletBalance {
  chain: Chain;
  native: TokenBalance;
  tokens: TokenBalance[];
  explorerUrl: string;
  error?: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
  blockNumber?: number;
}

export interface TransactionsResponse {
  chain: Chain;
  transactions: Transaction[];
  explorerUrl: string;
  error?: string;
}

export interface GasEstimate {
  chain: Chain;
  slow: { gasPrice?: string; fee?: string; estimatedTime: number };
  medium: { gasPrice?: string; fee?: string; estimatedTime: number };
  fast: { gasPrice?: string; fee?: string; estimatedTime: number };
  baseFee?: string;
  unit: string;
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
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useMultiChainBalances(address: string | null) {
  const queryClient = useQueryClient();
  
  const queries = SUPPORTED_CHAINS.map(chain => ({
    queryKey: ['walletBalance', chain.id, address],
    queryFn: () => callBlockchainFunction<WalletBalance>('getBalance', chain.id, address!, true),
    enabled: !!address,
    staleTime: 30000,
  }));

  // Use individual queries for each chain
  const ethereumBalance = useWalletBalance(address, 'ethereum');
  const polygonBalance = useWalletBalance(address, 'polygon');
  const bitcoinBalance = useWalletBalance(address, 'bitcoin');
  const solanaBalance = useWalletBalance(address, 'solana');

  return {
    ethereum: ethereumBalance,
    polygon: polygonBalance,
    bitcoin: bitcoinBalance,
    solana: solanaBalance,
    isLoading: ethereumBalance.isLoading || polygonBalance.isLoading || 
               bitcoinBalance.isLoading || solanaBalance.isLoading,
    refetchAll: () => {
      ethereumBalance.refetch();
      polygonBalance.refetch();
      bitcoinBalance.refetch();
      solanaBalance.refetch();
    },
  };
}

export function useTransactions(address: string | null, chain: Chain = 'ethereum') {
  return useQuery({
    queryKey: ['transactions', chain, address],
    queryFn: () => callBlockchainFunction<TransactionsResponse>('getTransactions', chain, address!, true),
    enabled: !!address,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useGasEstimate(chain: Chain = 'ethereum') {
  return useQuery({
    queryKey: ['gasEstimate', chain],
    queryFn: () => callBlockchainFunction<GasEstimate>('estimateGas', chain, '', true),
    staleTime: 15000,
    refetchInterval: 30000,
  });
}

// Helper to format balance with decimals
export function formatBalance(balance: string, decimals: number = 18): string {
  const num = parseFloat(balance) / Math.pow(10, decimals);
  if (num === 0) return '0';
  if (num < 0.000001) return '<0.000001';
  return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

// Helper to format address (truncate)
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
