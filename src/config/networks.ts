/**
 * SINGLE SOURCE OF TRUTH for all supported blockchain networks.
 * Every component/hook MUST import from here — never hardcode network data elsewhere.
 */

export type Chain =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'bsc'
  | 'solana'
  | 'tron'
  | 'bitcoin';

export type AddressKey = 'evm' | 'solana' | 'tron' | 'btc';

export interface NetworkConfig {
  id: Chain;
  name: string;
  symbol: string;
  /** Lowercase ticker for logo API: https://api.elbstream.com/logos/crypto/{logoSymbol} */
  logoSymbol: string;
  color: string;
  decimals: number;
  /** Which wallet address key this chain uses */
  addressKey: AddressKey;
  explorerUrl: string;
  chainId?: { mainnet: number; testnet: number };
  rpcUrl?: { mainnet: string; testnet: string };
  isEvm: boolean;
}

export const NETWORKS: NetworkConfig[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    logoSymbol: 'eth',
    color: '#627EEA',
    decimals: 18,
    addressKey: 'evm',
    explorerUrl: 'https://etherscan.io',
    chainId: { mainnet: 1, testnet: 11155111 },
    rpcUrl: { mainnet: 'https://eth.llamarpc.com', testnet: 'https://rpc.sepolia.org' },
    isEvm: true,
  },
  {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'POL',
    logoSymbol: 'matic',
    color: '#8247E5',
    decimals: 18,
    addressKey: 'evm',
    explorerUrl: 'https://polygonscan.com',
    chainId: { mainnet: 137, testnet: 80002 },
    rpcUrl: { mainnet: 'https://polygon-rpc.com', testnet: 'https://rpc-amoy.polygon.technology' },
    isEvm: true,
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    symbol: 'ETH',
    logoSymbol: 'arb',
    color: '#28A0F0',
    decimals: 18,
    addressKey: 'evm',
    explorerUrl: 'https://arbiscan.io',
    chainId: { mainnet: 42161, testnet: 421614 },
    rpcUrl: { mainnet: 'https://arb1.arbitrum.io/rpc', testnet: 'https://sepolia-rollup.arbitrum.io/rpc' },
    isEvm: true,
  },
  {
    id: 'bsc',
    name: 'BNB Chain',
    symbol: 'BNB',
    logoSymbol: 'bnb',
    color: '#F3BA2F',
    decimals: 18,
    addressKey: 'evm',
    explorerUrl: 'https://bscscan.com',
    chainId: { mainnet: 56, testnet: 97 },
    rpcUrl: { mainnet: 'https://bsc-dataseed.binance.org', testnet: 'https://data-seed-prebsc-1-s1.binance.org:8545' },
    isEvm: true,
  },
  {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    logoSymbol: 'sol',
    color: '#9945FF',
    decimals: 9,
    addressKey: 'solana',
    explorerUrl: 'https://explorer.solana.com',
    chainId: { mainnet: 0, testnet: 0 },
    rpcUrl: { mainnet: '', testnet: '' },
    isEvm: false,
  },
  {
    id: 'tron',
    name: 'Tron',
    symbol: 'TRX',
    logoSymbol: 'trx',
    color: '#FF0013',
    decimals: 6,
    addressKey: 'tron',
    explorerUrl: 'https://tronscan.org',
    chainId: { mainnet: 0, testnet: 0 },
    rpcUrl: { mainnet: '', testnet: '' },
    isEvm: false,
  },
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    logoSymbol: 'btc',
    color: '#F7931A',
    decimals: 8,
    addressKey: 'btc',
    explorerUrl: 'https://blockstream.info',
    chainId: { mainnet: 0, testnet: 0 },
    rpcUrl: { mainnet: '', testnet: '' },
    isEvm: false,
  },
];

/** Map for O(1) lookups by chain id */
export const NETWORK_MAP = Object.fromEntries(
  NETWORKS.map(n => [n.id, n])
) as Record<Chain, NetworkConfig>;

export function getNetwork(chain: Chain): NetworkConfig {
  return NETWORK_MAP[chain];
}

export function getNetworkLogoUrl(chain: Chain): string {
  return `https://api.elbstream.com/logos/crypto/${NETWORK_MAP[chain]?.logoSymbol ?? chain}`;
}

export function getExplorerUrl(chain: Chain): string {
  return NETWORK_MAP[chain]?.explorerUrl ?? 'https://etherscan.io';
}

export function getTxExplorerUrl(chain: Chain, txHash: string): string {
  const base = getExplorerUrl(chain).replace(/\/$/, '');
  if (chain === 'tron') return `${base}/#/transaction/${txHash}`;
  return `${base}/tx/${txHash}`;
}
