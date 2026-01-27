import * as React from "react";
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
  // Base58 (no 0,O,I,l) and typical Solana pubkey length
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
};

const getAddressesFromStorage = () => {
  const primaryAddress = localStorage.getItem("timetrade_wallet_address");
  const storedEvmAddress = localStorage.getItem("timetrade_wallet_address_evm");
  const storedSolanaAddress = localStorage.getItem("timetrade_wallet_address_solana");
  const storedTronAddress = localStorage.getItem("timetrade_wallet_address_tron");

  const norm = (v: string | null) => {
    const t = v?.trim();
    return t && t.length > 0 ? t : null;
  };

  const evmFromKey = norm(storedEvmAddress);
  const solFromKey = norm(storedSolanaAddress);
  const tronFromKey = norm(storedTronAddress);

  return {
    evmAddress: (evmFromKey && isEvmAddress(evmFromKey) ? evmFromKey : null) ||
      (isEvmAddress(primaryAddress) ? primaryAddress!.trim() : null),
    solanaAddress:
      (solFromKey && isLikelySolanaAddress(solFromKey) ? solFromKey : null) ||
      (isLikelySolanaAddress(primaryAddress) ? primaryAddress!.trim() : null),
    tronAddress:
      (tronFromKey && isTronAddress(tronFromKey) ? tronFromKey : null) ||
      (isTronAddress(primaryAddress) ? primaryAddress!.trim() : null),
  };
};

function toDecimalAmount(balance: string, decimals: number) {
  const n = parseFloat(balance);
  if (!Number.isFinite(n)) return 0;
  return n / Math.pow(10, decimals);
}

const CHAINS: Chain[] = ["ethereum", "polygon", "solana", "tron"];

export function useUnifiedPortfolio(enabled: boolean) {
  // Use state to reactively track addresses (re-read when localStorage might have changed)
  const [addresses, setAddresses] = React.useState(() => getAddressesFromStorage());
  
  // Re-read addresses periodically to catch updates from BlockchainContext
  React.useEffect(() => {
    if (!enabled) return;
    
    // Initial read
    setAddresses(getAddressesFromStorage());
    
    // Poll for changes (BlockchainContext writes async after derivation)
    const interval = setInterval(() => {
      setAddresses(getAddressesFromStorage());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [enabled]);

  const { evmAddress, solanaAddress, tronAddress } = addresses;

  // Debug logging for address detection
  React.useEffect(() => {
    if (enabled) {
      console.log('[UnifiedPortfolio] Addresses:', {
        evm: evmAddress,
        solana: solanaAddress,
        tron: tronAddress,
      });
    }
  }, [enabled, evmAddress, solanaAddress, tronAddress]);

  // Fetch balances in parallel (React Query)
  const ethBalance = useWalletBalance(enabled ? evmAddress : null, "ethereum");
  const polyBalance = useWalletBalance(enabled ? evmAddress : null, "polygon");
  const solBalance = useWalletBalance(enabled ? solanaAddress : null, "solana");
  const tronBalance = useWalletBalance(enabled ? tronAddress : null, "tron");

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
