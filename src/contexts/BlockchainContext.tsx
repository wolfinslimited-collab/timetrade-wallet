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

const isLikelySolanaAddress = (address: string | null | undefined) => {
  if (!address) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
};

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

// Create context with a default value to prevent "outside provider" errors during HMR/fast refresh
const defaultContextValue: BlockchainContextType = {
  walletAddress: null,
  selectedChain: 'ethereum',
  isConnected: false,
  isTestnet: true,
  derivedAccounts: [],
  activeAccountIndex: 0,
  setActiveAccountIndex: () => {},
  isLoadingAccounts: false,
  connectWallet: () => {},
  disconnectWallet: () => {},
  setSelectedChain: () => {},
  refreshAll: () => {},
  balance: undefined,
  isLoadingBalance: false,
  balanceError: null,
  totalBalanceUsd: 0,
  unifiedAssets: undefined,
  transactions: undefined,
  transactionsExplorerUrl: undefined,
  isLoadingTransactions: false,
  transactionsError: null,
  gasEstimate: undefined,
  isLoadingGas: false,
  gasError: null,
  prices: undefined,
  isLoadingPrices: false,
};

const BlockchainContext = createContext<BlockchainContextType>(defaultContextValue);

interface BlockchainProviderProps {
  children: ReactNode;
}

export function BlockchainProvider({ children }: BlockchainProviderProps) {
  const queryClient = useQueryClient();

  // Defer queries until after mount to avoid React HMR state corruption
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // Used to force a re-render when we update derived address keys in localStorage.
  const [derivedAddressTick, bumpDerivedAddressTick] = useState(0);
  
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

  // IMMEDIATE cleanup of corrupted Solana storage on mount (before any async derivation)
  // This runs synchronously on first render to prevent bad addresses from being used
  React.useMemo(() => {
    const storedSol = localStorage.getItem('timetrade_wallet_address_solana');
    if (storedSol && !isLikelySolanaAddress(storedSol)) {
      console.warn(`[BlockchainContext] Removing invalid Solana address on mount: ${storedSol}`);
      localStorage.removeItem('timetrade_wallet_address_solana');
    }
  }, []); // Empty deps = runs once on mount

  // Guard against corrupted Solana storage values (e.g. EVM 0x... accidentally saved under the Solana key)
  useEffect(() => {
    const storedSol = localStorage.getItem('timetrade_wallet_address_solana');
    if (!storedSol) return;
    if (isLikelySolanaAddress(storedSol)) return;

    const candidate =
      allDerivedAccounts.solana[activeAccountIndex]?.address ||
      allDerivedAccounts.solana[0]?.address ||
      null;

    if (candidate && isLikelySolanaAddress(candidate)) {
      localStorage.setItem('timetrade_wallet_address_solana', candidate);
      console.log(`Repaired Solana address in storage: ${candidate}`);
    } else {
      localStorage.removeItem('timetrade_wallet_address_solana');
      console.warn('Removed invalid Solana address from storage (no valid derived candidate found).');
    }

    bumpDerivedAddressTick((t) => t + 1);
  }, [activeAccountIndex, allDerivedAccounts]);

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

        // Get stored settings
        let solanaPathStyle = localStorage.getItem('timetrade_solana_derivation_path') as SolanaDerivationPath | null;
        const storedIndex = localStorage.getItem('timetrade_active_account_index');
        const storedChain = localStorage.getItem('timetrade_selected_chain') as Chain || 'ethereum';
        const index = storedIndex ? parseInt(storedIndex, 10) : 0;

        // IMMEDIATELY derive and store addresses for all chains before any balance checking
        // This ensures UnifiedTokenList/useUnifiedPortfolio have valid addresses right away
        const initialPath = solanaPathStyle || 'legacy';
        const initialAccounts = deriveMultipleAccounts(words, 5, initialPath);
        
        // Store addresses immediately (will be updated later if balance detection finds different funded address)
        const initialEvm = initialAccounts.evm[index] || initialAccounts.evm[0];
        const initialSolana = initialAccounts.solana[index] || initialAccounts.solana[0];
        const initialTron = initialAccounts.tron[index] || initialAccounts.tron[0];
        
        if (initialEvm) {
          localStorage.setItem('timetrade_wallet_address_evm', initialEvm.address);
        }
        if (initialSolana) {
          localStorage.setItem('timetrade_wallet_address_solana', initialSolana.address);
          console.log(`Initial Solana address stored: ${initialSolana.address}`);
        }
        if (initialTron) {
          localStorage.setItem('timetrade_wallet_address_tron', initialTron.address);
        }
        
        // Set accounts state immediately so UI can render
        if (cancelled) return;
        setAllDerivedAccounts(initialAccounts);

        const hasSolanaBalance = async (address: string): Promise<boolean> => {
          try {
            console.log(`Checking Solana balance for address: ${address}`);
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

            console.log(`Solana balance response for ${address}:`, data);

            const nativeBalance = data?.data?.native?.balance || '0';
            const tokens = data?.data?.tokens || [];
            const nativeBal = parseFloat(nativeBalance);
            const hasNativeBalance = nativeBalance !== '0' && !isNaN(nativeBal) && nativeBal > 0;
            const hasTokens = Array.isArray(tokens) && tokens.some((t: { balance?: string }) => {
              const bal = parseFloat(t?.balance || '0');
              return !isNaN(bal) && bal > 0;
            });
            console.log(`Address ${address}: hasNative=${hasNativeBalance}, hasTokens=${hasTokens}`);
            return hasNativeBalance || hasTokens;
          } catch (err) {
            console.error('Solana balance check failed:', err);
            return false;
          }
        };

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
          console.log('No stored Solana path, running auto-detection...');
          const detected = await autoDetectSolanaPathAndIndex();
          // Default to 'legacy' for Trust Wallet compatibility if no balance found
          solanaPathStyle = detected?.path ?? 'legacy';
          detectedSolanaAddress = detected?.address ?? null;
          detectedSolanaIndex = detected?.index ?? null;
          localStorage.setItem('timetrade_solana_derivation_path', solanaPathStyle);
          console.log(`Saved Solana derivation path preference: ${solanaPathStyle}, detected address: ${detectedSolanaAddress}`);
        }

        // Persist the detected Solana address (used by UnifiedTokenList to fetch SPL tokens)
        if (detectedSolanaAddress && typeof detectedSolanaIndex === 'number') {
          localStorage.setItem('timetrade_wallet_address_solana', detectedSolanaAddress);
          localStorage.setItem('timetrade_solana_balance_account_index', String(detectedSolanaIndex));
          console.log(`Saved Solana balance address (acct #${detectedSolanaIndex}): ${detectedSolanaAddress}`);
        }
        
        // Re-derive accounts with the (potentially updated) Solana path after balance detection
        const accounts = deriveMultipleAccounts(words, 5, solanaPathStyle);
        
        if (cancelled) return;
        
        setAllDerivedAccounts(accounts);
        
        // Update addresses if balance detection found a funded Solana address on a different account
        const activeEvm = accounts.evm[index] || accounts.evm[0];
        const activeSolana = accounts.solana[index] || accounts.solana[0];
        const activeTron = accounts.tron[index] || accounts.tron[0];
        
        if (activeEvm) {
          localStorage.setItem('timetrade_wallet_address_evm', activeEvm.address);
        }
        // Update Solana address if we detected a funded one
        if (detectedSolanaAddress) {
          localStorage.setItem('timetrade_wallet_address_solana', detectedSolanaAddress);
          console.log(`Updated Solana address to funded account: ${detectedSolanaAddress}`);
        } else if (activeSolana) {
          // Keep the initially stored address (already set above)
          console.log(`Keeping initial Solana address: ${activeSolana.address}`);
        }
        // Store Tron address
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
      } catch (err) {
        // If anything fails (bad PIN, corrupted data), stay disconnected.
        // Log it so we can debug cases where Solana address derivation never runs.
        console.error('[BlockchainContext] autoConnectFromMnemonic failed:', err);
      } finally {
        if (!cancelled) {
          setIsLoadingAccounts(false);
        }
      }
    }

    autoConnectFromMnemonic();

    // If the PIN is repaired/updated (e.g., during unlock), re-run derivation.
    const onPinUpdated = () => {
      if (cancelled) return;
      autoConnectFromMnemonic();
    };
    window.addEventListener('timetrade:pin-updated', onPinUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('timetrade:pin-updated', onPinUpdated);
    };
  }, []);

  // Ensure selected-chain queries use the correct chain-specific address (Solana/Tron differ from EVM).
  const selectedChainAddress = React.useMemo(() => {
    const evm = localStorage.getItem('timetrade_wallet_address_evm');
    const sol = localStorage.getItem('timetrade_wallet_address_solana');
    const tron = localStorage.getItem('timetrade_wallet_address_tron');

    if (selectedChain === 'solana') {
      if (isLikelySolanaAddress(sol)) return sol!.trim();
      if (isLikelySolanaAddress(walletAddress)) return walletAddress!.trim();
      return null;
    }
    if (selectedChain === 'tron') {
      if (isTronAddress(tron)) return tron!.trim();
      if (isTronAddress(walletAddress)) return walletAddress!.trim();
      return null;
    }
    if (selectedChain === 'ethereum' || selectedChain === 'polygon') {
      if (isEvmAddress(evm)) return evm!.trim();
      if (isEvmAddress(walletAddress)) return walletAddress!.trim();
      return null;
    }
    return walletAddress;
  }, [selectedChain, walletAddress, derivedAddressTick]);

  // Queries (selected chain) - only enable after mount to avoid HMR issues
  const balanceQuery = useWalletBalance(isMounted ? selectedChainAddress : null, selectedChain);
  const transactionsQuery = useTransactions(isMounted ? selectedChainAddress : null, selectedChain);
  const gasQuery = useGasEstimate(selectedChain);

  // Unified (multi-chain) portfolio values for dashboard totals/allocations.
  // Only enable after mount to prevent "Should have a queue" React errors during HMR
  const unified = useUnifiedPortfolio(isMounted && !!walletAddress);
  const totalBalanceUsd = unified.totalUsd;
  const unifiedAssets = unified.assets;

  const connectWallet = useCallback((address: string) => {
    const trimmed = address.trim();
    setWalletAddress(trimmed);
    localStorage.setItem('timetrade_wallet_address', trimmed);

    // Persist chain-specific keys ONLY if the address format matches that chain.
    // This prevents EVM 0x... addresses from poisoning the Solana storage key.
    const isSol = isLikelySolanaAddress(trimmed);
    const isEvm = isEvmAddress(trimmed);
    const isTron = isTronAddress(trimmed);

    if (isSol) {
      localStorage.setItem('timetrade_wallet_address_solana', trimmed);
    }

    if (isEvm) {
      localStorage.setItem('timetrade_wallet_address_evm', trimmed);
      const tron = evmToTronAddress(trimmed);
      if (tron) localStorage.setItem('timetrade_wallet_address_tron', tron);
    }

    if (isTron) {
      localStorage.setItem('timetrade_wallet_address_tron', trimmed);
    }

    // If format is ambiguous, fall back to the selected chain hint.
    if (!isSol && !isEvm && !isTron) {
      if (selectedChain === 'solana') localStorage.setItem('timetrade_wallet_address_solana', trimmed);
      if (selectedChain === 'tron') localStorage.setItem('timetrade_wallet_address_tron', trimmed);
      if (selectedChain === 'ethereum' || selectedChain === 'polygon') localStorage.setItem('timetrade_wallet_address_evm', trimmed);
    }

    bumpDerivedAddressTick((t) => t + 1);
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
  return useContext(BlockchainContext);
}
