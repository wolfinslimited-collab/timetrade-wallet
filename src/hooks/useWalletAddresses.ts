import * as React from "react";
import { isEvmAddress, isTronAddress } from "@/utils/tronAddress";

export type WalletAddressKey = "evm" | "solana" | "tron" | "btc";

export interface WalletAddresses {
  evm: string;
  solana: string;
  tron: string;
  btc: string;
}

const isLikelySolanaAddress = (address: string | null | undefined) => {
  if (!address) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address.trim());
};

function readAddressesFromStorage(): WalletAddresses {
  const primary = localStorage.getItem("timetrade_wallet_address");
  const storedEvm = localStorage.getItem("timetrade_wallet_address_evm");
  const storedSol = localStorage.getItem("timetrade_wallet_address_solana");
  const storedTron = localStorage.getItem("timetrade_wallet_address_tron");
  const storedBtc = localStorage.getItem("timetrade_wallet_address_btc");

  const primaryTrimmed = primary?.trim() || "";

  return {
    evm: storedEvm?.trim() || (isEvmAddress(primaryTrimmed) ? primaryTrimmed : ""),
    solana: storedSol?.trim() || (isLikelySolanaAddress(primaryTrimmed) ? primaryTrimmed : ""),
    tron: storedTron?.trim() || (isTronAddress(primaryTrimmed) ? primaryTrimmed : ""),
    btc: storedBtc?.trim() || "",
  };
}

const same = (a: WalletAddresses, b: WalletAddresses) =>
  a.evm === b.evm && a.solana === b.solana && a.tron === b.tron && a.btc === b.btc;

/**
 * Reactive localStorage-backed addresses.
 * - Picks up addresses written after onboarding/derivation
 * - Works even if Receive sheet opens before derivation finishes
 */
export function useWalletAddresses(enabled: boolean, pollMs = 500) {
  const [addresses, setAddresses] = React.useState<WalletAddresses>(() => readAddressesFromStorage());

  React.useEffect(() => {
    if (!enabled) return;

    let alive = true;
    const update = () => {
      if (!alive) return;
      const next = readAddressesFromStorage();
      setAddresses((prev) => (same(prev, next) ? prev : next));
    };

    // initial read
    update();

    // listen to cross-tab updates
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (!e.key.startsWith("timetrade_wallet_address") && !e.key.startsWith("timetrade_user_accounts")) return;
      update();
    };
    window.addEventListener("storage", onStorage);

    // same-tab updates (our app writes to localStorage without firing storage event)
    const interval = window.setInterval(update, pollMs);

    return () => {
      alive = false;
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
  }, [enabled, pollMs]);

  return { addresses };
}
