import { HDNodeWallet } from "ethers";
import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
import { mnemonicToSeedSync } from "@scure/bip39";

export interface DerivedAccount {
  index: number;
  address: string;
  path: string;
  chain: "evm" | "solana";
}

export interface MultiChainAccounts {
  evm: DerivedAccount[];
  solana: DerivedAccount[];
}

/**
 * Derive an EVM (Ethereum/Polygon) address from a BIP39 mnemonic at a specific account index.
 * Uses standard BIP44 path: m/44'/60'/0'/0/{index}
 */
export function deriveEvmAddress(phrase: string, accountIndex: number = 0): string {
  const path = `m/44'/60'/0'/0/${accountIndex}`;
  const wallet = HDNodeWallet.fromPhrase(phrase, undefined, path);
  return wallet.address;
}

/**
 * Derive a Solana address from a BIP39 mnemonic at a specific account index.
 * Uses standard BIP44 path: m/44'/501'/{index}'/0'
 */
export function deriveSolanaAddress(phrase: string, accountIndex: number = 0): string {
  const seed = mnemonicToSeedSync(phrase);
  const path = `m/44'/501'/${accountIndex}'/0'`;
  const derivedSeed = derivePath(path, Buffer.from(seed).toString("hex")).key;
  const keypair = Keypair.fromSeed(derivedSeed);
  return keypair.publicKey.toBase58();
}

/**
 * Derive multiple EVM accounts (indices 0-4) from a BIP39 mnemonic.
 */
export function deriveMultipleEvmAccounts(words: string[], count: number = 5): DerivedAccount[] {
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
      chain: "evm",
    });
  }

  return accounts;
}

/**
 * Derive multiple Solana accounts (indices 0-4) from a BIP39 mnemonic.
 */
export function deriveMultipleSolanaAccounts(words: string[], count: number = 5): DerivedAccount[] {
  const phrase = words
    .join(" ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  const seed = mnemonicToSeedSync(phrase);
  const accounts: DerivedAccount[] = [];
  
  for (let i = 0; i < count; i++) {
    const path = `m/44'/501'/${i}'/0'`;
    const derivedSeed = derivePath(path, Buffer.from(seed).toString("hex")).key;
    const keypair = Keypair.fromSeed(derivedSeed);
    accounts.push({
      index: i,
      address: keypair.publicKey.toBase58(),
      path,
      chain: "solana",
    });
  }

  return accounts;
}

/**
 * Derive multiple accounts for both EVM and Solana chains from a BIP39 mnemonic.
 */
export function deriveMultipleAccounts(words: string[], count: number = 5): MultiChainAccounts {
  return {
    evm: deriveMultipleEvmAccounts(words, count),
    solana: deriveMultipleSolanaAccounts(words, count),
  };
}

/**
 * Legacy function for backward compatibility - derives EVM accounts only
 */
export function deriveEvmAddressFromMnemonicWords(words: string[], accountIndex: number = 0): string {
  const phrase = words
    .join(" ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  return deriveEvmAddress(phrase, accountIndex);
}

/**
 * Format address for display (truncate middle)
 */
export function formatAddress(address: string, chars: number = 6): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}
