/**
 * Centralized wallet storage management
 * Single source of truth for all timetrade_* localStorage keys
 */

// All wallet-related localStorage keys
export const WALLET_STORAGE_KEYS = {
  // Core wallet state
  WALLET_CREATED: 'timetrade_wallet_created',
  PIN: 'timetrade_pin',
  BIOMETRIC: 'timetrade_biometric',
  SEED_PHRASE: 'timetrade_seed_phrase',
  
  // Addresses
  WALLET_ADDRESS: 'timetrade_wallet_address',
  WALLET_ADDRESS_EVM: 'timetrade_wallet_address_evm',
  WALLET_ADDRESS_SOLANA: 'timetrade_wallet_address_solana',
  WALLET_ADDRESS_TRON: 'timetrade_wallet_address_tron',
  WALLET_ADDRESS_BTC: 'timetrade_wallet_address_btc',
  
  // Account management
  USER_ACCOUNTS: 'timetrade_user_accounts',
  ACTIVE_ACCOUNT_ID: 'timetrade_active_account_id',
  ACTIVE_ACCOUNT_INDEX: 'timetrade_active_account_index',
  WALLET_NAME: 'timetrade_wallet_name',
  
  // Derivation settings
  SOLANA_DERIVATION_PATH: 'timetrade_solana_derivation_path',
  SOLANA_ACCOUNT_INDEX: 'timetrade_solana_balance_account_index',
  SELECTED_CHAIN: 'timetrade_selected_chain',
  
  // Keys storage
  STORED_KEYS: 'timetrade_stored_keys',
  ENCRYPTED_KEYS: 'timetrade_encrypted_keys',
  
  // Preferences (non-sensitive)
  PRICE_ALERTS: 'timetrade_price_alerts',
  PUSH_NOTIFICATIONS: 'timetrade_push_notifications',
  SAVED_ADDRESSES: 'timetrade_saved_addresses',
} as const;

export type WalletStorageKey = typeof WALLET_STORAGE_KEYS[keyof typeof WALLET_STORAGE_KEYS];

/**
 * Get all timetrade_* keys currently in localStorage
 */
export function getAllWalletKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('timetrade_')) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Complete wipe of ALL timetrade_* data
 * Used for "Reset Wallet" functionality
 */
export function wipeAllWalletData(): void {
  console.log('%c[WALLET STORAGE] 🗑️ Wiping ALL wallet data', 'color: #ef4444; font-weight: bold;');
  
  const keys = getAllWalletKeys();
  console.log('%c[WALLET STORAGE] Keys to remove:', 'color: #f97316;', keys);
  
  keys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log('%c[WALLET STORAGE] ✅ Wipe complete', 'color: #22c55e; font-weight: bold;');
}

/**
 * Clear all address-related keys (used when switching account types)
 */
export function clearAllAddresses(): void {
  console.log('%c[WALLET STORAGE] 🧹 Clearing all addresses', 'color: #f59e0b;');
  
  localStorage.removeItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS);
  localStorage.removeItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_EVM);
  localStorage.removeItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_SOLANA);
  localStorage.removeItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_TRON);
  localStorage.removeItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_BTC);
}

/**
 * Set all chain addresses at once
 */
export function setAllAddresses(addresses: {
  evm?: string;
  solana?: string;
  tron?: string;
  btc?: string;
}): void {
  console.log('%c[WALLET STORAGE] 💾 Setting addresses', 'color: #22c55e; font-weight: bold;', addresses);
  
  if (addresses.evm) {
    localStorage.setItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS, addresses.evm);
    localStorage.setItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_EVM, addresses.evm);
  }
  if (addresses.solana) {
    localStorage.setItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_SOLANA, addresses.solana);
  } else {
    // Explicitly remove if not provided (e.g., private key accounts don't have Solana)
    localStorage.removeItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_SOLANA);
  }
  if (addresses.tron) {
    localStorage.setItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_TRON, addresses.tron);
  }
  if (addresses.btc) {
    localStorage.setItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_BTC, addresses.btc);
  }
}

/**
 * Get all current addresses
 */
export function getAllAddresses(): {
  evm: string | null;
  solana: string | null;
  tron: string | null;
  btc: string | null;
  primary: string | null;
} {
  return {
    primary: localStorage.getItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS),
    evm: localStorage.getItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_EVM),
    solana: localStorage.getItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_SOLANA),
    tron: localStorage.getItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_TRON),
    btc: localStorage.getItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_BTC),
  };
}

/**
 * Clear session-specific mnemonic data (used when switching to private key account)
 */
export function clearMnemonicSession(): void {
  console.log('%c[WALLET STORAGE] 🔐 Clearing mnemonic session', 'color: #a855f7;');
  localStorage.removeItem(WALLET_STORAGE_KEYS.SEED_PHRASE);
  localStorage.removeItem(WALLET_STORAGE_KEYS.SOLANA_DERIVATION_PATH);
  localStorage.removeItem(WALLET_STORAGE_KEYS.SOLANA_ACCOUNT_INDEX);
}

/**
 * Log current wallet state for debugging
 */
export function logWalletState(): void {
  const addresses = getAllAddresses();
  const accounts = localStorage.getItem(WALLET_STORAGE_KEYS.USER_ACCOUNTS);
  const activeIndex = localStorage.getItem(WALLET_STORAGE_KEYS.ACTIVE_ACCOUNT_INDEX);
  const walletName = localStorage.getItem(WALLET_STORAGE_KEYS.WALLET_NAME);
  const hasSeedPhrase = !!localStorage.getItem(WALLET_STORAGE_KEYS.SEED_PHRASE);
  
  console.log('%c[WALLET STORAGE] 📊 Current State', 'color: #3b82f6; font-weight: bold;', {
    walletName,
    activeIndex,
    hasSeedPhrase,
    addresses,
    accountsCount: accounts ? JSON.parse(accounts).length : 0,
  });
}
