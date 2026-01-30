/**
 * Hook to perform a real on-chain transfer of tokens to the platform staking wallet.
 * NOTE: Backend has been removed - staking functionality is disabled.
 */
import { useState, useCallback } from 'react';
import { Chain } from '@/hooks/useBlockchain';
import { useBroadcastTransaction } from '@/hooks/useTransactionBroadcast';

export interface StakeTransferParams {
  chain: Chain;
  tokenSymbol: string;
  amount: string;
  contractAddress?: string;
  decimals: number;
  isNative: boolean;
}

export interface StakeTransferResult {
  txHash: string;
  explorerUrl: string;
}

/**
 * Fetch the platform staking wallet address for a given chain.
 * NOTE: Backend removed - always returns null.
 */
export async function getStakeWalletAddress(chain: Chain): Promise<string | null> {
  console.warn('[STAKE TRANSFER] Backend removed - staking not available');
  return null;
}

export function useStakeTransfer() {
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const broadcastMutation = useBroadcastTransaction();

  const transfer = useCallback(async (
    pin: string,
    params: StakeTransferParams
  ): Promise<StakeTransferResult> => {
    setIsTransferring(true);
    setError(null);

    try {
      throw new Error('Staking is not available. Backend has been removed.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transfer failed';
      setError(msg);
      throw err;
    } finally {
      setIsTransferring(false);
    }
  }, [broadcastMutation]);

  return {
    transfer,
    isTransferring,
    error,
    clearError: () => setError(null),
  };
}
