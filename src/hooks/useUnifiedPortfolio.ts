import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPriceForSymbol, useCryptoPrices } from "@/hooks/useCryptoPrices";
import { Chain, useWalletBalance, WalletBalance } from "@/hooks/useBlockchain";
import { isEvmAddress, isTronAddress } from "@/utils/tronAddress";

export interface UnifiedAsset {
  symbol: string;
  name: string;
  amount: number;
  price: number;
  valueUsd: number;
}

const isLikelySolanaAddress = (address: string | null | undefined) => {
  if (!address) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
};

function getAddressesFromStorage() {
  const storedEvmAddress = localStorage.getItem("timetrade_wallet_address_evm");
  const storedSolanaAddress = localStorage.getItem("timetrade_wallet_address_solana");
  const storedTronAddress = localStorage.getItem("timetrade_wallet_address_tron");

  // Log all address keys for debugging
  console.log(`%c[UNIFIED PORTFOLIO] 🔍 Reading Addresses from Storage`, 'color: #6366f1;', {
    evm: storedEvmAddress || '(empty)',
    solana: storedSolanaAddress || '(empty)',
    tron: storedTronAddress || '(empty)',
  });

  return {
    evmAddress: storedEvmAddress?.trim() || null,
    solanaAddress: storedSolanaAddress?.trim() || null,
    tronAddress: storedTronAddress?.trim() || null,
  };
}

function toDecimalAmount(balance: string, decimals: number) {
  const n = parseFloat(balance);
  if (!Number.isFinite(n)) return 0;
  return n / Math.pow(10, decimals);
}

const CHAINS: Chain[] = ["ethereum", "polygon", "solana", "tron"];

export function useUnifiedPortfolio(enabled: boolean) {
  const queryClient = useQueryClient();

  // State to hold addresses - updated on mount and when account switches
  const [addresses, setAddresses] = React.useState(() => getAddressesFromStorage());

  const { evmAddress, solanaAddress, tronAddress } = addresses;

  // Log active addresses whenever they change
  React.useEffect(() => {
    if (!enabled) return;
    console.log(`%c[UNIFIED PORTFOLIO] 📍 Active Addresses`, 'color: #a855f7; font-weight: bold;', {
      evm: evmAddress || '(not set)',
      solana: solanaAddress || '(not set)',
      tron: tronAddress || '(not set)',
      enabled,
      timestamp: new Date().toISOString(),
    });
  }, [enabled, evmAddress, solanaAddress, tronAddress]);

  // Listen for account switch events and re-read addresses
  React.useEffect(() => {
    if (!enabled) return;

    const handleAccountSwitch = () => {
      console.log(`%c[UNIFIED PORTFOLIO] 🔄 Account Switch Event Received`, 'color: #f97316; font-weight: bold;', {
        timestamp: new Date().toISOString(),
      });
      
      // Re-read addresses from storage
      const newAddresses = getAddressesFromStorage();
      setAddresses(newAddresses);
      
      console.log(`%c[UNIFIED PORTFOLIO] 🔄 New Addresses After Switch`, 'color: #22c55e; font-weight: bold;', {
        evm: newAddresses.evmAddress || '(not set)',
        solana: newAddresses.solanaAddress || '(not set)',
        tron: newAddresses.tronAddress || '(not set)',
      });
      
      // Invalidate queries to force refetch with new addresses
      console.log(`%c[UNIFIED PORTFOLIO] 🗑️ Invalidating Queries`, 'color: #eab308;');
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['cryptoPrices'] });
    };

    window.addEventListener('timetrade:account-switched', handleAccountSwitch);
    window.addEventListener('timetrade:unlocked', handleAccountSwitch);

    return () => {
      window.removeEventListener('timetrade:account-switched', handleAccountSwitch);
      window.removeEventListener('timetrade:unlocked', handleAccountSwitch);
    };
  }, [enabled, queryClient]);

  // Determine which addresses to use for queries
  const queryEvmAddress = enabled && evmAddress ? evmAddress : null;
  const querySolanaAddress = enabled && solanaAddress ? solanaAddress : null;
  const queryTronAddress = enabled && tronAddress ? tronAddress : null;

  // Log query addresses
  React.useEffect(() => {
    if (enabled) {
      console.log(`%c[UNIFIED PORTFOLIO] 🔗 Query Addresses`, 'color: #3b82f6;', {
        ethereum: queryEvmAddress || '(disabled)',
        polygon: queryEvmAddress || '(disabled)',
        solana: querySolanaAddress || '(disabled)',
        tron: queryTronAddress || '(disabled)',
      });
    }
  }, [enabled, queryEvmAddress, querySolanaAddress, queryTronAddress]);

  // Fetch balances in parallel (React Query)
  const ethBalance = useWalletBalance(queryEvmAddress, "ethereum");
  const polyBalance = useWalletBalance(queryEvmAddress, "polygon");
  const solBalance = useWalletBalance(querySolanaAddress, "solana");
  const tronBalance = useWalletBalance(queryTronAddress, "tron");

  const balances = React.useMemo(() => {
    const list: WalletBalance[] = [];
    if (ethBalance.data) list.push(ethBalance.data);
    if (polyBalance.data) list.push(polyBalance.data);
    if (solBalance.data) list.push(solBalance.data);
    if (tronBalance.data) list.push(tronBalance.data);
    return list;
  }, [ethBalance.data, polyBalance.data, solBalance.data, tronBalance.data]);

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
    const bySymbol = new Map<string, { symbol: string; name: string; amount: number }>();

    const add = (symbol: string, name: string, amount: number) => {
      const key = symbol.toUpperCase();
      if (!key || key === "UNKNOWN" || !Number.isFinite(amount) || amount <= 0) return;
      const existing = bySymbol.get(key);
      if (!existing) {
        bySymbol.set(key, { symbol: key, name: name || key, amount });
      } else {
        existing.amount += amount;
        if (!existing.name && name) existing.name = name;
      }
    };

    for (const b of balances) {
      add(
        b.native.symbol,
        b.native.name ?? b.native.symbol,
        toDecimalAmount(b.native.balance, b.native.decimals)
      );
      for (const t of b.tokens || []) {
        add(t.symbol, t.name ?? t.symbol, toDecimalAmount(t.balance, t.decimals));
      }
    }

    const list = Array.from(bySymbol.values()).map((h) => {
      const price = getPriceForSymbol(pricesQuery.data, h.symbol);
      return {
        symbol: h.symbol,
        name: h.name,
        amount: h.amount,
        price,
        valueUsd: h.amount * price,
      };
    });

    list.sort((a, b) => b.valueUsd - a.valueUsd);
    return list;
  }, [balances, pricesQuery.data]);

  const totalUsd = React.useMemo(() => {
    return assets.reduce((sum, a) => sum + (Number.isFinite(a.valueUsd) ? a.valueUsd : 0), 0);
  }, [assets]);

  const isLoadingBalances =
    ethBalance.isLoading || polyBalance.isLoading || solBalance.isLoading || tronBalance.isLoading;

  const balanceError =
    (ethBalance.error as Error | null) ||
    (polyBalance.error as Error | null) ||
    (solBalance.error as Error | null) ||
    (tronBalance.error as Error | null) ||
    null;

  return {
    addresses: { evmAddress, solanaAddress, tronAddress },
    chains: CHAINS,
    balances: { ethBalance, polyBalance, solBalance, tronBalance },
    assets,
    totalUsd,
    prices: pricesQuery.data,
    isLoadingBalances,
    isLoadingPrices: pricesQuery.isLoading,
    balanceError,
  };
}
