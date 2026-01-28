import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPriceForSymbol, useCryptoPrices } from "@/hooks/useCryptoPrices";
import { Chain, useWalletBalance, WalletBalance } from "@/hooks/useBlockchain";
import { getAllAddresses } from "@/utils/walletStorage";

export interface UnifiedAsset {
  symbol: string;
  name: string;
  amount: number;
  price: number;
  valueUsd: number;
  chain: Chain; // Track which chain this asset is on
}

function getAddressesFromStorage() {
  const addresses = getAllAddresses();
  
  console.log(`%c[UNIFIED PORTFOLIO] 🔍 Reading Addresses from Storage`, 'color: #6366f1;', {
    evm: addresses.evm || '(empty)',
    solana: addresses.solana || '(empty)',
    tron: addresses.tron || '(empty)',
  });

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

const CHAINS: Chain[] = ["ethereum", "polygon", "solana", "tron"];

export function useUnifiedPortfolio(enabled: boolean) {
  const queryClient = useQueryClient();

  // Use a version counter to force re-reads of addresses
  const [addressVersion, setAddressVersion] = React.useState(0);

  // Compute addresses from storage when:
  // - we become enabled (after mnemonic derivation writes addresses)
  // - an account switch/unlock event bumps the version
  const addresses = React.useMemo(() => {
    if (!enabled) {
      return {
        evmAddress: null,
        solanaAddress: null,
        tronAddress: null,
      };
    }
    return getAddressesFromStorage();
  }, [enabled, addressVersion]);

  const { evmAddress, solanaAddress, tronAddress } = addresses;

  // Log active addresses whenever they change
  React.useEffect(() => {
    if (!enabled) return;
    console.log(`%c[UNIFIED PORTFOLIO] 📍 Active Addresses (v${addressVersion})`, 'color: #a855f7; font-weight: bold;', {
      evm: evmAddress || '(not set)',
      solana: solanaAddress || '(not set)',
      tron: tronAddress || '(not set)',
      enabled,
      timestamp: new Date().toISOString(),
    });
  }, [enabled, evmAddress, solanaAddress, tronAddress, addressVersion]);

  // Listen for account switch events and re-read addresses
  React.useEffect(() => {
    if (!enabled) return;

    const handleAccountSwitch = () => {
      console.log(`%c[UNIFIED PORTFOLIO] 🔄 Account Switch Event Received`, 'color: #f97316; font-weight: bold;', {
        timestamp: new Date().toISOString(),
      });
      
      // Bump version to force useMemo recalculation
      setAddressVersion((v) => v + 1);
      
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
      console.log(`%c[UNIFIED PORTFOLIO] 🔗 Query Addresses (v${addressVersion})`, 'color: #3b82f6;', {
        ethereum: queryEvmAddress || '(disabled)',
        polygon: queryEvmAddress || '(disabled)',
        solana: querySolanaAddress || '(disabled)',
        tron: queryTronAddress || '(disabled)',
      });
    }
  }, [enabled, queryEvmAddress, querySolanaAddress, queryTronAddress, addressVersion]);

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
    // Use composite key (chain + symbol) to show each asset per-chain separately
    // This ensures USDC on Solana shows Solana badge, USDC on Ethereum shows ETH badge
    const byChainSymbol = new Map<string, { symbol: string; name: string; amount: number; chain: Chain }>();

    const add = (chain: Chain, symbol: string, name: string, amount: number) => {
      const symbolKey = symbol.toUpperCase();
      if (!symbolKey || symbolKey === "UNKNOWN" || !Number.isFinite(amount) || amount <= 0) return;
      
      const compositeKey = `${chain}:${symbolKey}`;
      const existing = byChainSymbol.get(compositeKey);
      if (!existing) {
        byChainSymbol.set(compositeKey, { symbol: symbolKey, name: name || symbolKey, amount, chain });
      } else {
        existing.amount += amount;
        if (!existing.name && name) existing.name = name;
      }
    };

    for (const b of balances) {
      // Add native token with its chain
      add(
        b.chain,
        b.native.symbol,
        b.native.name ?? b.native.symbol,
        toDecimalAmount(b.native.balance, b.native.decimals)
      );
      // Add each token with its chain
      for (const t of b.tokens || []) {
        add(b.chain, t.symbol, t.name ?? t.symbol, toDecimalAmount(t.balance, t.decimals));
      }
    }

    const list = Array.from(byChainSymbol.values()).map((h) => {
      const price = getPriceForSymbol(pricesQuery.data, h.symbol);
      return {
        symbol: h.symbol,
        name: h.name,
        amount: h.amount,
        price,
        valueUsd: h.amount * price,
        chain: h.chain,
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
