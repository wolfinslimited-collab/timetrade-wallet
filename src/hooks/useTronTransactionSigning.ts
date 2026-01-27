import { useState, useCallback } from 'react';
import { 
  signTrxTransaction, 
  signTrc20Transaction, 
  isValidTronAddress,
  TronTransactionParams,
  TronTRC20TransactionParams,
  SignedTronTransaction 
} from '@/utils/tronTransaction';

export interface TronSigningParams {
  to: string;
  amount: string;
  from: string;
  // For TRC-20 tokens
  contractAddress?: string;
  decimals?: number;
  isToken?: boolean;
}

interface UseTronTransactionSigningReturn {
  signTransaction: (privateKey: string, params: TronSigningParams) => Promise<SignedTronTransaction>;
  isSigningAvailable: boolean;
  error: string | null;
  clearError: () => void;
}

export function useTronTransactionSigning(isTestnet: boolean = true): UseTronTransactionSigningReturn {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const signTransaction = useCallback(async (
    privateKey: string,
    params: TronSigningParams
  ): Promise<SignedTronTransaction> => {
    try {
      setError(null);

      // Validate addresses
      if (!isValidTronAddress(params.to)) {
        throw new Error('Invalid recipient Tron address');
      }
      if (!isValidTronAddress(params.from)) {
        throw new Error('Invalid sender Tron address');
      }

      // Validate private key format
      let pk = privateKey;
      if (!pk.startsWith('0x')) {
        pk = '0x' + pk;
      }
      if (pk.length !== 66) {
        throw new Error('Invalid private key format');
      }

      if (params.isToken && params.contractAddress) {
        // TRC-20 token transfer
        if (!isValidTronAddress(params.contractAddress)) {
          throw new Error('Invalid contract address');
        }

        const trc20Params: TronTRC20TransactionParams = {
          to: params.to,
          amount: params.amount,
          from: params.from,
          contractAddress: params.contractAddress,
          decimals: params.decimals || 6,
        };

        console.log('Signing TRC-20 transaction:', trc20Params);
        return await signTrc20Transaction(pk, trc20Params, isTestnet);
      } else {
        // Native TRX transfer
        const trxParams: TronTransactionParams = {
          to: params.to,
          amount: params.amount,
          from: params.from,
        };

        console.log('Signing TRX transaction:', trxParams);
        return await signTrxTransaction(pk, trxParams, isTestnet);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign Tron transaction';
      setError(message);
      throw err;
    }
  }, [isTestnet]);

  return {
    signTransaction,
    isSigningAvailable: true, // Tron signing is always available
    error,
    clearError,
  };
}
