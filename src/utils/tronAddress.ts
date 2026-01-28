import { sha256 } from "ethers";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function isEvmAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export function isTronAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address.trim());
}

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

  // Leading zeros
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
 * Convert an EVM-style 0x.. address to Tron Base58Check (T...) address.
 * Tron Base58Check payload: 0x41 + 20-byte address + 4-byte checksum (double SHA256).
 */
export function evmToTronAddress(evmAddress: string): string | null {
  if (!isEvmAddress(evmAddress)) return null;

  const hex = evmAddress.trim().slice(2).toLowerCase();
  const tronAddressHex = `41${hex}`; // 21 bytes payload

  const payload = new Uint8Array(21);
  for (let i = 0; i < 21; i++) {
    payload[i] = parseInt(tronAddressHex.slice(i * 2, i * 2 + 2), 16);
  }

  const checksumHash1 = sha256(payload);
  const checksumHash2 = sha256(checksumHash1);
  const checksumHex = checksumHash2.slice(2, 10); // first 4 bytes

  const fullHex = tronAddressHex + checksumHex; // 25 bytes
  const fullBytes = new Uint8Array(25);
  for (let i = 0; i < 25; i++) {
    fullBytes[i] = parseInt(fullHex.slice(i * 2, i * 2 + 2), 16);
  }

  return encodeBase58(fullBytes);
}

/**
 * Convert a Tron hex address (21-byte payload, typically starting with "41")
 * to Tron Base58Check (T...) address.
 */
export function tronHexToBase58(tronHexAddress: string | null | undefined): string | null {
  const raw = (tronHexAddress ?? '').trim().toLowerCase();
  if (!raw) return null;

  const hex = raw.startsWith('0x') ? raw.slice(2) : raw;
  // Tron hex payload must be 21 bytes (42 hex chars) and start with 0x41
  if (!/^41[a-f0-9]{40}$/.test(hex)) return null;

  const payload = new Uint8Array(21);
  for (let i = 0; i < 21; i++) {
    payload[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  const checksumHash1 = sha256(payload);
  const checksumHash2 = sha256(checksumHash1);
  const checksumHex = checksumHash2.slice(2, 10); // first 4 bytes

  const fullHex = hex + checksumHex; // 25 bytes
  const fullBytes = new Uint8Array(25);
  for (let i = 0; i < 25; i++) {
    fullBytes[i] = parseInt(fullHex.slice(i * 2, i * 2 + 2), 16);
  }

  return encodeBase58(fullBytes);
}
