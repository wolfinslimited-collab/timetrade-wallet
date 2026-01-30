import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { evmToTronAddress, isEvmAddress, isTronAddress } from '@/utils/tronAddress';

export type Chain = 'ethereum' | 'bitcoin' | 'solana' | 'polygon' | 'tron';

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
    testnetName: 'Mainnet',
  },
  { 
    id: 'polygon', 
    name: 'Polygon', 
    symbol: 'POL', 
    icon: '⬡', 
    color: '#8247E5',
    decimals: 18,
    testnetName: 'Mainnet',
  },
  { 
    id: 'bitcoin', 
    name: 'Bitcoin', 
    symbol: 'BTC', 
    icon: '₿', 
    color: '#F7931A',
    decimals: 8,
    testnetName: 'Mainnet',
  },
  { 
    id: 'solana', 
    name: 'Solana', 
    symbol: 'SOL', 
    icon: '◎', 
    color: '#9945FF',
    decimals: 9,
    testnetName: 'Mainnet',
  },
  { 
    id: 'tron', 
    name: 'Tron', 
    symbol: 'TRX', 
    icon: '◈', 
    color: '#FF0013',
    decimals: 6,
    testnetName: 'Mainnet',
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

// Solana-specific token transfer
export interface SolanaTokenTransfer {
  source: string;
  destination: string;
  amount: string;
  decimals?: number;
  mint?: string;
  symbol?: string;
}

// Solana-specific parsed instruction
export interface ParsedInstruction {
  programId: string;
  programName: string;
  type: string;
  info?: Record<string, unknown>;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
  blockNumber?: number;
  // Tron-specific fields (optional)
  contractType?: string;
  contractAddress?: string;
  contractAddressBase58?: string;
  // Solana-specific fields
  fee?: number;
  parsedInstructions?: ParsedInstruction[];
  tokenTransfers?: SolanaTokenTransfer[];
  signers?: string[];
  logs?: string[];
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

// Mock data functions - backend removed
function getMockBalance(chain: Chain, address: string): WalletBalance {
  const chainInfo = getChainInfo(chain);
  return {
    chain,
    native: {
      symbol: chainInfo.symbol,
      balance: '0',
      decimals: chainInfo.decimals,
    },
    tokens: [],
    explorerUrl: getExplorerUrl(chain, address),
  };
}

function getExplorerUrl(chain: Chain, address: string): string {
  const explorers: Record<Chain, string> = {
    ethereum: `https://etherscan.io/address/${address}`,
    polygon: `https://polygonscan.com/address/${address}`,
    solana: `https://solscan.io/account/${address}`,
    tron: `https://tronscan.org/#/address/${address}`,
    bitcoin: `https://blockchair.com/bitcoin/address/${address}`,
  };
  return explorers[chain] || '';
}

function getMockTransactions(chain: Chain): TransactionsResponse {
  return {
    chain,
    transactions: [],
    explorerUrl: '',
  };
}

function getMockGasEstimate(chain: Chain): GasEstimate {
  return {
    chain,
    slow: { fee: '0.001', estimatedTime: 60 },
    medium: { fee: '0.002', estimatedTime: 30 },
    fast: { fee: '0.003', estimatedTime: 15 },
    unit: 'gwei',
  };
}

export function useWalletBalance(address: string | null, chain: Chain = 'ethereum') {
  return useQuery({
    queryKey: ['walletBalance', chain, address],
    queryFn: () => Promise.resolve(getMockBalance(chain, address || '')),
    enabled: !!address,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useMultiChainBalances(address: string | null) {
  const queryClient = useQueryClient();
  
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
    queryFn: () => Promise.resolve(getMockTransactions(chain)),
    enabled: !!address,
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useGasEstimate(chain: Chain = 'ethereum') {
  return useQuery({
    queryKey: ['gasEstimate', chain],
    queryFn: () => Promise.resolve(getMockGasEstimate(chain)),
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
