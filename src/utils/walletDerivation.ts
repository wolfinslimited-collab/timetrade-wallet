import { HDNodeWallet, sha256 } from "ethers";
import { Keypair } from "@solana/web3.js";
import { mnemonicToSeedSync } from "@scure/bip39";
import { hmac } from "@noble/hashes/hmac.js";
import { sha512 } from "@noble/hashes/sha2.js";

export type SolanaDerivationPath = "phantom" | "solflare" | "legacy";

export interface DerivedAccount {
  index: number;
  address: string;
  path: string;
  chain: "evm" | "solana" | "tron";
}

export interface MultiChainAccounts {
  evm: DerivedAccount[];
  solana: DerivedAccount[];
  tron: DerivedAccount[];
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

// ─────────────────────────────────────────────────────────────────────────────
// ED25519 BIP32 derivation – browser-compatible (replaces ed25519-hd-key)
// ─────────────────────────────────────────────────────────────────────────────

const ED25519_CURVE = "ed25519 seed";
const HARDENED_OFFSET = 0x80000000;

interface DerivedKey {
  key: Uint8Array;
  chainCode: Uint8Array;
}

function getMasterKeyFromSeed(seedHex: string): DerivedKey {
  const seedBytes = hexToBytes(seedHex);
  const I = hmac(sha512, new TextEncoder().encode(ED25519_CURVE), seedBytes);
  return {
    key: I.slice(0, 32),
    chainCode: I.slice(32),
  };
}

function CKDPriv({ key, chainCode }: DerivedKey, index: number): DerivedKey {
  const indexBuffer = new Uint8Array(4);
  const view = new DataView(indexBuffer.buffer);
  view.setUint32(0, index, false); // big-endian

  const data = new Uint8Array(1 + 32 + 4);
  data[0] = 0x00;
  data.set(key, 1);
  data.set(indexBuffer, 33);

  const I = hmac(sha512, chainCode, data);
  return {
    key: I.slice(0, 32),
    chainCode: I.slice(32),
  };
}

function derivePath(path: string, seedHex: string): DerivedKey {
  const segments = path
    .replace("m/", "")
    .split("/")
    .map((seg) => {
      const isHardened = seg.endsWith("'");
      const indexNum = parseInt(isHardened ? seg.slice(0, -1) : seg, 10);
      return isHardened ? indexNum + HARDENED_OFFSET : indexNum;
    });

  let derived = getMasterKeyFromSeed(seedHex);
  for (const idx of segments) {
    derived = CKDPriv(derived, idx);
  }
  return derived;
}

function hexToBytes(hex: string): Uint8Array {
  const len = hex.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─────────────────────────────────────────────────────────────────────────────
// EVM helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive an EVM (Ethereum/Polygon) address from a BIP39 mnemonic at a specific account index.
 * Uses standard BIP44 path: m/44'/60'/0'/0/{index}
 */
export function deriveEvmAddress(phrase: string, accountIndex: number = 0): string {
  const path = `m/44'/60'/0'/0/${accountIndex}`;
  const wallet = HDNodeWallet.fromPhrase(phrase, undefined, path);
  return wallet.address;
}

// ─────────────────────────────────────────────────────────────────────────────
// Solana helpers
// ─────────────────────────────────────────────────────────────────────────────

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
  const { key } = derivePath(path, bytesToHex(seed));
  const keypair = Keypair.fromSeed(key);
  return keypair.publicKey.toBase58();
}

/**
 * Derive Solana addresses using all known derivation paths.
 * Useful for finding which path was used by a user's original wallet.
 */
export function deriveSolanaAddressesAllPaths(
  phrase: string,
  accountIndex: number = 0
): { path: SolanaDerivationPath; address: string; fullPath: string }[] {
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
  const phrase = words.join(" ").toLowerCase().trim().replace(/\s+/g, " ");

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
  const phrase = words.join(" ").toLowerCase().trim().replace(/\s+/g, " ");
  const seed = mnemonicToSeedSync(phrase);
  const seedHex = bytesToHex(seed);
  const pathConfig = SOLANA_DERIVATION_PATHS[pathStyle];

  const accounts: DerivedAccount[] = [];
  for (let i = 0; i < count; i++) {
    const path = pathConfig.getPath(i);
    const { key } = derivePath(path, seedHex);
    const keypair = Keypair.fromSeed(key);
    accounts.push({
      index: i,
      address: keypair.publicKey.toBase58(),
      path,
      chain: "solana",
    });
  }
  return accounts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tron helpers
// ─────────────────────────────────────────────────────────────────────────────

// Base58 alphabet used by Tron (same as Bitcoin)
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Encode a Uint8Array to Base58 string
 */
function encodeBase58(bytes: Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let output = "";
  for (const byte of bytes) {
    if (byte === 0) output += BASE58_ALPHABET[0];
    else break;
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    output += BASE58_ALPHABET[digits[i]];
  }
  return output;
}

/**
 * Derive a Tron address from a BIP39 mnemonic at a specific account index.
 * Uses standard BIP44 path: m/44'/195'/0'/0/{index}
 * Tron uses the same secp256k1 curve as Ethereum but with Base58Check encoding.
 */
export function deriveTronAddress(phrase: string, accountIndex: number = 0): string {
  const path = `m/44'/195'/0'/0/${accountIndex}`;
  const wallet = HDNodeWallet.fromPhrase(phrase, undefined, path);

  const evmAddress = wallet.address.slice(2).toLowerCase();
  const tronAddressHex = "41" + evmAddress;

  const tronBytes = new Uint8Array(21);
  for (let i = 0; i < 21; i++) {
    tronBytes[i] = parseInt(tronAddressHex.substr(i * 2, 2), 16);
  }

  const checksumHash1 = sha256(tronBytes);
  const checksumHash2 = sha256(checksumHash1);
  const checksum = checksumHash2.slice(2, 10);

  const fullAddressHex = tronAddressHex + checksum;
  const fullBytes = new Uint8Array(25);
  for (let i = 0; i < 25; i++) {
    fullBytes[i] = parseInt(fullAddressHex.substr(i * 2, 2), 16);
  }

  return encodeBase58(fullBytes);
}

/**
 * Derive multiple Tron accounts (indices 0-4) from a BIP39 mnemonic.
 */
export function deriveMultipleTronAccounts(words: string[], count: number = 5): DerivedAccount[] {
  const phrase = words.join(" ").toLowerCase().trim().replace(/\s+/g, " ");

  const accounts: DerivedAccount[] = [];
  for (let i = 0; i < count; i++) {
    const path = `m/44'/195'/0'/0/${i}`;
    const address = deriveTronAddress(phrase, i);
    accounts.push({ index: i, address, path, chain: "tron" });
  }
  return accounts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-chain helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive multiple accounts for EVM, Solana, and Tron chains from a BIP39 mnemonic.
 */
export function deriveMultipleAccounts(
  words: string[],
  count: number = 5,
  solanaPathStyle: SolanaDerivationPath = "phantom"
): MultiChainAccounts {
  return {
    evm: deriveMultipleEvmAccounts(words, count),
    solana: deriveMultipleSolanaAccounts(words, count, solanaPathStyle),
    tron: deriveMultipleTronAccounts(words, count),
  };
}

/**
 * Legacy function for backward compatibility - derives EVM accounts only
 */
export function deriveEvmAddressFromMnemonicWords(words: string[], accountIndex: number = 0): string {
  const phrase = words.join(" ").toLowerCase().trim().replace(/\s+/g, " ");
  return deriveEvmAddress(phrase, accountIndex);
}

/**
 * Format address for display (truncate middle)
 */
export function formatAddress(address: string, chars: number = 6): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Private Key Derivation (for transaction signing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive EVM private key from mnemonic
 * Returns hex string with 0x prefix
 */
export function deriveEvmPrivateKey(phrase: string, accountIndex: number = 0): string {
  const path = `m/44'/60'/0'/0/${accountIndex}`;
  const wallet = HDNodeWallet.fromPhrase(phrase, undefined, path);
  return wallet.privateKey;
}

/**
 * Derive Solana private key (seed bytes) from mnemonic
 * Returns hex string of the 32-byte seed
 */
export function deriveSolanaPrivateKey(
  phrase: string,
  accountIndex: number = 0,
  pathStyle: SolanaDerivationPath = "phantom"
): string {
  const seed = mnemonicToSeedSync(phrase);
  const pathConfig = SOLANA_DERIVATION_PATHS[pathStyle];
  const path = pathConfig.getPath(accountIndex);
  const { key } = derivePath(path, bytesToHex(seed));
  return bytesToHex(key);
}

/**
 * Derive Tron private key from mnemonic
 * Returns hex string with 0x prefix (same as EVM since Tron uses secp256k1)
 */
export function deriveTronPrivateKey(phrase: string, accountIndex: number = 0): string {
  const path = `m/44'/195'/0'/0/${accountIndex}`;
  const wallet = HDNodeWallet.fromPhrase(phrase, undefined, path);
  return wallet.privateKey;
}

export type Chain = "ethereum" | "polygon" | "arbitrum" | "bsc" | "solana" | "tron" | "bitcoin";

/**
 * Derive private key for any supported chain
 */
export function derivePrivateKeyForChain(
  phrase: string,
  chain: Chain,
  accountIndex: number = 0,
  solanaPathStyle: SolanaDerivationPath = "phantom"
): string {
  switch (chain) {
    case "ethereum":
    case "polygon":
    case "arbitrum":
    case "bsc":
      return deriveEvmPrivateKey(phrase, accountIndex);
    case "solana":
      return deriveSolanaPrivateKey(phrase, accountIndex, solanaPathStyle);
    case "tron":
      return deriveTronPrivateKey(phrase, accountIndex);
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}
