import { useState, useCallback } from 'react';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { invokeBlockchain } from '@/lib/blockchain';
import { mnemonicToSeedSync } from '@scure/bip39';
import { hmac } from '@noble/hashes/hmac.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { SOLANA_DERIVATION_PATHS, SolanaDerivationPath } from '@/utils/walletDerivation';

export interface SolanaTransactionParams {
  to: string;
  amount: string; // Amount in SOL (for native) or token units (for SPL)
  from: string;
  priorityFee?: number; // In micro-lamports per compute unit
  // SPL Token fields (optional)
  isToken?: boolean;
  tokenMint?: string; // SPL token mint address
  decimals?: number; // Token decimals (default 6 for most stablecoins)
}

export interface SolanaSignedTransaction {
  signedTx: string; // Hex encoded serialized transaction
  txHash: string;
}

interface UseSolanaTransactionSigningReturn {
  signTransaction: (privateKey: string, params: SolanaTransactionParams) => Promise<SolanaSignedTransaction>;
  signSplTokenTransaction: (privateKey: string, params: SolanaTransactionParams) => Promise<SolanaSignedTransaction>;
  isSigningAvailable: boolean;
  error: string | null;
  clearError: () => void;
}

// Solana RPC endpoints
const SOLANA_RPC = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
};

// ─────────────────────────────────────────────────────────────────────────────
// ED25519 BIP32 derivation – browser-compatible
// ─────────────────────────────────────────────────────────────────────────────
const ED25519_CURVE = "ed25519 seed";
const HARDENED_OFFSET = 0x80000000;

interface DerivedKey { key: Uint8Array; chainCode: Uint8Array; }

function hexToBytes(hex: string): Uint8Array {
  const len = hex.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

function getMasterKeyFromSeed(seedHex: string): DerivedKey {
  const I = hmac(sha512, new TextEncoder().encode(ED25519_CURVE), hexToBytes(seedHex));
  return { key: I.slice(0, 32), chainCode: I.slice(32) };
}

function CKDPriv({ key, chainCode }: DerivedKey, index: number): DerivedKey {
  const indexBuffer = new Uint8Array(4);
  new DataView(indexBuffer.buffer).setUint32(0, index, false);
  const data = new Uint8Array(1 + 32 + 4);
  data[0] = 0x00;
  data.set(key, 1);
  data.set(indexBuffer, 33);
  const I = hmac(sha512, chainCode, data);
  return { key: I.slice(0, 32), chainCode: I.slice(32) };
}

function derivePath(path: string, seedHex: string): DerivedKey {
  const segments = path.replace("m/", "").split("/").map(seg => {
    const isHardened = seg.endsWith("'");
    return (isHardened ? parseInt(seg.slice(0, -1), 10) + HARDENED_OFFSET : parseInt(seg, 10));
  });
  let derived = getMasterKeyFromSeed(seedHex);
  for (const idx of segments) derived = CKDPriv(derived, idx);
  return derived;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Derive a Solana Keypair from a mnemonic phrase
 */
export function deriveSolanaKeypair(
  phrase: string,
  accountIndex: number = 0,
  pathStyle: SolanaDerivationPath = 'phantom'
): Keypair {
  const seed = mnemonicToSeedSync(phrase);
  const pathConfig = SOLANA_DERIVATION_PATHS[pathStyle];
  const path = pathConfig.getPath(accountIndex);
  const { key } = derivePath(path, bytesToHex(seed));
  return Keypair.fromSeed(key);
}

/**
 * Derive a Solana Keypair from a raw 32-byte private key (hex string)
 */
export function keypairFromPrivateKey(privateKeyHex: string): Keypair {
  // Remove 0x prefix if present
  const cleanKey = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;
  
  // For Solana, we need the 32-byte seed
  // The private key is the first 32 bytes
  const privateKeyBytes = new Uint8Array(
    cleanKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  
  if (privateKeyBytes.length !== 32) {
    throw new Error('Invalid private key length. Expected 32 bytes.');
  }
  
  return Keypair.fromSeed(privateKeyBytes);
}

/**
 * Get stored Solana derivation path and index
 */
function getStoredSolanaDerivationInfo(): { path: SolanaDerivationPath; index: number } {
  const storedPath = localStorage.getItem('timetrade_solana_derivation_path') as SolanaDerivationPath | null;
  const storedIndex = localStorage.getItem('timetrade_solana_balance_account_index');
  
  return {
    path: storedPath || 'legacy',
    index: storedIndex ? parseInt(storedIndex, 10) : 0,
  };
}

export function useSolanaTransactionSigning(isTestnet: boolean = false): UseSolanaTransactionSigningReturn {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const signTransaction = useCallback(async (
    privateKeyOrMnemonic: string,
    params: SolanaTransactionParams
  ): Promise<SolanaSignedTransaction> => {
    try {
      setError(null);
      
      const rpcUrl = isTestnet ? SOLANA_RPC.devnet : SOLANA_RPC.mainnet;
      const connection = new Connection(rpcUrl, 'confirmed');

      // Determine if input is mnemonic (contains spaces) or private key
      let keypair: Keypair;
      const isMnemonic = privateKeyOrMnemonic.includes(' ');
      
      if (isMnemonic) {
        // Derive keypair from mnemonic using stored path/index
        const { path, index } = getStoredSolanaDerivationInfo();
        keypair = deriveSolanaKeypair(privateKeyOrMnemonic.trim(), index, path);
        console.log(`Using Solana derivation: path=${path}, index=${index}`);
      } else {
        // Use raw private key
        keypair = keypairFromPrivateKey(privateKeyOrMnemonic);
      }

      const fromPubkey = keypair.publicKey;
      const toPubkey = new PublicKey(params.to);

      // Convert SOL amount to lamports
      const lamports = Math.floor(parseFloat(params.amount) * LAMPORTS_PER_SOL);
      
      if (lamports <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Get recent blockhash
      // Public Solana RPCs can return 403 in some environments, so we fall back to our backend Solana RPC (Helius).
      let blockhash: string;
      try {
        const latest = await connection.getLatestBlockhash('confirmed');
        blockhash = latest.blockhash;
      } catch (e) {
        console.warn('[Solana] getLatestBlockhash failed on public RPC; falling back to backend RPC', e);
        const { data, error: fnError } = await invokeBlockchain({
          action: 'solanaRpc',
          chain: 'solana',
          address: '',
          testnet: isTestnet,
          rpcMethod: 'getLatestBlockhash',
          rpcParams: [{ commitment: 'confirmed' }],
        });
        if (fnError) {
          throw new Error(fnError.message || 'Failed to fetch Solana blockhash');
        }
        const response = data as { success: boolean; data?: any; error?: string };
        if (!response?.success) {
          throw new Error(response?.error || 'Failed to fetch Solana blockhash');
        }
        blockhash = response.data?.value?.blockhash || response.data?.blockhash;
        if (!blockhash) {
          throw new Error('Failed to fetch Solana blockhash');
        }
      }

      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      });

      // Create transaction
      const transaction = new Transaction();
      
      // Add priority fee if specified (helps with faster confirmation)
      if (params.priorityFee) {
        const computeBudgetIx = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: params.priorityFee,
        });
        transaction.add(computeBudgetIx);
      }

      transaction.add(transferInstruction);
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // Sign transaction
      transaction.sign(keypair);

      // Serialize the signed transaction
      const serialized = transaction.serialize();
      // Tatum expects hex-encoded transaction data
      const hexTx = Buffer.from(serialized).toString('hex');

      // Get the signature (transaction hash) - convert to base58 for display
      const signature = transaction.signature;
      if (!signature) {
        throw new Error('Failed to sign transaction');
      }

      // The signature in base58 is used as the transaction hash on Solana
      const bs58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      const toBase58 = (bytes: Uint8Array): string => {
        let num = BigInt(0);
        for (const byte of bytes) {
          num = num * BigInt(256) + BigInt(byte);
        }
        let result = '';
        while (num > 0) {
          result = bs58Chars[Number(num % BigInt(58))] + result;
          num = num / BigInt(58);
        }
        for (const byte of bytes) {
          if (byte === 0) result = '1' + result;
          else break;
        }
        return result || '1';
      };
      
      const txHash = toBase58(signature);

      console.log('Solana transaction signed successfully:', {
        from: fromPubkey.toBase58(),
        to: toPubkey.toBase58(),
        lamports,
        blockhash,
        txHash,
      });

      return {
        signedTx: hexTx,
        txHash,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign Solana transaction';
      console.error('Solana signing error:', err);
      setError(message);
      throw err;
    }
  }, [isTestnet]);

  /**
   * Sign an SPL token transfer transaction
   */
  const signSplTokenTransaction = useCallback(async (
    privateKeyOrMnemonic: string,
    params: SolanaTransactionParams
  ): Promise<SolanaSignedTransaction> => {
    try {
      setError(null);

      if (!params.tokenMint) {
        throw new Error('Token mint address is required for SPL token transfers');
      }

      const rpcUrl = isTestnet ? SOLANA_RPC.devnet : SOLANA_RPC.mainnet;
      const connection = new Connection(rpcUrl, 'confirmed');

      // Determine if input is mnemonic (contains spaces) or private key
      let keypair: Keypair;
      const isMnemonic = privateKeyOrMnemonic.includes(' ');

      if (isMnemonic) {
        const { path, index } = getStoredSolanaDerivationInfo();
        keypair = deriveSolanaKeypair(privateKeyOrMnemonic.trim(), index, path);
        console.log(`[SPL] Using Solana derivation: path=${path}, index=${index}`);
      } else {
        keypair = keypairFromPrivateKey(privateKeyOrMnemonic);
      }

      const fromPubkey = keypair.publicKey;
      const toPubkey = new PublicKey(params.to);
      const mintPubkey = new PublicKey(params.tokenMint);
      const decimals = params.decimals ?? 6;

      // Calculate token amount in base units
      const tokenAmount = BigInt(Math.floor(parseFloat(params.amount) * Math.pow(10, decimals)));

      if (tokenAmount <= 0n) {
        throw new Error('Amount must be greater than 0');
      }

      // Get associated token accounts
      const fromAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const toAta = await getAssociatedTokenAddress(mintPubkey, toPubkey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      console.log('[SPL] From ATA:', fromAta.toBase58());
      console.log('[SPL] To ATA:', toAta.toBase58());

      // Get recent blockhash
      let blockhash: string;
      try {
        const latest = await connection.getLatestBlockhash('confirmed');
        blockhash = latest.blockhash;
      } catch (e) {
        console.warn('[SPL] getLatestBlockhash failed on public RPC; falling back to backend RPC', e);
        const { data, error: fnError } = await invokeBlockchain({
          action: 'solanaRpc',
          chain: 'solana',
          address: '',
          testnet: isTestnet,
          rpcMethod: 'getLatestBlockhash',
          rpcParams: [{ commitment: 'confirmed' }],
        });
        if (fnError) {
          throw new Error(fnError.message || 'Failed to fetch Solana blockhash');
        }
        const response = data as { success: boolean; data?: any; error?: string };
        if (!response?.success) {
          throw new Error(response?.error || 'Failed to fetch Solana blockhash');
        }
        blockhash = response.data?.value?.blockhash || response.data?.blockhash;
        if (!blockhash) {
          throw new Error('Failed to fetch Solana blockhash');
        }
      }

      // Create transaction
      const transaction = new Transaction();

      // Add priority fee if specified
      if (params.priorityFee) {
        const computeBudgetIx = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: params.priorityFee,
        });
        transaction.add(computeBudgetIx);
      }

      // Check if destination ATA exists via backend RPC (public RPC may be blocked)
      let destinationAccountExists = false;
      try {
        // First try direct connection
        await getAccount(connection, toAta, 'confirmed', TOKEN_PROGRAM_ID);
        destinationAccountExists = true;
      } catch (e: unknown) {
        // If it's a token account not found error, we need to create it
        // If it's a network error (403), fall back to backend RPC check
        const errMsg = e instanceof Error ? e.message : String(e);
        if (errMsg.includes('403') || errMsg.includes('Access forbidden') || errMsg.includes('could not find account')) {
          // Try via backend RPC
          try {
            const { data: rpcData, error: rpcError } = await invokeBlockchain({
              action: 'solanaRpc',
              chain: 'solana',
              address: '',
              testnet: isTestnet,
              rpcMethod: 'getAccountInfo',
              rpcParams: [toAta.toBase58(), { encoding: 'base64' }],
            });
            if (!rpcError && rpcData?.success && rpcData?.data?.value) {
              destinationAccountExists = true;
              console.log('[SPL] Destination ATA exists (verified via backend RPC)');
            } else {
              console.log('[SPL] Destination ATA does not exist (verified via backend RPC)');
              destinationAccountExists = false;
            }
          } catch {
            // If backend check also fails, assume we need to create it
            console.log('[SPL] Could not verify ATA existence, will attempt to create it');
            destinationAccountExists = false;
          }
        } else {
          // Standard account not found - we need to create it
          console.log('[SPL] Destination ATA does not exist, will create it');
          destinationAccountExists = false;
        }
      }

      if (!destinationAccountExists) {
        // Add instruction to create the associated token account
        const createAtaIx = createAssociatedTokenAccountInstruction(
          fromPubkey, // payer
          toAta,      // associated token account
          toPubkey,   // owner
          mintPubkey, // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        transaction.add(createAtaIx);
      }

      // Add transfer instruction
      const transferIx = createTransferInstruction(
        fromAta,      // source
        toAta,        // destination
        fromPubkey,   // owner
        tokenAmount,  // amount
        [],           // multi-signers (empty for single signer)
        TOKEN_PROGRAM_ID
      );
      transaction.add(transferIx);

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // Sign transaction
      transaction.sign(keypair);

      // Serialize
      const serialized = transaction.serialize();
      const hexTx = Buffer.from(serialized).toString('hex');

      // Get signature
      const signature = transaction.signature;
      if (!signature) {
        throw new Error('Failed to sign transaction');
      }

      // Convert to base58
      const bs58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      const toBase58 = (bytes: Uint8Array): string => {
        let num = BigInt(0);
        for (const byte of bytes) {
          num = num * BigInt(256) + BigInt(byte);
        }
        let result = '';
        while (num > 0) {
          result = bs58Chars[Number(num % BigInt(58))] + result;
          num = num / BigInt(58);
        }
        for (const byte of bytes) {
          if (byte === 0) result = '1' + result;
          else break;
        }
        return result || '1';
      };

      const txHash = toBase58(signature);

      console.log('[SPL] Token transaction signed successfully:', {
        from: fromPubkey.toBase58(),
        to: toPubkey.toBase58(),
        mint: mintPubkey.toBase58(),
        amount: tokenAmount.toString(),
        decimals,
        txHash,
      });

      return {
        signedTx: hexTx,
        txHash,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign SPL token transaction';
      console.error('[SPL] Signing error:', err);
      setError(message);
      throw err;
    }
  }, [isTestnet]);

  return {
    signTransaction,
    signSplTokenTransaction,
    isSigningAvailable: true, // Solana signing is always available client-side
    error,
    clearError,
  };
}

/**
 * Validate a Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get public key from a Solana keypair derived from mnemonic
 */
export function getSolanaPublicKeyFromMnemonic(
  phrase: string,
  accountIndex: number = 0,
  pathStyle: SolanaDerivationPath = 'phantom'
): string {
  const keypair = deriveSolanaKeypair(phrase, accountIndex, pathStyle);
  return keypair.publicKey.toBase58();
}
