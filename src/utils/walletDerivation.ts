import { HDNodeWallet } from "ethers";

export interface DerivedAccount {
  index: number;
  address: string;
  path: string;
}

/**
 * Derive an EVM (Ethereum/Polygon) address from a BIP39 mnemonic at a specific account index.
 * Uses standard BIP44 path: m/44'/60'/0'/0/{index}
 */
export function deriveEvmAddressFromMnemonicWords(words: string[], accountIndex: number = 0): string {
  const phrase = words
    .join(" ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  const path = `m/44'/60'/0'/0/${accountIndex}`;
  const wallet = HDNodeWallet.fromPhrase(phrase, undefined, path);
  return wallet.address;
}

/**
 * Derive multiple accounts (indices 0-4) from a BIP39 mnemonic.
 */
export function deriveMultipleAccounts(words: string[], count: number = 5): DerivedAccount[] {
  const phrase = words
    .join(" ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  const accounts: DerivedAccount[] = [];
  
  for (let i = 0; i < count; i++) {
    const path = `m/44'/60'/0'/0/${i}`;
    const wallet = HDNodeWallet.fromPhrase(phrase, undefined, path);
    accounts.push({
      index: i,
      address: wallet.address,
      path,
    });
  }

  return accounts;
}

/**
 * Format address for display (truncate middle)
 */
export function formatAddress(address: string, chars: number = 6): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}
