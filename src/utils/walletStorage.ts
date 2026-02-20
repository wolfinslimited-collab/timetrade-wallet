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

// Cross-tab reset signal (non-user-facing)
const RESET_SIGNAL_KEY = "timetrade__reset_signal";

/**
 * Notify other open tabs of the app to wipe their storage too.
 * This prevents another tab from re-populating localStorage after a reset.
 */
export function broadcastWalletResetSignal(): void {
  try {
    localStorage.setItem(RESET_SIGNAL_KEY, String(Date.now()));
  } catch {
    // ignore
  }

  try {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel("timetrade_wallet");
      bc.postMessage({ type: "wallet_reset", at: Date.now() });
      bc.close();
    }
  } catch {
    // ignore
  }
}

export function getResetSignalKey(): string {
  return RESET_SIGNAL_KEY;
}

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
  // IMPORTANT:
  // Users expect "Reset Wallet" to remove *everything* for this app.
  // Historically we only removed keys with the timetrade_ prefix, but other
  // libraries (wallet-connectors, caches, etc.) may store data under other keys.
  // On a dedicated app domain it's safe (and expected) to clear all storage.
  console.log('%c[WALLET STORAGE] 🗑️ Wiping ALL client storage', 'color: #ef4444; font-weight: bold;');

  try {
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) allKeys.push(k);
    }
    console.log('%c[WALLET STORAGE] localStorage keys before clear:', 'color: #f97316;', allKeys);
  } catch {
    // ignore
  }

  try {
    localStorage.clear();
  } catch (e) {
    console.warn('[WALLET STORAGE] localStorage.clear() failed, falling back to timetrade_* removal', e);
    const keys = getAllWalletKeys();
    keys.forEach((key) => localStorage.removeItem(key));
  }

  // Verify wipe (some environments/iframes can behave oddly). If anything remains,
  // remove keys one-by-one as a second pass.
  try {
    if (localStorage.length > 0) {
      const remaining: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) remaining.push(k);
      }
      console.warn("[WALLET STORAGE] localStorage not empty after clear(); removing keys individually", remaining);
      remaining.forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    // ignore
  }

  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }

  console.log('%c[WALLET STORAGE] ✅ Wipe complete', 'color: #22c55e; font-weight: bold;');
}

/**
 * Best-effort deletion of IndexedDB databases.
 * Some wallet connectors/cache layers store account state here.
 */
export async function wipeIndexedDb(): Promise<void> {
  try {
    const databasesFn = (indexedDB as unknown as { databases?: () => Promise<{ name?: string }[]> }).databases;
    const databases: { name?: string }[] = databasesFn ? await databasesFn() : [];
    const names = databases.map((d) => d.name).filter(Boolean) as string[];
    if (names.length === 0) return;

    console.log('%c[WALLET STORAGE] 🧨 Deleting IndexedDB databases', 'color: #ef4444; font-weight: bold;', names);

    await Promise.all(
      names.map(
        (name) =>
          new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase(name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          })
      )
    );
  } catch (e) {
    console.warn('[WALLET STORAGE] wipeIndexedDb skipped/failed', e);
  }
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
 * Get the encrypted seed phrase from the active account in timetrade_user_accounts.
 * This replaces the old timetrade_seed_phrase global key.
 */
export function getActiveAccountEncryptedSeed(): string | null {
  const activeId = localStorage.getItem(WALLET_STORAGE_KEYS.ACTIVE_ACCOUNT_ID);
  const accountsStr = localStorage.getItem(WALLET_STORAGE_KEYS.USER_ACCOUNTS);
  if (!accountsStr) return null;
  
  try {
    const accounts = JSON.parse(accountsStr);
    if (!Array.isArray(accounts)) return null;
    
    // Find active account
    const active = activeId 
      ? accounts.find((a: any) => a.id === activeId) 
      : accounts[0];
    
    if (!active) return null;
    return active.encryptedSeedPhrase || null;
  } catch {
    return null;
  }
}

/**
 * Update the encrypted seed phrase on the active account in timetrade_user_accounts.
 */
export function setActiveAccountEncryptedSeed(encryptedSeedStr: string): void {
  const activeId = localStorage.getItem(WALLET_STORAGE_KEYS.ACTIVE_ACCOUNT_ID);
  const accountsStr = localStorage.getItem(WALLET_STORAGE_KEYS.USER_ACCOUNTS);
  if (!accountsStr || !activeId) return;
  
  try {
    const accounts = JSON.parse(accountsStr);
    if (!Array.isArray(accounts)) return;
    
    const updated = accounts.map((a: any) => 
      a.id === activeId ? { ...a, encryptedSeedPhrase: encryptedSeedStr } : a
    );
    localStorage.setItem(WALLET_STORAGE_KEYS.USER_ACCOUNTS, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/**
 * Update encrypted seed phrase on ALL mnemonic accounts (used during PIN change).
 */
export function reEncryptAllAccountSeeds(oldEncrypted: string, newEncrypted: string): void {
  const accountsStr = localStorage.getItem(WALLET_STORAGE_KEYS.USER_ACCOUNTS);
  if (!accountsStr) return;
  
  try {
    const accounts = JSON.parse(accountsStr);
    if (!Array.isArray(accounts)) return;
    
    // We need to re-encrypt each account individually - caller handles this
    localStorage.setItem(WALLET_STORAGE_KEYS.USER_ACCOUNTS, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

/**
 * Clear session-specific mnemonic data (used when switching to private key account)
 */
export function clearMnemonicSession(): void {
  console.log('%c[WALLET STORAGE] 🔐 Clearing mnemonic session', 'color: #a855f7;');
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
  const hasSeedPhrase = !!getActiveAccountEncryptedSeed();
  
  console.log('%c[WALLET STORAGE] 📊 Current State', 'color: #3b82f6; font-weight: bold;', {
    walletName,
    activeIndex,
    hasSeedPhrase,
    addresses,
    accountsCount: accounts ? JSON.parse(accounts).length : 0,
  });
}
