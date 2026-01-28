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

  // Tracks which encrypted seed phrase was last used to derive accounts.
  // This allows us to re-derive only when the user actually switches to a different mnemonic.
  const lastSeedCipherRef = React.useRef<string | null>(null);

  // Defer queries until after mount to avoid React HMR state corruption
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

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

  const derivationRunRef = React.useRef(0);

  const deriveFromStoredMnemonic = useCallback(async (pinOverride?: string) => {
    console.log(`%c[BLOCKCHAIN CONTEXT] 🔐 Starting Derivation`, 'color: #8b5cf6; font-weight: bold;', {
      hasPinOverride: !!pinOverride,
      timestamp: new Date().toISOString(),
    });

    const encryptedDataStr = localStorage.getItem('timetrade_seed_phrase');
    const storedPin = localStorage.getItem('timetrade_pin');
    if (!encryptedDataStr) {
      console.log(`%c[BLOCKCHAIN CONTEXT] ⚠️ No seed phrase found`, 'color: #f59e0b;');
      return;
    }

    lastSeedCipherRef.current = encryptedDataStr;

    // Build a unique list of candidate PINs to try (handles rare PIN/seed desync issues)
    const pins = Array.from(
      new Set([pinOverride, storedPin].filter((p): p is string => !!p && p.trim().length > 0))
    );
    if (pins.length === 0) {
      console.log(`%c[BLOCKCHAIN CONTEXT] ⚠️ No PIN available`, 'color: #f59e0b;');
      return;
    }

    const runId = ++derivationRunRef.current;
    setIsLoadingAccounts(true);

    try {
      const encryptedData: EncryptedData = JSON.parse(encryptedDataStr);

      let decryptedPhrase: string | null = null;
      let usedPin: string | null = null;

      for (const pin of pins) {
        try {
          decryptedPhrase = await decryptPrivateKey(encryptedData, pin);
          usedPin = pin;
          break;
        } catch (err) {
          console.warn('[BlockchainContext] Failed to decrypt seed with provided PIN');
        }
      }

      if (!decryptedPhrase || !usedPin) {
        console.error(`%c[BLOCKCHAIN CONTEXT] ❌ PIN Mismatch`, 'color: #ef4444; font-weight: bold;');
        return;
      }

      // Auto-repair: if decryption succeeded with a different PIN than what's stored, update storage.
      if (storedPin !== usedPin) {
        localStorage.setItem('timetrade_pin', usedPin);
        window.dispatchEvent(new CustomEvent('timetrade:pin-updated'));
      }

      const words = decryptedPhrase.split(/\s+/);
      const phrase = words.join(' ').toLowerCase().trim().replace(/\s+/g, ' ');

      // Get stored settings
      const solanaPathStyle = (localStorage.getItem('timetrade_solana_derivation_path') as SolanaDerivationPath) || 'legacy';
      const storedIndex = localStorage.getItem('timetrade_active_account_index');
      const storedChain = (localStorage.getItem('timetrade_selected_chain') as Chain) || 'ethereum';
      const index = storedIndex ? parseInt(storedIndex, 10) : 0;

      // Keep state in sync even if some other part of the app wrote to localStorage directly.
      setActiveAccountIndex(index);

      // Derive addresses using stored path (no expensive auto-detection on every unlock)
      const accounts = deriveMultipleAccounts(words, 5, solanaPathStyle);
      const activeEvm = accounts.evm[index] || accounts.evm[0];
      const activeSolana = accounts.solana[index] || accounts.solana[0];
      const activeTron = accounts.tron[index] || accounts.tron[0];

      console.log(`%c[BLOCKCHAIN CONTEXT] ✅ Derived Addresses`, 'color: #22c55e; font-weight: bold;', {
        index,
        evm: activeEvm?.address || '(none)',
        solana: activeSolana?.address || '(none)',
        tron: activeTron?.address || '(none)',
        totalEvmAccounts: accounts.evm.length,
        totalSolanaAccounts: accounts.solana.length,
        totalTronAccounts: accounts.tron.length,
      });

      if (activeEvm) localStorage.setItem('timetrade_wallet_address_evm', activeEvm.address);
      if (activeSolana) localStorage.setItem('timetrade_wallet_address_solana', activeSolana.address);
      if (activeTron) localStorage.setItem('timetrade_wallet_address_tron', activeTron.address);

      if (runId !== derivationRunRef.current) return;
      setAllDerivedAccounts(accounts);

      const chainAccounts = storedChain === 'solana' ? accounts.solana : accounts.evm;
      const activeAccount = chainAccounts[index] || chainAccounts[0];
      if (activeAccount) {
        // Always sync walletAddress when mnemonic changes (or when index changes externally).
        setWalletAddress(activeAccount.address);
        localStorage.setItem('timetrade_wallet_address', activeAccount.address);
        console.log(`%c[BLOCKCHAIN CONTEXT] 📍 Active Wallet Set`, 'color: #3b82f6; font-weight: bold;', {
          chain: storedChain,
          address: activeAccount.address,
        });
        
        // CRITICAL: Invalidate queries AFTER addresses are set to trigger fresh fetches
        // This fixes the race condition where queries start before addresses are ready
        setTimeout(() => {
          console.log(`%c[BLOCKCHAIN CONTEXT] 🔄 Post-derivation query invalidation`, 'color: #06b6d4;');
          queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
          queryClient.invalidateQueries({ queryKey: ['cryptoPrices'] });
        }, 100);
      }
    } catch (err) {
      console.error(`%c[BLOCKCHAIN CONTEXT] ❌ Derivation Failed`, 'color: #ef4444; font-weight: bold;', err);
    } finally {
      if (runId === derivationRunRef.current) {
        setIsLoadingAccounts(false);
      }
    }
  }, [walletAddress]);

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
    console.log(`%c[BLOCKCHAIN CONTEXT] 🚀 Initializing...`, 'color: #8b5cf6; font-weight: bold;');
    deriveFromStoredMnemonic();

    const onUnlocked = (e: Event) => {
      try {
        console.log(`%c[BLOCKCHAIN CONTEXT] 🔓 Unlock event received`, 'color: #22c55e;');
        const pin = (e as CustomEvent<{ pin?: string }>).detail?.pin;
        deriveFromStoredMnemonic(pin);
      } catch (err) {
        console.error(`%c[BLOCKCHAIN CONTEXT] ❌ Error handling unlock event`, 'color: #ef4444;', err);
      }
    };

    const onAccountSwitched = () => {
      console.log(`%c[BLOCKCHAIN CONTEXT] 🔄 Account Switched Event Received`, 'color: #f97316; font-weight: bold;');
      
      const storedIndex = localStorage.getItem('timetrade_active_account_index');
      const nextIndex = storedIndex ? parseInt(storedIndex, 10) : 0;
      setActiveAccountIndex(nextIndex);

      // CRITICAL: Re-read wallet address from storage (AccountSwitcherSheet already wrote it)
      const newWalletAddress = localStorage.getItem('timetrade_wallet_address');
      if (newWalletAddress) {
        console.log(`%c[BLOCKCHAIN CONTEXT] 📍 Syncing wallet address from storage`, 'color: #22c55e;', {
          newAddress: newWalletAddress,
        });
        setWalletAddress(newWalletAddress);
      }

      // Only re-derive if the encrypted mnemonic changed
      const seedCipher = localStorage.getItem('timetrade_seed_phrase');
      if (seedCipher && seedCipher !== lastSeedCipherRef.current) {
        console.log(`%c[BLOCKCHAIN CONTEXT] 🔐 Seed phrase changed, re-deriving`, 'color: #a855f7;');
        deriveFromStoredMnemonic();
      }
    };

    window.addEventListener('timetrade:unlocked', onUnlocked as EventListener);
    window.addEventListener('timetrade:pin-updated', onUnlocked as EventListener);
    window.addEventListener('timetrade:account-switched', onAccountSwitched as EventListener);
    return () => {
      window.removeEventListener('timetrade:unlocked', onUnlocked as EventListener);
      window.removeEventListener('timetrade:pin-updated', onUnlocked as EventListener);
      window.removeEventListener('timetrade:account-switched', onAccountSwitched as EventListener);
    };
  }, [deriveFromStoredMnemonic]);

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

    // Ensure multi-chain views (like UnifiedTokenList) always have the right address keys.
    // This is especially important for manual "Connect Wallet" flows (no mnemonic).
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
    console.log('%c[BLOCKCHAIN CONTEXT] 🔌 Disconnecting wallet', 'color: #ef4444; font-weight: bold;');
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
    console.log(`%c[BLOCKCHAIN CONTEXT] 🔄 refreshAll() called`, 'color: #06b6d4; font-weight: bold;', {
      timestamp: new Date().toISOString(),
    });
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
    console.log(`%c[BLOCKCHAIN CONTEXT] 🔄 Switching Account`, 'color: #f97316; font-weight: bold;', {
      requestedIndex: index,
      currentIndex: activeAccountIndex,
    });

    // Get accounts for current chain, but also update all chain addresses
    const evmAccounts = allDerivedAccounts.evm;
    const solanaAccounts = allDerivedAccounts.solana;
    const tronAccounts = allDerivedAccounts.tron;
    
    // Allow switching even if some chains have no accounts - just use what's available
    const maxIndex = Math.max(evmAccounts.length, solanaAccounts.length, tronAccounts.length) - 1;
    if (index < 0 || maxIndex < 0) {
      console.warn(`%c[BLOCKCHAIN CONTEXT] ⚠️ Invalid Index`, 'color: #f59e0b;', { index, maxIndex });
      return;
    }
    const safeIndex = Math.min(index, maxIndex);
    
    setActiveAccountIndex(safeIndex);
    localStorage.setItem('timetrade_active_account_index', String(safeIndex));
    
    // Update main wallet address based on selected chain
    const chainAccounts = selectedChain === 'solana' ? solanaAccounts : evmAccounts;
    const account = chainAccounts[safeIndex] || chainAccounts[0];
    if (account) {
      setWalletAddress(account.address);
      localStorage.setItem('timetrade_wallet_address', account.address);
    }

    // Keep multi-chain address keys in sync with the active index
    const evmAcc = evmAccounts[safeIndex] || evmAccounts[0];
    const solAcc = solanaAccounts[safeIndex] || solanaAccounts[0];
    const tronAcc = tronAccounts[safeIndex] || tronAccounts[0];
    
    console.log(`%c[BLOCKCHAIN CONTEXT] 📍 New Addresses After Switch`, 'color: #22c55e; font-weight: bold;', {
      safeIndex,
      evm: evmAcc?.address || '(none)',
      solana: solAcc?.address || '(none)',
      tron: tronAcc?.address || '(none)',
    });

    if (evmAcc) localStorage.setItem('timetrade_wallet_address_evm', evmAcc.address);
    if (solAcc) localStorage.setItem('timetrade_wallet_address_solana', solAcc.address);
    if (tronAcc) localStorage.setItem('timetrade_wallet_address_tron', tronAcc.address);
    
    // Use setTimeout to ensure localStorage is written before event dispatch
    setTimeout(() => {
      console.log(`%c[BLOCKCHAIN CONTEXT] 📢 Dispatching account-switched event & invalidating queries`, 'color: #eab308; font-weight: bold;');
      // Dispatch event to notify other components (header, portfolio, etc.)
      window.dispatchEvent(new CustomEvent('timetrade:account-switched'));
      
      // Invalidate all queries to refetch with new addresses
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cryptoPrices'] });
      queryClient.invalidateQueries({ queryKey: ['gasEstimate'] });
    }, 50);
  }, [selectedChain, allDerivedAccounts, queryClient, activeAccountIndex]);

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
