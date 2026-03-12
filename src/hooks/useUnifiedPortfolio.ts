import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPriceForSymbol, useCryptoPrices } from "@/hooks/useCryptoPrices";
import { Chain, useWalletBalance, WalletBalance } from "@/hooks/useBlockchain";
import { getAllAddresses } from "@/utils/walletStorage";

export interface UnifiedAsset {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  amount: number;
  price: number;
  valueUsd: number;
  chain: Chain;
  isNative: boolean;
  contractAddress?: string;
}

function addBaseUnitStrings(a: string, b: string): string {
  const aa = (a ?? "0").trim() || "0";
  const bb = (b ?? "0").trim() || "0";
  try {
    return (BigInt(aa) + BigInt(bb)).toString();
  } catch {
    const sum = (parseFloat(aa) || 0) + (parseFloat(bb) || 0);
    return String(Math.round(sum));
  }
}

function getAddressesFromStorage() {
  const addresses = getAllAddresses();

  return {
    evmAddress: addresses.evm?.trim() || null,
    solanaAddress: addresses.solana?.trim() || null,
    tronAddress: addresses.tron?.trim() || null,
  };
}

function toDecimalAmount(balance: string, decimals: number) {
  const n = parseFloat(balance);
  if (!Number.isFinite(n)) return 0;
  return n / Math.pow(10, decimals);
}

const CHAINS: Chain[] = ["ethereum", "polygon", "solana", "tron", "arbitrum", "bsc"];

export function useUnifiedPortfolio(enabled: boolean) {
  const queryClient = useQueryClient();

  const [addressVersion, setAddressVersion] = React.useState(0);
  
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => { setIsMounted(true); }, []);

  const addresses = React.useMemo(() => {
    if (!enabled || !isMounted) {
      return {
        evmAddress: null,
        solanaAddress: null,
        tronAddress: null,
      };
    }
    return getAddressesFromStorage();
  }, [enabled, isMounted, addressVersion]);

  const { evmAddress, solanaAddress, tronAddress } = addresses;

  // Listen for account switch events and re-read addresses
  React.useEffect(() => {
    if (!enabled) return;

    const handleAccountSwitch = () => {
      setAddressVersion((v) => v + 1);
      
      // Single point of invalidation — queries will refetch with the new addresses
      // read from localStorage via the bumped addressVersion.
      queryClient.invalidateQueries({ queryKey: ['walletBalance'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['transactions'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['gasEstimate'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['cryptoPrices'], refetchType: 'active' });
    };

    window.addEventListener('timetrade:account-switched', handleAccountSwitch);
    window.addEventListener('timetrade:unlocked', handleAccountSwitch);
    window.addEventListener('timetrade:addresses-updated', handleAccountSwitch);

    return () => {
      window.removeEventListener('timetrade:account-switched', handleAccountSwitch);
      window.removeEventListener('timetrade:unlocked', handleAccountSwitch);
      window.removeEventListener('timetrade:addresses-updated', handleAccountSwitch);
    };
  }, [enabled, queryClient]);

  // Determine which addresses to use for queries
  const queryEvmAddress = enabled && evmAddress ? evmAddress : null;
  const querySolanaAddress = enabled && solanaAddress ? solanaAddress : null;
  const queryTronAddress = enabled && tronAddress ? tronAddress : null;

  // Fetch balances in parallel (React Query)
  const ethBalance = useWalletBalance(queryEvmAddress, "ethereum");
  const polyBalance = useWalletBalance(queryEvmAddress, "polygon");
  const arbBalance = useWalletBalance(queryEvmAddress, "arbitrum");
  const bscBalance = useWalletBalance(queryEvmAddress, "bsc");
  const solBalance = useWalletBalance(querySolanaAddress, "solana");
  const tronBalance = useWalletBalance(queryTronAddress, "tron");

  const balances = React.useMemo(() => {
    const list: WalletBalance[] = [];
    const seenChains = new Set<Chain>();
    
    const addIfUnique = (data: WalletBalance | undefined) => {
      if (data && !seenChains.has(data.chain)) {
        seenChains.add(data.chain);
        list.push(data);
      }
    };
    
    addIfUnique(ethBalance.data);
    addIfUnique(polyBalance.data);
    addIfUnique(arbBalance.data);
    addIfUnique(bscBalance.data);
    addIfUnique(solBalance.data);
    addIfUnique(tronBalance.data);
    
    return list;
  }, [ethBalance.data, polyBalance.data, arbBalance.data, bscBalance.data, solBalance.data, tronBalance.data]);

  const symbols = React.useMemo(() => {
    const set = new Set<string>(["ETH", "BTC", "SOL", "POL", "TRX", "USDC", "USDT"]);
    for (const b of balances) {
      if (b.native?.symbol) set.add(b.native.symbol);
      for (const t of b.tokens || []) {
        if (t?.symbol) set.add(t.symbol);
      }
    }
    return Array.from(set)
      .filter(Boolean)
      .map((s) => s.toUpperCase())
      .sort();
  }, [balances]);

  const pricesQuery = useCryptoPrices(symbols);

  const assets: UnifiedAsset[] = React.useMemo(() => {
    const byChainSymbol = new Map<
      string,
      {
        symbol: string;
        name: string;
        balance: string;
        decimals: number;
        amount: number;
        chain: Chain;
        isNative: boolean;
        contractAddress?: string;
      }
    >();

    const add = (entry: {
      chain: Chain;
      symbol: string;
      name: string;
      balance: string;
      decimals: number;
      amount: number;
      isNative: boolean;
      contractAddress?: string;
    }) => {
      const symbolKey = entry.symbol.toUpperCase();
      if (!symbolKey || symbolKey === "UNKNOWN") return;
      if (!Number.isFinite(entry.amount) || entry.amount <= 0) return;

      const contractKey = entry.contractAddress || "native";
      const compositeKey = `${entry.chain}:${symbolKey}:${contractKey}`;
      const existing = byChainSymbol.get(compositeKey);

      if (!existing) {
        byChainSymbol.set(compositeKey, {
          symbol: symbolKey,
          name: entry.name || symbolKey,
          balance: entry.balance,
          decimals: entry.decimals,
          amount: entry.amount,
          chain: entry.chain,
          isNative: entry.isNative,
          contractAddress: entry.contractAddress,
        });
        return;
      }

      existing.amount += entry.amount;
      existing.balance = addBaseUnitStrings(existing.balance, entry.balance);
      if (!existing.name && entry.name) existing.name = entry.name;
    };

    const getNativeDisplayName = (chain: Chain, symbol: string, originalName?: string): string => {
      const chainNames: Record<Chain, string> = {
        ethereum: "Ethereum",
        polygon: "Polygon",
        arbitrum: "Arbitrum One",
        bsc: "BNB Chain",
        solana: "Solana",
        tron: "Tron",
        bitcoin: "Bitcoin",
      };
      if (symbol.toUpperCase() === "ETH" && chain !== "ethereum") {
        return `ETH (${chainNames[chain]})`;
      }
      return originalName ?? symbol;
    };

    for (const b of balances) {
      add({
        chain: b.chain,
        symbol: b.native.symbol,
        name: getNativeDisplayName(b.chain, b.native.symbol, b.native.name),
        balance: b.native.balance,
        decimals: b.native.decimals,
        amount: toDecimalAmount(b.native.balance, b.native.decimals),
        isNative: true,
      });
      for (const t of b.tokens || []) {
        add({
          chain: b.chain,
          symbol: t.symbol,
          name: t.name ?? t.symbol,
          balance: t.balance,
          decimals: t.decimals,
          amount: toDecimalAmount(t.balance, t.decimals),
          isNative: false,
          contractAddress: t.contractAddress,
        });
      }
    }

    const list = Array.from(byChainSymbol.values()).map((h) => {
      const price = getPriceForSymbol(pricesQuery.data, h.symbol);
      return {
        symbol: h.symbol,
        name: h.name,
        balance: h.balance,
        decimals: h.decimals,
        amount: h.amount,
        price,
        valueUsd: h.amount * price,
        chain: h.chain,
        isNative: h.isNative,
        contractAddress: h.contractAddress,
      };
    });

    list.sort((a, b) => b.valueUsd - a.valueUsd);
    return list;
  }, [balances, pricesQuery.data]);

  const totalUsd = React.useMemo(() => {
    return assets.reduce((sum, a) => sum + (Number.isFinite(a.valueUsd) ? a.valueUsd : 0), 0);
  }, [assets]);

  const isLoadingBalances =
    ethBalance.isLoading || polyBalance.isLoading || arbBalance.isLoading || bscBalance.isLoading || solBalance.isLoading || tronBalance.isLoading;

  const balanceError =
    (ethBalance.error as Error | null) ||
    (polyBalance.error as Error | null) ||
    (arbBalance.error as Error | null) ||
    (bscBalance.error as Error | null) ||
    (solBalance.error as Error | null) ||
    (tronBalance.error as Error | null) ||
    null;

  return {
    addresses: { evmAddress, solanaAddress, tronAddress },
    chains: CHAINS,
    balances: { ethBalance, polyBalance, arbBalance, bscBalance, solBalance, tronBalance },
    assets,
    totalUsd,
    prices: pricesQuery.data,
    isLoadingBalances,
    isLoadingPrices: pricesQuery.isLoading,
    balanceError,
  };
}