import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist as englishWordlist } from "@scure/bip39/wordlists/english.js";

/**
 * Generates a valid BIP39 English mnemonic.
 *  - 12 words = 128-bit entropy
 *  - 24 words = 256-bit entropy
 */
export const generateSeedPhrase = (wordCount: 12 | 24 = 12): string[] => {
  const strength = wordCount === 12 ? 128 : 256;
  return generateMnemonic(englishWordlist, strength).split(" ");
};

/**
 * Validates a BIP39 English mnemonic, including checksum.
 */
export const validateSeedPhrase = (phrase: string[]): boolean => {
  const normalized = phrase
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);

  if (normalized.length !== 12 && normalized.length !== 24) return false;
  return validateMnemonic(normalized.join(" "), englishWordlist);
};
