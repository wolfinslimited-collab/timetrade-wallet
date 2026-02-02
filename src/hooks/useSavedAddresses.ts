import { useState, useEffect, useCallback } from 'react';

export interface SavedAddress {
  address: string;
  label: string;
  chain: 'ethereum' | 'polygon' | 'solana' | 'tron' | 'bitcoin' | 'arbitrum';
  createdAt: number;
}

const STORAGE_KEY = 'timetrade_saved_addresses';

export function useSavedAddresses() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAddresses(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load saved addresses:', e);
    }
  }, []);

  // Save address
  const saveAddress = useCallback((address: string, label: string, chain: SavedAddress['chain']) => {
    const newAddress: SavedAddress = {
      address: address.trim(),
      label: label.trim(),
      chain,
      createdAt: Date.now(),
    };

    setAddresses((prev) => {
      // Remove duplicate if exists
      const filtered = prev.filter(
        (a) => !(a.address.toLowerCase() === address.toLowerCase() && a.chain === chain)
      );
      const updated = [newAddress, ...filtered].slice(0, 20); // Keep max 20
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Remove address
  const removeAddress = useCallback((address: string, chain: SavedAddress['chain']) => {
    setAddresses((prev) => {
      const updated = prev.filter(
        (a) => !(a.address.toLowerCase() === address.toLowerCase() && a.chain === chain)
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Get addresses for a specific chain
  const getAddressesForChain = useCallback(
    (chain: SavedAddress['chain']) => {
      return addresses.filter((a) => a.chain === chain);
    },
    [addresses]
  );

  return {
    addresses,
    saveAddress,
    removeAddress,
    getAddressesForChain,
  };
}
