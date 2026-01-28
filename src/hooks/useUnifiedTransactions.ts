import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Chain, Transaction, TransactionsResponse, useTransactions } from "@/hooks/useBlockchain";
import { getAllAddresses } from "@/utils/walletStorage";

export interface UnifiedTransaction {
  chain: Chain;
  explorerUrl?: string;
  tx: Transaction;
}

function getAddressesFromStorage() {
  const a = getAllAddresses();
  return {
    evm: a.evm?.trim() || null,
    solana: a.solana?.trim() || null,
    tron: a.tron?.trim() || null,
  };
}

/**
 * Fetches real on-chain transactions across all supported networks in parallel,
 * based on the chain-specific addresses stored in localStorage.
 */
export function useUnifiedTransactions(enabled: boolean) {
  const queryClient = useQueryClient();
  const [addressVersion, setAddressVersion] = React.useState(0);

  const addresses = React.useMemo(() => {
    if (!enabled) return { evm: null, solana: null, tron: null };
    return getAddressesFromStorage();
  }, [enabled, addressVersion]);

  // Re-read addresses when the wallet state changes.
  React.useEffect(() => {
    if (!enabled) return;
    const bump = () => setAddressVersion((v) => v + 1);
    window.addEventListener("timetrade:account-switched", bump);
    window.addEventListener("timetrade:unlocked", bump);
    window.addEventListener("timetrade:addresses-updated", bump);
    return () => {
      window.removeEventListener("timetrade:account-switched", bump);
      window.removeEventListener("timetrade:unlocked", bump);
      window.removeEventListener("timetrade:addresses-updated", bump);
    };
  }, [enabled]);

  const eth = useTransactions(enabled ? addresses.evm : null, "ethereum");
  const polygon = useTransactions(enabled ? addresses.evm : null, "polygon");
  const solana = useTransactions(enabled ? addresses.solana : null, "solana");
  const tron = useTransactions(enabled ? addresses.tron : null, "tron");

  const combined = React.useMemo<UnifiedTransaction[]>(() => {
    const push = (chain: Chain, resp?: TransactionsResponse) => {
      if (!resp?.transactions?.length) return;
      for (const tx of resp.transactions) {
        list.push({ chain, explorerUrl: resp.explorerUrl, tx });
      }
    };

    const list: UnifiedTransaction[] = [];
    push("ethereum", eth.data);
    push("polygon", polygon.data);
    push("solana", solana.data);
    push("tron", tron.data);

    list.sort((a, b) => (b.tx.timestamp || 0) - (a.tx.timestamp || 0));
    return list;
  }, [eth.data, polygon.data, solana.data, tron.data]);

  const isLoading = eth.isLoading || polygon.isLoading || solana.isLoading || tron.isLoading;
  const error =
    (eth.error as Error | null) ||
    (polygon.error as Error | null) ||
    (solana.error as Error | null) ||
    (tron.error as Error | null) ||
    null;

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  }, [queryClient]);

  return {
    addresses,
    combined,
    isLoading,
    error,
    invalidate,
  };
}
