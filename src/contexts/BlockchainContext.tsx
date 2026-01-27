import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useWalletBalance, useTransactions, useGasEstimate, Chain, WalletBalance, Transaction, GasEstimate, TransactionsResponse, SUPPORTED_CHAINS, getChainInfo } from '@/hooks/useBlockchain';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { decryptPrivateKey, EncryptedData } from '@/utils/encryption';
import { useUnifiedPortfolio, UnifiedAsset } from '@/hooks/useUnifiedPortfolio';
import { 
  deriveMultipleAccounts, 
  DerivedAccount, 
  MultiChainAccounts, 
  SolanaDerivationPath,
  deriveSolanaAddressesAllPaths,
  deriveSolanaAddress,
  deriveTronAddress
} from '@/utils/walletDerivation';
import { evmToTronAddress, isEvmAddress, isTronAddress } from '@/utils/tronAddress';

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
  unifiedAssets: UnifiedAsset[] | undefined;

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

  // Used to force a re-render when we update derived address keys in localStorage.
  const [, bumpDerivedAddressTick] = useState(0);
  
  // Multi-account state - stores both EVM and Solana accounts
  const [allDerivedAccounts, setAllDerivedAccounts] = useState<MultiChainAccounts>({ evm: [], solana: [], tron: [] });
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

  // Ensure we always have a valid Tron address stored for unified multi-chain views.
  // This covers existing sessions and manual connect flows that only provide an EVM address.
  useEffect(() => {
    if (!walletAddress) return;
    if (!isEvmAddress(walletAddress)) return;

    const existing = localStorage.getItem('timetrade_wallet_address_tron');
    if (existing && isTronAddress(existing)) return;

    const derived = evmToTronAddress(walletAddress);
    if (derived) {
      localStorage.setItem('timetrade_wallet_address_tron', derived);
      bumpDerivedAddressTick((t) => t + 1);
    }
  }, [walletAddress]);

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
        const phrase = words.join(' ').toLowerCase().trim().replace(/\s+/g, ' ');

        const hasSolanaBalance = async (address: string): Promise<boolean> => {
          try {
            const { data, error } = await supabase.functions.invoke('blockchain', {
              body: {
                action: 'getBalance',
                chain: 'solana',
                address,
                testnet: false,
              },
            });

            if (error) {
              console.error('Solana balance check invoke error:', error);
              return false;
            }

            const nativeBalance = data?.data?.native?.balance || '0';
            const tokens = data?.data?.tokens || [];
            const hasNativeBalance = nativeBalance !== '0' && parseFloat(nativeBalance) > 0;
            const hasTokens = Array.isArray(tokens) && tokens.length > 0;
            return hasNativeBalance || hasTokens;
          } catch (err) {
            console.error('Solana balance check failed:', err);
            return false;
          }
        };
        
        // Get stored Solana derivation path preference
        let solanaPathStyle = localStorage.getItem('timetrade_solana_derivation_path') as SolanaDerivationPath | null;

        // Scan a few common account indices as users often keep SOL/SPL on account #1+.
        const SOLANA_SCAN_INDICES = [0, 1, 2, 3, 4];
        const SOLANA_PATH_STYLES: SolanaDerivationPath[] = ['phantom', 'solflare', 'legacy'];

        const findFirstBalanceForSpecificPath = async (
          path: SolanaDerivationPath
        ): Promise<{ index: number; address: string } | null> => {
          const checks = await Promise.all(
            SOLANA_SCAN_INDICES.map(async (i) => {
              const address = deriveSolanaAddress(phrase, i, path);
              const ok = await hasSolanaBalance(address);
              return { index: i, address, ok };
            })
          );
          const hit = checks.find((c) => c.ok);
          return hit ? { index: hit.index, address: hit.address } : null;
        };

        const autoDetectSolanaPathAndIndex = async (): Promise<
          { path: SolanaDerivationPath; index: number; address: string } | null
        > => {
          console.log('Auto-detecting Solana derivation path + account index (0-4)...');

          for (const i of SOLANA_SCAN_INDICES) {
            const allPaths = deriveSolanaAddressesAllPaths(phrase, i);

            const addressChecks = SOLANA_PATH_STYLES
              .map((path) => {
                const info = allPaths.find((p) => p.path === path);
                return info ? { path, address: info.address, fullPath: info.fullPath } : null;
              })
              .filter(Boolean) as { path: SolanaDerivationPath; address: string; fullPath: string }[];

            for (const c of addressChecks) {
              console.log(`Solana acct #${i} path ${c.path} (${c.fullPath}): ${c.address}`);
            }

            const balanceResults = await Promise.all(
              addressChecks.map(async ({ path, address }) => ({
                path,
                address,
                hasBalance: await hasSolanaBalance(address),
              }))
            );

            const hit = balanceResults.find((r) => r.hasBalance);
            if (hit) {
              return { path: hit.path, index: i, address: hit.address };
            }
          }

          return null;
        };

        let detectedSolanaAddress: string | null = null;
        let detectedSolanaIndex: number | null = null;

        // If a stored path exists, keep it if ANY of indices 0-4 has balance.
        if (solanaPathStyle) {
          const hit = await findFirstBalanceForSpecificPath(solanaPathStyle);
          if (hit) {
            detectedSolanaAddress = hit.address;
            detectedSolanaIndex = hit.index;
          } else {
            // Stored path appears wrong (or user has no SPL/native on indices 0-4)
            solanaPathStyle = null;
          }
        }

        // If no valid stored path (or no balances), detect across common path styles.
        if (!solanaPathStyle) {
          const detected = await autoDetectSolanaPathAndIndex();
          solanaPathStyle = detected?.path ?? 'legacy';
          detectedSolanaAddress = detected?.address ?? null;
          detectedSolanaIndex = detected?.index ?? null;
          localStorage.setItem('timetrade_solana_derivation_path', solanaPathStyle);
          console.log(`Saved Solana derivation path preference: ${solanaPathStyle}`);
        }

        // Persist the detected Solana address (used by UnifiedTokenList to fetch SPL tokens)
        if (detectedSolanaAddress && typeof detectedSolanaIndex === 'number') {
          localStorage.setItem('timetrade_wallet_address_solana', detectedSolanaAddress);
          localStorage.setItem('timetrade_solana_balance_account_index', String(detectedSolanaIndex));
          console.log(`Saved Solana balance address (acct #${detectedSolanaIndex}): ${detectedSolanaAddress}`);
        }
        
        // Derive all 5 accounts for both EVM and Solana with the correct path
        const accounts = deriveMultipleAccounts(words, 5, solanaPathStyle);
        
        if (cancelled) return;
        
        setAllDerivedAccounts(accounts);
        
        // Set wallet address from active account index and chain
        const storedIndex = localStorage.getItem('timetrade_active_account_index');
        const storedChain = localStorage.getItem('timetrade_selected_chain') as Chain || 'ethereum';
        const index = storedIndex ? parseInt(storedIndex, 10) : 0;

        // Store addresses for each chain type for multi-chain display (match active index)
        const activeEvm = accounts.evm[index] || accounts.evm[0];
        const activeSolana = accounts.solana[index] || accounts.solana[0];
        const activeTron = accounts.tron[index] || accounts.tron[0];
        if (activeEvm) {
          localStorage.setItem('timetrade_wallet_address_evm', activeEvm.address);
        }
        // Always ensure Solana address is stored (fallback if auto-detection didn't find a funded address)
        if (activeSolana) {
          // Only overwrite if we don't already have a detected address with balance
          const existingSolanaAddr = localStorage.getItem('timetrade_wallet_address_solana');
          if (!existingSolanaAddr || !detectedSolanaAddress) {
            localStorage.setItem('timetrade_wallet_address_solana', activeSolana.address);
            console.log(`Saved Solana address (acct #${index}): ${activeSolana.address}`);
          }
        }
        // Store Tron address for UnifiedTokenList
        if (activeTron) {
          localStorage.setItem('timetrade_wallet_address_tron', activeTron.address);
          console.log(`Saved Tron address (acct #${index}): ${activeTron.address}`);
        }
        
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

  // Ensure selected-chain queries use the correct chain-specific address (Solana/Tron differ from EVM).
  const selectedChainAddress = React.useMemo(() => {
    const evm = localStorage.getItem('timetrade_wallet_address_evm');
    const sol = localStorage.getItem('timetrade_wallet_address_solana');
    const tron = localStorage.getItem('timetrade_wallet_address_tron');

    if (selectedChain === 'solana') return sol || walletAddress;
    if (selectedChain === 'tron') return tron || walletAddress;
    if (selectedChain === 'ethereum' || selectedChain === 'polygon') return evm || walletAddress;
    return walletAddress;
  }, [selectedChain, walletAddress]);

  // Queries (selected chain)
  const balanceQuery = useWalletBalance(selectedChainAddress, selectedChain);
  const transactionsQuery = useTransactions(selectedChainAddress, selectedChain);
  const gasQuery = useGasEstimate(selectedChain);

  // Unified (multi-chain) portfolio values for dashboard totals/allocations.
  const unified = useUnifiedPortfolio(!!walletAddress);
  const totalBalanceUsd = unified.totalUsd;
  const unifiedAssets = unified.assets;

  const connectWallet = useCallback((address: string) => {
    const trimmed = address.trim();
    setWalletAddress(trimmed);
    localStorage.setItem('timetrade_wallet_address', trimmed);

    // Ensure multi-chain views (like UnifiedTokenList) always have the right address keys.
    // This is especially important for manual “Connect Wallet” flows (no mnemonic).
    if (selectedChain === 'solana') {
      localStorage.setItem('timetrade_wallet_address_solana', trimmed);
    } else if (selectedChain === 'ethereum' || selectedChain === 'polygon') {
      localStorage.setItem('timetrade_wallet_address_evm', trimmed);

      // Also persist a Tron-formatted address so Tron balances can be fetched/displayed.
      const tron = evmToTronAddress(trimmed);
      if (tron) localStorage.setItem('timetrade_wallet_address_tron', tron);
    }
  }, [selectedChain]);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setAllDerivedAccounts({ evm: [], solana: [], tron: [] });
    setActiveAccountIndex(0);
    localStorage.removeItem('timetrade_wallet_address');
    localStorage.removeItem('timetrade_wallet_address_evm');
    localStorage.removeItem('timetrade_wallet_address_solana');
    localStorage.removeItem('timetrade_wallet_address_tron');
    localStorage.removeItem('timetrade_solana_balance_account_index');
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

    // Keep multi-chain address keys in sync with the active index
    const evmAcc = allDerivedAccounts.evm[index];
    const solAcc = allDerivedAccounts.solana[index];
    const tronAcc = allDerivedAccounts.tron[index];
    if (evmAcc) localStorage.setItem('timetrade_wallet_address_evm', evmAcc.address);
    if (solAcc) localStorage.setItem('timetrade_wallet_address_solana', solAcc.address);
    if (tronAcc) localStorage.setItem('timetrade_wallet_address_tron', tronAcc.address);
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
    isLoadingBalance: balanceQuery.isLoading || unified.isLoadingBalances,
    balanceError: (balanceQuery.error as Error | null) || unified.balanceError,
    totalBalanceUsd,
    unifiedAssets,

    transactions: transactionsData?.transactions,
    transactionsExplorerUrl: transactionsData?.explorerUrl,
    isLoadingTransactions: transactionsQuery.isLoading,
    transactionsError: transactionsQuery.error,

    gasEstimate: gasQuery.data,
    isLoadingGas: gasQuery.isLoading,
    gasError: gasQuery.error,
    
    prices: unified.prices,
    isLoadingPrices: unified.isLoadingPrices,
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
