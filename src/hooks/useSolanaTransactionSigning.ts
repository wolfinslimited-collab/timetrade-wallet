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
import { mnemonicToSeedSync } from '@scure/bip39';
import { hmac } from '@noble/hashes/hmac.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { SOLANA_DERIVATION_PATHS, SolanaDerivationPath } from '@/utils/walletDerivation';

export interface SolanaTransactionParams {
  to: string;
  amount: string;
  from: string;
  priorityFee?: number;
  isToken?: boolean;
  tokenMint?: string;
  decimals?: number;
}

export interface SolanaSignedTransaction {
  signedTx: string;
  txHash: string;
}

interface UseSolanaTransactionSigningReturn {
  signTransaction: (privateKey: string, params: SolanaTransactionParams) => Promise<SolanaSignedTransaction>;
  signSplTokenTransaction: (privateKey: string, params: SolanaTransactionParams) => Promise<SolanaSignedTransaction>;
  isSigningAvailable: boolean;
  error: string | null;
  clearError: () => void;
}

const SOLANA_RPC = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
};

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

export function keypairFromPrivateKey(privateKeyHex: string): Keypair {
  const cleanKey = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;
  const privateKeyBytes = new Uint8Array(
    cleanKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  
  if (privateKeyBytes.length !== 32) {
    throw new Error('Invalid private key length. Expected 32 bytes.');
  }
  
  return Keypair.fromSeed(privateKeyBytes);
}

function getStoredSolanaDerivationInfo(): { path: SolanaDerivationPath; index: number } {
  const storedPath = localStorage.getItem('timetrade_solana_derivation_path') as SolanaDerivationPath | null;
  const storedIndex = localStorage.getItem('timetrade_solana_balance_account_index');
  
  return {
    path: storedPath || 'legacy',
    index: storedIndex ? parseInt(storedIndex, 10) : 0,
  };
}

/**
 * Validate a Solana address (base58 encoded, 32-44 characters)
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  // Solana addresses are base58 encoded and typically 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(trimmed);
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

      let keypair: Keypair;
      const isMnemonic = privateKeyOrMnemonic.includes(' ');
      
      if (isMnemonic) {
        const { path, index } = getStoredSolanaDerivationInfo();
        keypair = deriveSolanaKeypair(privateKeyOrMnemonic.trim(), index, path);
        console.log(`Using Solana derivation: path=${path}, index=${index}`);
      } else {
        keypair = keypairFromPrivateKey(privateKeyOrMnemonic);
      }

      const fromPubkey = keypair.publicKey;
      const toPubkey = new PublicKey(params.to);
      const lamports = Math.floor(parseFloat(params.amount) * LAMPORTS_PER_SOL);
      
      if (lamports <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const latest = await connection.getLatestBlockhash('confirmed');
      const blockhash = latest.blockhash;

      const transferInstruction = SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      });

      const transaction = new Transaction();
      
      if (params.priorityFee) {
        const computeBudgetIx = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: params.priorityFee,
        });
        transaction.add(computeBudgetIx);
      }

      transaction.add(transferInstruction);
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      transaction.sign(keypair);

      const serialized = transaction.serialize();
      const hexTx = Buffer.from(serialized).toString('hex');

      const signature = transaction.signature;
      if (!signature) {
        throw new Error('Failed to sign transaction');
      }

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

      const tokenAmount = BigInt(Math.floor(parseFloat(params.amount) * Math.pow(10, decimals)));

      if (tokenAmount <= 0n) {
        throw new Error('Amount must be greater than 0');
      }

      const fromAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const toAta = await getAssociatedTokenAddress(mintPubkey, toPubkey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      console.log('[SPL] From ATA:', fromAta.toBase58());
      console.log('[SPL] To ATA:', toAta.toBase58());

      const latest = await connection.getLatestBlockhash('confirmed');
      const blockhash = latest.blockhash;

      const transaction = new Transaction();

      if (params.priorityFee) {
        const computeBudgetIx = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: params.priorityFee,
        });
        transaction.add(computeBudgetIx);
      }

      let destinationAccountExists = false;
      try {
        await getAccount(connection, toAta, 'confirmed', TOKEN_PROGRAM_ID);
        destinationAccountExists = true;
      } catch {
        console.log('[SPL] Destination ATA does not exist, will create it');
        destinationAccountExists = false;
      }

      if (!destinationAccountExists) {
        const createAtaIx = createAssociatedTokenAccountInstruction(
          fromPubkey,
          toAta,
          toPubkey,
          mintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        transaction.add(createAtaIx);
      }

      const transferIx = createTransferInstruction(
        fromAta,
        toAta,
        fromPubkey,
        tokenAmount,
        [],
        TOKEN_PROGRAM_ID
      );
      transaction.add(transferIx);

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      transaction.sign(keypair);

      const serialized = transaction.serialize();
      const hexTx = Buffer.from(serialized).toString('hex');

      const signature = transaction.signature;
      if (!signature) {
        throw new Error('Failed to sign transaction');
      }

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
        tokenAmount: tokenAmount.toString(),
        mint: mintPubkey.toBase58(),
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
    isSigningAvailable: true,
    error,
    clearError,
  };
}
