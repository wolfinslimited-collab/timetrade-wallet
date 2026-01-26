import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist as englishWordlist } from "@scure/bip39/wordlists/english.js";

// Export wordlist for autocomplete functionality
export const bip39Wordlist = englishWordlist;

/**
 * Checks if a word is a valid BIP39 word.
 */
export const isValidBip39Word = (word: string): boolean => {
  return englishWordlist.includes(word.toLowerCase().trim());
};

/**
 * Gets autocomplete suggestions for a partial word input.
 */
export const getWordSuggestions = (partial: string, limit: number = 8): string[] => {
  const lower = partial.toLowerCase().trim();
  if (!lower || lower.length < 1) return [];
  return englishWordlist
    .filter(word => word.startsWith(lower))
    .slice(0, limit);
};

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
