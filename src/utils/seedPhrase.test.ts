import { describe, it, expect } from "vitest";
import {
  generateSeedPhrase,
  validateSeedPhrase,
  isValidBip39Word,
  getWordSuggestions,
  bip39Wordlist,
} from "./seedPhrase";

/**
 * Official BIP39 test vectors from:
 * https://github.com/trezor/python-mnemonic/blob/master/vectors.json
 * 
 * These are known-valid mnemonics with correct checksums.
 */
const VALID_12_WORD_MNEMONICS = [
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
  "legal winner thank year wave sausage worth useful legal winner thank yellow",
  "letter advice cage absurd amount doctor acoustic avoid letter advice cage above",
  "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong",
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon agent",
];

const VALID_24_WORD_MNEMONICS = [
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
  "legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth title",
  "letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic bless",
  "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote",
];

// Invalid mnemonics (wrong checksum or invalid words)
const INVALID_MNEMONICS = [
  // Wrong checksum (last word should be "about" not "abandon")
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon",
  // Invalid word "xyz" is not in BIP39
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon xyz",
  // Wrong checksum
  "legal winner thank year wave sausage worth useful legal winner thank wrong",
  // Empty
  "",
  // Too few words
  "abandon abandon abandon",
];

describe("seedPhrase utilities", () => {
  describe("bip39Wordlist", () => {
    it("should contain exactly 2048 words", () => {
      expect(bip39Wordlist.length).toBe(2048);
    });

    it("should contain known BIP39 words", () => {
      const knownWords = ["abandon", "ability", "zoo", "zone", "zero"];
      knownWords.forEach((word) => {
        expect(bip39Wordlist).toContain(word);
      });
    });

    it("should be sorted alphabetically", () => {
      const sorted = [...bip39Wordlist].sort();
      expect(bip39Wordlist).toEqual(sorted);
    });
  });

  describe("isValidBip39Word", () => {
    it("should return true for valid BIP39 words", () => {
      expect(isValidBip39Word("abandon")).toBe(true);
      expect(isValidBip39Word("zoo")).toBe(true);
      expect(isValidBip39Word("ability")).toBe(true);
    });

    it("should return false for invalid words", () => {
      expect(isValidBip39Word("xyz")).toBe(false);
      expect(isValidBip39Word("cryptocurrency")).toBe(false);
      expect(isValidBip39Word("invalidword")).toBe(false);
      expect(isValidBip39Word("notaword")).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(isValidBip39Word("ABANDON")).toBe(true);
      expect(isValidBip39Word("Zoo")).toBe(true);
      expect(isValidBip39Word("AbIlItY")).toBe(true);
    });

    it("should handle whitespace", () => {
      expect(isValidBip39Word("  abandon  ")).toBe(true);
      expect(isValidBip39Word("\tzoo\n")).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(isValidBip39Word("")).toBe(false);
      expect(isValidBip39Word("   ")).toBe(false);
    });
  });

  describe("getWordSuggestions", () => {
    it("should return suggestions starting with the input", () => {
      const suggestions = getWordSuggestions("ab");
      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach((word) => {
        expect(word.startsWith("ab")).toBe(true);
      });
    });

    it("should respect the limit parameter", () => {
      const suggestions = getWordSuggestions("a", 5);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it("should return empty array for empty input", () => {
      expect(getWordSuggestions("")).toEqual([]);
      expect(getWordSuggestions("   ")).toEqual([]);
    });

    it("should return empty array for no matches", () => {
      expect(getWordSuggestions("xyz")).toEqual([]);
      expect(getWordSuggestions("qqq")).toEqual([]);
    });

    it("should be case-insensitive", () => {
      const lower = getWordSuggestions("ab");
      const upper = getWordSuggestions("AB");
      expect(lower).toEqual(upper);
    });

    it("should return 'abandon' for 'aban' prefix", () => {
      const suggestions = getWordSuggestions("aban");
      expect(suggestions).toContain("abandon");
    });
  });

  describe("generateSeedPhrase", () => {
    it("should generate 12 words by default", () => {
      const phrase = generateSeedPhrase();
      expect(phrase.length).toBe(12);
    });

    it("should generate 12 words when specified", () => {
      const phrase = generateSeedPhrase(12);
      expect(phrase.length).toBe(12);
    });

    it("should generate 24 words when specified", () => {
      const phrase = generateSeedPhrase(24);
      expect(phrase.length).toBe(24);
    });

    it("should generate only valid BIP39 words", () => {
      const phrase = generateSeedPhrase(12);
      phrase.forEach((word) => {
        expect(isValidBip39Word(word)).toBe(true);
      });
    });

    it("should generate valid mnemonics with correct checksum", () => {
      // Generate multiple and validate each
      for (let i = 0; i < 5; i++) {
        const phrase12 = generateSeedPhrase(12);
        expect(validateSeedPhrase(phrase12)).toBe(true);

        const phrase24 = generateSeedPhrase(24);
        expect(validateSeedPhrase(phrase24)).toBe(true);
      }
    });

    it("should generate different phrases each time (randomness)", () => {
      const phrases = new Set<string>();
      for (let i = 0; i < 10; i++) {
        phrases.add(generateSeedPhrase(12).join(" "));
      }
      // With 2048^12 possibilities, duplicates are astronomically unlikely
      expect(phrases.size).toBe(10);
    });
  });

  describe("validateSeedPhrase", () => {
    describe("valid 12-word mnemonics (official test vectors)", () => {
      VALID_12_WORD_MNEMONICS.filter((m) => m.split(" ").length === 12).forEach(
        (mnemonic, index) => {
          it(`should validate test vector ${index + 1}: "${mnemonic.slice(0, 50)}..."`, () => {
            const words = mnemonic.split(" ");
            expect(validateSeedPhrase(words)).toBe(true);
          });
        }
      );
    });

    describe("valid 24-word mnemonics (official test vectors)", () => {
      VALID_24_WORD_MNEMONICS.forEach((mnemonic, index) => {
        it(`should validate test vector ${index + 1}`, () => {
          const words = mnemonic.split(" ");
          expect(validateSeedPhrase(words)).toBe(true);
        });
      });
    });

    describe("invalid mnemonics", () => {
      it("should reject mnemonic with wrong checksum", () => {
        const wrongChecksum =
          "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon".split(
            " "
          );
        expect(validateSeedPhrase(wrongChecksum)).toBe(false);
      });

      it("should reject mnemonic with invalid word", () => {
        const invalidWord =
          "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon xyz".split(
            " "
          );
        expect(validateSeedPhrase(invalidWord)).toBe(false);
      });

      it("should reject mnemonic with wrong word count", () => {
        expect(validateSeedPhrase(["abandon", "abandon", "abandon"])).toBe(
          false
        );
        expect(validateSeedPhrase(["abandon"])).toBe(false);
        expect(validateSeedPhrase([])).toBe(false);
      });

      it("should reject 13-word mnemonics", () => {
        const thirteenWords = Array(13).fill("abandon");
        expect(validateSeedPhrase(thirteenWords)).toBe(false);
      });

      it("should reject 23-word mnemonics", () => {
        const twentyThreeWords = Array(23).fill("abandon");
        expect(validateSeedPhrase(twentyThreeWords)).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("should handle mixed case input", () => {
        const mixedCase = "ABANDON abandon ABANDON abandon ABANDON abandon ABANDON abandon ABANDON abandon ABANDON about".split(" ");
        expect(validateSeedPhrase(mixedCase)).toBe(true);
      });

      it("should handle extra whitespace", () => {
        const withSpaces = "  abandon  abandon  abandon  abandon  abandon  abandon  abandon  abandon  abandon  abandon  abandon  about  ".split(/\s+/).filter(Boolean);
        expect(validateSeedPhrase(withSpaces)).toBe(true);
      });

      it("should handle leading/trailing whitespace in words", () => {
        const words = [
          "  abandon",
          "abandon  ",
          "  abandon  ",
          "abandon",
          "abandon",
          "abandon",
          "abandon",
          "abandon",
          "abandon",
          "abandon",
          "abandon",
          "about  ",
        ];
        expect(validateSeedPhrase(words)).toBe(true);
      });
    });
  });

  describe("integration: generate then validate", () => {
    it("should always generate valid 12-word phrases", () => {
      for (let i = 0; i < 20; i++) {
        const phrase = generateSeedPhrase(12);
        expect(phrase.length).toBe(12);
        expect(validateSeedPhrase(phrase)).toBe(true);
      }
    });

    it("should always generate valid 24-word phrases", () => {
      for (let i = 0; i < 20; i++) {
        const phrase = generateSeedPhrase(24);
        expect(phrase.length).toBe(24);
        expect(validateSeedPhrase(phrase)).toBe(true);
      }
    });
  });
});
