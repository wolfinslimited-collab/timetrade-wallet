import { HDNodeWallet } from "ethers";

/**
 * Derive an EVM (Ethereum/Polygon) address from a BIP39 mnemonic.
 *
 * Note: This derives the first account at the default EVM path.
 */
export function deriveEvmAddressFromMnemonicWords(words: string[]): string {
  const phrase = words
    .join(" ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  const wallet = HDNodeWallet.fromPhrase(phrase);
  return wallet.address;
}
