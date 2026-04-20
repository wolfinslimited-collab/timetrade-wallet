import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlatform, type Platform } from "./usePlatform";

type FeatureKey = "showStaking" | "showSwap" | "exchangeEnabled" | "showAiTrade";

const KEY_MAP: Record<FeatureKey, Record<Platform, string>> = {
  showStaking: {
    iphone: "show_staking_iphone",
    android: "show_staking_android",
    web: "show_staking_web",
  },
  showSwap: {
    iphone: "show_swap_iphone",
    android: "show_swap_android",
    web: "show_swap_web",
  },
  exchangeEnabled: {
    iphone: "exchange_enabled_iphone",
    android: "exchange_enabled_android",
    web: "exchange_enabled_web",
  },
  showAiTrade: {
    iphone: "show_ai_trade_iphone",
    android: "show_ai_trade_android",
    web: "show_ai_trade_web",
  },
};

const ALL_KEYS = Object.values(KEY_MAP).flatMap((m) => Object.values(m));

export interface FeatureFlags {
  /** Show the Staking tab in the bottom nav */
  showStaking: boolean;
  /** Show the Swap quick action button */
  showSwap: boolean;
  /** Enable exchange-related entry points (reserved for future use) */
  exchangeEnabled: boolean;
  /** Show the AI Trade tab in the bottom nav */
  showAiTrade: boolean;
  isLoading: boolean;
}

/**
 * Resolves remote feature flags from the `config` table for the current platform.
 * Defaults all flags to `false` while loading or on error (hidden-by-default).
 *
 * Flip flags via Cloud → Tables → `config` (per-platform keys).
 */
export const useFeatureFlags = (): FeatureFlags => {
  const platform = usePlatform();

  const { data, isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config")
        .select("key, value")
        .in("key", ALL_KEYS);
      if (error) throw error;
      const map = new Map<string, unknown>();
      (data ?? []).forEach((row) => map.set(row.key, row.value));
      return map;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const resolve = (feature: FeatureKey): boolean => {
    if (!data) return false;
    const key = KEY_MAP[feature][platform];
    const val = data.get(key);
    return val === true;
  };

  return {
    showStaking: resolve("showStaking"),
    showSwap: resolve("showSwap"),
    exchangeEnabled: resolve("exchangeEnabled"),
    showAiTrade: resolve("showAiTrade"),
    isLoading,
  };
};
