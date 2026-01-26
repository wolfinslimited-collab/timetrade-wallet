import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useWalletBalance, useTransactions, useGasEstimate, Chain, WalletBalance, Transaction, GasEstimate, TransactionsResponse, SUPPORTED_CHAINS, getChainInfo } from '@/hooks/useBlockchain';
import { useCryptoPrices, getPriceForSymbol } from '@/hooks/useCryptoPrices';
import { useQueryClient } from '@tanstack/react-query';
import { decryptPrivateKey, EncryptedData } from '@/utils/encryption';
import { 
  deriveMultipleAccounts, 
  DerivedAccount, 
  MultiChainAccounts, 
  SolanaDerivationPath,
  deriveSolanaAddressesAllPaths
} from '@/utils/walletDerivation';

interface BlockchainContextType {
  // Wallet state
  walletAddress: string | null;
  selectedChain: Chain;
  isConnected: boolean;
  isTestnet: boolean;

  // Multi-account support
  derivedAccounts: DerivedAccount[];
  activeAccountIndex: number;
  setActiveAccountIndex: (index: number) => void;
  isLoadingAccounts: boolean;

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
  
  // Multi-account state - stores both EVM and Solana accounts
  const [allDerivedAccounts, setAllDerivedAccounts] = useState<MultiChainAccounts>({ evm: [], solana: [] });
  const [activeAccountIndex, setActiveAccountIndex] = useState<number>(() => {
    const stored = localStorage.getItem('timetrade_active_account_index');
    return stored ? parseInt(stored, 10) : 0;
  });
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  
  const [walletAddress, setWalletAddress] = useState<string | null>(() => {
    const stored = localStorage.getItem('timetrade_wallet_address');
    return stored && stored.trim().length > 0 ? stored : null;
  });
  const [selectedChain, setSelectedChain] = useState<Chain>(() => {
    return (localStorage.getItem('timetrade_selected_chain') as Chain) || 'ethereum';
  });

  // Auto-connect and derive accounts from the stored, encrypted mnemonic.
  useEffect(() => {
    let cancelled = false;

    async function autoConnectFromMnemonic() {
      const storedPin = localStorage.getItem('timetrade_pin');
      const encryptedDataStr = localStorage.getItem('timetrade_seed_phrase');

      if (!storedPin || !encryptedDataStr) return;

      setIsLoadingAccounts(true);
      
      try {
        const encryptedData: EncryptedData = JSON.parse(encryptedDataStr);
        const decryptedPhrase = await decryptPrivateKey(encryptedData, storedPin);
        const words = decryptedPhrase.split(/\s+/);
        
        // Get stored Solana derivation path preference, or detect it
        let solanaPathStyle = localStorage.getItem('timetrade_solana_derivation_path') as SolanaDerivationPath | null;
        
        // If no stored path preference, try to auto-detect by checking which path has balance
        if (!solanaPathStyle) {
          const phrase = words.join(' ').toLowerCase().trim().replace(/\s+/g, ' ');
          const allPaths = deriveSolanaAddressesAllPaths(phrase, 0);
          
          // Store the first address from each path for potential balance checking
          // Default to 'legacy' as it's commonly used by Trust Wallet
          solanaPathStyle = 'legacy';
          
          // Store all detected addresses for debugging
          for (const pathInfo of allPaths) {
            console.log(`Solana path ${pathInfo.path} (${pathInfo.fullPath}): ${pathInfo.address}`);
          }
          
          localStorage.setItem('timetrade_solana_derivation_path', solanaPathStyle);
        }
        
        // Derive all 5 accounts for both EVM and Solana with the correct path
        const accounts = deriveMultipleAccounts(words, 5, solanaPathStyle);
        
        if (cancelled) return;
        
        setAllDerivedAccounts(accounts);
        
        // Store addresses for each chain type for multi-chain display
        if (accounts.evm.length > 0) {
          localStorage.setItem('timetrade_wallet_address_evm', accounts.evm[0].address);
        }
        if (accounts.solana.length > 0) {
          localStorage.setItem('timetrade_wallet_address_solana', accounts.solana[0].address);
        }
        
        // Set wallet address from active account index and chain
        const storedIndex = localStorage.getItem('timetrade_active_account_index');
        const storedChain = localStorage.getItem('timetrade_selected_chain') as Chain || 'ethereum';
        const index = storedIndex ? parseInt(storedIndex, 10) : 0;
        
        // Get appropriate accounts based on chain
        const chainAccounts = storedChain === 'solana' ? accounts.solana : accounts.evm;
        const activeAccount = chainAccounts[index] || chainAccounts[0];
        
        if (activeAccount && !walletAddress) {
          setWalletAddress(activeAccount.address);
          localStorage.setItem('timetrade_wallet_address', activeAccount.address);
        }
      } catch {
        // If anything fails (bad PIN, corrupted data), stay disconnected.
      } finally {
        if (!cancelled) {
          setIsLoadingAccounts(false);
        }
      }
    }

    autoConnectFromMnemonic();
    return () => {
      cancelled = true;
    };
  }, []);

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
    setAllDerivedAccounts({ evm: [], solana: [] });
    setActiveAccountIndex(0);
    localStorage.removeItem('timetrade_wallet_address');
    localStorage.removeItem('timetrade_active_account_index');
  }, []);

  const handleSetSelectedChain = useCallback((chain: Chain) => {
    setSelectedChain(chain);
    localStorage.setItem('timetrade_selected_chain', chain);
    
    // When switching chains, update wallet address to the correct chain's account
    const chainAccounts = chain === 'solana' ? allDerivedAccounts.solana : allDerivedAccounts.evm;
    if (chainAccounts.length > 0) {
      const accountIndex = Math.min(activeAccountIndex, chainAccounts.length - 1);
      const account = chainAccounts[accountIndex];
      if (account) {
        setWalletAddress(account.address);
        localStorage.setItem('timetrade_wallet_address', account.address);
      }
    }
  }, [allDerivedAccounts, activeAccountIndex]);

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['gasEstimate'] });
    queryClient.invalidateQueries({ queryKey: ['cryptoPrices'] });
  }, [queryClient]);

  // Extract transactions from response
  const transactionsData = transactionsQuery.data as TransactionsResponse | undefined;

  // Get accounts for current chain
  const derivedAccounts = React.useMemo(() => {
    return selectedChain === 'solana' ? allDerivedAccounts.solana : allDerivedAccounts.evm;
  }, [selectedChain, allDerivedAccounts]);

  // Handle switching active account
  const handleSetActiveAccountIndex = useCallback((index: number) => {
    const accounts = selectedChain === 'solana' ? allDerivedAccounts.solana : allDerivedAccounts.evm;
    if (index < 0 || index >= accounts.length) return;
    
    setActiveAccountIndex(index);
    localStorage.setItem('timetrade_active_account_index', String(index));
    
    const account = accounts[index];
    if (account) {
      setWalletAddress(account.address);
      localStorage.setItem('timetrade_wallet_address', account.address);
    }
  }, [selectedChain, allDerivedAccounts]);

  const value: BlockchainContextType = {
    walletAddress,
    selectedChain,
    isConnected: !!walletAddress,
    isTestnet: true,

    // Multi-account support
    derivedAccounts,
    activeAccountIndex,
    setActiveAccountIndex: handleSetActiveAccountIndex,
    isLoadingAccounts,

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
