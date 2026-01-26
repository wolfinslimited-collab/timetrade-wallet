import { supabase } from '@/integrations/supabase/client';
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

interface BroadcastResponse {
  success: boolean;
  data?: BroadcastResult;
  error?: string;
}

async function broadcastTransaction(params: BroadcastTransactionParams): Promise<BroadcastResult> {
  const { chain, signedTransaction, testnet = false } = params;

  const { data, error } = await supabase.functions.invoke('blockchain', {
    body: {
      action: 'broadcastTransaction',
      chain,
      address: '', // Not needed for broadcast
      signedTransaction,
      testnet,
    },
  });

  if (error) {
    console.error('Broadcast error:', error);
    throw new Error(error.message || 'Failed to broadcast transaction');
  }

  const response = data as BroadcastResponse;

  if (!response.success) {
    throw new Error(response.error || 'Unknown broadcast error');
  }

  return response.data!;
}

export function useBroadcastTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: broadcastTransaction,
    onSuccess: () => {
      // Invalidate balance and transaction queries after successful broadcast
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
