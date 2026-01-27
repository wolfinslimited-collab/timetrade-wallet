import { useState, useCallback } from 'react';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
  sendAndConfirmRawTransaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import { mnemonicToSeedSync } from '@scure/bip39';
import { SOLANA_DERIVATION_PATHS, SolanaDerivationPath } from '@/utils/walletDerivation';

export interface SolanaTransactionParams {
  to: string;
  amount: string; // Amount in SOL
  from: string;
  priorityFee?: number; // In micro-lamports per compute unit
}

export interface SolanaSignedTransaction {
  signedTx: string; // Base64 encoded serialized transaction
  txHash: string;
}

interface UseSolanaTransactionSigningReturn {
  signTransaction: (privateKey: string, params: SolanaTransactionParams) => Promise<SolanaSignedTransaction>;
  isSigningAvailable: boolean;
  error: string | null;
  clearError: () => void;
}

// Solana RPC endpoints
const SOLANA_RPC = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
};

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
  const derivedSeed = derivePath(path, Buffer.from(seed).toString('hex')).key;
  return Keypair.fromSeed(derivedSeed);
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
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

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
      const base64Tx = Buffer.from(serialized).toString('base64');

      // Get the signature (transaction hash)
      const signature = transaction.signature;
      if (!signature) {
        throw new Error('Failed to sign transaction');
      }

      const txHash = Buffer.from(signature).toString('base64');

      console.log('Solana transaction signed successfully:', {
        from: fromPubkey.toBase58(),
        to: toPubkey.toBase58(),
        lamports,
        blockhash,
      });

      return {
        signedTx: base64Tx,
        txHash,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign Solana transaction';
      console.error('Solana signing error:', err);
      setError(message);
      throw err;
    }
  }, [isTestnet]);

  return {
    signTransaction,
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
