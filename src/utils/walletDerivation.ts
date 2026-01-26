import { HDNodeWallet } from "ethers";
import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
import { mnemonicToSeedSync } from "@scure/bip39";

export type SolanaDerivationPath = "phantom" | "solflare" | "legacy";

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

// Solana derivation path patterns used by different wallets
export const SOLANA_DERIVATION_PATHS: Record<SolanaDerivationPath, { name: string; getPath: (index: number) => string }> = {
  phantom: {
    name: "Phantom / Solflare",
    getPath: (index) => `m/44'/501'/${index}'/0'`,
  },
  solflare: {
    name: "Solflare (alternate)",
    getPath: (index) => `m/44'/501'/0'/${index}'`,
  },
  legacy: {
    name: "Legacy / Trust Wallet",
    getPath: (index) => `m/44'/501'/${index}'`,
  },
};

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
 * Supports multiple derivation path styles used by different wallets.
 */
export function deriveSolanaAddress(
  phrase: string, 
  accountIndex: number = 0,
  pathStyle: SolanaDerivationPath = "phantom"
): string {
  const seed = mnemonicToSeedSync(phrase);
  const pathConfig = SOLANA_DERIVATION_PATHS[pathStyle];
  const path = pathConfig.getPath(accountIndex);
  const derivedSeed = derivePath(path, Buffer.from(seed).toString("hex")).key;
  const keypair = Keypair.fromSeed(derivedSeed);
  return keypair.publicKey.toBase58();
}

/**
 * Derive Solana addresses using all known derivation paths.
 * Useful for finding which path was used by a user's original wallet.
 */
export function deriveSolanaAddressesAllPaths(phrase: string, accountIndex: number = 0): { path: SolanaDerivationPath; address: string; fullPath: string }[] {
  const results: { path: SolanaDerivationPath; address: string; fullPath: string }[] = [];
  
  for (const [pathStyle, config] of Object.entries(SOLANA_DERIVATION_PATHS)) {
    const address = deriveSolanaAddress(phrase, accountIndex, pathStyle as SolanaDerivationPath);
    results.push({
      path: pathStyle as SolanaDerivationPath,
      address,
      fullPath: config.getPath(accountIndex),
    });
  }
  
  return results;
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
 * Uses the specified derivation path style.
 */
export function deriveMultipleSolanaAccounts(
  words: string[], 
  count: number = 5,
  pathStyle: SolanaDerivationPath = "phantom"
): DerivedAccount[] {
  const phrase = words
    .join(" ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  const seed = mnemonicToSeedSync(phrase);
  const accounts: DerivedAccount[] = [];
  const pathConfig = SOLANA_DERIVATION_PATHS[pathStyle];
  
  for (let i = 0; i < count; i++) {
    const path = pathConfig.getPath(i);
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
export function deriveMultipleAccounts(
  words: string[], 
  count: number = 5,
  solanaPathStyle: SolanaDerivationPath = "phantom"
): MultiChainAccounts {
  return {
    evm: deriveMultipleEvmAccounts(words, count),
    solana: deriveMultipleSolanaAccounts(words, count, solanaPathStyle),
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
