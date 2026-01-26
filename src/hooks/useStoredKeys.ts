import { useState, useCallback, useEffect } from 'react';
import { encryptPrivateKey, decryptPrivateKey, EncryptedData } from '@/utils/encryption';
import { ethers } from 'ethers';

const STORAGE_KEY = 'timetrade_encrypted_keys';

export interface StoredKeyInfo {
  address: string;
  chain: string;
  label?: string;
  addedAt: number;
}

interface StoredKeyEntry {
  info: StoredKeyInfo;
  encrypted: EncryptedData;
}

interface StoredKeysData {
  keys: StoredKeyEntry[];
}

export function useStoredKeys() {
  const [storedKeys, setStoredKeys] = useState<StoredKeyInfo[]>([]);

  // Load stored keys metadata on mount
  useEffect(() => {
    loadStoredKeys();
  }, []);

  const loadStoredKeys = useCallback(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed: StoredKeysData = JSON.parse(data);
        setStoredKeys(parsed.keys.map(k => k.info));
      } else {
        setStoredKeys([]);
      }
    } catch (error) {
      console.error('Failed to load stored keys:', error);
      setStoredKeys([]);
    }
  }, []);

  const getStoredKeysData = useCallback((): StoredKeysData => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to parse stored keys:', error);
    }
    return { keys: [] };
  }, []);

  const saveStoredKeysData = useCallback((data: StoredKeysData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setStoredKeys(data.keys.map(k => k.info));
  }, []);

  /**
   * Store a private key encrypted with the user's PIN
   */
  const storePrivateKey = useCallback(async (
    privateKey: string,
    pin: string,
    chain: string,
    label?: string
  ): Promise<void> => {
    // Derive address from private key
    let address: string;
    try {
      const wallet = new ethers.Wallet(privateKey);
      address = wallet.address;
    } catch (error) {
      throw new Error('Invalid private key');
    }

    // Encrypt the private key
    const encrypted = await encryptPrivateKey(privateKey, pin);

    // Get existing data
    const data = getStoredKeysData();

    // Check if key for this address already exists
    const existingIndex = data.keys.findIndex(
      k => k.info.address.toLowerCase() === address.toLowerCase() && k.info.chain === chain
    );

    const newEntry: StoredKeyEntry = {
      info: {
        address,
        chain,
        label,
        addedAt: Date.now(),
      },
      encrypted,
    };

    if (existingIndex >= 0) {
      // Update existing
      data.keys[existingIndex] = newEntry;
    } else {
      // Add new
      data.keys.push(newEntry);
    }

    saveStoredKeysData(data);
  }, [getStoredKeysData, saveStoredKeysData]);

  /**
   * Retrieve a private key using the PIN
   */
  const retrievePrivateKey = useCallback(async (
    address: string,
    chain: string,
    pin: string
  ): Promise<string | null> => {
    const data = getStoredKeysData();
    
    const entry = data.keys.find(
      k => k.info.address.toLowerCase() === address.toLowerCase() && k.info.chain === chain
    );

    if (!entry) {
      return null;
    }

    try {
      const decrypted = await decryptPrivateKey(entry.encrypted, pin);
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt private key:', error);
      throw new Error('Invalid PIN');
    }
  }, [getStoredKeysData]);

  /**
   * Check if a key exists for an address
   */
  const hasStoredKey = useCallback((address: string, chain: string): boolean => {
    const data = getStoredKeysData();
    return data.keys.some(
      k => k.info.address.toLowerCase() === address.toLowerCase() && k.info.chain === chain
    );
  }, [getStoredKeysData]);

  /**
   * Get stored key info for an address
   */
  const getStoredKeyInfo = useCallback((address: string, chain: string): StoredKeyInfo | null => {
    const data = getStoredKeysData();
    const entry = data.keys.find(
      k => k.info.address.toLowerCase() === address.toLowerCase() && k.info.chain === chain
    );
    return entry?.info || null;
  }, [getStoredKeysData]);

  /**
   * Remove a stored key
   */
  const removeStoredKey = useCallback((address: string, chain: string) => {
    const data = getStoredKeysData();
    data.keys = data.keys.filter(
      k => !(k.info.address.toLowerCase() === address.toLowerCase() && k.info.chain === chain)
    );
    saveStoredKeysData(data);
  }, [getStoredKeysData, saveStoredKeysData]);

  /**
   * Remove all stored keys
   */
  const clearAllStoredKeys = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStoredKeys([]);
  }, []);

  /**
   * Update stored keys when PIN changes
   */
  const reEncryptWithNewPin = useCallback(async (
    oldPin: string,
    newPin: string
  ): Promise<boolean> => {
    const data = getStoredKeysData();
    
    if (data.keys.length === 0) {
      return true;
    }

    try {
      // Decrypt all keys with old PIN and re-encrypt with new PIN
      const newKeys: StoredKeyEntry[] = [];
      
      for (const entry of data.keys) {
        const decrypted = await decryptPrivateKey(entry.encrypted, oldPin);
        const reEncrypted = await encryptPrivateKey(decrypted, newPin);
        
        newKeys.push({
          info: entry.info,
          encrypted: reEncrypted,
        });
      }

      saveStoredKeysData({ keys: newKeys });
      return true;
    } catch (error) {
      console.error('Failed to re-encrypt keys with new PIN:', error);
      return false;
    }
  }, [getStoredKeysData, saveStoredKeysData]);

  return {
    storedKeys,
    storePrivateKey,
    retrievePrivateKey,
    hasStoredKey,
    getStoredKeyInfo,
    removeStoredKey,
    clearAllStoredKeys,
    reEncryptWithNewPin,
    refreshKeys: loadStoredKeys,
  };
}
