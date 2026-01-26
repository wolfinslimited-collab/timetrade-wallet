/**
 * AES-GCM encryption utilities using Web Crypto API
 * Uses PIN as the key derivation source for encrypting private keys
 */

// Derive a cryptographic key from the PIN using PBKDF2
async function deriveKeyFromPin(pin: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);

  // Import PIN as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinData,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-GCM key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000, // High iteration count for security
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate a random salt
function generateSalt(): ArrayBuffer {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return array.buffer as ArrayBuffer;
}

// Generate a random IV for AES-GCM
function generateIV(): ArrayBuffer {
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return array.buffer as ArrayBuffer;
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  salt: string; // Base64 encoded
  iv: string; // Base64 encoded
}

/**
 * Encrypt a private key using the user's PIN
 */
export async function encryptPrivateKey(
  privateKey: string,
  pin: string
): Promise<EncryptedData> {
  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKeyFromPin(pin, salt);

  const encoder = new TextEncoder();
  const data = encoder.encode(privateKey);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt a private key using the user's PIN
 */
export async function decryptPrivateKey(
  encryptedData: EncryptedData,
  pin: string
): Promise<string> {
  const salt = base64ToArrayBuffer(encryptedData.salt);
  const iv = base64ToArrayBuffer(encryptedData.iv);
  const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);

  const key = await deriveKeyFromPin(pin, salt);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt. Invalid PIN or corrupted data.');
  }
}

/**
 * Verify if a PIN can decrypt the stored data (for PIN verification)
 */
export async function verifyPinCanDecrypt(
  encryptedData: EncryptedData,
  pin: string
): Promise<boolean> {
  try {
    await decryptPrivateKey(encryptedData, pin);
    return true;
  } catch {
    return false;
  }
}
