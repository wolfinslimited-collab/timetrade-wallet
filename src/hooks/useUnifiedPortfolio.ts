import * as React from "react";
import { getPriceForSymbol, useCryptoPrices } from "@/hooks/useCryptoPrices";
import { Chain, useWalletBalance, WalletBalance } from "@/hooks/useBlockchain";

export interface UnifiedAsset {
  symbol: string;
  name: string;
  amount: number;
  price: number;
  valueUsd: number;
}

// Address detection is now handled by BlockchainContext

function toDecimalAmount(balance: string, decimals: number) {
  const n = parseFloat(balance);
  if (!Number.isFinite(n)) return 0;
  return n / Math.pow(10, decimals);
}

const CHAINS: Chain[] = ["ethereum", "polygon", "solana", "tron"];

export function useUnifiedPortfolio(enabled: boolean) {
  const [tick, setTick] = React.useState(0);
  
  // Addresses for each chain from localStorage (active account index already synced there)
  const addresses = React.useMemo(() => {
    const storedEvmAddress = localStorage.getItem("timetrade_wallet_address_evm");
    const storedSolanaAddress = localStorage.getItem("timetrade_wallet_address_solana");
    const storedTronAddress = localStorage.getItem("timetrade_wallet_address_tron");

    console.log('[useUnifiedPortfolio] Reading addresses:', { storedEvmAddress, storedSolanaAddress, storedTronAddress });
    
    return {
      evm: storedEvmAddress || null,
      solana: storedSolanaAddress || null,
      tron: storedTronAddress || null,
    };
  }, [tick]);

  // Poll for address changes (in case BlockchainContext updates them after initial render)
  React.useEffect(() => {
    const interval = setInterval(() => {
      const storedSolana = localStorage.getItem('timetrade_wallet_address_solana');
      if (storedSolana && !addresses.solana) {
        setTick(t => t + 1);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [addresses.solana]);

  // Fetch balances in parallel (React Query)
  const ethBalance = useWalletBalance(enabled ? addresses.evm : null, "ethereum");
  const polyBalance = useWalletBalance(enabled ? addresses.evm : null, "polygon");
  const solBalance = useWalletBalance(enabled ? addresses.solana : null, "solana");
  const tronBalance = useWalletBalance(enabled ? addresses.tron : null, "tron");

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
    addresses: { evmAddress: addresses.evm, solanaAddress: addresses.solana, tronAddress: addresses.tron },
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
