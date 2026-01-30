import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Chain } from './useBlockchain';

export interface BroadcastTransactionParams {
  chain: Chain;
  signedTransaction: string;
  testnet?: boolean;
}

export interface BroadcastResult {
  txHash: string;
  explorerUrl: string;
}

// Mock broadcast - backend removed
async function broadcastTransaction(params: BroadcastTransactionParams): Promise<BroadcastResult> {
  // Since backend is removed, just return a mock result
  console.warn('[BROADCAST] Backend removed - transactions cannot be broadcast');
  throw new Error('Transaction broadcasting is not available. Backend has been removed.');
}

export function useBroadcastTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: broadcastTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

// Helper to format a signed transaction for display
export function formatTxHash(hash: string): string {
  if (!hash || hash.length < 16) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}
